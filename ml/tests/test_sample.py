"""Sample JSON uses the real scorer and stays inside the size budget."""

from __future__ import annotations

import json
from pathlib import Path

from scripts.make_sample_data import write_sample


def test_sample_bundle_matches_the_dataset_shape_and_schema(tmp_path: Path) -> None:
    results = write_sample(tmp_path)
    assert results["is_sample"] is True
    assert results["partial"] is False
    counts = results["counts"]
    assert isinstance(counts, dict)
    assert counts["channels"] == 82
    assert counts["anomalies"] == 105
    assert counts["smap_channels"] == 55
    assert counts["msl_channels"] == 27
    assert counts["point"] == 62
    assert counts["contextual"] == 43
    lstm_group = results["lstm"]
    baseline_group = results["baseline"]
    assert isinstance(lstm_group, dict)
    assert isinstance(baseline_group, dict)
    lstm = lstm_group["overall"]
    assert isinstance(lstm, dict)
    assert 0 < float(lstm["precision"]) < 1
    assert 0 < float(lstm["recall"]) < 1
    contextual_lstm = lstm_group["class"]["contextual"]["recall"]
    contextual_base = baseline_group["class"]["contextual"]["recall"]
    assert contextual_lstm > contextual_base
    assert "not measurements" in results["comparison_note"]

    channels = json.loads((tmp_path / "channels.json").read_text(encoding="utf-8"))
    assert channels["is_sample"] is True
    assert len(channels["channels"]) == 82
    assert sum(1 for channel in channels["channels"] if channel["has_error_series"]) == 10
    anomalies = json.loads((tmp_path / "anomalies.json").read_text(encoding="utf-8"))
    assert len(anomalies["anomalies"]) == 105
    sample_channel = json.loads((tmp_path / "channel" / "P-1.json").read_text(encoding="utf-8"))
    assert sample_channel["is_sample"] is True
    assert sample_channel["true_anomalies"]
    for key in ("time", "value", "predicted", "smoothed_error"):
        assert len(sample_channel[key]) == sample_channel["displayed_points"]
    total = sum(path.stat().st_size for path in tmp_path.rglob("*.json"))
    assert total < 10_000_000
