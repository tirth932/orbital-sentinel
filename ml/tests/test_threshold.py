"""Dynamic threshold and pruning, with no labels involved."""

from __future__ import annotations

import numpy as np

from src.threshold import best_threshold, contiguous_sequences, prune_sequences


def test_sequences_include_a_run_that_reaches_the_last_index() -> None:
    mask = np.array([False, True, True])
    assert contiguous_sequences(mask) == [(1, 2)]


def test_pruning_drops_the_tail_when_the_drop_is_under_13_percent() -> None:
    errors = np.zeros(100)
    errors[10:15] = 10
    errors[40:45] = 8
    errors[70:75] = 7.9
    sequences = contiguous_sequences(errors > 1)
    pruned = prune_sequences(errors, sequences, prune_p=0.13)
    assert pruned == [(10, 14), (40, 44)]


def test_pruning_keeps_a_single_sequence() -> None:
    errors = np.array([0.0, 5.0, 0.0])
    assert prune_sequences(errors, [(1, 1)]) == [(1, 1)]


def test_best_threshold_covers_a_clear_spike() -> None:
    rng = np.random.default_rng(0)
    errors = np.abs(rng.normal(0, 0.05, 500))
    errors[200:210] = 5
    epsilon, sequences = best_threshold(errors)
    assert epsilon < 5
    assert any(start <= 200 and end >= 209 for start, end in sequences)
