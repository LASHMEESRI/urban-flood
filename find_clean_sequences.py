import pandas as pd

INPUT = r"E:\urban flood\data\processed\chennai_temporal_features_clean.csv"

df = pd.read_csv(INPUT)

df["timestamp"] = pd.to_datetime(df["timestamp"])

df = df.sort_values("timestamp").reset_index(drop=True)

# Difference between consecutive timestamps
df["time_diff"] = df["timestamp"].diff()

# A new continuous block starts whenever the gap is not exactly 1 hour
df["new_block"] = (
    df["time_diff"] != pd.Timedelta(hours=1)
)

# Assign block numbers
df["block_id"] = df["new_block"].cumsum()

# Block sizes
blocks = (
    df.groupby("block_id")
    .agg(
        start=("timestamp", "min"),
        end=("timestamp", "max"),
        rows=("timestamp", "count")
    )
    .reset_index()
)

print("=" * 70)
print("CLEAN CONTINUOUS WATER-LEVEL SEQUENCE CHECK")
print("=" * 70)

print()
print("TOTAL CLEAN ROWS:", len(df))

print()
print("TOTAL CONTINUOUS BLOCKS:", len(blocks))

print()
print("BLOCKS WITH >= 7 HOURLY RECORDS")
print("=" * 70)

valid_blocks = blocks[blocks["rows"] >= 7]

print(valid_blocks.to_string(index=False))

print()
print("=" * 70)
print("SUMMARY")
print("=" * 70)

print("Blocks >= 7 hours:", len(valid_blocks))

print(
    "Potential 6-hour-input + 1-hour-target sequences:",
    sum(valid_blocks["rows"] - 6)
)

print()
print("LONGEST BLOCK:")

if len(blocks) > 0:
    longest = blocks.loc[blocks["rows"].idxmax()]
    print(
        "Start :", longest["start"]
    )
    print(
        "End   :", longest["end"]
    )
    print(
        "Rows  :", longest["rows"]
    )

print()
print("=" * 70)
print("DONE")
print("=" * 70)