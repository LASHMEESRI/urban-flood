import csv
from datetime import datetime

INPUT = r"E:\urban flood\data\processed\lstm_training_data.csv"

with open(INPUT, encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

def parse_time(row):
    return datetime.strptime(
        row["target_time"],
        "%d-%m-%Y %H:%M"
    )

rows.sort(key=parse_time)

n = len(rows)

train_end = int(n * 0.70)
val_end = int(n * 0.85)

train = rows[:train_end]
validation = rows[train_end:val_end]
test = rows[val_end:]

print("TOTAL:", n)

print("\nTRAINING:")
print("Rows:", len(train))
print("From:", train[0]["start_time"])
print("To:", train[-1]["target_time"])

print("\nVALIDATION:")
print("Rows:", len(validation))
print("From:", validation[0]["start_time"])
print("To:", validation[-1]["target_time"])

print("\nTEST:")
print("Rows:", len(test))
print("From:", test[0]["start_time"])
print("To:", test[-1]["target_time"])

print("\nCHRONOLOGY CHECK:")

train_last = parse_time(train[-1])
val_first = parse_time(validation[0])
val_last = parse_time(validation[-1])
test_first = parse_time(test[0])

print("Train → Validation:", train_last <= val_first)
print("Validation → Test:", val_last <= test_first)