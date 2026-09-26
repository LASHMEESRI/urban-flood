import {
  AlertItem,
  CityPreset,
  DestinationPreset,
  DrainNode,
  FloodRiskZone,
  NowcastInterval,
  PipelineMetrics,
  RiskLevel,
  SensorHistoryPoint,
} from '../types';

export const CITY_PRESETS: CityPreset[] = [
  {
    id: 'gps',
    name: 'Auto-detect (Current GPS)',
    subdivision: 'Live Sensor Geolocation',
    lat: 19.076,
    lng: 72.8777,
    defaultRainfall: 42,
    notableHazard: 'Active Smart City Telemetry',
  },
  {
    id: 'mumbai',
    name: 'Mumbai (Mithi River Basin)',
    subdivision: 'Kurla & Hindmata Chokepoint',
    lat: 19.0728,
    lng: 72.8826,
    defaultRainfall: 68,
    notableHazard: 'High Tide & Mithi River Outfall Siltation',
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru (Koramangala Valley)',
    subdivision: 'Rainbow Drive & Bellandur Lake Basin',
    lat: 12.9279,
    lng: 77.6271,
    defaultRainfall: 54,
    notableHazard: 'Encroached Rajakaluve Storm Drains',
  },
  {
    id: 'chennai',
    name: 'Chennai (Adyar River Basin)',
    subdivision: 'Velachery & Madipakkam Lowlands',
    lat: 12.9815,
    lng: 80.218,
    defaultRainfall: 62,
    notableHazard: 'Coastal Inundation & Micro-drainage Choke',
  },
  {
    id: 'delhi',
    name: 'Delhi (Yamuna Floodplain)',
    subdivision: 'ITO Ring Road & Kashmere Gate',
    lat: 28.6289,
    lng: 77.2415,
    defaultRainfall: 38,
    notableHazard: 'Hathnikund Barrage Discharge & Drain 12',
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad (Musi River Corridor)',
    subdivision: 'Begumpet & Nala Catchment',
    lat: 17.4447,
    lng: 78.4664,
    defaultRainfall: 46,
    notableHazard: 'Urban Nala Overflow & Underpass Traps',
  },
];

const ZONE_NAME_TEMPLATES = [
  'Sector 4 Metro Underpass',
  'Riverside Embankment Lowlands',
  'Central Railway Culvert',
  'Market Yard Storm Drain Basin',
  'Highway Interchange Grade-Separator',
  'Industrial Park Catchment A',
  'Civic Hospital Access Corridor',
  'North Outfall Tidal Gate',
];

const LAND_COVERS = [
  { name: 'High-Density Concrete / Asphalt', c: 0.88, elevDiff: -3.2 },
  { name: 'Mixed Residential & Paved Roads', c: 0.76, elevDiff: -1.5 },
  { name: 'Urban Green Park & Retention Basin', c: 0.35, elevDiff: 2.1 },
  { name: 'Low-Lying Alluvial Riverbed', c: 0.82, elevDiff: -4.8 },
  { name: 'Commercial Hub / Paved Plaza', c: 0.90, elevDiff: -0.8 },
  { name: 'Transport Depot & Rail Yard', c: 0.84, elevDiff: -2.0 },
];

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'Severe';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

export function generateInitialZones(centerLat: number, centerLng: number): FloodRiskZone[] {
  const zones: FloodRiskZone[] = [];
  const count = 7;

  // Distribute zones in a realistic cluster around the center (within ~1.8km radius)
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI + (Math.random() * 0.4 - 0.2);
    const distanceKm = 0.45 + Math.random() * 0.95; // 450m to 1400m from center
    
    // 1 deg lat ~ 111km, 1 deg lng ~ 111 * cos(lat)
    const dLat = (distanceKm / 111) * Math.cos(angle);
    const dLng = (distanceKm / (111 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);

    const lat = centerLat + dLat;
    const lng = centerLng + dLng;

    // Generate polygonal vertices around this point for realistic irregular flood footprint
    const polyCoords: [number, number][] = [];
    const polyPoints = 6;
    const polyRadiusKm = (180 + Math.random() * 160) / 1000;
    for (let p = 0; p < polyPoints; p++) {
      const pAngle = (p / polyPoints) * 2 * Math.PI;
      const jitter = 0.7 + Math.random() * 0.6;
      const pDist = polyRadiusKm * jitter;
      const pLat = lat + (pDist / 111) * Math.cos(pAngle);
      const pLng = lng + (pDist / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(pAngle);
      polyCoords.push([pLat, pLng]);
    }

    const landCover = LAND_COVERS[i % LAND_COVERS.length];
    // Varied risk distribution
    let riskPercentage: number;
    if (i === 0) riskPercentage = 84 + Math.floor(Math.random() * 12); // one severe
    else if (i === 1 || i === 2) riskPercentage = 60 + Math.floor(Math.random() * 14); // high
    else if (i === 3 || i === 4) riskPercentage = 35 + Math.floor(Math.random() * 14); // moderate
    else riskPercentage = 12 + Math.floor(Math.random() * 12); // low

    const riskLevel = getRiskLevel(riskPercentage);
    const predictedWaterLevelCm = Math.round((riskPercentage / 100) * 85 + (riskLevel === 'Severe' ? 25 : 0));
    const etaMinutes = riskLevel === 'Severe' ? 15 : riskLevel === 'High' ? 35 : riskLevel === 'Moderate' ? 65 : 120;

    zones.push({
      id: `zone-${i + 1}`,
      name: ZONE_NAME_TEMPLATES[i % ZONE_NAME_TEMPLATES.length],
      lat,
      lng,
      radius: Math.round(polyRadiusKm * 1000),
      riskLevel,
      riskPercentage,
      predictedWaterLevelCm,
      etaMinutes,
      affectedDrains: [`DRN-${100 + i * 3}`, `DRN-${101 + i * 3}`, `CULV-0${i + 1}`],
      elevationMeters: Math.round((14 + landCover.elevDiff + (Math.random() * 2 - 1)) * 10) / 10,
      landCover: landCover.name,
      runoffCoefficient: landCover.c,
      polygonCoords: polyCoords,
    });
  }

  return zones;
}

export function generateDrainNodes(centerLat: number, centerLng: number): DrainNode[] {
  const nodes: DrainNode[] = [];
  const drainNames = [
    'Main Storm Trunk D-1',
    'Railway Siphon Box Culvert',
    'Sector 4 Collector Drain',
    'Market Street Trapezoidal Drain',
    'River Outfall Sluice Gate #2',
    'Ring Road Micro-channel B',
    'Hospital Zone Bypass Duct',
    'Central Canal Regulating Weir',
  ];

  for (let i = 0; i < drainNames.length; i++) {
    const angle = ((i * 1.3) / drainNames.length) * 2 * Math.PI;
    const distanceKm = 0.3 + Math.random() * 1.1;
    const lat = centerLat + (distanceKm / 111) * Math.cos(angle);
    const lng = centerLng + (distanceKm / (111 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);

    const capacityM3s = Math.round((12 + Math.random() * 18) * 10) / 10;
    let loadPct: number;
    let status: 'Clear' | 'Partial' | 'Blocked';
    let siltationCm: number;

    if (i === 1 || i === 4) {
      status = 'Blocked';
      loadPct = 92 + Math.floor(Math.random() * 8);
      siltationCm = 65 + Math.floor(Math.random() * 25);
    } else if (i === 0 || i === 3 || i === 6) {
      status = 'Partial';
      loadPct = 68 + Math.floor(Math.random() * 18);
      siltationCm = 35 + Math.floor(Math.random() * 20);
    } else {
      status = 'Clear';
      loadPct = 32 + Math.floor(Math.random() * 25);
      siltationCm = 10 + Math.floor(Math.random() * 12);
    }

    const currentLoadM3s = Math.round(((capacityM3s * loadPct) / 100) * 10) / 10;

    nodes.push({
      id: `drain-node-${i + 1}`,
      name: drainNames[i],
      lat,
      lng,
      capacityM3s,
      currentLoadM3s,
      loadPercentage: loadPct,
      status,
      siltationCm,
      outfallType: i === 4 ? 'Flap Gate Outfall' : i === 1 ? 'Submerged Siphon' : 'Gravity Channel',
    });
  }

  return nodes;
}

export function generateInitialHistory(): SensorHistoryPoint[] {
  const points: SensorHistoryPoint[] = [];
  const now = new Date();
  const stepCount = 12; // last 60 minutes in 5-min intervals

  let rain = 28;
  let waterLevel = 18;

  for (let i = stepCount; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000);
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');

    // Simulate rising storm trend
    const stepGrowth = (stepCount - i) * 1.8;
    rain = Math.max(5, Math.min(95, Math.round(25 + stepGrowth + (Math.random() * 10 - 4))));
    const runoff = Math.round((rain * 0.78 * 0.85 + Math.random() * 4) * 10) / 10;
    waterLevel = Math.max(8, Math.min(110, Math.round(15 + stepGrowth * 1.6 + (Math.random() * 6 - 2))));
    const drainLoad = Math.min(100, Math.round(35 + stepGrowth * 3.5 + Math.random() * 8));

    points.push({
      timestamp: `${hours}:${minutes}`,
      rainfallMmHr: rain,
      waterLevelCm: waterLevel,
      runoffM3s: runoff,
      drainLoadPct: drainLoad,
    });
  }

  return points;
}

export function generateNowcastTimeline(currentRiskScore: number, currentWaterLevelCm: number): NowcastInterval[] {
  const intervals: { label: string; probOffset: number; depthFactor: number }[] = [
    { label: 'Now', probOffset: 0, depthFactor: 1.0 },
    { label: '+30m', probOffset: 12, depthFactor: 1.25 },
    { label: '+60m', probOffset: 22, depthFactor: 1.48 },
    { label: '+90m', probOffset: 18, depthFactor: 1.55 },
    { label: '+120m', probOffset: 8, depthFactor: 1.35 },
    { label: '+150m', probOffset: -5, depthFactor: 1.15 },
    { label: '+180m', probOffset: -18, depthFactor: 0.85 },
  ];

  return intervals.map((intv) => {
    const prob = Math.max(5, Math.min(98, Math.round(currentRiskScore + intv.probOffset)));
    const depth = Math.max(5, Math.round(currentWaterLevelCm * intv.depthFactor));
    return {
      label: intv.label,
      probability: prob,
      expectedDepthCm: depth,
      riskLevel: getRiskLevel(prob),
    };
  });
}

export function generateDestinations(centerLat: number, centerLng: number): DestinationPreset[] {
  return [
    {
      id: 'dest-shelter',
      name: 'District Community Flood Relief Camp',
      type: 'shelter',
      lat: centerLat + 0.015,
      lng: centerLng + 0.012,
      elevationM: 26.5,
      capacityNotes: 'Bed capacity: 450 | Medical triage on site',
    },
    {
      id: 'dest-hospital',
      name: 'Apex Government Medical Center & Trauma',
      type: 'hospital',
      lat: centerLat - 0.012,
      lng: centerLng + 0.016,
      elevationM: 24.2,
      capacityNotes: 'Critical ICU operational | Emergency ramp open',
    },
    {
      id: 'dest-transit',
      name: 'Central Elevated Metro Terminal (Line 2)',
      type: 'transit',
      lat: centerLat + 0.018,
      lng: centerLng - 0.014,
      elevationM: 31.0,
      capacityNotes: 'Dry concourse | Feeder buses to relief stations',
    },
    {
      id: 'dest-highground',
      name: 'Civic Ridge Sports Complex (Safe High-Ground)',
      type: 'highground',
      lat: centerLat - 0.019,
      lng: centerLng - 0.018,
      elevationM: 34.8,
      capacityNotes: 'Natural ridge elevation >30m MSL | Helipad available',
    },
  ];
}

/**
 * Advance the simulation by one nowcasting cycle
 */
export function advanceSimulation(
  prevMetrics: PipelineMetrics,
  zones: FloodRiskZone[],
  drains: DrainNode[],
  history: SensorHistoryPoint[],
  isCloudburstActive: boolean
): {
  metrics: PipelineMetrics;
  zones: FloodRiskZone[];
  drains: DrainNode[];
  history: SensorHistoryPoint[];
  nowcast: NowcastInterval[];
  newAlert?: AlertItem;
} {
  // Step 1: Doppler Radar Rainfall
  let rainTarget = isCloudburstActive ? 85 : 45;
  const rainJitter = (Math.random() - 0.48) * 8;
  const newRain = Math.max(8, Math.min(125, Math.round(prevMetrics.dopplerRainfallMmHr * 0.85 + rainTarget * 0.15 + rainJitter)));
  const radarDbz = Math.round(15 + (newRain / 100) * 45);

  // Step 2: DEM & Surface Model
  const imperviousCover = 78; // 78% impervious concrete/asphalt

  // Step 3: Runoff estimation (Rational formula Q = C * I * A / 360)
  const runoff = Math.round(((0.78 * newRain * 12.4) / 10 + (Math.random() * 2 - 1)) * 10) / 10;

  // Step 4: Drainage Graph Model
  // update drain nodes
  const updatedDrains = drains.map((d) => {
    let delta = (Math.random() - 0.45) * 4;
    if (newRain > 60) delta += 3;
    const newLoadPct = Math.max(15, Math.min(100, Math.round(d.loadPercentage + delta)));
    const status: 'Clear' | 'Partial' | 'Blocked' =
      newLoadPct >= 88 ? 'Blocked' : newLoadPct >= 65 ? 'Partial' : 'Clear';
    const newCurrentLoad = Math.round(((d.capacityM3s * newLoadPct) / 100) * 10) / 10;
    return {
      ...d,
      loadPercentage: newLoadPct,
      currentLoadM3s: newCurrentLoad,
      status,
    };
  });

  const totalDrainCapacity = drains.reduce((sum, d) => sum + d.capacityM3s, 0);
  const avgDrainLoadPct = Math.round(
    updatedDrains.reduce((sum, d) => sum + d.loadPercentage, 0) / updatedDrains.length
  );
  const blockedCount = updatedDrains.filter((d) => d.status === 'Blocked').length;
  const networkBlockagePct = Math.round((blockedCount / updatedDrains.length) * 100);

  // Step 5: Water Level Calculation
  // Inundation rate derived from runoff vs active drainage capacity
  const effectiveDrainOutput = (totalDrainCapacity * (100 - networkBlockagePct * 0.7)) / 100;
  const netInflow = runoff - effectiveDrainOutput * 0.25;
  const levelDelta = Math.round(netInflow * 0.45 + (newRain > 50 ? 2 : -1));
  const newWaterLevel = Math.max(10, Math.min(140, prevMetrics.waterLevelCm + levelDelta));
  const rateOfRise = levelDelta * 4; // cm/hr rate

  // Step 6: AI Flood Risk Score
  const aiScore = Math.min(
    100,
    Math.max(
      8,
      Math.round(
        (newWaterLevel / 95) * 45 +
        (newRain / 80) * 30 +
        (avgDrainLoadPct / 100) * 20 +
        (networkBlockagePct / 100) * 5
      )
    )
  );

  const overallRisk = getRiskLevel(aiScore);

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  const shortTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const metrics: PipelineMetrics = {
    dopplerRainfallMmHr: newRain,
    radarReflectivityDbz: radarDbz,
    demElevationMeanM: 18.4,
    imperviousCoverPct: imperviousCover,
    runoffRateM3s: runoff,
    drainCapacityM3s: Math.round(totalDrainCapacity * 10) / 10,
    drainLoadPct: avgDrainLoadPct,
    networkBlockagePct,
    waterLevelCm: newWaterLevel,
    rateOfRiseCmHr: rateOfRise,
    aiRiskScore: aiScore,
    overallRiskLevel: overallRisk,
    lastUpdated: timeStr,
  };

  // Update zones proportionally
  const updatedZones = zones.map((z, idx) => {
    const jitter = (Math.random() - 0.45) * 5;
    const factor = z.runoffCoefficient / 0.78;
    const zRiskPct = Math.max(
      8,
      Math.min(99, Math.round(aiScore * factor * (idx === 0 ? 1.15 : idx === 1 ? 1.05 : 0.85) + jitter))
    );
    const zRisk = getRiskLevel(zRiskPct);
    const zDepth = Math.round((newWaterLevel * (zRiskPct / 65)) * 10) / 10;
    const zEta = zRisk === 'Severe' ? Math.max(5, z.etaMinutes - 2) : z.etaMinutes;

    return {
      ...z,
      riskPercentage: zRiskPct,
      riskLevel: zRisk,
      predictedWaterLevelCm: zDepth,
      etaMinutes: zEta,
    };
  });

  // Append history
  const newHistory = [
    ...history.slice(-14),
    {
      timestamp: shortTimeStr,
      rainfallMmHr: newRain,
      waterLevelCm: newWaterLevel,
      runoffM3s: runoff,
      drainLoadPct: avgDrainLoadPct,
    },
  ];

  // Nowcast timeline
  const nowcast = generateNowcastTimeline(aiScore, newWaterLevel);

  // Generate alert if severe or high
  let newAlert: AlertItem | undefined = undefined;
  const severeZones = updatedZones.filter((z) => z.riskLevel === 'Severe');
  const highZones = updatedZones.filter((z) => z.riskLevel === 'High');

  if (severeZones.length > 0 && Math.random() > 0.4) {
    const targetZone = severeZones[0];
    newAlert = {
      id: `alert-${Date.now()}`,
      timestamp: shortTimeStr,
      severity: 'Severe',
      title: '🚨 CRITICAL FLASH FLOOD INUNDATION',
      message: `Severe flooding imminent at ${targetZone.name}! Predicted depth: ${targetZone.predictedWaterLevelCm}cm. Siltation choking ${targetZone.affectedDrains.join(', ')}. Avoid travel.`,
      zoneName: targetZone.name,
      acknowledged: false,
    };
  } else if (highZones.length > 0 && Math.random() > 0.6) {
    const targetZone = highZones[0];
    newAlert = {
      id: `alert-${Date.now()}`,
      timestamp: shortTimeStr,
      severity: 'High',
      title: '⚠️ Urban Flood Early Warning',
      message: `High runoff risk detected in ${targetZone.name}. Water level rising at ${rateOfRise > 0 ? `+${rateOfRise}cm/hr` : 'steady pace'}. Caution on underpass routes.`,
      zoneName: targetZone.name,
      acknowledged: false,
    };
  }

  return {
    metrics,
    zones: updatedZones,
    drains: updatedDrains,
    history: newHistory,
    nowcast,
    newAlert,
  };
}
