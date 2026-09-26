import csv
from datetime import datetime, timedelta

INPUT = r"E:\urban flood\data\processed\chennai_temporal_features.csv"

TRAIN_OUT = r"E:\urban flood\data\processed\lstm_train.csv"
VAL_OUT = r"E:\urban flood\data\processed\lstm_validation.csv"
TEST_OUT = r"E:\urban flood\data\processed\lstm_test.csv"

SEQUENCE_LENGTH = 6


def parse_time(value):
    return datetime.strptime(value, "%d-%m-%Y %H:%M")


# --------------------------------------------------
# Load original temporal data
# --------------------------------------------------

with open(INPUT, encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

rows.sort(key=lambda r: parse_time(r["timestamp"]))

# --------------------------------------------------
# Keep only rows with valid required values
# --------------------------------------------------

clean_rows = []

for row in rows:
    try:
        rainfall = float(row["rainfall_mean"])
        water = float(row["water_level"])

        clean_rows.append({
            "timestamp": row["timestamp"],
            "rainfall_mean": rainfall,
            "water_level": water
        })

    except (ValueError, TypeError):
        continue


# --------------------------------------------------
# Split by DATE first
# --------------------------------------------------

n = len(clean_rows)

train_end = int(n * 0.70)
val_end = int(n * 0.85)

train_rows = clean_rows[:train_end]
val_rows = clean_rows[train_end:val_end]
test_rows = clean_rows[val_end:]


# --------------------------------------------------
# Create sequences only inside each split
# --------------------------------------------------

def create_sequences(data):

    sequences = []

    if len(data) < SEQUENCE_LENGTH + 1:
        return sequences

    # Break again whenever hourly continuity is lost
    runs = []
    current = [data[0]]

    for row in data[1:]:

        previous_time = parse_time(current[-1]["timestamp"])
        current_time = parse_time(row["timestamp"])

        if current_time - previous_time == timedelta(hours=1):
            current.append(row)
        else:
            runs.append(current)
            current = [row]

    runs.append(current)

    sequence_id = 1

    for run in runs:

        if len(run) < SEQUENCE_LENGTH + 1:
            continue

        for i in range(len(run) - SEQUENCE_LENGTH):

            input_rows = run[i:i + SEQUENCE_LENGTH]
            target = run[i + SEQUENCE_LENGTH]

            sequences.append({
                "sequence_id": sequence_id,
                "start_time": input_rows[0]["timestamp"],
                "end_time": input_rows[-1]["timestamp"],
                "target_time": target["timestamp"],

                "rainfall_mean": "|".join(
                    str(row["rainfall_mean"])
                    for row in input_rows
                ),

                "water_level": "|".join(
                    str(row["water_level"])
                    for row in input_rows
                ),

                "target_water_level": target["water_level"]
            })

            sequence_id += 1

    return sequences


train_sequences = create_sequences(train_rows)
val_sequences = create_sequences(val_rows)
test_sequences = create_sequences(test_rows)


# --------------------------------------------------
# Save
# --------------------------------------------------

fields = [
    "sequence_id",
    "start_time",
    "end_time",
    "target_time",
    "rainfall_mean",
    "water_level",
    "target_water_level"
]


def save_csv(filename, data):

    with open(filename, "w", newline="", encoding="utf-8") as f:

        writer = csv.DictWriter(
            f,
            fieldnames=fields
        )

        writer.writeheader()
        writer.writerows(data)


save_csv(TRAIN_OUT, train_sequences)
save_csv(VAL_OUT, val_sequences)
save_csv(TEST_OUT, test_sequences)


# --------------------------------------------------
# Report
# --------------------------------------------------

print("ORIGINAL ROWS:", len(rows))
print("CLEAN ROWS:", len(clean_rows))

print()
print("RAW ROW SPLIT")
print("TRAIN:", len(train_rows))
print("VALIDATION:", len(val_rows))
print("TEST:", len(test_rows))

print()
print("FINAL LSTM SEQUENCES")
print("TRAIN:", len(train_sequences))
print("VALIDATION:", len(val_sequences))
print("TEST:", len(test_sequences))

print()
print("TRAIN PERIOD:")
if train_sequences:
    print(train_sequences[0]["start_time"], "→",
          train_sequences[-1]["target_time"])

print()
print("VALIDATION PERIOD:")
if val_sequences:
    print(val_sequences[0]["start_time"], "→",
          val_sequences[-1]["target_time"])

print()
print("TEST PERIOD:")
if test_sequences:
    print(test_sequences[0]["start_time"], "→",
          test_sequences[-1]["target_time"])

print()
print("FILES CREATED:")
print(TRAIN_OUT)
print(VAL_OUT)
print(TEST_OUT)