import csv
import json
import numpy as np
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler

BASE = Path(r"E:\urban flood\data\processed")

FILES = {
    "train": BASE / "lstm_train.csv",
    "validation": BASE / "lstm_validation.csv",
    "test": BASE / "lstm_test.csv",
}


def load_csv(path):
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def extract_values(rows, column):
    values = []

    for row in rows:
        values.extend(
            float(x)
            for x in row[column].split("|")
        )

    return np.array(values).reshape(-1, 1)


train = load_csv(FILES["train"])
validation = load_csv(FILES["validation"])
test = load_csv(FILES["test"])

print("TRAIN:", len(train))
print("VALIDATION:", len(validation))
print("TEST:", len(test))


# --------------------------------------------------
# Fit scalers ONLY on training data
# --------------------------------------------------

rainfall_scaler = MinMaxScaler()
water_scaler = MinMaxScaler()

rainfall_scaler.fit(
    extract_values(train, "rainfall_mean")
)

water_scaler.fit(
    extract_values(train, "water_level")
)


# --------------------------------------------------
# Save scaler parameters
# --------------------------------------------------

scalers = {
    "rainfall_min": float(rainfall_scaler.data_min_[0]),
    "rainfall_max": float(rainfall_scaler.data_max_[0]),
    "water_level_min": float(water_scaler.data_min_[0]),
    "water_level_max": float(water_scaler.data_max_[0]),
}

with open(
    BASE / "lstm_scalers.json",
    "w",
    encoding="utf-8"
) as f:
    json.dump(scalers, f, indent=2)


# --------------------------------------------------
# Convert each sequence
# --------------------------------------------------

def transform_rows(rows):

    X = []
    y = []

    for row in rows:

        rainfall = np.array(
            [float(x) for x in row["rainfall_mean"].split("|")]
        ).reshape(-1, 1)

        water = np.array(
            [float(x) for x in row["water_level"].split("|")]
        ).reshape(-1, 1)

        target = float(row["target_water_level"])

        rainfall_scaled = rainfall_scaler.transform(rainfall)
        water_scaled = water_scaler.transform(water)
        target_scaled = water_scaler.transform(
            np.array([[target]])
        )[0, 0]

        sequence = np.concatenate(
            [rainfall_scaled, water_scaled],
            axis=1
        )

        X.append(sequence.tolist())
        y.append(float(target_scaled))

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


X_train, y_train = transform_rows(train)
X_val, y_val = transform_rows(validation)
X_test, y_test = transform_rows(test)


# --------------------------------------------------
# Save NumPy arrays
# --------------------------------------------------

np.save(BASE / "X_train.npy", X_train)
np.save(BASE / "y_train.npy", y_train)

np.save(BASE / "X_validation.npy", X_val)
np.save(BASE / "y_validation.npy", y_val)

np.save(BASE / "X_test.npy", X_test)
np.save(BASE / "y_test.npy", y_test)


print("\nSHAPES")

print("X_train:", X_train.shape)
print("y_train:", y_train.shape)

print("X_validation:", X_val.shape)
print("y_validation:", y_val.shape)

print("X_test:", X_test.shape)
print("y_test:", y_test.shape)

print("\nSCALERS")
print(json.dumps(scalers, indent=2))

print("\nFILES CREATED:")
print(BASE / "X_train.npy")
print(BASE / "y_train.npy")
print(BASE / "X_validation.npy")
print(BASE / "y_validation.npy")
print(BASE / "X_test.npy")
print(BASE / "y_test.npy")
print(BASE / "lstm_scalers.json")