import numpy as np
import tensorflow as tf

from pathlib import Path
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping


BASE = Path(r"E:\urban flood\data\processed")


# --------------------------------------------------
# Load data
# --------------------------------------------------

X_train = np.load(BASE / "X_train_robust.npy")
y_train = np.load(BASE / "y_train_robust.npy")

X_val = np.load(BASE / "X_validation_robust.npy")
y_val = np.load(BASE / "y_validation_robust.npy")


print("TRAIN:", X_train.shape)
print("VALIDATION:", X_val.shape)


# --------------------------------------------------
# Build small LSTM
# --------------------------------------------------

model = Sequential([
    LSTM(
        32,
        input_shape=(6, 2)
    ),

    Dropout(0.2),

    Dense(16, activation="relu"),

    Dense(1)
])


model.compile(
    optimizer=tf.keras.optimizers.Adam(
        learning_rate=0.001
    ),
    loss="mse",
    metrics=["mae"]
)


model.summary()


# --------------------------------------------------
# Early stopping
# --------------------------------------------------

early_stopping = EarlyStopping(
    monitor="val_loss",
    patience=15,
    restore_best_weights=True
)


# --------------------------------------------------
# Train
# --------------------------------------------------

history = model.fit(
    X_train,
    y_train,

    validation_data=(
        X_val,
        y_val
    ),

    epochs=100,

    batch_size=16,

    callbacks=[
        early_stopping
    ],

    verbose=1
)


# --------------------------------------------------
# Save model
# --------------------------------------------------

model.save(
    BASE / "urban_flood_lstm.keras"
)


print("\nTRAINING COMPLETE")

print(
    "Model saved:",
    BASE / "urban_flood_lstm.keras"
)

print(
    "Epochs completed:",
    len(history.history["loss"])
)

print(
    "Best validation loss:",
    min(history.history["val_loss"])
)