export interface GridCell {
  grid_id: number;
  center_lat: number;
  center_lon: number;
  elevation_m: number;
  slope_degree: number;
  landcover_class: number;
  imperviousness_percent: number;
  historical_risk: string;
  risk_score: number;
}

export async function loadGridData(): Promise<GridCell[]> {
  const response = await fetch("/chennai_grid_data.json");

  if (!response.ok) {
    throw new Error("Failed to load Chennai grid data");
  }

  return response.json();
}
