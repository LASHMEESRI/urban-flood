import csv
from datetime import datetime

FILES = {
    "TRAIN": r"E:\urban flood\data\processed\lstm_train.csv",
    "VALIDATION": r"E:\urban flood\data\processed\lstm_validation.csv",
    "TEST": r"E:\urban flood\data\processed\lstm_test.csv"
}

def parse_time(value):
    return datetime.strptime(value, "%d-%m-%Y %H:%M")

data = {}

for name, file in FILES.items():

    with open(file, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    data[name] = rows

    print(f"\n{name}")
    print("Sequences:", len(rows))

    if rows:
        print("First target:", rows[0]["target_time"])
        print("Last target :", rows[-1]["target_time"])


print("\nBOUNDARY CHECK")

train_last = parse_time(data["TRAIN"][-1]["target_time"])
val_first = parse_time(data["VALIDATION"][0]["target_time"])

val_last = parse_time(data["VALIDATION"][-1]["target_time"])
test_first = parse_time(data["TEST"][0]["target_time"])

print("Train → Validation:", train_last < val_first)
print("Validation → Test:", val_last < test_first)

print("\nRESULT:")
if train_last < val_first and val_last < test_first:
    print("NO TEMPORAL LEAKAGE DETECTED")
else:
    print("CHECK SPLIT")