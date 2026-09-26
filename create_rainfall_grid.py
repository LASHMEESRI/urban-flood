import pandas as pd
import numpy as np

RAIN_INPUT = r"E:\urban flood\data\processed\chennai_rainfall_combined.csv"
GRID_INPUT = r"E:\urban flood\data\processed\chennai_grid.csv"
OUTPUT = r"E:\urban flood\data\processed\chennai_rainfall_grid.csv"

# --------------------------------------------------
# LOAD DATA
# --------------------------------------------------

rain = pd.read_csv(RAIN_INPUT)
grid = pd.read_csv(GRID_INPUT)

rain["timestamp"] = pd.to_datetime(
    rain["timestamp"],
    dayfirst=True
)

# --------------------------------------------------
# STATION LOCATIONS
# --------------------------------------------------

stations = {
    "mylapore": (13.04138889, 80.27916667),
    "redhills": (13.18666667, 80.18833333),
    "tharamani": (12.98583333, 80.24500000),
}

# --------------------------------------------------
# IDW FUNCTION
# --------------------------------------------------

def idw_rainfall(grid_lat, grid_lon, values):

    numerator = 0.0
    denominator = 0.0

    for station, value in values.items():

        if pd.isna(value):
            continue

        station_lat, station_lon = stations[station]

        distance = np.sqrt(
            (grid_lat - station_lat) ** 2 +
            (grid_lon - station_lon) ** 2
        )

        # Avoid division by zero
        if distance == 0:
            return float(value)

        weight = 1 / (distance ** 2)

        numerator += weight * value
        denominator += weight

    if denominator == 0:
        return np.nan

    return numerator / denominator


# --------------------------------------------------
# PROCESS EACH TIMESTAMP
# --------------------------------------------------

results = []

for _, row in rain.iterrows():

    values = {
        "mylapore": row["rainfall_mylapore"],
        "redhills": row["rainfall_redhills"],
        "tharamani": row["rainfall_tharamani"],
    }

    for _, cell in grid.iterrows():

        rainfall = idw_rainfall(
            cell["center_lat"],
            cell["center_lon"],
            values
        )

        results.append({
            "timestamp": row["timestamp"],
            "grid_id": cell["grid_id"],
            "rainfall_mm": rainfall
        })


# --------------------------------------------------
# SAVE
# --------------------------------------------------

output = pd.DataFrame(results)

output.to_csv(
    OUTPUT,
    index=False
)

print("=" * 70)
print("RAINFALL → GRID PROCESSING COMPLETE")
print("=" * 70)

print()
print("TOTAL ROWS:", len(output))

print()
print("UNIQUE TIMESTAMPS:", output["timestamp"].nunique())

print("UNIQUE GRID CELLS:", output["grid_id"].nunique())

print()
print("MISSING RAINFALL:", output["rainfall_mm"].isna().sum())

print()
print("RAINFALL STATISTICS")
print(output["rainfall_mm"].describe())

print()
print("OUTPUT:")
print(OUTPUT)

print("=" * 70)