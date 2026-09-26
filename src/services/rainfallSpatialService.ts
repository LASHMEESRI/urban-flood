import type { GridCell } from "./gridDataService";
import type { RainfallRecord } from "./rainfallService";

interface RainfallStation {
  name: string;
  latitude: number;
  longitude: number;
  value: number | null;
}

const RAINFALL_STATIONS = [
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

/**
 * Estimate rainfall at a grid cell using
 * Inverse Distance Weighting (IDW).
 *
 * Nearby stations receive higher influence.
 */
export function estimateGridRainfall(
  grid: GridCell,
  rainfall: RainfallRecord,
): number {
  const stations: RainfallStation[] = RAINFALL_STATIONS.map((station) => {
    let value: number | null = null;

    if (station.name === "Mylapore") {
      value = rainfall.rainfall_mylapore;
    }

    if (station.name === "RedHills") {
      value = rainfall.rainfall_redhills;
    }

    if (station.name === "Tharamani") {
      value = rainfall.rainfall_tharamani;
    }

    return {
      ...station,
      value,
    };
  });

  const validStations = stations.filter(
    (station) => station.value !== null && Number.isFinite(station.value),
  );

  if (validStations.length === 0) {
    return rainfall.rainfall_mean ?? 0;
  }

  let weightedRainfall = 0;
  let totalWeight = 0;

  for (const station of validStations) {
    const distance = distanceKm(
      grid.center_lat,
      grid.center_lon,
      station.latitude,
      station.longitude,
    );

    // Prevent division by zero if grid is exactly
    // at a rainfall station.
    const safeDistance = Math.max(distance, 0.01);

    const weight = 1 / safeDistance ** 2;

    weightedRainfall += (station.value ?? 0) * weight;

    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return rainfall.rainfall_mean ?? 0;
  }

  return Number((weightedRainfall / totalWeight).toFixed(2));
}
