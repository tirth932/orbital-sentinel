"""One-channel training smoke test. Skipped when torch is not installed."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

torch = pytest.importorskip("torch")

from src.errors import predict_series  # noqa: E402
from src.train import get_device, load_model, train_channel  # noqa: E402


def test_tiny_channel_trains_and_predicts(tmp_path: Path) -> None:
    rng = np.random.default_rng(0)
    timeline = np.arange(180, dtype=np.float64)
    signal = np.sin(timeline / 12.0)
    data = np.column_stack([signal, np.zeros(timeline.shape[0])])
    data[:, 1] = rng.normal(0, 0.01, timeline.shape[0])
    info = train_channel(
        "tiny",
        data,
        window=20,
        epochs=2,
        patience=2,
        batch_size=16,
        model_dir=tmp_path,
        force=True,
    )
    assert info["skipped"] == 0
    assert int(info["epochs_ran"]) >= 1
    model = load_model(tmp_path / "tiny.pt", get_device())
    predicted = predict_series(model, data, get_device(), window=20, batch_size=16)
    assert predicted.shape == (160,)
    assert np.isfinite(predicted).all()
