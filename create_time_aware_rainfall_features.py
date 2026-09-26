import pandas as pd

INPUT = r"E:\urban flood\data\processed\chennai_rainfall_grid.csv"

OUTPUT = r"E:\urban flood\data\processed\chennai_time_aware_rainfall.csv"


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 70)
print("TIME-AWARE RAINFALL FEATURE CREATION")
print("=" * 70)

df = pd.read_csv(INPUT)

df["timestamp"] = pd.to_datetime(df["timestamp"])

print()
print("INPUT ROWS:", len(df))
print("GRID CELLS:", df["grid_id"].nunique())
print("TIMESTAMPS:", df["timestamp"].nunique())


# ============================================================
# SORT DATA
# ============================================================

df = df.sort_values(
    ["grid_id", "timestamp"]
).reset_index(drop=True)


# ============================================================
# PREVIOUS RAINFALL FEATURES
# ============================================================

print()
print("=" * 70)
print("CREATING RAINFALL FEATURES")
print("=" * 70)

df["rainfall_previous_1h"] = (
    df.groupby("grid_id")["rainfall_mm"]
    .shift(1)
)

df["rainfall_previous_3h"] = (
    df.groupby("grid_id")["rainfall_mm"]
    .shift(3)
)


# ============================================================
# TIME-AWARE ROLLING RAINFALL
# ============================================================

def calculate_time_rolling(group, hours):

    group = group.sort_values("timestamp")

    rainfall = group.set_index(
        "timestamp"
    )["rainfall_mm"]

    result = rainfall.rolling(
        f"{hours}h",
        min_periods=1
    ).sum()

    return pd.Series(
        result.to_numpy(),
        index=group.index
    )


# ============================================================
# 3-HOUR RAINFALL
# ============================================================

print("Calculating 3-hour rainfall...")

df["rainfall_3h"] = (
    df.groupby("grid_id", group_keys=False)
    .apply(
        lambda group:
        calculate_time_rolling(group, 3)
    )
    .reset_index(level=0, drop=True)
)


# ============================================================
# 6-HOUR RAINFALL
# ============================================================

print("Calculating 6-hour rainfall...")

df["rainfall_6h"] = (
    df.groupby("grid_id", group_keys=False)
    .apply(
        lambda group:
        calculate_time_rolling(group, 6)
    )
    .reset_index(level=0, drop=True)
)


# ============================================================
# 12-HOUR RAINFALL
# ============================================================

print("Calculating 12-hour rainfall...")

df["rainfall_12h"] = (
    df.groupby("grid_id", group_keys=False)
    .apply(
        lambda group:
        calculate_time_rolling(group, 12)
    )
    .reset_index(level=0, drop=True)
)


# ============================================================
# 24-HOUR RAINFALL
# ============================================================

print("Calculating 24-hour rainfall...")

df["rainfall_24h"] = (
    df.groupby("grid_id", group_keys=False)
    .apply(
        lambda group:
        calculate_time_rolling(group, 24)
    )
    .reset_index(level=0, drop=True)
)


# ============================================================
# FILL INITIAL PREVIOUS VALUES
# ============================================================

df["rainfall_previous_1h"] = (
    df["rainfall_previous_1h"]
    .fillna(0)
)

df["rainfall_previous_3h"] = (
    df["rainfall_previous_3h"]
    .fillna(0)
)


# ============================================================
# SORT FINAL DATA
# ============================================================

df = df.sort_values(
    ["timestamp", "grid_id"]
).reset_index(drop=True)


# ============================================================
# SELECT FINAL COLUMNS
# ============================================================

final_columns = [
    "timestamp",
    "grid_id",
    "rainfall_mm",
    "rainfall_previous_1h",
    "rainfall_previous_3h",
    "rainfall_3h",
    "rainfall_6h",
    "rainfall_12h",
    "rainfall_24h"
]

df = df[final_columns]


# ============================================================
# FINAL CHECK
# ============================================================

print()
print("=" * 70)
print("FINAL CHECK")
print("=" * 70)

print()
print("TOTAL ROWS:", len(df))

print(
    "UNIQUE GRID CELLS:",
    df["grid_id"].nunique()
)

print(
    "UNIQUE TIMESTAMPS:",
    df["timestamp"].nunique()
)

print()
print("DATE RANGE")

print(
    "START:",
    df["timestamp"].min()
)

print(
    "END  :",
    df["timestamp"].max()
)

print()
print("MISSING VALUES")

print(
    df.isna().sum()
)

print()
print("RAINFALL STATISTICS")

print(
    df[
        [
            "rainfall_mm",
            "rainfall_3h",
            "rainfall_6h",
            "rainfall_12h",
            "rainfall_24h"
        ]
    ].describe()
)


# ============================================================
# SAVE
# ============================================================

df.to_csv(
    OUTPUT,
    index=False
)

print()
print("=" * 70)
print("TIME-AWARE RAINFALL DATASET CREATED")
print("=" * 70)

print()
print("OUTPUT:")
print(OUTPUT)

print("=" * 70)