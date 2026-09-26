import csv
from collections import Counter

file = r"E:\urban flood\data\raw\water level\rwl_tel_hr_tamil_nadu_sw_gw_27_2021_2025.csv"

with open(file, encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))

rows = [
    r for r in rows
    if r["Station"] == "Nandambakkam CheckDam"
]

rows.sort(key=lambda r: r["Data Acquisition Time"])

print("TOTAL:", len(rows))

# Group by year
years = {}

for r in rows:
    year = r["Data Acquisition Time"][-4:]
    value = float(r["River Water Level Telemetry Hourly (meter)"])

    years.setdefault(year, []).append(value)

print("\nYEARLY WATER LEVEL STATISTICS")
print("=" * 60)

for year, values in years.items():
    print(
        year,
        "| count =", len(values),
        "| min =", min(values),
        "| max =", max(values),
        "| unique =", len(set(values))
    )

# Count exact repeated values
counter = Counter(
    r["River Water Level Telemetry Hourly (meter)"]
    for r in rows
)

print("\nMOST COMMON WATER LEVEL VALUES")
print("=" * 60)

for value, count in counter.most_common(15):
    print(value, "->", count, "observations")

# Monthly statistics
print("\nMONTHLY VARIATION")
print("=" * 60)

months = {}

for r in rows:
    date = r["Data Acquisition Time"]
    year_month = date[-7:]  # MM-YYYY

    value = float(r["River Water Level Telemetry Hourly (meter)"])
    months.setdefault(year_month, []).append(value)

for month, values in months.items():
    print(
        month,
        "| count =", len(values),
        "| min =", round(min(values), 3),
        "| max =", round(max(values), 3),
        "| range =", round(max(values) - min(values), 3)
    )