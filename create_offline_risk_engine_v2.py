import pandas as pd

# ============================================================
# INPUT FILES
# ============================================================

RAIN_INPUT = r"E:\urban flood\data\processed\chennai_time_aware_rainfall.csv"

SPATIAL_INPUT = r"E:\urban flood\data\processed\chennai_spatial_features.csv"

OUTPUT = r"E:\urban flood\data\processed\chennai_offline_risk_dataset_v2.csv"


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 70)
print("OFFLINE FLOOD RISK ENGINE V2")
print("=" * 70)

print()
print("Loading time-aware rainfall data...")

rain = pd.read_csv(RAIN_INPUT)

print("Loading spatial data...")

spatial = pd.read_csv(SPATIAL_INPUT)

rain["timestamp"] = pd.to_datetime(
    rain["timestamp"]
)


# ============================================================
# BASIC CHECK
# ============================================================

print()
print("=" * 70)
print("INPUT CHECK")
print("=" * 70)

print()
print("Rainfall rows:", len(rain))

print(
    "Rainfall grid cells:",
    rain["grid_id"].nunique()
)

print(
    "Rainfall timestamps:",
    rain["timestamp"].nunique()
)

print()
print("Spatial rows:", len(spatial))


# ============================================================
# REQUIRED COLUMNS
# ============================================================

rain_columns = [
    "timestamp",
    "grid_id",
    "rainfall_mm",
    "rainfall_previous_1h",
    "rainfall_previous_3h",
    "rainfall_3h",
    "rainfall_6h",
    "rainfall_12h",
    "rainfall_24h"
]

spatial_columns = [
    "grid_id",
    "center_lat",
    "center_lon",
    "elevation_m",
    "slope_degree",
    "landcover_class",
    "imperviousness_percent",
    "historical_risk",
    "risk_score"
]

for column in rain_columns:

    if column not in rain.columns:

        raise ValueError(
            f"Missing rainfall column: {column}"
        )


for column in spatial_columns:

    if column not in spatial.columns:

        raise ValueError(
            f"Missing spatial column: {column}"
        )


# ============================================================
# MERGE
# ============================================================

print()
print("=" * 70)
print("MERGING DATA")
print("=" * 70)

df = rain.merge(
    spatial,
    on="grid_id",
    how="left",
    validate="many_to_one"
)

print()
print("Merged rows:", len(df))


# ============================================================
# CHECK SPATIAL VALUES
# ============================================================

spatial_check_columns = [
    "center_lat",
    "center_lon",
    "elevation_m",
    "slope_degree",
    "landcover_class",
    "imperviousness_percent",
    "historical_risk",
    "risk_score"
]

missing = (
    df[spatial_check_columns]
    .isna()
    .sum()
)

print()
print("MISSING SPATIAL VALUES:")
print(missing)

if missing.sum() > 0:

    raise ValueError(
        "Missing spatial values found after merge."
    )


# ============================================================
# NORMALIZATION FUNCTION
# ============================================================

def minmax(series):

    minimum = series.min()

    maximum = series.max()

    if maximum == minimum:

        return pd.Series(
            0.0,
            index=series.index
        )

    return (
        (series - minimum)
        / (maximum - minimum)
    )


# ============================================================
# DYNAMIC RAINFALL SCORE
# ============================================================

print()
print("=" * 70)
print("CALCULATING DYNAMIC RAINFALL SCORE")
print("=" * 70)


rain_3h_score = minmax(
    df["rainfall_3h"]
)

rain_6h_score = minmax(
    df["rainfall_6h"]
)

rain_12h_score = minmax(
    df["rainfall_12h"]
)

rain_24h_score = minmax(
    df["rainfall_24h"]
)


# Recent rainfall gets higher weight.

df["dynamic_rainfall_score"] = (

    0.40 * rain_3h_score

    + 0.30 * rain_6h_score

    + 0.20 * rain_12h_score

    + 0.10 * rain_24h_score
)


# ============================================================
# STATIC SUSCEPTIBILITY
# ============================================================

print()
print("=" * 70)
print("CALCULATING STATIC SUSCEPTIBILITY")
print("=" * 70)


# Lower elevation = higher susceptibility

elevation_score = (
    1 - minmax(df["elevation_m"])
)


# Lower slope = higher susceptibility

slope_score = (
    1 - minmax(df["slope_degree"])
)


# Higher imperviousness = higher susceptibility

imperviousness_score = (
    df["imperviousness_percent"] / 100
)


# Higher historical flood category = higher susceptibility

historical_score = (
    df["risk_score"] / 4
)


# Prototype static susceptibility

df["static_susceptibility_score"] = (

    0.25 * elevation_score

    + 0.15 * slope_score

    + 0.25 * imperviousness_score

    + 0.35 * historical_score
)


# ============================================================
# COMBINED RISK SCORE
# ============================================================

print()
print("=" * 70)
print("CALCULATING FLOOD RISK")
print("=" * 70)


df["flood_risk_score"] = (

    0.55 * df["dynamic_rainfall_score"]

    + 0.45 * df["static_susceptibility_score"]
) * 100


# ============================================================
# RISK CATEGORY
# ============================================================

def get_risk_category(score):

    if score < 25:

        return "LOW"

    elif score < 50:

        return "MODERATE"

    elif score < 75:

        return "HIGH"

    else:

        return "CRITICAL"


df["risk_category"] = (
    df["flood_risk_score"]
    .apply(get_risk_category)
)


# ============================================================
# ALERT LEVEL
# ============================================================

def get_alert_level(category):

    if category == "CRITICAL":

        return "IMMEDIATE"

    elif category == "HIGH":

        return "WARNING"

    elif category == "MODERATE":

        return "WATCH"

    else:

        return "NORMAL"


df["alert_level"] = (
    df["risk_category"]
    .apply(get_alert_level)
)


# ============================================================
# SORT
# ============================================================

df = df.sort_values(
    ["timestamp", "grid_id"]
).reset_index(drop=True)


# ============================================================
# FINAL COLUMNS
# ============================================================

final_columns = [

    "timestamp",

    "grid_id",

    "center_lat",

    "center_lon",

    # Current rainfall
    "rainfall_mm",

    # Rainfall history
    "rainfall_previous_1h",

    "rainfall_previous_3h",

    # Time-aware rainfall accumulation
    "rainfall_3h",

    "rainfall_6h",

    "rainfall_12h",

    "rainfall_24h",

    # Terrain
    "elevation_m",

    "slope_degree",

    # Land characteristics
    "landcover_class",

    "imperviousness_percent",

    # Historical flood information
    "historical_risk",

    "risk_score",

    # Model scores
    "dynamic_rainfall_score",

    "static_susceptibility_score",

    "flood_risk_score",

    "risk_category",

    "alert_level"
]

df = df[final_columns]


# ============================================================
# FINAL QUALITY CHECK
# ============================================================

print()
print("=" * 70)
print("FINAL QUALITY CHECK")
print("=" * 70)

print()
print("TOTAL ROWS:", len(df))

print(
    "UNIQUE GRID CELLS:",
    df["grid_id"].nunique()
)

print(
    "UNIQUE TIMESTAMPS:",
    df["timestamp"].nunique()
)

print()
print("DATE RANGE")

print(
    "START:",
    df["timestamp"].min()
)

print(
    "END:",
    df["timestamp"].max()
)

print()
print("MISSING VALUES")

print(
    df.isna().sum()
)


# ============================================================
# RISK DISTRIBUTION
# ============================================================

print()
print("=" * 70)
print("RISK CATEGORY DISTRIBUTION")
print("=" * 70)

print(
    df["risk_category"]
    .value_counts()
    .sort_index()
)


# ============================================================
# RISK SCORE STATISTICS
# ============================================================

print()
print("=" * 70)
print("RISK SCORE STATISTICS")
print("=" * 70)

print(
    df["flood_risk_score"]
    .describe()
)


# ============================================================
# SAVE
# ============================================================

print()
print("=" * 70)
print("SAVING DATASET")
print("=" * 70)

df.to_csv(
    OUTPUT,
    index=False
)

print()
print("OUTPUT:")
print(OUTPUT)

print()
print("=" * 70)
print("OFFLINE FLOOD RISK ENGINE V2 COMPLETE")
print("=" * 70)