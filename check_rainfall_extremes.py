import csv

file = r"E:\urban flood\data\processed\chennai_temporal_features.csv"

with open(file, encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

values = []

for row in rows:
    try:
        values.append({
            "timestamp": row["timestamp"],
            "rainfall": float(row["rainfall_mean"])
        })
    except ValueError:
        pass

values.sort(key=lambda x: x["rainfall"], reverse=True)

print("TOP 20 RAINFALL VALUES")
print()

for item in values[:20]:
    print(
        f'{item["timestamp"]} -> '
        f'{item["rainfall"]} mm'
    )
