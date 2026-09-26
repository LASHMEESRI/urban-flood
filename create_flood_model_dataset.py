import pandas as pd

RAIN_INPUT = r"E:\urban flood\data\processed\chennai_rainfall_grid.csv"
SPATIAL_INPUT = r"E:\urban flood\data\processed\chennai_spatial_features.csv"
OUTPUT = r"E:\urban flood\data\processed\chennai_flood_model_dataset.csv"

print("=" * 70)
print("LOADING DATA")
print("=" * 70)

rain = pd.read_csv(RAIN_INPUT)
spatial = pd.read_csv(SPATIAL_INPUT)

print("Rainfall rows:", len(rain))
print("Spatial rows :", len(spatial))

rain["timestamp"] = pd.to_datetime(rain["timestamp"])

print()
print("=" * 70)
print("MERGING DATA")
print("=" * 70)

model = rain.merge(
    spatial,
    on="grid_id",
    how="left",
    validate="many_to_one"
)

print("Merged rows:", len(model))

required_columns = [
    "center_lat",
    "center_lon",
    "elevation_m",
    "slope_degree",
    "landcover_class",
    "imperviousness_percent",
    "historical_risk",
    "risk_score"
]

missing = model[required_columns].isna().sum()

print()
print("MISSING SPATIAL VALUES:")
print(missing)

if missing.sum() > 0:
    raise ValueError("Missing spatial values found.")

print()
print("=" * 70)
print("CREATING RAINFALL FEATURES")
print("=" * 70)

model = model.sort_values(
    ["grid_id", "timestamp"]
).reset_index(drop=True)

grouped = model.groupby("grid_id")["rainfall_mm"]

model["rainfall_previous_1h"] = grouped.shift(1)
model["rainfall_previous_3h"] = grouped.shift(3)

model["rainfall_3h"] = (
    grouped.transform(
        lambda x: x.rolling(3, min_periods=1).sum()
    )
)

model["rainfall_6h"] = (
    grouped.transform(
        lambda x: x.rolling(6, min_periods=1).sum()
    )
)

model["rainfall_12h"] = (
    grouped.transform(
        lambda x: x.rolling(12, min_periods=1).sum()
    )
)

model["rainfall_24h"] = (
    grouped.transform(
        lambda x: x.rolling(24, min_periods=1).sum()
    )
)

model["rainfall_previous_1h"] = (
    model["rainfall_previous_1h"].fillna(0)
)

model["rainfall_previous_3h"] = (
    model["rainfall_previous_3h"].fillna(0)
)

model = model.sort_values(
    ["timestamp", "grid_id"]
).reset_index(drop=True)

final_columns = [
    "timestamp",
    "grid_id",
    "center_lat",
    "center_lon",
    "rainfall_mm",
    "rainfall_previous_1h",
    "rainfall_previous_3h",
    "rainfall_3h",
    "rainfall_6h",
    "rainfall_12h",
    "rainfall_24h",
    "elevation_m",
    "slope_degree",
    "landcover_class",
    "imperviousness_percent",
    "historical_risk",
    "risk_score"
]

model = model[final_columns]

print()
print("=" * 70)
print("FINAL CHECK")
print("=" * 70)

print("TOTAL ROWS:", len(model))
print("UNIQUE TIMESTAMPS:", model["timestamp"].nunique())
print("UNIQUE GRID CELLS:", model["grid_id"].nunique())

print()
print("DATE RANGE:")
print("START:", model["timestamp"].min())
print("END  :", model["timestamp"].max())

print()
print("MISSING VALUES:")
print(model.isna().sum())

print()
print("RAINFALL STATISTICS:")
print(
    model[
        [
            "rainfall_mm",
            "rainfall_3h",
            "rainfall_6h",
            "rainfall_12h",
            "rainfall_24h"
        ]
    ].describe()
)

print()
print("=" * 70)
print("SAVING DATASET")
print("=" * 70)

model.to_csv(
    OUTPUT,
    index=False
)

print()
print("OUTPUT:")
print(OUTPUT)

print()
print("=" * 70)
print("FLOOD MODEL DATASET CREATED SUCCESSFULLY")
print("=" * 70)