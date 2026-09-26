export interface RainfallRecord {
  timestamp: string;
  rainfall_mylapore: number | null;
  rainfall_redhills: number | null;
  rainfall_tharamani: number | null;
  rainfall_mean: number | null;
}

export async function loadRainfallData(): Promise<RainfallRecord[]> {
  const response = await fetch("/chennai_rainfall_data.json");

  if (!response.ok) {
    throw new Error("Failed to load offline rainfall data");
  }

  return response.json();
}
