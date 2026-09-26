import csv

INPUT = r"E:\urban flood\data\processed\lstm_sequences.csv"
OUTPUT = r"E:\urban flood\data\processed\lstm_training_data.csv"

with open(INPUT, encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

output_rows = []

for row in rows:
    rainfall = row["rainfall_mean"].split("|")
    water = row["water_level"].split("|")

    if len(rainfall) != 6 or len(water) != 6:
        continue

    try:
        rainfall = [float(x) for x in rainfall]
        water = [float(x) for x in water]
        target = float(row["target_water_level"])
    except ValueError:
        continue

    output_rows.append({
        "sequence_id": row["sequence_id"],
        "start_time": row["start_time"],
        "end_time": row["end_time"],
        "target_time": row["target_time"],
        "rainfall_mean": "|".join(map(str, rainfall)),
        "water_level": "|".join(map(str, water)),
        "target_water_level": target
    })

fields = [
    "sequence_id",
    "start_time",
    "end_time",
    "target_time",
    "rainfall_mean",
    "water_level",
    "target_water_level"
]

with open(OUTPUT, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(output_rows)

print("INPUT SEQUENCES:", len(rows))
print("CLEAN SEQUENCES:", len(output_rows))
print("OUTPUT:", OUTPUT)