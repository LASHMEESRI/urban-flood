import csv

file = r"E:\urban flood\data\raw\rainfall\rainfall_tel_hr_tamil_nadu_sw_gw_tn_2021_2025.csv"

timestamps = [
    "02-11-2022 06:00",
    "02-11-2022 05:00",
    "11-03-2025 23:00",
    "12-03-2025 00:00",
]

stations = [
    "Chennai Mylapore (DGPOffice)",
    "RedHills"
]

with open(file, encoding="utf-8-sig", newline="") as f:
    reader = csv.DictReader(f)

    for row in reader:

        if (
            row["Station"] in stations
            and row["Data Acquisition Time"] in timestamps
        ):

            print("\nMATCH")
            print("Station:", row["Station"])
            print("Time:", row["Data Acquisition Time"])
            print(
                "Rainfall:",
                row["Telemetry Hourly Rainfall (mm)"]
            )
            print("Latitude:", row["Latitude"])
            print("Longitude:", row["Longitude"])