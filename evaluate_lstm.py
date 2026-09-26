import json
import numpy as np
import tensorflow as tf

from pathlib import Path
from sklearn.metrics import mean_absolute_error, mean_squared_error


BASE = Path(r"E:\urban flood\data\processed")


# --------------------------------------------------
# Load model
# --------------------------------------------------

model = tf.keras.models.load_model(
    BASE / "urban_flood_lstm.keras"
)


# --------------------------------------------------
# Load test data
# --------------------------------------------------

X_test = np.load(
    BASE / "X_test_robust.npy"
)

y_test_scaled = np.load(
    BASE / "y_test_robust.npy"
)


# --------------------------------------------------
# Load water-level scaler information
# --------------------------------------------------

with open(
    BASE / "lstm_robust_scalers.json",
    encoding="utf-8"
) as f:

    scaler_info = json.load(f)


water_mean = scaler_info["water_level_mean"]
water_std = scaler_info["water_level_std"]


# --------------------------------------------------
# Predict
# --------------------------------------------------

pred_scaled = model.predict(
    X_test,
    verbose=0
).flatten()


# --------------------------------------------------
# Convert back to meters
# --------------------------------------------------

y_actual = (
    y_test_scaled * water_std
    + water_mean
)

y_predicted = (
    pred_scaled * water_std
    + water_mean
)


# --------------------------------------------------
# Metrics
# --------------------------------------------------

mae = mean_absolute_error(
    y_actual,
    y_predicted
)

rmse = np.sqrt(
    mean_squared_error(
        y_actual,
        y_predicted
    )
)

max_error = np.max(
    np.abs(
        y_actual - y_predicted
    )
)


print("TEST RESULTS")
print("====================")

print(
    "Test samples:",
    len(y_actual)
)

print(
    "MAE:",
    round(mae, 4),
    "m"
)

print(
    "RMSE:",
    round(rmse, 4),
    "m"
)

print(
    "Maximum error:",
    round(max_error, 4),
    "m"
)


# --------------------------------------------------
# Show predictions
# --------------------------------------------------

print("\nACTUAL vs PREDICTED")
print("====================")

for i in range(len(y_actual)):

    print(
        f"{i + 1:02d}. "
        f"Actual = {y_actual[i]:.3f} m | "
        f"Predicted = {y_predicted[i]:.3f} m | "
        f"Error = "
        f"{abs(y_actual[i] - y_predicted[i]):.3f} m"
    )