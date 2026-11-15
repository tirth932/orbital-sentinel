"""Window alignment: index t predicts column 0 at t+window."""

from __future__ import annotations

import numpy as np
from sklearn.preprocessing import MinMaxScaler

from src.data import fit_scaler, transform, windows


def test_window_target_is_one_step_past_the_window() -> None:
    data = np.zeros((300, 3), dtype=np.float64)
    data[:, 0] = np.arange(300)
    data[:, 1] = 7
    data[:, 2] = -3
    inputs, targets = windows(data, window=250)
    assert inputs.shape == (50, 250, 3)
    assert targets.shape == (50,)
    assert inputs[0, 0, 0] == 0
    assert inputs[0, -1, 0] == 249
    assert targets[0] == 250
    assert inputs[-1, 0, 0] == 49
    assert inputs[-1, -1, 0] == 298
    assert targets[-1] == 299
    assert np.all(inputs[0, :, 1] == 7)


def test_scaler_is_fit_on_train_only() -> None:
    train = np.array([[0.0, 0.0], [1.0, 5.0], [0.5, 2.0]])
    scaler = fit_scaler(train)
    assert isinstance(scaler, MinMaxScaler)
    scaled_train = transform(scaler, train)
    assert scaled_train[0, 0] == 0
    assert scaled_train[1, 0] == 1
    scaled_test = transform(scaler, np.array([[2.0, 5.0]]))
    assert scaled_test[0, 0] == 2
