"""JSON writers shared by the sample generator and the real pipeline."""

from __future__ import annotations

import json
import math
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from src.config import (
    BASELINE_SIGMA,
    DROPOUT,
    EWMA_SPAN,
    EXPORT_DECIMALS,
    LSTM_LAYERS,
    LSTM_UNITS,
    MAX_CHANNEL_BYTES,
    MAX_SERIES_POINTS,
    MAX_WEB_DATA_BYTES,
    PRUNE_P,
    REPO_ROOT,
    SEED,
    SHOWCASE_LIMIT,
    WEB_DATA_DIR,
    WINDOW,
)
from src.evaluate import ChannelScore, comparison_note, dataset_counts, overlaps, summarize


def git_commit() -> str | None:
    try:
        output = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=REPO_ROOT,
            stderr=subprocess.DEVNULL,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError, OSError):
        return None
    commit = output.strip()
    return commit or None


def dump_json(path: Path, payload: object, *, indent: int | None = None) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, indent=indent, allow_nan=False)
    path.write_text(text + "\n", encoding="utf-8")
    return len(text.encode("utf-8"))


def _round_metric(block: dict[str, object]) -> dict[str, float | int]:
    return {
        "precision": round(float(block["precision"]), 6),
        "recall": round(float(block["recall"]), 6),
        "f1": round(float(block["f1"]), 6),
        "tp": int(block["tp"]),
        "fp": int(block["fp"]),
        "fn": int(block["fn"]),
    }


def _round_group(group: dict[str, object]) -> dict[str, object]:
    spacecraft = group["spacecraft"]
    classes = group["class"]
    assert isinstance(spacecraft, dict)
    assert isinstance(classes, dict)
    return {
        "overall": _round_metric(group["overall"]),  # type: ignore[arg-type]
        "spacecraft": {name: _round_metric(value) for name, value in spacecraft.items()},
        "class": {name: _round_metric(value) for name, value in classes.items()},
    }


def config_payload() -> dict[str, float | int]:
    return {
        "window": WINDOW,
        "lstm_units": LSTM_UNITS,
        "layers": LSTM_LAYERS,
        "dropout": DROPOUT,
        "ewma_span": EWMA_SPAN,
        "prune_p": PRUNE_P,
        "baseline_sigma": BASELINE_SIGMA,
        "seed": SEED,
    }


def build_results_payload(
    channels: list[ChannelScore],
    *,
    is_sample: bool,
    partial: bool,
) -> dict[str, object]:
    lstm = summarize(channels, "lstm")
    baseline = summarize(channels, "baseline")
    lstm_overall = lstm["overall"]
    baseline_overall = baseline["overall"]
    assert isinstance(lstm_overall, dict)
    assert isinstance(baseline_overall, dict)
    return {
        "is_sample": is_sample,
        "partial": partial,
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "git_commit": git_commit(),
        "seed": SEED,
        "config": config_payload(),
        "counts": dataset_counts(channels),
        "comparison_note": comparison_note(lstm_overall, baseline_overall, is_sample=is_sample),
        "lstm": _round_group(lstm),
        "baseline": _round_group(baseline),
    }


def _number(value: float) -> float | None:
    if math.isnan(value) or math.isinf(value):
        return None
    return round(float(value), EXPORT_DECIMALS)


def decimate_minmax(
    time: np.ndarray,
    value: np.ndarray,
    predicted: np.ndarray,
    smoothed_error: np.ndarray,
    max_points: int = MAX_SERIES_POINTS,
) -> dict[str, list[object]]:
    """Keep the min and max telemetry value in each bucket so spikes survive."""
    length = int(time.shape[0])
    if length == 0:
        return {"time": [], "value": [], "predicted": [], "smoothed_error": []}
    if length <= max_points:
        indices = list(range(length))
    else:
        buckets = max(1, max_points // 2)
        edges = np.linspace(0, length, buckets + 1, dtype=int)
        chosen: list[int] = []
        for bucket in range(buckets):
            start = int(edges[bucket])
            end = int(edges[bucket + 1])
            if end <= start:
                continue
            segment = value[start:end]
            finite = np.isfinite(segment)
            if not np.any(finite):
                chosen.append(start)
                continue
            local = np.where(finite, segment, np.inf)
            local_max = np.where(finite, segment, -np.inf)
            min_index = start + int(np.argmin(local))
            max_index = start + int(np.argmax(local_max))
            chosen.extend(sorted({min_index, max_index}))
        indices = chosen
    return {
        "time": [int(time[index]) for index in indices],
        "value": [_number(float(value[index])) for index in indices],
        "predicted": [_number(float(predicted[index])) for index in indices],
        "smoothed_error": [_number(float(smoothed_error[index])) for index in indices],
    }


def build_channel_payload(
    *,
    chan_id: str,
    spacecraft: str,
    classes: list[str],
    time: np.ndarray,
    value: np.ndarray,
    predicted: np.ndarray,
    smoothed_error: np.ndarray,
    threshold: float,
    true_anomalies: list[tuple[int, int]],
    flagged_sequences: list[tuple[int, int]],
    baseline_flagged: list[tuple[int, int]],
    n_timesteps: int,
    time_offset: int,
    has_full_errors: bool,
    is_sample: bool,
    max_points: int = MAX_SERIES_POINTS,
) -> dict[str, object]:
    series = decimate_minmax(time, value, predicted, smoothed_error, max_points)
    unique_classes = list(dict.fromkeys(classes))
    return {
        "id": chan_id,
        "spacecraft": spacecraft,
        "is_sample": is_sample,
        "classes": unique_classes,
        "anomaly_classes": list(classes),
        "threshold": round(float(threshold), EXPORT_DECIMALS),
        "time_offset": int(time_offset),
        "prune_p": PRUNE_P,
        "n_timesteps": int(n_timesteps),
        "displayed_points": len(series["time"]),
        "has_full_errors": has_full_errors,
        "time": series["time"],
        "value": series["value"],
        "predicted": series["predicted"],
        "smoothed_error": series["smoothed_error"],
        "true_anomalies": [[int(start), int(end)] for start, end in true_anomalies],
        "flagged_sequences": [[int(start), int(end)] for start, end in flagged_sequences],
        "baseline_flagged": [[int(start), int(end)] for start, end in baseline_flagged],
    }


def build_error_payload(
    chan_id: str,
    smoothed_error: np.ndarray,
    threshold: float,
    time_offset: int,
) -> dict[str, object]:
    rounded = [round(float(value), EXPORT_DECIMALS) for value in smoothed_error]
    return {
        "id": chan_id,
        "threshold": round(float(threshold), EXPORT_DECIMALS),
        "time_offset": int(time_offset),
        "prune_p": PRUNE_P,
        "full_resolution": True,
        "smoothed_error": rounded,
    }


def build_index_entry(channel: ChannelScore, *, has_full_errors: bool) -> dict[str, object]:
    from src.evaluate import score_events

    spans = [span for span, _kind in channel.anomalies]
    result = score_events(spans, list(channel.lstm_flagged))
    classes = list(dict.fromkeys(kind for _span, kind in channel.anomalies))
    return {
        "id": channel.chan_id,
        "spacecraft": channel.spacecraft,
        "classes": classes,
        "n_anomalies": len(channel.anomalies),
        "n_found": int(result["tp"]),
        "n_missed": int(result["fn"]),
        "n_false_positives": int(result["fp"]),
        "has_error_series": has_full_errors,
    }


def build_anomalies_payload(channels: list[ChannelScore], *, is_sample: bool) -> dict[str, object]:
    records: list[dict[str, object]] = []
    for channel in channels:
        for index, (span, kind) in enumerate(channel.anomalies):
            found = any(overlaps(span, flag) for flag in channel.lstm_flagged)
            records.append(
                {
                    "id": f"{channel.chan_id}-{index}",
                    "channel": channel.chan_id,
                    "spacecraft": channel.spacecraft,
                    "class": kind,
                    "start": int(span[0]),
                    "end": int(span[1]),
                    "found": found,
                }
            )
    return {"is_sample": is_sample, "anomalies": records}


def render_results_markdown(payload: dict[str, object]) -> str:
    def row(name: str, block: dict[str, object]) -> str:
        return (
            f"| {name} | {float(block['precision']):.4f} | {float(block['recall']):.4f} | "
            f"{float(block['f1']):.4f} | {int(block['tp'])} | {int(block['fp'])} | {int(block['fn'])} |"
        )

    lstm = payload["lstm"]
    baseline = payload["baseline"]
    assert isinstance(lstm, dict)
    assert isinstance(baseline, dict)
    banner = "SAMPLE DATA — not a trained model." if payload["is_sample"] else "Measured by the local pipeline."
    if payload["partial"]:
        banner += " Partial channel set."
    chunks = [
        "# ORBITAL SENTINEL results",
        "",
        banner,
        "",
        f"Generated: {payload['generated_at']}",
        f"Seed: {payload['seed']}",
        f"Git: {payload['git_commit'] or 'unavailable'}",
        "",
        str(payload["comparison_note"]),
        "",
    ]
    header = [
        "| Model | Precision | Recall | F1 | TP | FP | FN |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]

    def add_table(title: str, left: dict[str, object], right: dict[str, object]) -> None:
        chunks.extend([f"## {title}", "", *header, row("LSTM", left), row("Baseline z-score", right), ""])

    add_table("Overall", lstm["overall"], baseline["overall"])  # type: ignore[arg-type]
    lstm_space = lstm["spacecraft"]
    base_space = baseline["spacecraft"]
    lstm_class = lstm["class"]
    base_class = baseline["class"]
    assert isinstance(lstm_space, dict) and isinstance(base_space, dict)
    assert isinstance(lstm_class, dict) and isinstance(base_class, dict)
    for name in ("SMAP", "MSL"):
        add_table(name, lstm_space[name], base_space[name])
    for name in ("point", "contextual"):
        add_table(name.capitalize(), lstm_class[name], base_class[name])
    chunks.append(
        "Class false positives are sequences that overlap no labeled anomaly. "
        "They are shared by the point and contextual tables."
    )
    chunks.append("")
    return "\n".join(chunks)


def choose_showcase(channels: list[ChannelScore], limit: int = SHOWCASE_LIMIT) -> set[str]:
    smap = [channel.chan_id for channel in channels if channel.spacecraft == "SMAP"]
    msl = [channel.chan_id for channel in channels if channel.spacecraft == "MSL"]
    picked: list[str] = []
    index = 0
    while len(picked) < limit and (index < len(smap) or index < len(msl)):
        if index < len(smap) and len(picked) < limit:
            picked.append(smap[index])
        if index < len(msl) and len(picked) < limit:
            picked.append(msl[index])
        index += 1
    return set(picked)


def _fits(payload: dict[str, object]) -> bool:
    encoded = json.dumps(payload, separators=(",", ":"), allow_nan=False).encode("utf-8")
    return len(encoded) <= MAX_CHANNEL_BYTES


def write_channel_file(directory: Path, payload: dict[str, object]) -> None:
    current = payload
    points = MAX_SERIES_POINTS
    # Caller passes an already-decimated payload. If it is still too big, drop
    # points by rewriting is not possible here; the series builder retries.
    if not _fits(current) and isinstance(current.get("time"), list):
        while points > 200 and not _fits(current):
            points = int(points * 0.7)
            # Truncation keeps a legal file if decimation was not enough.
            for key in ("time", "value", "predicted", "smoothed_error"):
                series = current[key]
                assert isinstance(series, list)
                current[key] = series[:points]
            current["displayed_points"] = len(current["time"])  # type: ignore[arg-type]
    dump_json(directory / "channel" / f"{current['id']}.json", current)


def write_error_file(directory: Path, payload: dict[str, object]) -> bool:
    """Write the full error array when it fits. Return whether it was published."""
    if _fits(payload):
        dump_json(directory / "channel" / f"{payload['id']}.errors.json", payload)
        return True
    return False


def write_web_bundle(
    directory: Path,
    *,
    results: dict[str, object],
    index_channels: list[dict[str, object]],
    anomalies: dict[str, object],
) -> None:
    dump_json(directory / "results.json", results, indent=2)
    dump_json(
        directory / "channels.json",
        {"is_sample": results["is_sample"], "channels": index_channels},
        indent=2,
    )
    dump_json(directory / "anomalies.json", anomalies, indent=2)
    total = sum(path.stat().st_size for path in directory.rglob("*.json"))
    if total > MAX_WEB_DATA_BYTES:
        raise RuntimeError(f"web data is {total} bytes, above the {MAX_WEB_DATA_BYTES} budget")


def publish_dir(explicit: Path | None = None) -> Path:
    return explicit or WEB_DATA_DIR
