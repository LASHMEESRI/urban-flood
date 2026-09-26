import type { GridCell } from "./gridDataService";

import type { RainfallFeatureRecord } from "./rainfallFeatureService";

import type { FloodRiskResult } from "./floodRiskService";

import { calculateFloodRisk } from "./floodRiskService";

import type { RainfallNowcast, NowcastHorizon } from "./nowcastService";

export interface NowcastRiskSnapshot {
  horizon: NowcastHorizon;

  baseTimestamp: string;

  forecastTimestamp: string;

  method: "PERSISTENCE_BASELINE";

  results: FloodRiskResult[];
}

/**
 * Convert the station-level nowcast into the
 * RainfallFeatureRecord format expected by
 * the existing flood-risk engine.
 */
function buildFutureRainfallFeatures(
  nowcast: RainfallNowcast,
): RainfallFeatureRecord {
  const mylapore = nowcast.stations.find(
    (station) => station.station === "Mylapore",
  );

  const redHills = nowcast.stations.find(
    (station) => station.station === "RedHills",
  );

  const tharamani = nowcast.stations.find(
    (station) => station.station === "Tharamani",
  );

  return {
    timestamp: nowcast.forecastTimestamp,

    /*
     * Future 1-hour rainfall.
     *
     * Persistence baseline assumes the
     * current hourly intensity continues.
     */
    Mylapore_1hr: mylapore?.rainfall60min ?? null,

    RedHills_1hr: redHills?.rainfall60min ?? null,

    Tharamani_1hr: tharamani?.rainfall60min ?? null,

    /*
     * Projected 3-hour accumulation.
     */
    Mylapore_3hr: mylapore?.projected3hr ?? null,

    RedHills_3hr: redHills?.projected3hr ?? null,

    Tharamani_3hr: tharamani?.projected3hr ?? null,

    /*
     * Projected 6-hour accumulation.
     */
    Mylapore_6hr: mylapore?.projected6hr ?? null,

    RedHills_6hr: redHills?.projected6hr ?? null,

    Tharamani_6hr: tharamani?.projected6hr ?? null,
  };
}

/**
 * Calculate future flood risk for all Chennai
 * GIS grid cells.
 *
 * This uses the existing flood-risk engine,
 * but feeds it rainfall conditions projected
 * 15 / 30 / 60 minutes into the future.
 */
export function calculateNowcastRisk(
  gridData: GridCell[],
  nowcast: RainfallNowcast,
): NowcastRiskSnapshot {
  if (gridData.length === 0) {
    throw new Error("No GIS grid data available for nowcast");
  }

  const futureRainfall = buildFutureRainfallFeatures(nowcast);

  const results = gridData.map((grid) =>
    calculateFloodRisk(grid, futureRainfall),
  );

  return {
    horizon: nowcast.horizon,

    baseTimestamp: nowcast.baseTimestamp,

    forecastTimestamp: nowcast.forecastTimestamp,

    method: "PERSISTENCE_BASELINE",

    results,
  };
}
