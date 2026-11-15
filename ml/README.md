# ML pipeline

Offline training for ORBITAL SENTINEL. The website never imports this package.

## Data

The labeled NASA SMAP and MSL telemetry is not in git. Download one of these:

- Hugging Face dataset `appleparan/telemanom`: `data/data/train/*.npy`, `data/data/test/*.npy`, and `labeled_anomalies.csv`
- Kaggle: `patrickfleith/nasa-anomaly-detection-dataset-smap-msl` (needs an API token)
- The original telemanom S3 zip currently returns 403

Place the files so this layout exists (a single nested `data/` folder is also detected):

```
ml/data/train/*.npy
ml/data/test/*.npy
ml/data/labeled_anomalies.csv
```

Column 0 of each array is the telemetry value. The other columns are command indicators. `labeled_anomalies.csv` supplies `chan_id`, `spacecraft`, `anomaly_sequences`, `class`, and `num_values`. The public file lists `P-2` twice; those ranges are merged onto one channel. `T-10` has a telemetry file and no label row, so a full run scores it with an empty anomaly list. SMAP files have 25 columns and MSL files have 55; that is how an unlabeled file is assigned a spacecraft.

## Setup

From `ml/`:

```
pip install -r requirements.txt
python -m scripts.make_sample_data
python -m pytest
```

`make_sample_data.py` writes synthetic JSON to `web/public/data/` with `"is_sample": true`. The dashboard can be built from that before any training.

## Train

```
python -m scripts.run_all --only P-1
python -m scripts.run_all
```

Checkpoints land in `ml/outputs/models/` and are gitignored. A channel that already has a checkpoint is skipped. `--force` retrains it. `--only` writes `ml/outputs/results.json` and `results.md` and does not replace the website files. A full run (or `--publish`) writes `web/public/data/` with `"is_sample": false`.

Each channel is re-seeded with seed 42, so a single-channel run matches that channel inside a full run. The scaler is fit on the train file only. The last 20% of train windows are validation for early stopping. Thresholds are chosen from the test error stream and are never fit on the labels.

Prediction index 0 is test time 250. Flagged LSTM sequences are shifted by +250 before event scoring. The z-score baseline is not shifted, because it scores the raw test value.

## Outputs

- `ml/outputs/results.md` — LSTM vs baseline tables
- `ml/outputs/channels/<id>.json` — short per-channel training summary
- `web/public/data/results.json`
- `web/public/data/channels.json`
- `web/public/data/anomalies.json`
- `web/public/data/channel/<id>.json`
- `web/public/data/channel/<id>.errors.json` for about 10 showcase channels
