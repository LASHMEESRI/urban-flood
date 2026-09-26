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
# SORT
# ============================================================

df = df.sort_values(
    ["grid_id", "timestamp"]
).reset_index(drop=True)


# ============================================================
# CREATE RAINFALL FEATURES
# ============================================================

print()
print("=" * 70)
print("CALCULATING TIME-AWARE RAINFALL")
print("=" * 70)


# ------------------------------------------------------------
# Previous observations
# ------------------------------------------------------------

df["rainfall_previous_1h"] = (
    df.groupby("grid_id")["rainfall_mm"]
    .shift(1)
)

df["rainfall_previous_3h"] = (
    df.groupby("grid_id")["rainfall_mm"]
    .shift(3)
)


# ============================================================
# TIME-AWARE ROLLING FUNCTION
# ============================================================

def time_rolling_sum(group, hours):

    group = group.sort_values("timestamp").copy()

    group = group.set_index("timestamp")

    result = (
        group["rainfall_mm"]
        .rolling(
            f"{hours}h",
            min_periods=1
        )
        .sum()
    )

    return result.values


# ============================================================
# CALCULATE ROLLING FEATURES
# ============================================================

df["rainfall_3h"] = (
    df.groupby("grid_id", group_keys=False)
    .apply(
        lambda group: pd.Series(
            time_rolling_sum(group, 3),
            index=group.index
        ),
        include_groups=False
    )
    .reset_index(level=0, drop=True)
)


df["rainfall_6h"] = (
    df.groupby("grid_id", group_keys=False)
    .apply(
        lambda group: pd.Series(
            time_rolling_sum(group, 6),
            index=group.index
        ),
        include_groups=False
    )
    .reset_index(level=0, drop=True)
)


df["rainfall_12h"] = (
    df.groupby("grid_id", group_keys=False)
    .apply(
        lambda group: pd.Series(
            time_rolling_sum(group, 12),
            index=group.index
        ),
        include_groups=False
    )
    .reset_index(level=0, drop=True)
)


df["rainfall_24h"] = (
    df.groupby("grid_id", group_keys=False)
    .apply(
        lambda group: pd.Series(
            time_rolling_sum(group, 24),
            index=group.index
        ),
        include_groups=False
    )
    .reset_index(level=0, drop=True)
)


# ============================================================
# FILL INITIAL LAG VALUES
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
# SELECT COLUMNS
# ============================================================

columns = [
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

df = df[columns]


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
print("DATE RANGE:")

print(
    "START:",
    df["timestamp"].min()
)

print(
    "END  :",
    df["timestamp"].max()
)

print()
print("MISSING VALUES:")

print(
    df.isna().sum()
)

print()
print("RAINFALL FEATURES:")

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