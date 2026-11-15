"""Train one LSTM per channel. The seed is reset for every channel."""

from __future__ import annotations

import copy
import random
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, Dataset

from src.config import (
    BATCH_SIZE,
    LEARNING_RATE,
    MAX_EPOCHS,
    MODEL_DIR,
    PATIENCE,
    SEED,
    VAL_FRACTION,
    WINDOW,
)
from src.model import LSTMForecaster


def set_seed(seed: int = SEED) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def get_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    mps = getattr(torch.backends, "mps", None)
    if mps is not None and mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def model_path(chan_id: str, model_dir: Path | None = None) -> Path:
    return (model_dir or MODEL_DIR) / f"{chan_id}.pt"


class WindowDataset(Dataset[tuple[torch.Tensor, torch.Tensor]]):
    """Slices of ``data.windows``: index t predicts column 0 at t+window."""

    def __init__(self, data: np.ndarray, start: int, end: int, window: int) -> None:
        self.data = data
        self.start = start
        self.end = end
        self.window = window

    def __len__(self) -> int:
        return self.end - self.start

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        origin = self.start + index
        features = torch.tensor(self.data[origin : origin + self.window], dtype=torch.float32)
        target = torch.tensor(self.data[origin + self.window, 0], dtype=torch.float32)
        return features, target


def _run_epoch(
    model: LSTMForecaster,
    loader: DataLoader[tuple[torch.Tensor, torch.Tensor]],
    optimizer: torch.optim.Optimizer | None,
    device: torch.device,
) -> float:
    training = optimizer is not None
    model.train(training)
    total = 0.0
    seen = 0
    loss_fn = nn.MSELoss()
    for features, target in loader:
        features = features.to(device)
        target = target.to(device)
        if training and optimizer is not None:
            optimizer.zero_grad(set_to_none=True)
        predicted = model(features)
        loss = loss_fn(predicted, target)
        if training and optimizer is not None:
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
        batch = int(target.shape[0])
        total += float(loss.item()) * batch
        seen += batch
    return total / seen if seen else 0.0


def train_channel(
    chan_id: str,
    train_scaled: np.ndarray,
    *,
    window: int = WINDOW,
    epochs: int = MAX_EPOCHS,
    patience: int = PATIENCE,
    batch_size: int = BATCH_SIZE,
    learning_rate: float = LEARNING_RATE,
    seed: int = SEED,
    model_dir: Path | None = None,
    force: bool = False,
) -> dict[str, float | int | str]:
    """Train on the first 80% of windows. Early-stop on the last 20%.

    An existing checkpoint is reused unless ``force`` is set. Re-seeding makes
    ``--only CHAN`` match that channel inside a full run.
    """
    destination = model_path(chan_id, model_dir)
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.is_file() and not force:
        return {"chan_id": chan_id, "skipped": 1, "path": str(destination), "epochs_ran": 0, "best_val_loss": -1.0}

    count = train_scaled.shape[0] - window
    if count < 2:
        raise ValueError(f"{chan_id} does not have enough rows for window {window}")
    split = int(count * (1.0 - VAL_FRACTION))
    split = min(max(split, 1), count - 1)

    set_seed(seed)
    device = get_device()
    model = LSTMForecaster(n_features=train_scaled.shape[1]).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    generator = torch.Generator()
    generator.manual_seed(seed)
    pin = device.type == "cuda"
    train_loader = DataLoader(
        WindowDataset(train_scaled, 0, split, window),
        batch_size=batch_size,
        shuffle=True,
        generator=generator,
        num_workers=0,
        pin_memory=pin,
    )
    val_loader = DataLoader(
        WindowDataset(train_scaled, split, count, window),
        batch_size=batch_size,
        shuffle=False,
        num_workers=0,
        pin_memory=pin,
    )

    best_loss = float("inf")
    best_state: dict[str, torch.Tensor] | None = None
    remaining = patience
    epochs_ran = 0
    for _epoch in range(epochs):
        epochs_ran += 1
        _run_epoch(model, train_loader, optimizer, device)
        val_loss = _run_epoch(model, val_loader, None, device)
        if val_loss < best_loss - 1e-6:
            best_loss = val_loss
            best_state = copy.deepcopy(model.state_dict())
            remaining = patience
        else:
            remaining -= 1
            if remaining <= 0:
                break
    if best_state is None:
        raise RuntimeError(f"{chan_id} produced no validation loss")
    model.load_state_dict(best_state)
    torch.save(
        {
            "state_dict": model.state_dict(),
            "n_features": train_scaled.shape[1],
            "chan_id": chan_id,
            "window": window,
            "epochs_ran": epochs_ran,
            "best_val_loss": best_loss,
            "seed": seed,
        },
        destination,
    )
    return {
        "chan_id": chan_id,
        "skipped": 0,
        "path": str(destination),
        "epochs_ran": epochs_ran,
        "best_val_loss": best_loss,
    }


def load_model(path: Path, device: torch.device | None = None) -> LSTMForecaster:
    target = device or get_device()
    try:
        checkpoint = torch.load(path, map_location=target, weights_only=False)
    except TypeError:
        checkpoint = torch.load(path, map_location=target)
    model = LSTMForecaster(n_features=int(checkpoint["n_features"]))
    model.load_state_dict(checkpoint["state_dict"])
    model.to(target)
    model.eval()
    return model
