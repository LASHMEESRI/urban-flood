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
            r["River Water Level Telemetry Hourly (meter)"]
        )
        data.append((dt, value))

data.sort()

print("=" * 70)
print("WATER-LEVEL QUALITY CHECK")
print("=" * 70)

large_changes = []

for i in range(1, len(data)):
    dt1, v1 = data[i - 1]
    dt2, v2 = data[i]

    # Only consecutive hourly observations
    if (dt2 - dt1).total_seconds() != 3600:
        continue

    change = abs(v2 - v1)

    if change > 2:
        large_changes.append(
            (dt1, v1, dt2, v2, change)
        )

print("Changes > 2 m:", len(large_changes))

print("\nFIRST 30 LARGE CHANGES")
print("=" * 70)

for dt1, v1, dt2, v2, change in large_changes[:30]:
    print(
        dt1.strftime("%d-%m-%Y %H:%M"),
        round(v1, 3),
        "->",
        dt2.strftime("%d-%m-%Y %H:%M"),
        round(v2, 3),
        "| change =",
        round(change, 3)
    )

print("\nYEAR DISTRIBUTION")
print("=" * 70)

year_counts = {}

for dt1, v1, dt2, v2, change in large_changes:
    year = dt2.year
    year_counts[year] = year_counts.get(year, 0) + 1

for year in sorted(year_counts):
    print(year, "->", year_counts[year])