import pandas as pd

INPUT = r"E:\urban flood\data\processed\chennai_rainfall_combined.csv"

df = pd.read_csv(INPUT)

df["timestamp"] = pd.to_datetime(df["timestamp"], dayfirst=True)
print("=" * 70)
print("RAINFALL DATA CHECK")
print("=" * 70)

print()
print("TOTAL ROWS:", len(df))

print()
print("DATE RANGE")
print("START:", df["timestamp"].min())
print("END  :", df["timestamp"].max())

print()
print("COLUMNS")
print(df.columns.tolist())

print()
print("MISSING VALUES")
print(df.isna().sum())

print()
print("RAINFALL STATISTICS")
print("=" * 70)

for col in [
    "rainfall_mylapore",
    "rainfall_redhills",
    "rainfall_tharamani",
    "rainfall_mean"
]:

    print()
    print(col)

    print(df[col].describe())

print()
print("=" * 70)
print("DONE")
print("=" * 70)