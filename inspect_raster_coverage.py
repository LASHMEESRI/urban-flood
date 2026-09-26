import rasterio
import os

FILES = [
    r"E:\urban flood\data\raw\dem\Copernicus_DSM_COG_10_N12_00_E080_00_DEM.tif",
    r"E:\urban flood\data\raw\dem\Copernicus_DSM_COG_10_N13_00_E080_00_DEM.tif",
    r"E:\urban flood\data\raw\landcover\ESA_WorldCover_10m_2021_v200_N12E078_Map.tif"
]

print("=" * 70)
print("RASTER COVERAGE CHECK")
print("=" * 70)

for path in FILES:

    print()
    print("=" * 70)
    print(os.path.basename(path))
    print("=" * 70)

    if not os.path.exists(path):
        print("FILE NOT FOUND")
        continue

    with rasterio.open(path) as src:

        print("CRS:", src.crs)
        print("Width:", src.width)
        print("Height:", src.height)
        print("Resolution:", src.res)
        print("Bounds:")
        print("  Left  :", src.bounds.left)
        print("  Bottom:", src.bounds.bottom)
        print("  Right :", src.bounds.right)
        print("  Top   :", src.bounds.top)

        print("NoData:", src.nodata)
        print("Bands:", src.count)

print()
print("=" * 70)
print("DONE")
print("=" * 70)