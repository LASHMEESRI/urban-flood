import pandas as pd
import json

INPUT = "data/processed/chennai_rainfall_features.csv"
OUTPUT = "public/chennai_rainfall_features.json"

df = pd.read_csv(INPUT)

df["timestamp"] = pd.to_datetime(df["timestamp"])

stations = {
    "Mylapore": "Chennai Mylapore (DGPOffice)",
    "RedHills": "RedHills",
    "Tharamani": "SGSWRDC Campus (Tharamani site)",
}

records = []

for timestamp, group in df.groupby("timestamp"):

    record = {
        "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S")
    }

    for short_name, station_name in stations.items():

        station = group[group["station"] == station_name]

        if station.empty:
            record[f"{short_name}_1hr"] = None
            record[f"{short_name}_3hr"] = None
            record[f"{short_name}_6hr"] = None
        else:
            row = station.iloc[0]

            record[f"{short_name}_1hr"] = (
                None if pd.isna(row["rainfall_1hr"])
                else float(row["rainfall_1hr"])
            )

            record[f"{short_name}_3hr"] = (
                None if pd.isna(row["rainfall_3hr"])
                else float(row["rainfall_3hr"])
            )

            record[f"{short_name}_6hr"] = (
                None if pd.isna(row["rainfall_6hr"])
                else float(row["rainfall_6hr"])
            )

    records.append(record)

with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(records, f, indent=2, allow_nan=False)

print("PWA RAINFALL FEATURE JSON CREATED")
print("Records:", len(records))
print("Output:", OUTPUT)