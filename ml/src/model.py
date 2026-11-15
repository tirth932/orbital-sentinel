"""LSTM next-step forecaster for one telemetry channel."""

from __future__ import annotations

import torch
from torch import nn

from src.config import DROPOUT, LSTM_LAYERS, LSTM_UNITS


class LSTMForecaster(nn.Module):
    def __init__(
        self,
        n_features: int,
        units: int = LSTM_UNITS,
        layers: int = LSTM_LAYERS,
        dropout: float = DROPOUT,
    ) -> None:
        super().__init__()
        if n_features < 1:
            raise ValueError("n_features must be positive")
        self.n_features = n_features
        self.units = units
        self.layers = layers
        self.dropout = dropout
        self.lstm = nn.LSTM(
            input_size=n_features,
            hidden_size=units,
            num_layers=layers,
            dropout=dropout if layers > 1 else 0.0,
            batch_first=True,
        )
        self.head = nn.Linear(units, 1)

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        output, _state = self.lstm(inputs)
        return self.head(output[:, -1, :]).squeeze(-1)
