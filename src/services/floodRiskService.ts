import type { GridCell } from "./gridDataService";

import type { RainfallFeatureRecord } from "./rainfallFeatureService";

import { estimateGridRainfallFeatures } from "./rainfallFeatureSpatialService";

export type FloodRiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface FloodRiskResult {
  grid_id: number;

  timestamp: string;

  rainfall_mm: number;

  rainfall_1hr_mm: number | null;

  rainfall_3hr_mm: number | null;

  rainfall_6hr_mm: number | null;

  static_score: number;

  dynamic_score: number;

  final_score: number;

  risk: FloodRiskLevel;
}

function getRiskLevel(score: number): FloodRiskLevel {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MODERATE";

  return "LOW";
}

function normalizeRainfall(
  rainfall: number | null,
  reference: number,
): number | null {
  if (rainfall === null || !Number.isFinite(rainfall)) {
    return null;
  }

  return Math.min(Math.max(rainfall, 0) / reference, 1) * 100;
}

function calculateDynamicScore(
  rainfall1hr: number | null,
  rainfall3hr: number | null,
  rainfall6hr: number | null,
): number {
  const normalized1hr = normalizeRainfall(rainfall1hr, 17.5);

  const normalized3hr = normalizeRainfall(rainfall3hr, 53.5);

  const normalized6hr = normalizeRainfall(rainfall6hr, 119.4);

  const values: Array<{
    score: number;
    weight: number;
  }> = [];

  if (normalized1hr !== null) {
    values.push({
      score: normalized1hr,
      weight: 0.5,
    });
  }

  if (normalized3hr !== null) {
    values.push({
      score: normalized3hr,
      weight: 0.3,
    });
  }

  if (normalized6hr !== null) {
    values.push({
      score: normalized6hr,
      weight: 0.2,
    });
  }

  if (values.length === 0) {
    return 0;
  }

  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);

  const weightedScore = values.reduce(
    (sum, item) => sum + item.score * item.weight,
    0,
  );

  return weightedScore / totalWeight;
}

export function calculateFloodRisk(
  grid: GridCell,
  rainfall: RainfallFeatureRecord,
): FloodRiskResult {
  const spatialRainfall = estimateGridRainfallFeatures(grid, rainfall);

  const rainfall1hr = spatialRainfall.rainfall1hr;

  const rainfall3hr = spatialRainfall.rainfall3hr;

  const rainfall6hr = spatialRainfall.rainfall6hr;

  const historicalFactor = grid.risk_score >= 0 ? grid.risk_score : 0;

  const elevationFactor = Math.max(
    0,
    Math.min(100, 100 - grid.elevation_m * 2.5),
  );

  const slopeFactor = Math.max(0, Math.min(100, 100 - grid.slope_degree * 10));

  const imperviousFactor = Math.max(
    0,
    Math.min(100, grid.imperviousness_percent),
  );

  const staticScore =
    historicalFactor * 0.35 +
    elevationFactor * 0.2 +
    slopeFactor * 0.1 +
    imperviousFactor * 0.35;

  const dynamicScore = calculateDynamicScore(
    rainfall1hr,
    rainfall3hr,
    rainfall6hr,
  );

  const finalScore = staticScore * 0.6 + dynamicScore * 0.4;

  return {
    grid_id: grid.grid_id,

    timestamp: rainfall.timestamp,

    rainfall_mm: rainfall1hr !== null ? Number(rainfall1hr.toFixed(2)) : 0,

    rainfall_1hr_mm:
      rainfall1hr !== null ? Number(rainfall1hr.toFixed(2)) : null,

    rainfall_3hr_mm:
      rainfall3hr !== null ? Number(rainfall3hr.toFixed(2)) : null,

    rainfall_6hr_mm:
      rainfall6hr !== null ? Number(rainfall6hr.toFixed(2)) : null,

    static_score: Number(staticScore.toFixed(2)),

    dynamic_score: Number(dynamicScore.toFixed(2)),

    final_score: Number(finalScore.toFixed(2)),

    risk: getRiskLevel(finalScore),
  };
}
