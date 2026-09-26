import type { RainfallFeatureRecord } from "./rainfallFeatureService";

export type NowcastHorizon = 15 | 30 | 60;

export interface StationNowcast {
  station: "Mylapore" | "RedHills" | "Tharamani";

  currentRainfall1hr: number | null;

  rainfall15min: number | null;
  rainfall30min: number | null;
  rainfall60min: number | null;

  projected3hr: number | null;
  projected6hr: number | null;
}

export interface RainfallNowcast {
  baseTimestamp: string;

  horizon: NowcastHorizon;

  forecastTimestamp: string;

  stations: StationNowcast[];

  method: "PERSISTENCE_BASELINE";
}

/**
 * Convert YYYY-MM-DD HH:mm:ss into a Date.
 */
function parseTimestamp(timestamp: string): Date {
  const date = new Date(timestamp.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid rainfall timestamp: ${timestamp}`);
  }

  return date;
}

/**
 * Format Date as:
 * YYYY-MM-DD HH:mm:ss
 */
function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join(
      "-",
    ) +
    " " +
    [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join(
      ":",
    )
  );
}

/**
 * Calculate a persistence-based rainfall nowcast.
 *
 * Assumption:
 * The latest observed 1-hour rainfall intensity
 * continues unchanged into the future.
 *
 * This is a baseline method, NOT an ML prediction.
 */
export function calculateRainfallNowcast(
  record: RainfallFeatureRecord,
  horizon: NowcastHorizon,
): RainfallNowcast {
  const baseDate = parseTimestamp(record.timestamp);

  const forecastDate = new Date(baseDate.getTime() + horizon * 60 * 1000);

  const stations: StationNowcast[] = [
    {
      station: "Mylapore",
      currentRainfall1hr: record.Mylapore_1hr,

      rainfall15min:
        record.Mylapore_1hr !== null
          ? Number((record.Mylapore_1hr * 0.25).toFixed(2))
          : null,

      rainfall30min:
        record.Mylapore_1hr !== null
          ? Number((record.Mylapore_1hr * 0.5).toFixed(2))
          : null,

      rainfall60min:
        record.Mylapore_1hr !== null
          ? Number(record.Mylapore_1hr.toFixed(2))
          : null,

      projected3hr:
        record.Mylapore_3hr !== null && record.Mylapore_1hr !== null
          ? Number(
              (
                record.Mylapore_3hr +
                record.Mylapore_1hr * (horizon / 60)
              ).toFixed(2),
            )
          : null,

      projected6hr:
        record.Mylapore_6hr !== null && record.Mylapore_1hr !== null
          ? Number(
              (
                record.Mylapore_6hr +
                record.Mylapore_1hr * (horizon / 60)
              ).toFixed(2),
            )
          : null,
    },

    {
      station: "RedHills",
      currentRainfall1hr: record.RedHills_1hr,

      rainfall15min:
        record.RedHills_1hr !== null
          ? Number((record.RedHills_1hr * 0.25).toFixed(2))
          : null,

      rainfall30min:
        record.RedHills_1hr !== null
          ? Number((record.RedHills_1hr * 0.5).toFixed(2))
          : null,

      rainfall60min:
        record.RedHills_1hr !== null
          ? Number(record.RedHills_1hr.toFixed(2))
          : null,

      projected3hr:
        record.RedHills_3hr !== null && record.RedHills_1hr !== null
          ? Number(
              (
                record.RedHills_3hr +
                record.RedHills_1hr * (horizon / 60)
              ).toFixed(2),
            )
          : null,

      projected6hr:
        record.RedHills_6hr !== null && record.RedHills_1hr !== null
          ? Number(
              (
                record.RedHills_6hr +
                record.RedHills_1hr * (horizon / 60)
              ).toFixed(2),
            )
          : null,
    },

    {
      station: "Tharamani",
      currentRainfall1hr: record.Tharamani_1hr,

      rainfall15min:
        record.Tharamani_1hr !== null
          ? Number((record.Tharamani_1hr * 0.25).toFixed(2))
          : null,

      rainfall30min:
        record.Tharamani_1hr !== null
          ? Number((record.Tharamani_1hr * 0.5).toFixed(2))
          : null,

      rainfall60min:
        record.Tharamani_1hr !== null
          ? Number(record.Tharamani_1hr.toFixed(2))
          : null,

      projected3hr:
        record.Tharamani_3hr !== null && record.Tharamani_1hr !== null
          ? Number(
              (
                record.Tharamani_3hr +
                record.Tharamani_1hr * (horizon / 60)
              ).toFixed(2),
            )
          : null,

      projected6hr:
        record.Tharamani_6hr !== null && record.Tharamani_1hr !== null
          ? Number(
              (
                record.Tharamani_6hr +
                record.Tharamani_1hr * (horizon / 60)
              ).toFixed(2),
            )
          : null,
    },
  ];

  return {
    baseTimestamp: record.timestamp,

    horizon,

    forecastTimestamp: formatTimestamp(forecastDate),

    stations,

    method: "PERSISTENCE_BASELINE",
  };
}
