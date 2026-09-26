import os
import numpy as np
import pandas as pd

from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping


# ============================================================
# 1. PATHS
# ============================================================

INPUT_FILE = "data/processed/lstm_clean_sequences.csv"

MODEL_DIR = "ml/models"

os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_FILE = os.path.join(
    MODEL_DIR,
    "urban_flood_lstm.keras"
)


# ============================================================
# 2. LOAD DATA
# ============================================================

df = pd.read_csv(INPUT_FILE)

print("\n====================================")
print("DATASET LOADED")
print("====================================")

print("Rows:", len(df))
print("Columns:", df.columns.tolist())


# ============================================================
# 3. PARSE PIPE-SEPARATED SEQUENCES
# ============================================================

def parse_sequence(value):
    return [float(x) for x in str(value).split("|")]


rainfall_sequences = np.array(
    [
        parse_sequence(value)
        for value in df["rainfall_sequence"]
    ],
    dtype=np.float32,
)


water_level_sequences = np.array(
    [
        parse_sequence(value)
        for value in df["water_level_sequence"]
    ],
    dtype=np.float32,
)


targets = df["target_water_level"].astype(
    np.float32
).to_numpy()


print("\nRainfall shape:", rainfall_sequences.shape)

print(
    "Water level shape:",
    water_level_sequences.shape,
)

print(
    "Target shape:",
    targets.shape,
)


# ============================================================
# 4. COMBINE FEATURES
# ============================================================

# Expected:
# samples × 6 time steps × 2 features
#
# Feature 1 = rainfall
# Feature 2 = water level

X = np.stack(
    [
        rainfall_sequences,
        water_level_sequences,
    ],
    axis=-1,
)

y = targets.reshape(-1, 1)


print("\n====================================")
print("LSTM DATA SHAPE")
print("====================================")

print("Input X:", X.shape)
print("Target y:", y.shape)


# ============================================================
# 5. CHRONOLOGICAL TRAIN / VALIDATION / TEST SPLIT
# ============================================================

# Total = 79 sequences
#
# Train      = 55
# Validation = 12
# Test       = 12

train_end = 55

validation_end = 67


X_train = X[:train_end]

y_train = y[:train_end]


X_val = X[train_end:validation_end]

y_val = y[train_end:validation_end]


X_test = X[validation_end:]

y_test = y[validation_end:]


print("\n====================================")
print("CHRONOLOGICAL SPLIT")
print("====================================")

print("Training:", len(X_train))

print("Validation:", len(X_val))

print("Test:", len(X_test))


# ============================================================
# 6. FEATURE SCALING
# ============================================================

# IMPORTANT:
# Fit scalers ONLY on training data.
# This prevents test-data leakage.

feature_scaler = StandardScaler()


feature_scaler.fit(
    X_train.reshape(
        -1,
        X_train.shape[-1],
    )
)


def scale_features(X_data):

    original_shape = X_data.shape

    scaled = feature_scaler.transform(
        X_data.reshape(
            -1,
            original_shape[-1],
        )
    )

    return scaled.reshape(
        original_shape
    )


X_train_scaled = scale_features(
    X_train
)

X_val_scaled = scale_features(
    X_val
)

X_test_scaled = scale_features(
    X_test
)


# ============================================================
# 7. TARGET SCALING
# ============================================================

target_scaler = StandardScaler()


target_scaler.fit(
    y_train
)


y_train_scaled = target_scaler.transform(
    y_train
)

y_val_scaled = target_scaler.transform(
    y_val
)

y_test_scaled = target_scaler.transform(
    y_test
)


# ============================================================
# 8. BUILD LSTM MODEL
# ============================================================

model = Sequential(
    [
        LSTM(
            32,
            input_shape=(6, 2),
            return_sequences=False,
        ),

        Dropout(0.2),

        Dense(
            16,
            activation="relu",
        ),

        Dense(1),
    ]
)


model.compile(
    optimizer=tf.keras.optimizers.Adam(
        learning_rate=0.001
    ),

    loss="mse",

    metrics=["mae"],
)


print("\n====================================")
print("LSTM MODEL")
print("====================================")

model.summary()


# ============================================================
# 9. EARLY STOPPING
# ============================================================

early_stopping = EarlyStopping(
    monitor="val_loss",

    patience=15,

    restore_best_weights=True,
)


# ============================================================
# 10. TRAIN LSTM
# ============================================================

print("\n====================================")
print("TRAINING LSTM")
print("====================================")


history = model.fit(
    X_train_scaled,

    y_train_scaled,

    validation_data=(
        X_val_scaled,
        y_val_scaled,
    ),

    epochs=100,

    batch_size=8,

    shuffle=False,

    callbacks=[
        early_stopping
    ],

    verbose=1,
)


# ============================================================
# 11. TEST PREDICTIONS
# ============================================================

print("\n====================================")
print("GENERATING TEST PREDICTIONS")
print("====================================")


predicted_scaled = model.predict(
    X_test_scaled,
    verbose=0,
)


# Convert predictions back to metres

predicted = target_scaler.inverse_transform(
    predicted_scaled
).flatten()


actual = y_test.flatten()


# ============================================================
# 12. CALCULATE METRICS
# ============================================================

mae = mean_absolute_error(
    actual,
    predicted,
)


rmse = np.sqrt(
    mean_squared_error(
        actual,
        predicted,
    )
)


r2 = r2_score(
    actual,
    predicted,
)


print("\n====================================")
print("LSTM TEST RESULTS")
print("====================================")

print(
    f"MAE  : {mae:.4f} m"
)

print(
    f"RMSE : {rmse:.4f} m"
)

print(
    f"R²   : {r2:.4f}"
)

print("====================================")


# ============================================================
# 13. ACTUAL VS PREDICTED
# ============================================================

results = pd.DataFrame(
    {
        "target_timestamp":
            df.iloc[
                validation_end:
            ][
                "target_timestamp"
            ].values,

        "actual_water_level_m":
            actual,

        "predicted_water_level_m":
            predicted,
    }
)


print("\n====================================")
print("ACTUAL VS PREDICTED")
print("====================================")

print(
    results.to_string(
        index=False
    )
)


# ============================================================
# 14. SAVE TEST PREDICTIONS
# ============================================================

results_file = (
    "data/processed/"
    "lstm_test_predictions.csv"
)


results.to_csv(
    results_file,
    index=False,
)


print("\nTest predictions saved to:")

print(
    results_file
)


# ============================================================
# 15. SAVE TRAINED MODEL
# ============================================================

model.save(
    MODEL_FILE
)


print("\nTrained model saved to:")

print(
    MODEL_FILE
)


# ============================================================
# 16. TRAINING SUMMARY
# ============================================================

print("\n====================================")
print("TRAINING COMPLETE")
print("====================================")

print(
    "Input sequence: 6 hours"
)

print(
    "Prediction horizon: next hour"
)

print(
    "Input features: rainfall + water level"
)

print(
    "Training samples:",
    len(X_train)
)

print(
    "Validation samples:",
    len(X_val)
)

print(
    "Test samples:",
    len(X_test)
)

print(
    "Model:",
    MODEL_FILE
)

print(
    "Predictions:",
    results_file
)

print("====================================")