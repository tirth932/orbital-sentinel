"""Synthetic JSON in the real export schema, flagged is_sample true.

The detector math is the real threshold, pruning, baseline, and event scorer.
The telemetry is invented so the website can be built before training.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

from src.baseline import baseline_sequences
from src.config import EWMA_SPAN, WEB_DATA_DIR
from src.errors import ewma
from src.evaluate import ChannelScore
from src.export_web import (
    build_anomalies_payload,
    build_channel_payload,
    build_error_payload,
    build_index_entry,
    build_results_payload,
    choose_showcase,
    render_results_markdown,
    write_channel_file,
    write_error_file,
    write_web_bundle,
)
from src.threshold import dynamic_threshold

SERIES_LENGTH = 900
POINT_COUNT = 62
CONTEXTUAL_COUNT = 43
SMAP_CHANNELS = 55
MSL_CHANNELS = 27


def _channel_id(index: int) -> tuple[str, str]:
    if index < SMAP_CHANNELS:
        return f"P-{index + 1}", "SMAP"
    return f"M-{index - SMAP_CHANNELS + 1}", "MSL"


def anomaly_plan(seed: int = 42) -> list[dict[str, object]]:
    """82 channels and 105 anomalies: 62 point, 43 contextual, 55 SMAP, 27 MSL."""
    labels = ["point"] * POINT_COUNT + ["contextual"] * CONTEXTUAL_COUNT
    order = np.random.default_rng(seed).permutation(len(labels))
    shuffled = [labels[int(index)] for index in order]
    counts = [1] * (SMAP_CHANNELS + MSL_CHANNELS)
    for index in range(POINT_COUNT + CONTEXTUAL_COUNT - len(counts)):
        counts[index] += 1
    if sum(counts) != len(shuffled):
        raise RuntimeError("Anomaly schedule does not sum to 105")
    channels: list[dict[str, object]] = []
    cursor = 0
    for index, count in enumerate(counts):
        chan_id, spacecraft = _channel_id(index)
        anomalies: list[dict[str, object]] = []
        for slot in range(count):
            kind = shuffled[cursor]
            cursor += 1
            missed = cursor % 6 == 0
            if missed:
                magnitude = 0.03
            elif kind == "point":
                magnitude = 4.5
            else:
                magnitude = 0.65
            start = 180 if slot == 0 else 560
            width = 8 if kind == "point" else 40
            anomalies.append(
                {
                    "start": start,
                    "end": start + width - 1,
                    "class": kind,
                    "magnitude": magnitude,
                }
            )
        channels.append(
            {
                "id": chan_id,
                "spacecraft": spacecraft,
                "anomalies": anomalies,
                "false_positive": index % 4 == 0,
            }
        )
    return channels


def synthesize_channel(spec: dict[str, object], index: int) -> tuple[ChannelScore, dict[str, object], np.ndarray, float]:
    rng = np.random.default_rng(42 + index)
    length = SERIES_LENGTH
    timeline = np.arange(length, dtype=np.float64)
    clean = np.sin(timeline / 40.0) + 0.15 * np.sin(timeline / 11.0)
    value = clean + rng.normal(0.0, 0.03, length)
    predicted = clean.copy()
    anomalies = spec["anomalies"]
    assert isinstance(anomalies, list)
    for anomaly in anomalies:
        start = int(anomaly["start"])
        end = int(anomaly["end"])
        value[start : end + 1] += float(anomaly["magnitude"])
    if spec["false_positive"]:
        predicted[760:781] -= 1.2
    train_time = np.arange(500, dtype=np.float64)
    train_values = np.sin(train_time / 40.0) + 0.15 * np.sin(train_time / 11.0)
    train_values = train_values + rng.normal(0.0, 0.03, train_values.shape[0])
    train = np.column_stack([train_values, np.zeros(train_values.shape[0])])
    test = np.column_stack([value, np.zeros(length)])
    smoothed = ewma(np.abs(value - predicted), EWMA_SPAN)
    threshold, sequences = dynamic_threshold(smoothed)
    baseline = baseline_sequences(train, test)
    spans = tuple(
        ((int(anomaly["start"]), int(anomaly["end"])), str(anomaly["class"])) for anomaly in anomalies
    )
    score = ChannelScore(
        chan_id=str(spec["id"]),
        spacecraft=str(spec["spacecraft"]),
        anomalies=spans,
        lstm_flagged=tuple(sequences),
        baseline_flagged=tuple(baseline),
    )
    return score, {
        "time": timeline,
        "value": value,
        "predicted": predicted,
        "smoothed_error": smoothed,
    }, smoothed, threshold


def write_sample(directory: Path | None = None) -> dict[str, object]:
    destination = directory or WEB_DATA_DIR
    channel_dir = destination / "channel"
    if channel_dir.is_dir():
        for stale in channel_dir.glob("*.json"):
            stale.unlink()
    specs = anomaly_plan()
    scores: list[ChannelScore] = []
    series_by_id: dict[str, tuple[dict[str, np.ndarray], np.ndarray, float]] = {}
    for index, spec in enumerate(specs):
        score, series, smoothed, threshold = synthesize_channel(spec, index)
        scores.append(score)
        series_by_id[score.chan_id] = (series, smoothed, threshold)
    showcase = choose_showcase(scores)
    results = build_results_payload(scores, is_sample=True, partial=False)
    index_entries: list[dict[str, object]] = []
    for score in scores:
        series, smoothed, threshold = series_by_id[score.chan_id]
        has_errors = score.chan_id in showcase
        if has_errors:
            published = write_error_file(
                destination,
                build_error_payload(score.chan_id, smoothed, threshold, time_offset=0),
            )
            has_errors = published
        classes = [kind for _span, kind in score.anomalies]
        payload = build_channel_payload(
            chan_id=score.chan_id,
            spacecraft=score.spacecraft,
            classes=classes,
            time=series["time"],
            value=series["value"],
            predicted=series["predicted"],
            smoothed_error=series["smoothed_error"],
            threshold=threshold,
            true_anomalies=[span for span, _kind in score.anomalies],
            flagged_sequences=list(score.lstm_flagged),
            baseline_flagged=list(score.baseline_flagged),
            n_timesteps=SERIES_LENGTH,
            time_offset=0,
            has_full_errors=has_errors,
            is_sample=True,
        )
        write_channel_file(destination, payload)
        index_entries.append(build_index_entry(score, has_full_errors=has_errors))
    anomalies = build_anomalies_payload(scores, is_sample=True)
    write_web_bundle(destination, results=results, index_channels=index_entries, anomalies=anomalies)
    markdown = destination.parent.parent.parent / "ml" / "outputs" / "sample-results.md"
    # The sample bundle lives under web/public/data. Keep the markdown next to it
    # only when writing to the default web directory; tests pass a temp dir.
    if directory is None:
        sample_md = WEB_DATA_DIR.parents[2] / "ml" / "outputs" / "sample-results.md"
        sample_md.parent.mkdir(parents=True, exist_ok=True)
        sample_md.write_text(render_results_markdown(results), encoding="utf-8")
    else:
        _ = markdown
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Write sample dashboard JSON.")
    parser.add_argument("--out", type=Path, default=None, help="Defaults to web/public/data")
    args = parser.parse_args()
    results = write_sample(args.out)
    counts = results["counts"]
    lstm = results["lstm"]
    assert isinstance(counts, dict)
    assert isinstance(lstm, dict)
    overall = lstm["overall"]
    assert isinstance(overall, dict)
    print(
        f"Wrote sample data: {counts['channels']} channels, {counts['anomalies']} anomalies, "
        f"LSTM recall {float(overall['recall']):.3f}"
    )


if __name__ == "__main__":
    main()
