import pandas as pd
import os

INPUT = r"E:\urban flood\data\raw\water level\rwl_tel_hr_tamil_nadu_sw_gw_27_2021_2025.csv"

OUTPUT = r"E:\urban flood\data\processed\chennai_waterlevel_quality_checked.csv"

print("=" * 70)
print("CREATING QUALITY-CHECKED WATER LEVEL DATASET")
print("=" * 70)

# 1. Read raw dataset
df = pd.read_csv(INPUT)

# 2. Select Nandambakkam CheckDam station
df = df[
    df["Station"].astype(str).str.strip().str.lower()
    == "nandambakkam checkdam"
].copy()

# 3. Convert timestamp
df["timestamp"] = pd.to_datetime(
    df["Data Acquisition Time"],
    dayfirst=True,
    errors="coerce"
)

# 4. Convert water level to numeric
level_col = "River Water Level Telemetry Hourly (meter)"

df["water_level"] = pd.to_numeric(
    df[level_col],
    errors="coerce"
)

# 5. Remove invalid records
df = df.dropna(
    subset=["timestamp", "water_level"]
)

# 6. Keep hourly records only
df = df[
    df["timestamp"].dt.minute == 0
].copy()

# 7. Sort chronologically
df = df.sort_values(
    "timestamp"
).reset_index(drop=True)

# 8. Calculate absolute change from previous observation
df["change_from_previous"] = (
    df["water_level"].diff().abs()
)

# 9. Create quality flag
df["quality_flag"] = "VALID"

df.loc[
    df["change_from_previous"] > 2,
    "quality_flag"
] = "SUSPICIOUS"

# First observation has no previous value
df.loc[
    df["change_from_previous"].isna(),
    "quality_flag"
] = "VALID"

# 10. Select output columns
output = df[
    [
        "timestamp",
        "water_level",
        "change_from_previous",
        "quality_flag"
    ]
].copy()

# 11. Create output folder if needed
os.makedirs(
    os.path.dirname(OUTPUT),
    exist_ok=True
)

# 12. Save quality-checked dataset
output.to_csv(
    OUTPUT,
    index=False
)

# 13. Print summary
print()
print("OUTPUT FILE:")
print(OUTPUT)

print()
print("TOTAL RECORDS:", len(output))

print()
print("QUALITY DISTRIBUTION")
print("=" * 70)
print(
    output["quality_flag"].value_counts()
)

print()
print(
    "SUSPICIOUS RECORDS:",
    (output["quality_flag"] == "SUSPICIOUS").sum()
)

print()
print(
    "MAX CHANGE:",
    output["change_from_previous"].max(),
    "m"
)

print()
print("FIRST 10 SUSPICIOUS RECORDS")
print("=" * 70)

print(
    output[
        output["quality_flag"] == "SUSPICIOUS"
    ].head(10).to_string(index=False)
)

print()
print("=" * 70)
print("DONE")
print("=" * 70)