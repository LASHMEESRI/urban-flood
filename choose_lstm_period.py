import csv
from datetime import datetime
from collections import defaultdict

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

    # Keep only exact hourly records
    if dt.minute == 0:
        value = float(
            r["River Water Level Telemetry Hourly (meter)"]
        )
        data.append((dt, value))

data.sort()

years = defaultdict(list)

for dt, value in data:
    years[dt.year].append(value)

print("=" * 70)
print("CORRECT YEARLY WATER-LEVEL ANALYSIS")
print("=" * 70)

for year in sorted(years):
    values = years[year]

    print(
        f"{year}: "
        f"rows={len(values):5d} | "
        f"min={min(values):7.3f} | "
        f"max={max(values):7.3f} | "
        f"range={max(values)-min(values):7.3f} | "
        f"unique={len(set(values)):5d}"
    )

print("\n" + "=" * 70)
print("YEARLY CHANGE COUNT")
print("=" * 70)

for year in sorted(years):
    values = years[year]

    changes = 0

    for i in range(1, len(values)):
        if abs(values[i] - values[i-1]) > 0.01:
            changes += 1

    print(
        f"{year}: changes > 0.01 m = {changes}"
    )

print("\n" + "=" * 70)
print("CONTINUOUS DYNAMIC PERIODS")
print("=" * 70)

# Print 10 periods where water level changes significantly
for i in range(1, len(data)):
    dt1, v1 = data[i-1]
    dt2, v2 = data[i]

    if abs(v2 - v1) > 0.5:
        print(
            dt1.strftime("%d-%m-%Y %H:%M"),
            "->",
            dt2.strftime("%d-%m-%Y %H:%M"),
            "|",
            round(v1, 3),
            "->",
            round(v2, 3),
            "| change =",
            round(abs(v2-v1), 3)
        )