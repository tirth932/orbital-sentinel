"""Nonparametric dynamic threshold and percent-decrease pruning.

The threshold is chosen only from the smoothed error stream. Labeled anomalies
are never consulted here.
"""

from __future__ import annotations

import numpy as np

from src.config import PRUNE_P, Z_VALUES


def contiguous_sequences(mask: np.ndarray) -> list[tuple[int, int]]:
    """Inclusive ``[start, end]`` runs where ``mask`` is true."""
    sequences: list[tuple[int, int]] = []
    start: int | None = None
    for index, flagged in enumerate(np.asarray(mask, dtype=bool)):
        if flagged and start is None:
            start = index
        elif not flagged and start is not None:
            sequences.append((start, index - 1))
            start = None
    if start is not None:
        sequences.append((start, len(mask) - 1))
    return sequences


def candidate_thresholds(errors: np.ndarray) -> list[float]:
    mean = float(np.mean(errors))
    std = float(np.std(errors))
    return [mean + z * std for z in Z_VALUES]


def threshold_score(errors: np.ndarray, epsilon: float) -> float | None:
    """Paper score. ``None`` when the candidate does not split the stream."""
    errors = np.asarray(errors, dtype=np.float64)
    above = errors > epsilon
    n_above = int(np.count_nonzero(above))
    if n_above == 0:
        return None
    below = errors[~above]
    if below.size == 0:
        return None
    mean = float(np.mean(errors))
    std = float(np.std(errors))
    if abs(mean) < 1e-8 or std < 1e-8:
        return None
    mean_below = float(np.mean(below))
    std_below = float(np.std(below))
    n_sequences = len(contiguous_sequences(above))
    numerator = ((mean - mean_below) / mean) + ((std - std_below) / std)
    denominator = n_above + n_sequences**2
    if denominator == 0:
        return None
    return float(numerator / denominator)


def best_threshold(errors: np.ndarray) -> tuple[float, list[tuple[int, int]]]:
    """Pick the epsilon in ``mean + z * std`` with the highest score.

    Ties keep the earlier (lower) z. If every candidate is invalid, return the
    top of the range and no sequences.
    """
    errors = np.asarray(errors, dtype=np.float64)
    mean = float(np.mean(errors)) if errors.size else 0.0
    std = float(np.std(errors)) if errors.size else 0.0
    chosen = mean + Z_VALUES[-1] * std
    chosen_sequences: list[tuple[int, int]] = []
    best = -np.inf
    for epsilon in candidate_thresholds(errors):
        score = threshold_score(errors, epsilon)
        if score is None or score <= best:
            continue
        best = score
        chosen = float(epsilon)
        chosen_sequences = contiguous_sequences(errors > epsilon)
    return chosen, chosen_sequences


def prune_sequences(
    errors: np.ndarray,
    sequences: list[tuple[int, int]],
    prune_p: float = PRUNE_P,
) -> list[tuple[int, int]]:
    """Drop sequences that are not a distinct step down in max error.

    Sequences are sorted by max smoothed error, descending. When
    ``(e[i] - e[i+1]) / e[i] < prune_p``, sequence ``i+1`` and every smaller
    sequence are removed. Sequence ``i`` stays.
    """
    if len(sequences) <= 1:
        return list(sequences)
    errors = np.asarray(errors, dtype=np.float64)
    scored: list[tuple[float, tuple[int, int]]] = []
    for start, end in sequences:
        scored.append((float(np.max(errors[start : end + 1])), (start, end)))
    scored.sort(key=lambda item: item[0], reverse=True)
    kept = [scored[0][1]]
    for index in range(len(scored) - 1):
        current = scored[index][0]
        nxt = scored[index + 1][0]
        if current <= 0:
            break
        drop = (current - nxt) / current
        if drop < prune_p:
            break
        kept.append(scored[index + 1][1])
    kept.sort(key=lambda span: span[0])
    return kept


def dynamic_threshold(
    errors: np.ndarray,
    prune_p: float = PRUNE_P,
) -> tuple[float, list[tuple[int, int]]]:
    """Return ``(epsilon, pruned inclusive sequences)`` in error-index space."""
    epsilon, sequences = best_threshold(errors)
    return epsilon, prune_sequences(errors, sequences, prune_p)
