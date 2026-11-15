"""Three-sigma baseline fit on the train telemetry only."""

from __future__ import annotations

import numpy as np

from src.config import BASELINE_SIGMA
from src.threshold import contiguous_sequences


def baseline_sequences(
    train: np.ndarray,
    test: np.ndarray,
    sigma: float = BASELINE_SIGMA,
) -> list[tuple[int, int]]:
    """Flag raw test values more than ``sigma`` train standard deviations from the train mean.

    Indices are already on the test timeline. Do not apply the LSTM window shift.
    A standard deviation of zero produces no flags.
    """
    train_values = np.asarray(train[:, 0], dtype=np.float64)
    test_values = np.asarray(test[:, 0], dtype=np.float64)
    mean = float(np.mean(train_values))
    std = float(np.std(train_values))
    if std < 1e-12:
        return []
    mask = np.abs(test_values - mean) > sigma * std
    return contiguous_sequences(mask)
