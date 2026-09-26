export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Severe';

export type DrainStatus = 'Clear' | 'Partial' | 'Blocked';

export interface FloodRiskZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // in meters
  riskLevel: RiskLevel;
  riskPercentage: number;
  predictedWaterLevelCm: number;
  etaMinutes: number;
  affectedDrains: string[];
  elevationMeters: number;
  landCover: string;
  runoffCoefficient: number;
  polygonCoords?: [number, number][]; // lat, lng coordinates
}

export interface DrainNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacityM3s: number;
  currentLoadM3s: number;
  loadPercentage: number;
  status: DrainStatus;
  siltationCm: number;
  outfallType: string;
}

export interface SensorHistoryPoint {
  timestamp: string;
  rainfallMmHr: number;
  waterLevelCm: number;
  runoffM3s: number;
  drainLoadPct: number;
}

export interface NowcastInterval {
  label: string; // e.g. "Now", "+30m", "+1h", "+1.5h", "+2h", "+2.5h", "+3h"
  probability: number; // 0 - 100%
  expectedDepthCm: number;
  riskLevel: RiskLevel;
}

export interface AlertItem {
  id: string;
  timestamp: string;
  severity: RiskLevel;
  title: string;
  message: string;
  zoneName: string;
  acknowledged?: boolean;
}

export interface PipelineMetrics {
  // Step 1: Doppler Radar
  dopplerRainfallMmHr: number;
  radarReflectivityDbz: number;
  // Step 2: DEM + Land Cover
  demElevationMeanM: number;
  imperviousCoverPct: number;
  // Step 3: Runoff
  runoffRateM3s: number;
  // Step 4: Drainage Graph
  drainCapacityM3s: number;
  drainLoadPct: number;
  networkBlockagePct: number;
  // Step 5: Water Level
  waterLevelCm: number;
  rateOfRiseCmHr: number;
  // Step 6: AI Flood Nowcast
  aiRiskScore: number; // 0 - 100
  overallRiskLevel: RiskLevel;
  // Metadata
  lastUpdated: string;
}

export interface CityPreset {
  id: string;
  name: string;
  subdivision: string;
  lat: number;
  lng: number;
  defaultRainfall: number;
  notableHazard: string;
}

export interface DestinationPreset {
  id: string;
  name: string;
  type: 'hospital' | 'shelter' | 'transit' | 'highground';
  lat: number;
  lng: number;
  elevationM: number;
  capacityNotes: string;
}

export interface EvacuationRoute {
  mode: 'emergency' | 'transit' | 'public';
  distanceKm: number;
  durationMinutes: number;
  destinationName: string;
  destinationCoords: [number, number];
  coordinates: [number, number][]; // [lat, lng] array
  intersectsFloodZone: boolean;
  intersectedZones: string[];
  safetyScore: 'Safe' | 'Caution' | 'Severe Hazard' | 'Safe Rerouted';
  instructions: string[];
}
