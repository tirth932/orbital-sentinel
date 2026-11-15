# ORBITAL SENTINEL results

SAMPLE DATA — not a trained model.

Generated: 2026-11-14T12:33:28+00:00
Seed: 42
Git: unavailable

Sample data generated for interface development. These figures are not measurements from a trained model.

## Overall

| Model | Precision | Recall | F1 | TP | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LSTM | 0.8171 | 0.6381 | 0.7166 | 67 | 15 | 38 |
| Baseline z-score | 1.0000 | 0.4762 | 0.6452 | 50 | 0 | 55 |

## SMAP

| Model | Precision | Recall | F1 | TP | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LSTM | 0.8182 | 0.5769 | 0.6767 | 45 | 10 | 33 |
| Baseline z-score | 1.0000 | 0.4615 | 0.6316 | 36 | 0 | 42 |

## MSL

| Model | Precision | Recall | F1 | TP | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LSTM | 0.8148 | 0.8148 | 0.8148 | 22 | 5 | 5 |
| Baseline z-score | 1.0000 | 0.5185 | 0.6829 | 14 | 0 | 13 |

## Point

| Model | Precision | Recall | F1 | TP | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LSTM | 0.7541 | 0.7419 | 0.7480 | 46 | 15 | 16 |
| Baseline z-score | 1.0000 | 0.8065 | 0.8929 | 50 | 0 | 12 |

## Contextual

| Model | Precision | Recall | F1 | TP | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LSTM | 0.5833 | 0.4884 | 0.5316 | 21 | 15 | 22 |
| Baseline z-score | 0.0000 | 0.0000 | 0.0000 | 0 | 0 | 43 |

Class false positives are sequences that overlap no labeled anomaly. They are shared by the point and contextual tables.
