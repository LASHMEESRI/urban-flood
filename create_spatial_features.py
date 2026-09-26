import pandas as pd
import numpy as np
import rasterio
from rasterio.windows import from_bounds
import os

BASE = r"E:\urban flood\data"

GRID_FILE = os.path.join(
    BASE, "processed", "chennai_grid.csv"
)

RISK_FILE = os.path.join(
    BASE, "processed", "chennai_grid_risk.csv"
)

DEM_FILES = [
    os.path.join(
        BASE,
        "raw",
        "dem",
        "Copernicus_DSM_COG_10_N12_00_E080_00_DEM.tif"
    ),
    os.path.join(
        BASE,
        "raw",
        "dem",
        "Copernicus_DSM_COG_10_N13_00_E080_00_DEM.tif"
    )
]

LANDCOVER_FILE = os.path.join(
    BASE,
    "raw",
    "landcover",
    "ESA_WorldCover_10m_2021_v200_N12E078_Map.tif"
)

OUTPUT = os.path.join(
    BASE,
    "processed",
    "chennai_spatial_features.csv"
)

print("=" * 70)
print("CREATING CHENNAI SPATIAL FEATURES")
print("=" * 70)

# ---------------------------------------------------------
# 1. Load grid
# ---------------------------------------------------------

grid = pd.read_csv(GRID_FILE)

# Load historical flood risk
risk = pd.read_csv(RISK_FILE)

grid = grid.merge(
    risk[
        [
            "grid_id",
            "historical_risk",
            "risk_score"
        ]
    ],
    on="grid_id",
    how="left"
)

print()
print("GRID CELLS:", len(grid))

# ---------------------------------------------------------
# 2. DEM helper
# ---------------------------------------------------------

dem_sources = []

for path in DEM_FILES:

    src = rasterio.open(path)

    dem_sources.append(src)

    print()
    print("Loaded DEM:")
    print(os.path.basename(path))


def get_dem_value(lat, lon):

    for src in dem_sources:

        if (
            src.bounds.left <= lon <= src.bounds.right
            and
            src.bounds.bottom <= lat <= src.bounds.top
        ):

            row, col = src.index(lon, lat)

            value = src.read(
                1,
                window=rasterio.windows.Window(
                    col,
                    row,
                    1,
                    1
                )
            )[0, 0]

            return float(value)

    return np.nan


# ---------------------------------------------------------
# 3. Calculate slope from DEM
# ---------------------------------------------------------

def get_dem_and_slope(lat, lon):

    for src in dem_sources:

        if (
            src.bounds.left <= lon <= src.bounds.right
            and
            src.bounds.bottom <= lat <= src.bounds.top
        ):

            row, col = src.index(lon, lat)

            # Small local window around grid center
            r0 = max(0, row - 1)
            c0 = max(0, col - 1)

            window = rasterio.windows.Window(
                c0,
                r0,
                3,
                3
            )

            values = src.read(
                1,
                window=window
            ).astype(float)

            if values.shape[0] < 3 or values.shape[1] < 3:
                return np.nan, np.nan

            center_r = values.shape[0] // 2
            center_c = values.shape[1] // 2

            center = values[
                center_r,
                center_c
            ]

            # Pixel spacing in metres
            pixel_size = 30.0

            # Central difference
            dzdx = (
                values[center_r, center_c + 1]
                -
                values[center_r, center_c - 1]
            ) / (2 * pixel_size)

            dzdy = (
                values[center_r + 1, center_c]
                -
                values[center_r - 1, center_c]
            ) / (2 * pixel_size)

            slope = np.degrees(
                np.arctan(
                    np.sqrt(
                        dzdx ** 2 +
                        dzdy ** 2
                    )
                )
            )

            return float(center), float(slope)

    return np.nan, np.nan


# ---------------------------------------------------------
# 4. Land-cover helper
# ---------------------------------------------------------

lc = rasterio.open(LANDCOVER_FILE)

print()
print("Loaded WorldCover:")
print(os.path.basename(LANDCOVER_FILE))

BUILT_UP_CLASS = 50


def get_landcover_stats(
    min_lat,
    max_lat,
    min_lon,
    max_lon
):

    try:

        window = from_bounds(
            min_lon,
            min_lat,
            max_lon,
            max_lat,
            lc.transform
        )

        data = lc.read(
            1,
            window=window
        )

        if data.size == 0:
            return np.nan, np.nan

        valid = data[data != 0]

        if len(valid) == 0:
            return np.nan, np.nan

        # Most common land-cover class
        values, counts = np.unique(
            valid,
            return_counts=True
        )

        dominant_class = int(
            values[np.argmax(counts)]
        )

        # Built-up fraction
        built_up_pixels = np.sum(
            valid == BUILT_UP_CLASS
        )

        impervious_fraction = (
            built_up_pixels /
            len(valid)
        ) * 100.0

        return (
            dominant_class,
            float(impervious_fraction)
        )

    except Exception:

        return np.nan, np.nan


# ---------------------------------------------------------
# 5. Process every grid cell
# ---------------------------------------------------------

results = []

total = len(grid)

for i, row in grid.iterrows():

    lat = float(row["center_lat"])
    lon = float(row["center_lon"])

    elevation, slope = get_dem_and_slope(
        lat,
        lon
    )

    dominant_landcover, imperviousness = (
        get_landcover_stats(
            row["min_lat"],
            row["max_lat"],
            row["min_lon"],
            row["max_lon"]
        )
    )

    results.append({

        "grid_id":
            row["grid_id"],

        "center_lat":
            lat,

        "center_lon":
            lon,

        "elevation_m":
            elevation,

        "slope_degree":
            slope,

        "landcover_class":
            dominant_landcover,

        "imperviousness_percent":
            imperviousness,

        "historical_risk":
            row["historical_risk"],

        "risk_score":
            row["risk_score"]
    })

    if (i + 1) % 100 == 0:
        print(
            f"Processed {i + 1}/{total} grid cells"
        )


# ---------------------------------------------------------
# 6. Save
# ---------------------------------------------------------

result = pd.DataFrame(results)

result.to_csv(
    OUTPUT,
    index=False
)

# ---------------------------------------------------------
# 7. Close rasters
# ---------------------------------------------------------

for src in dem_sources:
    src.close()

lc.close()

# ---------------------------------------------------------
# 8. Summary
# ---------------------------------------------------------

print()
print("=" * 70)
print("SPATIAL FEATURE SUMMARY")
print("=" * 70)

print()
print("TOTAL GRID CELLS:", len(result))

print()
print("MISSING VALUES")
print(result.isna().sum().to_string())

print()
print("ELEVATION")
print(result["elevation_m"].describe())

print()
print("SLOPE")
print(result["slope_degree"].describe())

print()
print("LAND COVER CLASSES")
print(
    result["landcover_class"]
    .value_counts()
    .sort_index()
)

print()
print("IMPERVIOUSNESS (%)")
print(
    result["imperviousness_percent"]
    .describe()
)

print()
print("OUTPUT:")
print(OUTPUT)

print()
print("=" * 70)
print("DONE")
print("=" * 70)