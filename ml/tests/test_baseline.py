"""Train-only three-sigma baseline."""

from __future__ import annotations

import numpy as np

from src.baseline import baseline_sequences


def _train() -> np.ndarray:
    values = np.array([-1.0, 1.0] * 10)
    return np.column_stack([values, np.zeros(values.shape[0])])


def test_exact_three_sigma_is_not_a_flag() -> None:
    test = np.zeros((3, 2))
    test[:, 0] = [0.0, 3.0, 0.0]
    assert baseline_sequences(_train(), test) == []


def test_spike_above_three_sigma_becomes_one_sequence() -> None:
    test = np.zeros((5, 2))
    test[:, 0] = [0.0, 0.0, 4.0, 4.0, 0.0]
    assert baseline_sequences(_train(), test) == [(2, 3)]


def test_zero_train_variance_flags_nothing() -> None:
    train = np.zeros((8, 1))
    test = np.ones((4, 1))
    assert baseline_sequences(train, test) == []
