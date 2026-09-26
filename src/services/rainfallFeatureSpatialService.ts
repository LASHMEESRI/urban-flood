import type { GridCell } from "./gridDataService";
import type { RainfallFeatureRecord } from "./rainfallFeatureService";

interface RainfallStation {
  name: "Mylapore" | "RedHills" | "Tharamani";
  latitude: number;
  longitude: number;
}

const RAINFALL_STATIONS: RainfallStation[] = [
  {
    name: "Mylapore",
    latitude: 13.04138889,
    longitude: 80.27916667,
  },
  {
    name: "RedHills",
    latitude: 13.18666667,
    longitude: 80.18833333,
  },
  {
    name: "Tharamani",
    latitude: 12.98583333,
    longitude: 80.245,
  },
];

function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusKm = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function interpolate(
  grid: GridCell,
  values: Array<{
    station: RainfallStation;
    value: number | null;
  }>,
): number | null {
  const validStations = values.filter(
    (item) => item.value !== null && Number.isFinite(item.value),
  );

  if (validStations.length === 0) {
    return null;
  }

  let weightedRainfall = 0;
  let totalWeight = 0;

  for (const item of validStations) {
    const distance = distanceKm(
      grid.center_lat,
      grid.center_lon,
      item.station.latitude,
      item.station.longitude,
    );

    const safeDistance = Math.max(distance, 0.01);

    const weight = 1 / safeDistance ** 2;

    weightedRainfall += (item.value ?? 0) * weight;

    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return null;
  }

  return Number((weightedRainfall / totalWeight).toFixed(2));
}

function getStationValue(
  rainfall: RainfallFeatureRecord,
  station: RainfallStation["name"],
  duration: "1hr" | "3hr" | "6hr",
): number | null {
  return rainfall[`${station}_${duration}` as keyof RainfallFeatureRecord] as
    | number
    | null;
}

export interface SpatialRainfallFeatures {
  rainfall1hr: number | null;
  rainfall3hr: number | null;
  rainfall6hr: number | null;
}

export function estimateGridRainfallFeatures(
  grid: GridCell,
  rainfall: RainfallFeatureRecord,
): SpatialRainfallFeatures {
  const rainfall1hr = interpolate(
    grid,
    RAINFALL_STATIONS.map((station) => ({
      station,
      value: getStationValue(rainfall, station.name, "1hr"),
    })),
  );

  const rainfall3hr = interpolate(
    grid,
    RAINFALL_STATIONS.map((station) => ({
      station,
      value: getStationValue(rainfall, station.name, "3hr"),
    })),
  );

  const rainfall6hr = interpolate(
    grid,
    RAINFALL_STATIONS.map((station) => ({
      station,
      value: getStationValue(rainfall, station.name, "6hr"),
    })),
  );

  return {
    rainfall1hr,
    rainfall3hr,
    rainfall6hr,
  };
}
