"""Export helpers and the label file parser."""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np

from src.data import load_labels, merge_records
from src.export_web import decimate_minmax


def test_decimate_keeps_the_spike() -> None:
    length = 10_000
    value = np.zeros(length)
    value[1234] = 50
    series = decimate_minmax(
        np.arange(length),
        value,
        value,
        value,
        max_points=1500,
    )
    assert max(point for point in series["value"] if point is not None) == 50
    assert len(series["time"]) <= 1500


def test_load_labels_parses_sequences_and_classes(tmp_path: Path) -> None:
    path = tmp_path / "labeled_anomalies.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["chan_id", "spacecraft", "anomaly_sequences", "class", "num_values"],
        )
        writer.writeheader()
        writer.writerow(
            {
                "chan_id": "P-1",
                "spacecraft": "SMAP",
                "anomaly_sequences": "[[10, 20], [30, 40]]",
                "class": "['point', 'contextual']",
                "num_values": "100",
            }
        )
    rows = load_labels(path)
    assert rows[0]["chan_id"] == "P-1"
    assert rows[0]["anomaly_sequences"] == [(10, 20), (30, 40)]
    assert rows[0]["classes"] == ["point", "contextual"]
    assert rows[0]["num_values"] == 100


def test_duplicate_channel_rows_keep_both_ranges() -> None:
    merged = merge_records(
        [
            {
                "chan_id": "P-2",
                "spacecraft": "SMAP",
                "anomaly_sequences": [(5350, 6575)],
                "classes": ["point"],
                "num_values": 8209,
            },
            {
                "chan_id": "P-2",
                "spacecraft": "SMAP",
                "anomaly_sequences": [(5300, 6420)],
                "classes": ["point"],
                "num_values": 8209,
            },
        ]
    )
    assert len(merged) == 1
    assert merged[0]["anomaly_sequences"] == [(5350, 6575), (5300, 6420)]
