"""Train, score, and export every channel. Run from the ml/ directory."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

from src.baseline import baseline_sequences
from src.config import OUTPUT_DIR, WEB_DATA_DIR, WINDOW
from src.data import fit_scaler, invert_column, load_channel, load_labels, transform, unlabeled_channels
from src.errors import absolute_error, ewma, predict_series
from src.evaluate import ChannelScore
from src.export_web import (
    build_anomalies_payload,
    build_channel_payload,
    build_error_payload,
    build_index_entry,
    build_results_payload,
    choose_showcase,
    dump_json,
    render_results_markdown,
    write_channel_file,
    write_error_file,
    write_web_bundle,
)
from src.threshold import dynamic_threshold
from src.train import get_device, load_model, train_channel


def process_channel(record: dict[str, object], *, force: bool) -> tuple[ChannelScore, dict[str, object], dict[str, object]]:
    chan_id = str(record["chan_id"])
    spacecraft = str(record["spacecraft"])
    sequences = record["anomaly_sequences"]
    classes = record["classes"]
    assert isinstance(sequences, list)
    assert isinstance(classes, list)
    train_raw, test_raw = load_channel(chan_id)
    scaler = fit_scaler(train_raw)
    train_scaled = transform(scaler, train_raw)
    test_scaled = transform(scaler, test_raw)
    trained = train_channel(chan_id, train_scaled, force=force)
    device = get_device()
    model = load_model(Path(str(trained["path"])), device)
    predicted_scaled = predict_series(model, test_scaled, device)
    actual_scaled = test_scaled[WINDOW:, 0]
    smoothed = ewma(absolute_error(actual_scaled, predicted_scaled))
    threshold, error_sequences = dynamic_threshold(smoothed)
    flagged = [(start + WINDOW, end + WINDOW) for start, end in error_sequences]
    baseline = baseline_sequences(train_raw, test_raw)
    anomalies = tuple(
        ((int(span[0]), int(span[1])), str(kind)) for span, kind in zip(sequences, classes, strict=True)
    )
    score = ChannelScore(
        chan_id=chan_id,
        spacecraft=spacecraft,
        anomalies=anomalies,
        lstm_flagged=tuple(flagged),
        baseline_flagged=tuple(baseline),
    )
    length = int(test_raw.shape[0])
    time = np.arange(length, dtype=np.float64)
    value = test_raw[:, 0].astype(np.float64)
    predicted = np.full(length, np.nan, dtype=np.float64)
    chart_error = np.full(length, np.nan, dtype=np.float64)
    predicted[WINDOW:] = invert_column(scaler, 0, predicted_scaled)
    chart_error[WINDOW:] = smoothed
    summary = {
        "id": chan_id,
        "spacecraft": spacecraft,
        "epochs_ran": trained["epochs_ran"],
        "best_val_loss": trained["best_val_loss"],
        "skipped": trained["skipped"],
        "threshold": threshold,
        "n_flagged": len(flagged),
        "n_baseline": len(baseline),
    }
    chart = {
        "time": time,
        "value": value,
        "predicted": predicted,
        "smoothed_error": chart_error,
        "threshold": threshold,
        "smoothed": smoothed,
    }
    return score, summary, chart


def run(*, only: list[str] | None, force: bool, publish: bool) -> dict[str, object]:
    labels = load_labels() + unlabeled_channels()
    selected = labels
    if only:
        wanted = set(only)
        selected = [row for row in labels if str(row["chan_id"]) in wanted]
        missing = wanted - {str(row["chan_id"]) for row in selected}
        if missing:
            raise FileNotFoundError(f"Unknown channel ids: {', '.join(sorted(missing))}")
    if not selected:
        raise FileNotFoundError("No channels to run. Check ml/data/labeled_anomalies.csv.")

    scores: list[ChannelScore] = []
    summaries: list[dict[str, object]] = []
    charts: dict[str, dict[str, object]] = {}
    total = len(selected)
    for index, record in enumerate(selected, start=1):
        chan_id = str(record["chan_id"])
        print(f"[{index}/{total}] {chan_id}", flush=True)
        score, summary, chart = process_channel(record, force=force)
        scores.append(score)
        summaries.append(summary)
        charts[chan_id] = chart
        dump_json(OUTPUT_DIR / "channels" / f"{chan_id}.json", summary, indent=2)

    partial = len(scores) != len(labels)
    results = build_results_payload(scores, is_sample=False, partial=partial)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    dump_json(OUTPUT_DIR / "results.json", results, indent=2)
    (OUTPUT_DIR / "results.md").write_text(render_results_markdown(results), encoding="utf-8")

    should_publish = publish or not partial
    if should_publish:
        channel_dir = WEB_DATA_DIR / "channel"
        if channel_dir.is_dir():
            for stale in channel_dir.glob("*.json"):
                stale.unlink()
        showcase = choose_showcase(scores)
        index_entries: list[dict[str, object]] = []
        for score in scores:
            chart = charts[score.chan_id]
            smoothed = chart["smoothed"]
            assert isinstance(smoothed, np.ndarray)
            has_errors = False
            if score.chan_id in showcase:
                has_errors = write_error_file(
                    WEB_DATA_DIR,
                    build_error_payload(score.chan_id, smoothed, float(chart["threshold"]), WINDOW),
                )
            payload = build_channel_payload(
                chan_id=score.chan_id,
                spacecraft=score.spacecraft,
                classes=[kind for _span, kind in score.anomalies],
                time=chart["time"],  # type: ignore[arg-type]
                value=chart["value"],  # type: ignore[arg-type]
                predicted=chart["predicted"],  # type: ignore[arg-type]
                smoothed_error=chart["smoothed_error"],  # type: ignore[arg-type]
                threshold=float(chart["threshold"]),
                true_anomalies=[span for span, _kind in score.anomalies],
                flagged_sequences=list(score.lstm_flagged),
                baseline_flagged=list(score.baseline_flagged),
                n_timesteps=int(chart["time"].shape[0]),  # type: ignore[attr-defined]
                time_offset=WINDOW,
                has_full_errors=has_errors,
                is_sample=False,
            )
            write_channel_file(WEB_DATA_DIR, payload)
            index_entries.append(build_index_entry(score, has_full_errors=has_errors))
        write_web_bundle(
            WEB_DATA_DIR,
            results=results,
            index_channels=index_entries,
            anomalies=build_anomalies_payload(scores, is_sample=False),
        )
        print(f"Published web data to {WEB_DATA_DIR}")
    else:
        print("Partial run: wrote ml/outputs only. Pass --publish to replace web/public/data.")
    print(f"Results: {OUTPUT_DIR / 'results.md'}")
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Train, evaluate, and export SMAP/MSL channels.")
    parser.add_argument("--only", default=None, help="Comma-separated channel ids, for example P-1,E-1")
    parser.add_argument("--force", action="store_true", help="Retrain even if a checkpoint exists")
    parser.add_argument("--publish", action="store_true", help="Write web/public/data even for a partial run")
    args = parser.parse_args(argv)
    only = None if args.only is None else [part.strip() for part in args.only.split(",") if part.strip()]
    try:
        run(only=only, force=args.force, publish=args.publish)
    except FileNotFoundError as exc:
        print(exc)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
