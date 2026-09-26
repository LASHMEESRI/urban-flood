import pandas as pd

INPUT = r"E:\urban flood\data\processed\lstm_clean_sequences.csv"

df = pd.read_csv(INPUT)

def sequence_range(x):
    values = [float(v) for v in str(x).split("|")]
    return max(values) - min(values)

df["input_range"] = df["water_level_sequence"].apply(sequence_range)

df["target_timestamp"] = pd.to_datetime(
    df["target_timestamp"]
)

df = df.sort_values(
    "target_timestamp"
).reset_index(drop=True)

print("=" * 70)
print("DYNAMIC CLEAN LSTM SEQUENCES")
print("=" * 70)

print()
print("TOTAL SEQUENCES:", len(df))

print()
print("SEQUENCES WITH INPUT RANGE >= 0.5 m")
print("=" * 70)

dynamic = df[df["input_range"] >= 0.5].copy()

print("COUNT:", len(dynamic))

if len(dynamic) > 0:
    print()
    print(
        dynamic[
            [
                "sequence_id",
                "input_start",
                "input_end",
                "target_timestamp",
                "input_range",
                "target_water_level"
            ]
        ].to_string(index=False)
    )

print()
print("=" * 70)
print("DYNAMIC SEQUENCES BY YEAR")
print("=" * 70)

if len(dynamic) > 0:
    print(
        dynamic["target_timestamp"]
        .dt.year
        .value_counts()
        .sort_index()
    )

print()
print("=" * 70)
print("DONE")
print("=" * 70)