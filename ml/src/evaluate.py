"""Event-level overlap scoring.

An anomaly is found when any flagged sequence overlaps it. A flagged sequence
that overlaps no anomaly is a false positive. Ranges are inclusive.
"""

from __future__ import annotations

from dataclasses import dataclass


def overlaps(left: tuple[int, int], right: tuple[int, int]) -> bool:
    return left[0] <= right[1] and right[0] <= left[1]


def shift_sequences(sequences: list[tuple[int, int]], offset: int) -> list[tuple[int, int]]:
    """Move window-space indices onto the original timeline."""
    return [(start + offset, end + offset) for start, end in sequences]


def score_events(
    true_anomalies: list[tuple[int, int]],
    flagged: list[tuple[int, int]],
) -> dict[str, float | int]:
    """Micro counts for one set of events.

    Precision and recall are 0 when the denominator is 0 (no predictions, or
    no labeled anomalies). That matches a dashboard that always has a number.
    """
    matched_flags: set[int] = set()
    true_positives = 0
    for anomaly in true_anomalies:
        hit = False
        for index, flag in enumerate(flagged):
            if overlaps(anomaly, flag):
                hit = True
                matched_flags.add(index)
        if hit:
            true_positives += 1
    false_positives = len(flagged) - len(matched_flags)
    false_negatives = len(true_anomalies) - true_positives
    return metrics_from_counts(true_positives, false_positives, false_negatives)


def metrics_from_counts(true_positives: int, false_positives: int, false_negatives: int) -> dict[str, float | int]:
    precision_den = true_positives + false_positives
    recall_den = true_positives + false_negatives
    precision = true_positives / precision_den if precision_den else 0.0
    recall = true_positives / recall_den if recall_den else 0.0
    f1_den = precision + recall
    f1 = 2 * precision * recall / f1_den if f1_den else 0.0
    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "tp": true_positives,
        "fp": false_positives,
        "fn": false_negatives,
    }


@dataclass(frozen=True)
class ChannelScore:
    chan_id: str
    spacecraft: str
    anomalies: tuple[tuple[tuple[int, int], str], ...]
    lstm_flagged: tuple[tuple[int, int], ...]
    baseline_flagged: tuple[tuple[int, int], ...]


def _flags(channel: ChannelScore, model: str) -> list[tuple[int, int]]:
    if model == "lstm":
        return list(channel.lstm_flagged)
    if model == "baseline":
        return list(channel.baseline_flagged)
    raise ValueError(f"Unknown model {model}")


def accumulate(
    channels: list[ChannelScore],
    model: str,
    anomaly_class: str | None = None,
) -> dict[str, float | int]:
    """Sum event counts.

    For a class subset, true positives and false negatives are counted only on
    anomalies of that class. False positives are sequences that overlap no
    labeled anomaly of any class, so a detection of the other class is not
    punished as a false alarm.
    """
    true_positives = 0
    false_positives = 0
    false_negatives = 0
    for channel in channels:
        flags = _flags(channel, model)
        if anomaly_class is None:
            spans = [span for span, _kind in channel.anomalies]
            result = score_events(spans, flags)
            true_positives += int(result["tp"])
            false_positives += int(result["fp"])
            false_negatives += int(result["fn"])
            continue
        class_spans = [span for span, kind in channel.anomalies if kind == anomaly_class]
        class_result = score_events(class_spans, flags)
        all_spans = [span for span, _kind in channel.anomalies]
        pure_false_positives = int(score_events(all_spans, flags)["fp"])
        true_positives += int(class_result["tp"])
        false_negatives += int(class_result["fn"])
        false_positives += pure_false_positives
    return metrics_from_counts(true_positives, false_positives, false_negatives)


def summarize(channels: list[ChannelScore], model: str) -> dict[str, object]:
    smap = [channel for channel in channels if channel.spacecraft == "SMAP"]
    msl = [channel for channel in channels if channel.spacecraft == "MSL"]
    return {
        "overall": accumulate(channels, model),
        "spacecraft": {
            "SMAP": accumulate(smap, model),
            "MSL": accumulate(msl, model),
        },
        "class": {
            "point": accumulate(channels, model, "point"),
            "contextual": accumulate(channels, model, "contextual"),
        },
    }


def dataset_counts(channels: list[ChannelScore]) -> dict[str, int]:
    point = sum(1 for channel in channels for _span, kind in channel.anomalies if kind == "point")
    contextual = sum(
        1 for channel in channels for _span, kind in channel.anomalies if kind == "contextual"
    )
    return {
        "channels": len(channels),
        "anomalies": point + contextual,
        "smap_channels": sum(1 for channel in channels if channel.spacecraft == "SMAP"),
        "msl_channels": sum(1 for channel in channels if channel.spacecraft == "MSL"),
        "point": point,
        "contextual": contextual,
    }


def comparison_note(
    lstm: dict[str, float | int],
    baseline: dict[str, float | int],
    *,
    is_sample: bool,
) -> str:
    if is_sample:
        return (
            "Sample data generated for interface development. "
            "These figures are not measurements from a trained model."
        )
    recall_delta = float(lstm["recall"]) - float(baseline["recall"])
    precision_delta = float(lstm["precision"]) - float(baseline["precision"])
    if recall_delta > 0 and precision_delta >= -0.05:
        return (
            "On this run, LSTM recall is higher than the z-score baseline "
            "with precision within five points of the baseline."
        )
    if recall_delta > 0:
        return (
            "On this run, LSTM recall is higher than the z-score baseline, "
            "with a larger precision tradeoff. Counts are reported above."
        )
    return (
        "On this run, LSTM recall did not exceed the z-score baseline. "
        "Event counts are reported without adjustment."
    )
