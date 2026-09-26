import type { FloodRiskResult } from "./floodRiskService";
import type { GridCell } from "./gridDataService";

export type RouteCoordinate = [number, number];

export type RouteSafetyLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface ScoredRoute {
  distanceKm: number;

  floodExposureScore: number;

  highRiskCells: number;

  criticalRiskCells: number;

  moderateRiskCells: number;

  sampledCells: number;

  routeCost: number;

  safetyLevel: RouteSafetyLevel;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two coordinates.
 *
 * Coordinate format:
 * [latitude, longitude]
 */
function haversineDistance(
  pointA: RouteCoordinate,
  pointB: RouteCoordinate,
): number {
  const lat1 = (pointA[0] * Math.PI) / 180;
  const lat2 = (pointB[0] * Math.PI) / 180;

  const deltaLat = ((pointB[0] - pointA[0]) * Math.PI) / 180;

  const deltaLon = ((pointB[1] - pointA[1]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate the total length of a route.
 */
function calculateRouteDistance(coordinates: RouteCoordinate[]): number {
  let distanceKm = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    distanceKm += haversineDistance(coordinates[index - 1], coordinates[index]);
  }

  return distanceKm;
}

/**
 * Find the nearest Chennai GIS grid cell
 * for a route coordinate.
 */
function findNearestGridCell(
  coordinate: RouteCoordinate,
  gridData: GridCell[],
): GridCell | null {
  if (gridData.length === 0) {
    return null;
  }

  let nearestCell: GridCell | null = null;
  let nearestDistance = Infinity;

  for (const cell of gridData) {
    const distance = haversineDistance(coordinate, [
      cell.center_lat,
      cell.center_lon,
    ]);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestCell = cell;
    }
  }

  return nearestCell;
}

/**
 * Evaluate one route against the current
 * offline flood-risk grid.
 *
 * This function scores an existing route.
 * It does NOT choose between multiple routes yet.
 */
export function scoreRoute(
  coordinates: RouteCoordinate[],
  gridData: GridCell[],
  riskResults: Map<number, FloodRiskResult>,
): ScoredRoute {
  if (coordinates.length < 2) {
    throw new Error("Route must contain at least two coordinates.");
  }

  if (gridData.length === 0) {
    throw new Error("No Chennai GIS grid data available.");
  }

  const distanceKm = calculateRouteDistance(coordinates);

  let totalRiskScore = 0;

  let highRiskCells = 0;
  let criticalRiskCells = 0;
  let moderateRiskCells = 0;

  let sampledCells = 0;

  /*
   * Prevent the same grid cell from being counted
   * repeatedly when a route travels through it.
   */
  const visitedGridIds = new Set<number>();

  for (const coordinate of coordinates) {
    const nearestCell = findNearestGridCell(coordinate, gridData);

    if (!nearestCell) {
      continue;
    }

    if (visitedGridIds.has(nearestCell.grid_id)) {
      continue;
    }

    visitedGridIds.add(nearestCell.grid_id);

    const riskResult = riskResults.get(nearestCell.grid_id);

    if (!riskResult) {
      continue;
    }

    sampledCells += 1;

    totalRiskScore += riskResult.final_score;

    if (riskResult.risk === "CRITICAL") {
      criticalRiskCells += 1;
    } else if (riskResult.risk === "HIGH") {
      highRiskCells += 1;
    } else if (riskResult.risk === "MODERATE") {
      moderateRiskCells += 1;
    }
  }

  const floodExposureScore =
    sampledCells > 0 ? totalRiskScore / sampledCells : 0;

  /*
   * Prototype route-cost model.
   *
   * Lower cost = better route according to
   * the combined distance + flood-risk objective.
   *
   * Critical cells receive the largest penalty.
   */
  const routeCost =
    distanceKm +
    floodExposureScore * 0.05 +
    moderateRiskCells * 0.25 +
    highRiskCells * 0.75 +
    criticalRiskCells * 2;

  let safetyLevel: RouteSafetyLevel;

  if (criticalRiskCells > 0) {
    safetyLevel = "CRITICAL";
  } else if (highRiskCells > 0) {
    safetyLevel = "HIGH";
  } else if (moderateRiskCells > 0 || floodExposureScore >= 25) {
    safetyLevel = "MODERATE";
  } else {
    safetyLevel = "LOW";
  }

  return {
    distanceKm: Number(distanceKm.toFixed(2)),

    floodExposureScore: Number(floodExposureScore.toFixed(2)),

    highRiskCells,

    criticalRiskCells,

    moderateRiskCells,

    sampledCells,

    routeCost: Number(routeCost.toFixed(2)),

    safetyLevel,
  };
}
