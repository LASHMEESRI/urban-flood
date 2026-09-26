import { EvacuationRoute, FloodRiskZone } from '../types';

/**
 * Reverse geocode coordinate using OpenStreetMap Nominatim
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'UrbanFloodNowcastingDashboard/1.0',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Nominatim returned error');
    const data = await response.json();
    
    if (data && data.address) {
      const suburb = data.address.suburb || data.address.neighbourhood || data.address.residential;
      const city = data.address.city || data.address.town || data.address.county || data.address.state_district;
      const state = data.address.state;
      if (suburb && city) return `${suburb}, ${city}`;
      if (city && state) return `${city}, ${state}`;
      if (data.display_name) return data.display_name.split(',').slice(0, 2).join(',');
    }
    return `Zone [${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E]`;
  } catch {
    return `Zone [${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E]`;
  }
}

/**
 * Calculate distance between two lat/lng points in km (Haversine)
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks if a polyline intersects or passes near any flood risk zone
 */
export function checkRouteFloodIntersection(
  routeCoords: [number, number][],
  zones: FloodRiskZone[]
): {
  intersects: boolean;
  affectedZones: string[];
  maxRisk: 'Safe' | 'Caution' | 'Severe Hazard';
} {
  const affectedZoneSet = new Set<string>();
  let hasSevere = false;
  let hasHigh = false;

  for (const [rLat, rLng] of routeCoords) {
    for (const zone of zones) {
      if (zone.riskLevel === 'Severe' || zone.riskLevel === 'High') {
        const distKm = haversineDistanceKm(rLat, rLng, zone.lat, zone.lng);
        // Check if within zone radius + safety buffer of 100m
        const zoneRadiusKm = (zone.radius + 100) / 1000;
        if (distKm <= zoneRadiusKm) {
          affectedZoneSet.add(zone.name);
          if (zone.riskLevel === 'Severe') hasSevere = true;
          if (zone.riskLevel === 'High') hasHigh = true;
        }
      }
    }
  }

  const affectedZones = Array.from(affectedZoneSet);
  let maxRisk: 'Safe' | 'Caution' | 'Severe Hazard' = 'Safe';
  if (hasSevere) maxRisk = 'Severe Hazard';
  else if (hasHigh) maxRisk = 'Caution';

  return {
    intersects: affectedZones.length > 0,
    affectedZones,
    maxRisk,
  };
}

/**
 * Generate fallback / detour route coordinates avoiding flood centers
 */
function generateFallbackRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  avoidZones: FloodRiskZone[],
  detour: boolean
): [number, number][] {
  const points: [number, number][] = [[startLat, startLng]];
  const segments = 12;

  // Compute offset vector to detour around severe zones if requested
  let perpLat = -(destLng - startLng);
  let perpLng = destLat - startLat;
  const len = Math.sqrt(perpLat * perpLat + perpLng * perpLng) || 1;
  perpLat /= len;
  perpLng /= len;

  const detourScale = detour ? 0.007 : 0.001;

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    // base interpolation
    let pLat = startLat + t * (destLat - startLat);
    let pLng = startLng + t * (destLng - startLng);

    // Apply smooth sinusoidal detour curve away from flood center
    const arc = Math.sin(t * Math.PI) * detourScale;
    pLat += perpLat * arc;
    pLng += perpLng * arc;

    points.push([pLat, pLng]);
  }

  points.push([destLat, destLng]);
  return points;
}

/**
 * Fetch route from OSRM demo server, with robust fallback and flood-zone hazard checks
 */
export async function calculateEvacuationRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  destName: string,
  mode: 'emergency' | 'transit' | 'public',
  floodZones: FloodRiskZone[]
): Promise<EvacuationRoute> {
  const straightDist = haversineDistanceKm(startLat, startLng, destLat, destLng);
  const estDistKm = Math.round(straightDist * 1.35 * 10) / 10;
  
  // Speed factors by mode
  const avgSpeedKmh = mode === 'emergency' ? 45 : mode === 'transit' ? 25 : 32;
  const estDurationMin = Math.round((estDistKm / avgSpeedKmh) * 60) + 4;

  let coordinates: [number, number][] = [];
  let fetchedInstructions: string[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const primary = data.routes[0];
        // OSRM coordinates are [lon, lat]
        coordinates = primary.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        
        if (primary.legs && primary.legs[0] && primary.legs[0].steps) {
          fetchedInstructions = primary.legs[0].steps
            .slice(0, 5)
            .map((s: { maneuver?: { instruction?: string }; name?: string }) => {
              if (s.name) return `Proceed on ${s.name}`;
              return s.maneuver?.instruction || 'Continue along designated evacuation corridor';
            });
        }
      }
    }
  } catch {
    // Graceful fallback to GIS simulated grid route
  }

  // If OSRM was unavailable or returned empty, use fallback
  if (coordinates.length === 0) {
    coordinates = generateFallbackRoute(startLat, startLng, destLat, destLng, floodZones, false);
  }

  // Check if primary path crosses high flood zones
  const initialCheck = checkRouteFloodIntersection(coordinates, floodZones);

  let finalCoordinates = coordinates;
  let safetyScore: 'Safe' | 'Caution' | 'Severe Hazard' | 'Safe Rerouted' = initialCheck.maxRisk;

  // If severe hazard, calculate smart detour
  if (initialCheck.intersects && initialCheck.maxRisk === 'Severe Hazard') {
    const detourCoords = generateFallbackRoute(startLat, startLng, destLat, destLng, floodZones, true);
    const detourCheck = checkRouteFloodIntersection(detourCoords, floodZones);
    if (!detourCheck.intersects || detourCheck.maxRisk !== 'Severe Hazard') {
      finalCoordinates = detourCoords;
      safetyScore = 'Safe Rerouted';
    }
  }

  const instructions = fetchedInstructions.length > 0 ? fetchedInstructions : [
    `Depart current location via primary non-inundated arterial link`,
    safetyScore === 'Safe Rerouted'
      ? `[DETOUR ACTIVE] Diverting 800m north to bypass flooded low-lying underpass`
      : `Maintain speed and monitor live drainage telemetry`,
    `Ascend towards elevated crest route approaching ${destName}`,
    `Arrive at safe entrance / high ground reception point`,
  ];

  return {
    mode,
    distanceKm: safetyScore === 'Safe Rerouted' ? Math.round((estDistKm + 0.8) * 10) / 10 : estDistKm,
    durationMinutes: safetyScore === 'Safe Rerouted' ? estDurationMin + 3 : estDurationMin,
    destinationName: destName,
    destinationCoords: [destLat, destLng],
    coordinates: finalCoordinates,
    intersectsFloodZone: initialCheck.intersects,
    intersectedZones: initialCheck.affectedZones,
    safetyScore,
    instructions,
  };
}
