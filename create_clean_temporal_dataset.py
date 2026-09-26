import pandas as pd
import os

RAINFALL = r"E:\urban flood\data\processed\chennai_rainfall_combined.csv"

WATER = r"E:\urban flood\data\processed\chennai_waterlevel_quality_checked.csv"

OUTPUT = r"E:\urban flood\data\processed\chennai_temporal_features_clean.csv"

print("=" * 70)
print("CREATING CLEAN TEMPORAL DATASET")
print("=" * 70)

# ---------------------------------------------------------
# 1. Load rainfall
# ---------------------------------------------------------
rain = pd.read_csv(RAINFALL)

rain["timestamp"] = pd.to_datetime(
    rain["timestamp"],
    errors="coerce"
)

# Keep required rainfall column
rain = rain[
    [
        "timestamp",
        "rainfall_mean"
    ]
].copy()

# ---------------------------------------------------------
# 2. Load quality-checked water level
# ---------------------------------------------------------
water = pd.read_csv(WATER)

water["timestamp"] = pd.to_datetime(
    water["timestamp"],
    errors="coerce"
)

# ---------------------------------------------------------
# 3. Keep only valid water-level observations
# ---------------------------------------------------------
water = water[
    water["quality_flag"] == "VALID"
].copy()

water = water[
    [
        "timestamp",
        "water_level",
        "quality_flag"
    ]
].copy()

# ---------------------------------------------------------
# 4. Merge rainfall + water level
# ---------------------------------------------------------
merged = pd.merge(
    rain,
    water,
    on="timestamp",
    how="inner"
)

# ---------------------------------------------------------
# 5. Sort chronologically
# ---------------------------------------------------------
merged = merged.sort_values(
    "timestamp"
).reset_index(drop=True)

# ---------------------------------------------------------
# 6. Check missing values
# ---------------------------------------------------------
print()
print("ROWS AFTER MERGE:", len(merged))

print()
print("MISSING VALUES")
print("=" * 70)
print(merged.isna().sum())

# ---------------------------------------------------------
# 7. Save
# ---------------------------------------------------------
os.makedirs(
    os.path.dirname(OUTPUT),
    exist_ok=True
)

merged.to_csv(
    OUTPUT,
    index=False
)

# ---------------------------------------------------------
# 8. Summary
# ---------------------------------------------------------
print()
print("OUTPUT:")
print(OUTPUT)

print()
print("DATE RANGE:")
print("START:", merged["timestamp"].min())
print("END  :", merged["timestamp"].max())

print()
print("SAMPLE")
print("=" * 70)
print(merged.head(10).to_string(index=False))

print()
print("=" * 70)
print("DONE")
print("=" * 70)