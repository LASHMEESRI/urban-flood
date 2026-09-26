import csv
import json
import numpy as np

from pathlib import Path
from sklearn.preprocessing import StandardScaler

BASE = Path(r"E:\urban flood\data\processed")

FILES = {
    "train": BASE / "lstm_train.csv",
    "validation": BASE / "lstm_validation.csv",
    "test": BASE / "lstm_test.csv",
}


def load_csv(path):
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


train = load_csv(FILES["train"])
validation = load_csv(FILES["validation"])
test = load_csv(FILES["test"])

print("TRAIN:", len(train))
print("VALIDATION:", len(validation))
print("TEST:", len(test))


# --------------------------------------------------
# Fit scalers ONLY on training data
# --------------------------------------------------

rainfall_scaler = StandardScaler()
water_scaler = StandardScaler()


train_rainfall = []

train_water = []

for row in train:

    rainfall_values = [
        float(x)
        for x in row["rainfall_mean"].split("|")
    ]

    water_values = [
        float(x)
        for x in row["water_level"].split("|")
    ]

    # Log transform rainfall
    rainfall_values = np.log1p(
        np.array(rainfall_values)
    )

    train_rainfall.extend(rainfall_values)
    train_water.extend(water_values)


train_rainfall = np.array(
    train_rainfall
).reshape(-1, 1)

train_water = np.array(
    train_water
).reshape(-1, 1)


rainfall_scaler.fit(train_rainfall)
water_scaler.fit(train_water)


# --------------------------------------------------
# Transform sequences
# --------------------------------------------------

def transform_rows(rows):

    X = []
    y = []

    for row in rows:

        rainfall = np.array([
            float(x)
            for x in row["rainfall_mean"].split("|")
        ])

        water = np.array([
            float(x)
            for x in row["water_level"].split("|")
        ])

        target = float(
            row["target_water_level"]
        )

        # Log transform rainfall
        rainfall_log = np.log1p(rainfall)

        # Scale
        rainfall_scaled = rainfall_scaler.transform(
            rainfall_log.reshape(-1, 1)
        ).flatten()

        water_scaled = water_scaler.transform(
            water.reshape(-1, 1)
        ).flatten()

        target_scaled = water_scaler.transform(
            np.array([[target]])
        )[0, 0]

        sequence = np.column_stack([
            rainfall_scaled,
            water_scaled
        ])

        X.append(sequence)
        y.append(target_scaled)

    return (
        np.array(X, dtype=np.float32),
        np.array(y, dtype=np.float32)
    )


X_train, y_train = transform_rows(train)
X_val, y_val = transform_rows(validation)
X_test, y_test = transform_rows(test)


# --------------------------------------------------
# Save arrays
# --------------------------------------------------

np.save(BASE / "X_train_robust.npy", X_train)
np.save(BASE / "y_train_robust.npy", y_train)

np.save(BASE / "X_validation_robust.npy", X_val)
np.save(BASE / "y_validation_robust.npy", y_val)

np.save(BASE / "X_test_robust.npy", X_test)
np.save(BASE / "y_test_robust.npy", y_test)


# --------------------------------------------------
# Save scaler information
# --------------------------------------------------

scaler_info = {
    "rainfall_transform": "log1p",
    "rainfall_mean": float(rainfall_scaler.mean_[0]),
    "rainfall_std": float(rainfall_scaler.scale_[0]),
    "water_level_mean": float(water_scaler.mean_[0]),
    "water_level_std": float(water_scaler.scale_[0])
}

with open(
    BASE / "lstm_robust_scalers.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        scaler_info,
        f,
        indent=2
    )


# --------------------------------------------------
# Print result
# --------------------------------------------------

print("\nSHAPES")

print("X_train:", X_train.shape)
print("y_train:", y_train.shape)

print("X_validation:", X_val.shape)
print("y_validation:", y_val.shape)

print("X_test:", X_test.shape)
print("y_test:", y_test.shape)

print("\nSCALER INFORMATION")

print(json.dumps(
    scaler_info,
    indent=2
))

print("\nFILES CREATED")

print(BASE / "X_train_robust.npy")
print(BASE / "y_train_robust.npy")
print(BASE / "X_validation_robust.npy")
print(BASE / "y_validation_robust.npy")
print(BASE / "X_test_robust.npy")
print(BASE / "y_test_robust.npy")
print(BASE / "lstm_robust_scalers.json")