"""Load one telemetry channel, scale it on the train file only, and window it."""

from __future__ import annotations

import ast
import csv
import re
from pathlib import Path

import numpy as np
from sklearn.preprocessing import MinMaxScaler

from src.config import DATA_DIR, WINDOW


def resolve_data_dir(root: Path | None = None) -> Path:
    """Find train/ and labeled_anomalies.csv, including one or two nested folders."""
    base = root or DATA_DIR
    candidates = [base, base / "data", base / "archive"]
    if base.is_dir():
        for child in base.iterdir():
            if child.is_dir():
                candidates.append(child)
                candidates.append(child / "data")
    for candidate in candidates:
        if (candidate / "train").is_dir() and (candidate / "labeled_anomalies.csv").is_file():
            return candidate
    return base


def load_channel(chan_id: str, root: Path | None = None) -> tuple[np.ndarray, np.ndarray]:
    """Return raw train and test arrays with shape (time, features)."""
    data_dir = resolve_data_dir(root)
    train_path = data_dir / "train" / f"{chan_id}.npy"
    test_path = data_dir / "test" / f"{chan_id}.npy"
    missing = [path for path in (train_path, test_path) if not path.is_file()]
    if missing:
        joined = ", ".join(str(path) for path in missing)
        raise FileNotFoundError(
            f"Missing {chan_id} arrays ({joined}). "
            "Download the NASA SMAP/MSL dataset into ml/data/. See ml/README.md."
        )
    train = np.load(train_path).astype(np.float64)
    test = np.load(test_path).astype(np.float64)
    if train.ndim != 2 or test.ndim != 2:
        raise ValueError(f"{chan_id} arrays must have shape (time, features)")
    if train.shape[1] != test.shape[1]:
        raise ValueError(f"{chan_id} train/test feature counts differ")
    return train, test


def fit_scaler(train: np.ndarray) -> MinMaxScaler:
    """Fit MinMax on the train file only. Do not refit on test."""
    scaler = MinMaxScaler()
    scaler.fit(train)
    return scaler


def transform(scaler: MinMaxScaler, values: np.ndarray) -> np.ndarray:
    return scaler.transform(values)


def invert_column(scaler: MinMaxScaler, column: int, scaled: np.ndarray) -> np.ndarray:
    """Inverse-transform one scaled column back to the original units."""
    width = int(scaler.n_features_in_)
    tiled = np.zeros((len(scaled), width), dtype=np.float64)
    tiled[:, column] = scaled
    return scaler.inverse_transform(tiled)[:, column]


def windows(data: np.ndarray, window: int = WINDOW) -> tuple[np.ndarray, np.ndarray]:
    """Build forecast windows.

    Window t uses steps ``[t, t+window)`` across every column and predicts
    column 0 at index ``t+window``. The returned target index is therefore
    ``window`` steps ahead of the window start. Callers that compare predictions
    to labeled anomaly times must shift prediction indices by ``+window``.
    """
    if data.ndim != 2:
        raise ValueError("data must be 2D (time, features)")
    count = data.shape[0] - window
    if count <= 0:
        raise ValueError(f"series length {data.shape[0]} is shorter than window {window}")
    features = data.shape[1]
    inputs = np.empty((count, window, features), dtype=np.float64)
    for start in range(count):
        inputs[start] = data[start : start + window]
    targets = data[window:, 0].copy()
    return inputs, targets


def _as_list(value: object) -> list[object]:
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]


def parse_sequences(raw: str) -> list[tuple[int, int]]:
    text = raw.strip()
    try:
        parsed = ast.literal_eval(text)
        return [(int(pair[0]), int(pair[1])) for pair in parsed]
    except (SyntaxError, ValueError, TypeError, IndexError):
        pairs = re.findall(r"\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]", text)
        if not pairs:
            raise ValueError(f"Cannot parse anomaly sequences: {raw}") from None
        return [(int(start), int(end)) for start, end in pairs]


def parse_classes(raw: str) -> list[str]:
    text = raw.strip()
    try:
        parsed = _as_list(ast.literal_eval(text))
    except (SyntaxError, ValueError):
        inner = text.strip("[]")
        parsed = [part.strip().strip("'\"") for part in inner.split(",") if part.strip()]
    classes = [str(item).strip().lower() for item in parsed]
    allowed = {"point", "contextual"}
    unknown = [item for item in classes if item not in allowed]
    if unknown:
        raise ValueError(f"Unknown anomaly class {unknown!r} in {raw!r}")
    return classes


def load_labels(path: Path | None = None) -> list[dict[str, object]]:
    """Read labeled_anomalies.csv into one record per channel."""
    label_path = path or (resolve_data_dir() / "labeled_anomalies.csv")
    if not label_path.is_file():
        raise FileNotFoundError(
            f"Missing {label_path}. Download the NASA SMAP/MSL dataset into ml/data/."
        )
    records: list[dict[str, object]] = []
    with label_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        required = {"chan_id", "spacecraft", "anomaly_sequences", "class"}
        fieldnames = set(reader.fieldnames or [])
        if not required.issubset(fieldnames):
            raise ValueError(f"{label_path} is missing columns {sorted(required - fieldnames)}")
        for row in reader:
            sequences = parse_sequences(row["anomaly_sequences"])
            classes = parse_classes(row["class"])
            if len(classes) == 1 and len(sequences) > 1:
                classes = classes * len(sequences)
            if len(classes) != len(sequences):
                raise ValueError(
                    f"{row['chan_id']} has {len(sequences)} sequences and {len(classes)} classes"
                )
            num_raw = row.get("num_values") or "0"
            records.append(
                {
                    "chan_id": row["chan_id"].strip(),
                    "spacecraft": row["spacecraft"].strip().upper(),
                    "anomaly_sequences": sequences,
                    "classes": classes,
                    "num_values": int(float(num_raw)) if num_raw else 0,
                }
            )
    return merge_records(records)


def merge_records(records: list[dict[str, object]]) -> list[dict[str, object]]:
    """Collapse repeated channel ids. The public CSV lists P-2 twice."""
    merged: dict[str, dict[str, object]] = {}
    order: list[str] = []
    for record in records:
        chan_id = str(record["chan_id"])
        if chan_id not in merged:
            merged[chan_id] = {
                "chan_id": chan_id,
                "spacecraft": record["spacecraft"],
                "anomaly_sequences": list(record["anomaly_sequences"]),  # type: ignore[arg-type]
                "classes": list(record["classes"]),  # type: ignore[arg-type]
                "num_values": record["num_values"],
            }
            order.append(chan_id)
            continue
        existing = merged[chan_id]
        sequences = existing["anomaly_sequences"]
        classes = existing["classes"]
        assert isinstance(sequences, list)
        assert isinstance(classes, list)
        sequences.extend(record["anomaly_sequences"])  # type: ignore[arg-type]
        classes.extend(record["classes"])  # type: ignore[arg-type]
    return [merged[chan_id] for chan_id in order]


def unlabeled_channels(root: Path | None = None) -> list[dict[str, object]]:
    """Channels that have a train file but no row in the label CSV.

    SMAP arrays in this dataset have 25 columns and MSL arrays have 55.
    """
    import numpy as np

    data_dir = resolve_data_dir(root)
    train_dir = data_dir / "train"
    if not train_dir.is_dir():
        return []
    labeled = {str(row["chan_id"]) for row in load_labels(data_dir / "labeled_anomalies.csv")}
    extras: list[dict[str, object]] = []
    for path in sorted(train_dir.glob("*.npy")):
        if path.stem in labeled:
            continue
        array = np.load(path, mmap_mode="r")
        spacecraft = "SMAP" if int(array.shape[1]) <= 30 else "MSL"
        extras.append(
            {
                "chan_id": path.stem,
                "spacecraft": spacecraft,
                "anomaly_sequences": [],
                "classes": [],
                "num_values": int(array.shape[0]),
            }
        )
    return extras
