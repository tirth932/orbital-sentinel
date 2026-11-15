"""Fixed hyperparameters. Nothing here is tuned on labeled test anomalies."""

from __future__ import annotations

from pathlib import Path

ML_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ML_ROOT.parent
DATA_DIR = ML_ROOT / "data"
OUTPUT_DIR = ML_ROOT / "outputs"
MODEL_DIR = OUTPUT_DIR / "models"
FIGURE_DIR = OUTPUT_DIR / "figures"
WEB_DATA_DIR = REPO_ROOT / "web" / "public" / "data"

WINDOW = 250
LSTM_UNITS = 80
LSTM_LAYERS = 2
DROPOUT = 0.3
SEED = 42
EWMA_SPAN = 30
PRUNE_P = 0.13
MAX_EPOCHS = 35
PATIENCE = 5
VAL_FRACTION = 0.20
BATCH_SIZE = 64
LEARNING_RATE = 1e-3
BASELINE_SIGMA = 3.0
Z_VALUES = tuple(2.5 + 0.5 * index for index in range(16))  # 2.5 .. 10.0 inclusive

MAX_SERIES_POINTS = 1500
SHOWCASE_LIMIT = 10
MAX_CHANNEL_BYTES = 120_000
MAX_WEB_DATA_BYTES = 10_000_000
EXPORT_DECIMALS = 4
