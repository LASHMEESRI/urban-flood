import csv

file = r"E:\urban flood\data\raw\water level\rwl_tel_hr_tamil_nadu_sw_gw_27_2021_2025.csv"

with open(file, encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))

rows = [
    row for row in rows
    if row["Station"] == "Nandambakkam CheckDam"
]

rows.sort(
    key=lambda r: r["Data Acquisition Time"]
)

print("TOTAL RAW ROWS:", len(rows))

print("\nLAST 100 RAW OBSERVATIONS")
print("=" * 60)

for row in rows[-100:]:
    print(
        row["Data Acquisition Time"],
        "->",
        row["River Water Level Telemetry Hourly (meter)"]
    )