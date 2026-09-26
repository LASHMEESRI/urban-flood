import pandas as pd

INPUT = r"E:\urban flood\data\processed\lstm_clean_sequences.csv"

df = pd.read_csv(INPUT)

df["target_timestamp"] = pd.to_datetime(
    df["target_timestamp"]
)

df = df.sort_values(
    "target_timestamp"
).reset_index(drop=True)

print("=" * 70)
print("CLEAN LSTM SEQUENCE DISTRIBUTION")
print("=" * 70)

print()
print("TOTAL SEQUENCES:", len(df))

print()
print("DATE RANGE")
print("=" * 70)
print("START:", df["target_timestamp"].min())
print("END  :", df["target_timestamp"].max())

print()
print("SEQUENCES BY YEAR")
print("=" * 70)

print(
    df["target_timestamp"]
    .dt.year
    .value_counts()
    .sort_index()
)

print()
print("TARGET WATER-LEVEL DISTRIBUTION")
print("=" * 70)

print(
    df["target_water_level"]
    .describe()
)

print()
print("TARGET VALUE COUNTS")
print("=" * 70)

print(
    df["target_water_level"]
    .round(3)
    .value_counts()
    .head(20)
)

print()
print("ALL SEQUENCES IN CHRONOLOGICAL ORDER")
print("=" * 70)

print(
    df[
        [
            "sequence_id",
            "input_start",
            "input_end",
            "target_timestamp",
            "target_water_level"
        ]
    ].to_string(index=False)
)

print()
print("=" * 70)
print("DONE")
print("=" * 70)