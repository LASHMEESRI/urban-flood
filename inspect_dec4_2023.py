import csv
from datetime import datetime

file = r"E:\urban flood\data\raw\water level\rwl_tel_hr_tamil_nadu_sw_gw_27_2021_2025.csv"

with open(file, encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))

rows = [
    r for r in rows
    if r["Station"] == "Nandambakkam CheckDam"
]

data = []

for r in rows:
    dt = datetime.strptime(
        r["Data Acquisition Time"],
        "%d-%m-%Y %H:%M"
    )

    if dt.minute == 0:
        value = float(
            r["River Water Level Telemetry Hourly (meter)"
        ])

        data.append((dt, value))

data.sort()

print("=" * 70)
print("DECEMBER 4–5, 2023 EVENT")
print("=" * 70)

for dt, value in data:
    if datetime(2023, 12, 4, 0) <= dt <= datetime(2023, 12, 5, 23):
        print(
            dt.strftime("%d-%m-%Y %H:%M"),
            "->",
            value
        )