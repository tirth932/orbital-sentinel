"""EWMA matches the adjust=True recurrence."""

from __future__ import annotations

import numpy as np

from src.errors import ewma


def test_span_one_is_identity() -> None:
    values = np.array([1.0, 3.0, 2.0])
    np.testing.assert_allclose(ewma(values, span=1), values)


def test_span_three_matches_the_closed_form() -> None:
    expected = np.array([1.0, 3.5 / 1.5, 3.75 / 1.75])
    np.testing.assert_allclose(ewma(np.array([1.0, 3.0, 2.0]), span=3), expected)


def test_spike_is_smoothed_down() -> None:
    values = np.zeros(40)
    values[20] = 10
    smoothed = ewma(values, span=30)
    assert smoothed[20] < 10
    assert smoothed[19] < smoothed[20]
    assert smoothed[-1] < smoothed[20]
