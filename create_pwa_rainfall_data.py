import pandas as pd
import json
import os

INPUT = r"E:\urban flood\data\processed\chennai_rainfall_combined.csv"
OUTPUT = r"E:\urban flood\public\chennai_rainfall_data.json"

print("=" * 70)
print("CREATING OFFLINE RAINFALL DATA")
print("=" * 70)

df = pd.read_csv(INPUT)

print("Input rows:", len(df))

required_columns = [
    "timestamp",
    "rainfall_mylapore",
    "rainfall_redhills",
    "rainfall_tharamani",
    "rainfall_mean",
]

missing = [
    column
    for column in required_columns
    if column not in df.columns
]

if missing:
    raise ValueError(f"Missing columns: {missing}")

df = df[required_columns]

df = df.where(pd.notnull(df), None)

records = df.to_dict(orient="records")

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

with open(OUTPUT, "w", encoding="utf-8") as file:
    json.dump(records, file, separators=(",", ":"))

print()
print("=" * 70)
print("OFFLINE RAINFALL DATA CREATED")
print("=" * 70)

print("RAINfall RECORDS:", len(records))
print("OUTPUT:")
print(OUTPUT)

print("=" * 70)