# ORBITAL SENTINEL — project spec

Portfolio project: an LSTM anomaly detector on NASA SMAP and MSL telemetry, plus a futuristic 3D dashboard. The two halves stay separate.

1. `ml/` trains and evaluates offline and writes JSON.
2. `web/` is a Next.js app deployed on Vercel. It only reads `web/public/data/`. Vercel never runs PyTorch.

Do not fabricate metrics. Every number in the UI and the root README comes from `ml/outputs/results.json` produced by the real pipeline. Until that file exists, the UI loads sample JSON from `ml/scripts/make_sample_data.py` and shows a SAMPLE DATA badge (`is_sample: true`).

## Repo layout

```
PROJECT_SPEC.md
README.md
LICENSE
.gitignore
ml/requirements.txt
ml/README.md
ml/data/                         # gitignored: train/, test/, labeled_anomalies.csv
ml/notebooks/01_explore.ipynb
ml/src/config.py                 # WINDOW=250, units=80, layers=2, dropout=0.3, seed=42, EWMA=30, prune_p=0.13
ml/src/data.py
ml/src/model.py
ml/src/train.py
ml/src/errors.py
ml/src/threshold.py
ml/src/baseline.py
ml/src/evaluate.py
ml/src/export_web.py
ml/scripts/make_sample_data.py
ml/scripts/run_all.py
ml/outputs/                      # results.json, results.md; models/ and figures/ gitignored
web/                             # Vercel root directory
```

## Phase A — ML

Data: Kaggle `patrickfleith/nasa-anomaly-detection-dataset-smap-msl` (or the Hundman et al. telemanom zip). One `.npy` per channel, shape `(time, features)`. Column 0 is telemetry. `labeled_anomalies.csv` has `chan_id, spacecraft, anomaly_sequences, class, num_values`. 82 channels (55 SMAP, 27 MSL), 105 anomalies (62 point, 43 contextual).

Locked choices:

- MinMax scaler fit on the train file only. MSE on the next value of column 0. Adam at `1e-3`, batch 64, gradient clip 1.0. Device CUDA, then MPS, then CPU.
- Window `t` is steps `[t, t+250)` of every column and predicts column 0 at `t+250`. LSTM flags are shifted by `+250` before overlap checks. Ranges are inclusive. The baseline is not shifted.
- One model per channel. Last 20% of train windows validate. Early stopping patience 5, max 35 epochs. Seed 42 is reset per channel. Checkpoints in `ml/outputs/models/` are skipped unless `--force`.
- Dynamic threshold: `epsilon = mean + z * std` for `z` from 2.5 to 10 step 0.5. Score `((mean - mean_below) / mean + (std - std_below) / std) / (n_above + n_sequences^2)`.
- Pruning: sort sequences by max smoothed error descending. When `(e[i] - e[i+1]) / e[i] < 0.13`, drop `i+1` and every smaller sequence.
- Never tune thresholds, smoothing, or hyperparameters on labeled test anomalies.
- Baseline: raw test value more than 3 train standard deviations from the train mean, collapsed into sequences, scored the same way.
- Event score: an anomaly is a true positive if any flagged sequence overlaps it. A flagged sequence that overlaps none is a false positive. Point vs contextual is scored per anomaly. Class false positives are sequences that overlap no labeled anomaly at all.
- `run_all.py --only P-1,E-1` trains a subset and writes `ml/outputs/` only. A full run publishes `web/public/data/` with `is_sample: false`.
- Chart series are min/max decimated to about 1500 points. About 10 showcase channels also get a full-resolution smoothed error file, rounded to 4 decimals, each file under about 120 KB, the data folder under about 10 MB.

## Phase B — web

Next.js 15 App Router, TypeScript strict, Tailwind CSS v4, React Three Fiber, drei, postprocessing, Framer Motion, Lenis, canvas charts with d3-scale and d3-shape, zustand, zod. No API routes. No `any`.

Visual identity: near-black `#05060a`, cyan `#00E5FF`, violet `#7C4DFF`, magenta `#FF2E93`, amber `#FFB020`, mint `#35F2A8`. Glass panels, HUD corners, scanlines, count-up numbers, reduced-motion support.

Pages:

- Home: procedural satellite hero, stats from `results.json`, four method steps, LSTM vs baseline results, lazy anomaly globe, limitations, footer.
- `/console`: searchable channel list, telemetry chart (zoom, pan, crosshair, minimap), error chart with a draggable threshold, baseline toggle, verdict and event table.

The threshold slider recomputes sequences on the exported error array, including pruning, and updates that channel's precision and recall. Channels without a full error file keep the exported threshold and show a lock.

R3F scenes are dynamic-imported with `ssr: false`. Mobile, low core count, or missing WebGL uses a CSS scene. `prefers-reduced-motion` freezes camera, parallax, and particles.

## Phase C — repo

GitHub Actions runs the ML unit tests (no dataset, no torch required) and web lint, typecheck, and build. Vercel root is `web/`, with cache headers for `/data/*`. The root README includes the reproduce steps, an architecture diagram, limitations, the dataset citation, and a results table taken from the exported JSON. Sample numbers stay labeled as sample.

Paper figures of 87.5% precision and 80.0% recall, if shown, are labeled "reported in the NASA JPL paper" and are never stored as this repo's measurements.

Citation: Hundman, K., Constantinou, V., Laporte, C., Colwell, I., and Soderstrom, T. (2018). Detecting Spacecraft Anomalies Using LSTMs and Nonparametric Dynamic Thresholding. KDD.
