import pandas as pd
import numpy as np
import os

INPUT = r"E:\urban flood\data\processed\chennai_temporal_features_clean.csv"

OUTPUT = r"E:\urban flood\data\processed\lstm_clean_sequences.csv"

print("=" * 70)
print("CREATING CLEAN LSTM SEQUENCES")
print("=" * 70)

# ---------------------------------------------------------
# 1. Load data
# ---------------------------------------------------------
df = pd.read_csv(INPUT)

df["timestamp"] = pd.to_datetime(df["timestamp"])

df = df.sort_values("timestamp").reset_index(drop=True)

# ---------------------------------------------------------
# 2. Identify continuous hourly blocks
# ---------------------------------------------------------
df["time_diff"] = df["timestamp"].diff()

df["new_block"] = (
    df["time_diff"] != pd.Timedelta(hours=1)
)

df["block_id"] = df["new_block"].cumsum()

# ---------------------------------------------------------
# 3. Create sequences
# ---------------------------------------------------------
sequences = []

sequence_id = 1

for block_id, block in df.groupby("block_id"):

    block = block.reset_index(drop=True)

    # Need 6 input hours + 1 target hour
    if len(block) < 7:
        continue

    for start in range(len(block) - 6):

        window = block.iloc[start:start + 7]

        # Verify exactly hourly spacing
        diffs = window["timestamp"].diff().dropna()

        if not all(diffs == pd.Timedelta(hours=1)):
            continue

        input_rows = window.iloc[:6]
        target_row = window.iloc[6]

        sequences.append({
            "sequence_id": sequence_id,

            "input_start": input_rows.iloc[0]["timestamp"],
            "input_end": input_rows.iloc[-1]["timestamp"],
            "target_timestamp": target_row["timestamp"],

            "rainfall_sequence":
                "|".join(
                    input_rows["rainfall_mean"].astype(str)
                ),

            "water_level_sequence":
                "|".join(
                    input_rows["water_level"].astype(str)
                ),

            "target_water_level":
                target_row["water_level"]
        })

        sequence_id += 1

# ---------------------------------------------------------
# 4. Convert to DataFrame
# ---------------------------------------------------------
result = pd.DataFrame(sequences)

# ---------------------------------------------------------
# 5. Save
# ---------------------------------------------------------
os.makedirs(
    os.path.dirname(OUTPUT),
    exist_ok=True
)

result.to_csv(
    OUTPUT,
    index=False
)

# ---------------------------------------------------------
# 6. Summary
# ---------------------------------------------------------
print()
print("TOTAL SEQUENCES:", len(result))

print()
print("OUTPUT:")
print(OUTPUT)

print()
print("SAMPLE SEQUENCES")
print("=" * 70)

if len(result) > 0:
    print(
        result.head(10).to_string(index=False)
    )

print()
print("TARGET STATISTICS")
print("=" * 70)

if len(result) > 0:
    print(
        result["target_water_level"].describe()
    )

print()
print("=" * 70)
print("DONE")
print("=" * 70)