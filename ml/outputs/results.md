# ORBITAL SENTINEL results

Measured by the local pipeline. Partial channel set.

Generated: 2026-11-14T13:11:14+00:00
Seed: 42
Git: unavailable

On this run, LSTM recall did not exceed the z-score baseline. Event counts are reported without adjustment.

## Overall

| Model | Precision | Recall | F1 | TP | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LSTM | 0.0000 | 0.0000 | 0.0000 | 0 | 1 | 3 |
| Baseline z-score | 0.0513 | 0.6667 | 0.0952 | 2 | 37 | 1 |

## SMAP

| Model | Precision | Recall | F1 | TP | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LSTM | 0.0000 | 0.0000 | 0.0000 | 0 | 1 | 3 |
| Baseline z-score | 0.0513 | 0.6667 | 0.0952 | 2 | 37 | 1 |

## MSL

| Model | Precision | Recall | F1 | TP | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LSTM | 0.0000 | 0.0000 | 0.0000 | 0 | 0 | 0 |
| Baseline z-score | 0.0000 | 0.0000 | 0.0000 | 0 | 0 | 0 |

## Point

| Model | Precision | Recall | F1 | TP | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LSTM | 0.0000 | 0.0000 | 0.0000 | 0 | 1 | 0 |
| Baseline z-score | 0.0000 | 0.0000 | 0.0000 | 0 | 37 | 0 |

## Contextual

| Model | Precision | Recall | F1 | TP | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LSTM | 0.0000 | 0.0000 | 0.0000 | 0 | 1 | 3 |
| Baseline z-score | 0.0513 | 0.6667 | 0.0952 | 2 | 37 | 1 |

Class false positives are sequences that overlap no labeled anomaly. They are shared by the point and contextual tables.
