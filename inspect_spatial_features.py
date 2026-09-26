import pandas as pd
import os

BASE = r"E:\urban flood\data\processed"

FILES = [
    "chennai_grid.csv",
    "chennai_grid_risk.csv",
    "flood_risk_zones.csv",
    "chennai_rainfall_combined.csv",
    "chennai_waterlevel_quality_checked.csv"
]

print("=" * 70)
print("URBAN FLOOD SPATIAL DATA INSPECTION")
print("=" * 70)

for filename in FILES:

    path = os.path.join(BASE, filename)

    print()
    print("=" * 70)
    print(filename)
    print("=" * 70)

    if not os.path.exists(path):
        print("FILE NOT FOUND")
        continue

    df = pd.read_csv(path)

    print("Rows:", len(df))
    print("Columns:")
    
    for column in df.columns:
        print("  -", column)

    print()
    print("Missing values:")

    print(
        df.isna().sum()
        .to_string()
    )

print()
print("=" * 70)
print("DONE")
print("=" * 70)