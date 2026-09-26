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
print("DYNAMIC 6-HOUR WINDOWS")
print("=" * 70)

windows = []

for i in range(len(data) - 6):
    window = data[i:i+7]

    # Require exactly hourly observations
    valid = True

    for j in range(1, len(window)):
        diff = window[j][0] - window[j-1][0]

        if diff.total_seconds() != 3600:
            valid = False
            break

    if not valid:
        continue

    values = [x[1] for x in window]

    change = max(values) - min(values)

    if change >= 2.0:
        windows.append(
            (
                change,
                window[0][0],
                window[-1][0],
                values
            )
        )

windows.sort(reverse=True)

print("FOUND:", len(windows))
print()

for change, start, end, values in windows[:30]:
    print(
        start.strftime("%d-%m-%Y %H:%M"),
        "->",
        end.strftime("%d-%m-%Y %H:%M"),
        "| range =",
        round(change, 3),
        "| values =",
        [round(v, 3) for v in values]
    )