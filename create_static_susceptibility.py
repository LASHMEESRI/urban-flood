import pandas as pd
import numpy as np

INPUT = r"E:\urban flood\data\processed\chennai_spatial_features.csv"

OUTPUT = r"E:\urban flood\data\processed\chennai_static_susceptibility.csv"

print("=" * 70)
print("CREATING STATIC FLOOD SUSCEPTIBILITY")
print("=" * 70)

df = pd.read_csv(INPUT)

# ---------------------------------------------------------
# Normalize helper
# ---------------------------------------------------------
def minmax(series):
    minimum = series.min()
    maximum = series.max()

    if maximum == minimum:
        return pd.Series(0.0, index=series.index)

    return (series - minimum) / (maximum - minimum)


# ---------------------------------------------------------
# 1. Elevation susceptibility
# Lower elevation = higher susceptibility
# ---------------------------------------------------------
elevation_norm = minmax(df["elevation_m"])

df["elevation_factor"] = 1 - elevation_norm


# ---------------------------------------------------------
# 2. Slope susceptibility
# Lower slope = higher susceptibility
# ---------------------------------------------------------
slope_norm = minmax(df["slope_degree"])

df["slope_factor"] = 1 - slope_norm


# ---------------------------------------------------------
# 3. Imperviousness
# Higher imperviousness = higher susceptibility
# ---------------------------------------------------------
df["impervious_factor"] = (
    df["imperviousness_percent"] / 100.0
)


# ---------------------------------------------------------
# 4. Historical flood risk
# risk_score is 0–4
# Normalize to 0–1
# ---------------------------------------------------------
df["historical_factor"] = (
    df["risk_score"] / 4.0
)


# ---------------------------------------------------------
# 5. Static susceptibility
#
# Weights:
# Elevation       25%
# Slope           15%
# Imperviousness 25%
# Historical      35%
# ---------------------------------------------------------
df["susceptibility_score"] = (
    0.25 * df["elevation_factor"]
    +
    0.15 * df["slope_factor"]
    +
    0.25 * df["impervious_factor"]
    +
    0.35 * df["historical_factor"]
) * 100


# ---------------------------------------------------------
# 6. Risk category
# ---------------------------------------------------------
def classify(score):

    if score < 25:
        return "LOW"

    elif score < 50:
        return "MODERATE"

    elif score < 75:
        return "HIGH"

    else:
        return "CRITICAL"


df["susceptibility_class"] = (
    df["susceptibility_score"]
    .apply(classify)
)


# ---------------------------------------------------------
# 7. Save
# ---------------------------------------------------------
df.to_csv(
    OUTPUT,
    index=False
)


# ---------------------------------------------------------
# 8. Summary
# ---------------------------------------------------------
print()
print("TOTAL GRID CELLS:", len(df))

print()
print("SUSCEPTIBILITY DISTRIBUTION")
print("=" * 70)

print(
    df["susceptibility_class"]
    .value_counts()
)

print()
print("SUSCEPTIBILITY SCORE")
print("=" * 70)

print(
    df["susceptibility_score"]
    .describe()
)

print()
print("OUTPUT:")
print(OUTPUT)

print()
print("=" * 70)
print("DONE")
print("=" * 70)