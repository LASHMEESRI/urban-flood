export interface RainfallFeatureRecord {
  timestamp: string;

  Mylapore_1hr: number | null;
  Mylapore_3hr: number | null;
  Mylapore_6hr: number | null;

  RedHills_1hr: number | null;
  RedHills_3hr: number | null;
  RedHills_6hr: number | null;

  Tharamani_1hr: number | null;
  Tharamani_3hr: number | null;
  Tharamani_6hr: number | null;
}

export async function loadRainfallFeatures(): Promise<RainfallFeatureRecord[]> {
  const response = await fetch("/chennai_rainfall_features.json");

  if (!response.ok) {
    throw new Error("Failed to load offline rainfall feature data");
  }

  return response.json();
}
