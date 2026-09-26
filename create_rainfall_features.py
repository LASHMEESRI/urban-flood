import pandas as pd
from pathlib import Path

INPUT = Path("data/processed/chennai_rainfall_hourly.csv")
OUTPUT = Path("data/processed/chennai_rainfall_features.csv")

df = pd.read_csv(INPUT)

df["timestamp"] = pd.to_datetime(
    df["Data Acquisition Time"],
    dayfirst=True,
    errors="coerce",
)

df["rainfall_1hr"] = pd.to_numeric(
    df["rainfall_1hr"],
    errors="coerce",
)

df = df.sort_values(
    ["Station", "timestamp"]
).reset_index(drop=True)

results = []

for station, group in df.groupby("Station"):

    group = group.copy()
    group = group.sort_values("timestamp")

    gap_hours = (
        group["timestamp"].diff().dt.total_seconds() / 3600
    )

    group["continuous_1h"] = gap_hours.eq(1)

    block = (~group["continuous_1h"]).cumsum()

    group["rainfall_3hr"] = (
        group.groupby(block)["rainfall_1hr"]
        .rolling(3, min_periods=3)
        .sum()
        .reset_index(level=0, drop=True)
    )

    group["rainfall_6hr"] = (
        group.groupby(block)["rainfall_1hr"]
        .rolling(6, min_periods=6)
        .sum()
        .reset_index(level=0, drop=True)
    )

    group["station"] = station

    results.append(group)

result = pd.concat(results, ignore_index=True)

result = result[
    [
        "station",
        "Latitude",
        "Longitude",
        "timestamp",
        "rainfall_1hr",
        "rainfall_3hr",
        "rainfall_6hr",
    ]
]

result.to_csv(OUTPUT, index=False)

print("RAINFALL FEATURE DATASET CREATED")
print("Rows:", len(result))
print("Output:", OUTPUT)
print()

print(
    "Valid 1-hour:",
    result["rainfall_1hr"].notna().sum()
)

print(
    "Valid 3-hour:",
    result["rainfall_3hr"].notna().sum()
)

print(
    "Valid 6-hour:",
    result["rainfall_6hr"].notna().sum()
)

print()
print("BY STATION:")

print(
    result.groupby("station")[
        [
            "rainfall_1hr",
            "rainfall_3hr",
            "rainfall_6hr",
        ]
    ].count()
)