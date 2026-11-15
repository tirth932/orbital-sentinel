"""Absolute forecast error and EWMA smoothing. Prediction imports torch lazily."""

from __future__ import annotations

import numpy as np

from src.config import BATCH_SIZE, EWMA_SPAN, WINDOW


def ewma(values: np.ndarray, span: int = EWMA_SPAN) -> np.ndarray:
    """Pandas-compatible ``ewm(span=span, adjust=True).mean()``."""
    series = np.asarray(values, dtype=np.float64)
    if span < 1:
        raise ValueError("span must be >= 1")
    if series.size == 0:
        return series.copy()
    alpha = 2.0 / (span + 1.0)
    one_minus = 1.0 - alpha
    smoothed = np.empty(series.shape[0], dtype=np.float64)
    numerator = 0.0
    denominator = 0.0
    for index, value in enumerate(series):
        numerator = numerator * one_minus + float(value)
        denominator = denominator * one_minus + 1.0
        smoothed[index] = numerator / denominator
    return smoothed


def absolute_error(actual: np.ndarray, predicted: np.ndarray) -> np.ndarray:
    return np.abs(np.asarray(actual, dtype=np.float64) - np.asarray(predicted, dtype=np.float64))


def predict_series(
    model: object,
    data: np.ndarray,
    device: object,
    window: int = WINDOW,
    batch_size: int = BATCH_SIZE,
) -> np.ndarray:
    """Predict column 0 at each index ``t+window`` from steps ``[t, t+window)``."""
    import torch

    count = data.shape[0] - window
    if count <= 0:
        raise ValueError(f"series length {data.shape[0]} is shorter than window {window}")
    predictions = np.empty(count, dtype=np.float64)
    model.eval()  # type: ignore[attr-defined]
    with torch.no_grad():
        for start in range(0, count, batch_size):
            end = min(count, start + batch_size)
            batch = np.empty((end - start, window, data.shape[1]), dtype=np.float32)
            for offset, origin in enumerate(range(start, end)):
                batch[offset] = data[origin : origin + window]
            tensor = torch.from_numpy(batch).to(device)
            output = model(tensor).detach().cpu().numpy()  # type: ignore[operator]
            predictions[start:end] = np.atleast_1d(output)
    return predictions
