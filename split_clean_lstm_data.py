import pandas as pd
import os

INPUT = r"E:\urban flood\data\processed\lstm_clean_sequences.csv"

TRAIN_OUT = r"E:\urban flood\data\processed\lstm_train_clean.csv"
VAL_OUT = r"E:\urban flood\data\processed\lstm_validation_clean.csv"
TEST_OUT = r"E:\urban flood\data\processed\lstm_test_clean.csv"

df = pd.read_csv(INPUT)

df["target_timestamp"] = pd.to_datetime(
    df["target_timestamp"]
)

df = df.sort_values(
    "target_timestamp"
).reset_index(drop=True)

# ---------------------------------------------------------
# Chronological split
# ---------------------------------------------------------
n = len(df)

train_end = int(n * 0.70)
val_end = int(n * 0.85)

train = df.iloc[:train_end].copy()
validation = df.iloc[train_end:val_end].copy()
test = df.iloc[val_end:].copy()

# ---------------------------------------------------------
# Save
# ---------------------------------------------------------
train.to_csv(TRAIN_OUT, index=False)
validation.to_csv(VAL_OUT, index=False)
test.to_csv(TEST_OUT, index=False)

# ---------------------------------------------------------
# Report
# ---------------------------------------------------------
print("=" * 70)
print("CHRONOLOGICAL LSTM SPLIT")
print("=" * 70)

for name, data in [
    ("TRAIN", train),
    ("VALIDATION", validation),
    ("TEST", test)
]:

    print()
    print(name)
    print("-" * 70)

    print("Samples:", len(data))

    print(
        "Start:",
        data["target_timestamp"].min()
    )

    print(
        "End  :",
        data["target_timestamp"].max()
    )

    print(
        "Target min:",
        data["target_water_level"].min()
    )

    print(
        "Target max:",
        data["target_water_level"].max()
    )

    print(
        "Target mean:",
        data["target_water_level"].mean()
    )

    print(
        "Target unique values:",
        data["target_water_level"].nunique()
    )

    print()
    print("Target values:")

    print(
        data["target_water_level"]
        .round(3)
        .value_counts()
        .sort_index()
        .to_string()
    )

print()
print("=" * 70)
print("FILES CREATED")
print("=" * 70)

print(TRAIN_OUT)
print(VAL_OUT)
print(TEST_OUT)

print()
print("=" * 70)
print("DONE")
print("=" * 70)