import pandas as pd
import json
import os

INPUT = r"E:\urban flood\data\processed\chennai_spatial_features.csv"
OUTPUT = r"E:\urban flood\public\chennai_grid_data.json"

print("=" * 70)
print("CREATING PWA GRID DATA")
print("=" * 70)

print()
print("Reading spatial dataset...")

df = pd.read_csv(INPUT)

print("Input rows:", len(df))

columns = [
    "grid_id",
    "center_lat",
    "center_lon",
    "elevation_m",
    "slope_degree",
    "landcover_class",
    "imperviousness_percent",
    "historical_risk",
    "risk_score"
]

missing = [
    column
    for column in columns
    if column not in df.columns
]

if missing:
    raise ValueError(
        f"Missing columns: {missing}"
    )

df = df[columns]

os.makedirs(
    os.path.dirname(OUTPUT),
    exist_ok=True
)

records = df.to_dict(
    orient="records"
)

with open(
    OUTPUT,
    "w",
    encoding="utf-8"
) as file:
    json.dump(
        records,
        file,
        separators=(",", ":")
    )

print()
print("=" * 70)
print("PWA GRID DATA CREATED")
print("=" * 70)

print()
print("GRID CELLS:", len(records))

print()
print("OUTPUT:")
print(OUTPUT)

print("=" * 70)