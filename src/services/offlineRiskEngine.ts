import { loadGridData, type GridCell } from "./gridDataService";

import {
  loadRainfallFeatures,
  type RainfallFeatureRecord,
} from "./rainfallFeatureService";

import { calculateFloodRisk, type FloodRiskResult } from "./floodRiskService";

export interface OfflineRiskSnapshot {
  rainfall: RainfallFeatureRecord;
  results: FloodRiskResult[];
}

function normalizeTimestamp(timestamp: string): string {
  // Old UI format:
  // DD-MM-YYYY HH:mm
  //
  // New feature JSON format:
  // YYYY-MM-DD HH:mm:ss

  const match = timestamp.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);

  if (match) {
    const [, day, month, year, hour, minute] = match;

    return `${year}-${month}-${day} ${hour}:${minute}:00`;
  }

  return timestamp;
}

export async function calculateOfflineRisk(
  timestamp?: string,
): Promise<OfflineRiskSnapshot> {
  const [gridData, rainfallData] = await Promise.all([
    loadGridData(),
    loadRainfallFeatures(),
  ]);

  if (gridData.length === 0) {
    throw new Error("No GIS grid data available");
  }

  if (rainfallData.length === 0) {
    throw new Error("No rainfall feature data available");
  }

  let rainfallRecord: RainfallFeatureRecord;

  if (timestamp) {
    const normalizedTimestamp = normalizeTimestamp(timestamp);

    const exactMatch = rainfallData.find(
      (record) => record.timestamp === normalizedTimestamp,
    );

    if (!exactMatch) {
      throw new Error(
        `No rainfall feature record found for timestamp: ${timestamp}`,
      );
    }

    rainfallRecord = exactMatch;
  } else {
    rainfallRecord = rainfallData[rainfallData.length - 1];
  }

  const results = gridData.map((grid: GridCell) =>
    calculateFloodRisk(grid, rainfallRecord),
  );

  return {
    rainfall: rainfallRecord,
    results,
  };
}
