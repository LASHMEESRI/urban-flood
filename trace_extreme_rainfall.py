import csv

file = r"E:\urban flood\data\processed\chennai_rainfall_combined.csv"

with open(file, encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

timestamps = [
    "02-11-2022 06:00",
    "02-11-2022 05:00",
    "11-03-2025 23:00",
    "12-03-2025 00:00",
]

for timestamp in timestamps:

    matches = [
        row for row in rows
        if row["timestamp"] == timestamp
    ]

    print("\nTIMESTAMP:", timestamp)

    if not matches:
        print("NOT FOUND")
        continue

    row = matches[0]

    print("Mylapore :", row["rainfall_mylapore"])
    print("RedHills :", row["rainfall_redhills"])
    print("Tharamani:", row["rainfall_tharamani"])
    print("Mean     :", row["rainfall_mean"])