import csv
from collections import Counter

FILES = {
    "TRAIN": r"E:\urban flood\data\processed\lstm_train.csv",
    "VALIDATION": r"E:\urban flood\data\processed\lstm_validation.csv",
    "TEST": r"E:\urban flood\data\processed\lstm_test.csv"
}

for name, file in FILES.items():

    with open(file, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    targets = [
        float(row["target_water_level"])
        for row in rows
    ]

    unique = sorted(set(targets))

    print("\n" + name)
    print("=" * 30)

    print("Samples:", len(targets))
    print("Unique target values:", len(unique))
    print("Minimum:", min(targets))
    print("Maximum:", max(targets))

    print("Mean:", sum(targets) / len(targets))

    print("\nFirst 20 target values:")
    print(targets[:20])

    if len(unique) <= 20:
        print("\nAll unique values:")
        print(unique)