"""Event overlap, the +250 window shift, and grouped metrics."""

from __future__ import annotations

from src.evaluate import (
    ChannelScore,
    comparison_note,
    score_events,
    shift_sequences,
    summarize,
)


def test_hit_miss_and_false_positive() -> None:
    result = score_events([(100, 110), (200, 210)], [(200, 205), (300, 310)])
    assert result["tp"] == 1
    assert result["fp"] == 1
    assert result["fn"] == 1


def test_one_flag_can_cover_two_anomalies() -> None:
    result = score_events([(10, 20), (15, 25)], [(12, 18)])
    assert result["tp"] == 2
    assert result["fp"] == 0
    assert result["fn"] == 0


def test_touching_endpoints_count_as_overlap() -> None:
    result = score_events([(1, 5)], [(5, 8)])
    assert result["tp"] == 1
    assert result["fp"] == 0


def test_window_offset_is_required_before_scoring() -> None:
    truth = [(250, 260)]
    predicted = [(0, 10)]
    assert score_events(truth, predicted)["tp"] == 0
    shifted = shift_sequences(predicted, 250)
    found = score_events(truth, shifted)
    assert found["tp"] == 1
    assert found["fp"] == 0
    assert shifted == [(250, 260)]


def test_empty_predictions_score_zero_recall() -> None:
    result = score_events([(1, 2)], [])
    assert result["precision"] == 0
    assert result["recall"] == 0
    assert result["fn"] == 1


def test_class_false_positives_are_not_detections_of_the_other_class() -> None:
    channel = ChannelScore(
        chan_id="P-1",
        spacecraft="SMAP",
        anomalies=(((0, 5), "point"), ((20, 30), "contextual")),
        lstm_flagged=((0, 5), (40, 45)),
        baseline_flagged=(),
    )
    summary = summarize([channel], "lstm")
    point = summary["class"]["point"]
    contextual = summary["class"]["contextual"]
    assert point["tp"] == 1 and point["fn"] == 0
    assert contextual["tp"] == 0 and contextual["fn"] == 1
    assert point["fp"] == 1
    assert contextual["fp"] == 1


def test_sample_note_is_not_a_model_claim() -> None:
    note = comparison_note({"recall": 1, "precision": 1}, {"recall": 0, "precision": 1}, is_sample=True)
    assert "not measurements" in note
    real = comparison_note({"recall": 0.2, "precision": 0.2}, {"recall": 0.8, "precision": 0.8}, is_sample=False)
    assert "did not exceed" in real
