import React, { useEffect, useRef, useState } from "react";

import L from "leaflet";

import {
  Layers,
  Crosshair,
  Navigation,
  Compass,
  Plus,
  Minus,
  Camera,
  X,
  Waves,
} from "lucide-react";

import { DrainNode, EvacuationRoute, FloodRiskZone } from "../types";

import { calculateOfflineRisk } from "../services/offlineRiskEngine";

import type { FloodRiskResult } from "../services/floodRiskService";

import {
  loadRainfallFeatures,
  type RainfallFeatureRecord,
} from "../services/rainfallFeatureService";

import {
  calculateRainfallNowcast,
  type NowcastHorizon,
  type RainfallNowcast,
} from "../services/nowcastService";

import {
  calculateNowcastRisk,
  type NowcastRiskSnapshot,
} from "../services/nowcastRiskService";

export type GoogleTileType =
  | "google-roadmap"
  | "google-satellite"
  | "google-terrain"
  | "google-traffic"
  | "dark"
  | "osm";

interface ChennaiGridCell {
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

interface MapContainerProps {
  userLocation: [number, number];
  floodZones: FloodRiskZone[];
  drainNodes: DrainNode[];
  activeRoute: EvacuationRoute | null;
  onSelectZone: (zone: FloodRiskZone) => void;
  onSelectDrain?: (drain: DrainNode) => void;
  onMapClickDestination?: (coords: [number, number]) => void;
  isDestinationPickingMode: boolean;
  onOpenDirections?: (zone?: FloodRiskZone) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  userLocation,
  floodZones,
  drainNodes,
  activeRoute,
  onSelectZone,
  onSelectDrain,
  onMapClickDestination,
  isDestinationPickingMode,
  onOpenDirections,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const zonesLayerRef = useRef<L.LayerGroup | null>(null);
  const drainsLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const radarLayerRef = useRef<L.LayerGroup | null>(null);
  const gridLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeTile, setActiveTile] =
    useState<GoogleTileType>("google-roadmap");

  const [showDrains, setShowDrains] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showOfflinePanel, setShowOfflinePanel] = useState(false);
  const [showStreetViewModal, setShowStreetViewModal] = useState(false);

  const [streetViewTarget, setStreetViewTarget] =
    useState<FloodRiskZone | null>(null);

  // ---------------------------------------------------------------------------
  // Offline dynamic risk results
  // ---------------------------------------------------------------------------

  const [offlineRiskResults, setOfflineRiskResults] = useState<
    Map<number, FloodRiskResult>
  >(new Map());

  // ---------------------------------------------------------------------------
  // Offline rainfall feature dataset + timestamp selector
  // ---------------------------------------------------------------------------

  const [rainfallRecords, setRainfallRecords] = useState<
    RainfallFeatureRecord[]
  >([]);

  const [selectedTimestamp, setSelectedTimestamp] = useState<string>("");

  const [isRainfallLoading, setIsRainfallLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Offline nowcast state
  // ---------------------------------------------------------------------------

  const [selectedNowcastHorizon, setSelectedNowcastHorizon] =
    useState<NowcastHorizon>(15);

  const [nowcastRiskResults, setNowcastRiskResults] = useState<
    Map<number, FloodRiskResult>
  >(new Map());

  const [nowcastSnapshot, setNowcastSnapshot] =
    useState<NowcastRiskSnapshot | null>(null);

  const [isNowcastLoading, setIsNowcastLoading] = useState(false);

  const [riskViewMode, setRiskViewMode] = useState<"CURRENT" | "NOWCAST">(
    "NOWCAST",
  );

  // ---------------------------------------------------------------------------
  // Tile configurations
  // ---------------------------------------------------------------------------

  const TILE_URLS: Record<
    GoogleTileType,
    {
      url: string;
      attribution: string;
      maxZoom: number;
      subdomains?: string[];
    }
  > = {
    "google-roadmap": {
      url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      attribution: "&copy; Google Maps",
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    },

    "google-satellite": {
      url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      attribution: "&copy; Google Maps Satellite",
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    },

    "google-terrain": {
      url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
      attribution: "&copy; Google Maps Terrain",
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    },

    "google-traffic": {
      url: "https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}",
      attribution: "&copy; Google Maps Traffic",
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    },

    dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: "&copy; CARTO &copy; OSM",
      maxZoom: 19,
      subdomains: ["a", "b", "c", "d"],
    },

    osm: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
      subdomains: ["a", "b", "c"],
    },
  };

  // ---------------------------------------------------------------------------
  // Flood zone colors
  // ---------------------------------------------------------------------------

  const getZoneColors = (level: string) => {
    switch (level) {
      case "Severe":
        return {
          color: "#EA4335",
          fill: "#EA4335",
          opacity: 0.45,
          text: "#d93025",
        };

      case "High":
        return {
          color: "#FBBC04",
          fill: "#FA7B17",
          opacity: 0.4,
          text: "#e37400",
        };

      case "Moderate":
        return {
          color: "#F9AB00",
          fill: "#FBBC04",
          opacity: 0.35,
          text: "#b06000",
        };

      default:
        return {
          color: "#34A853",
          fill: "#34A853",
          opacity: 0.28,
          text: "#188038",
        };
    }
  };

  // ---------------------------------------------------------------------------
  // Offline dynamic risk colors
  // ---------------------------------------------------------------------------

  const getOfflineRiskColor = (risk: string) => {
    switch (risk) {
      case "CRITICAL":
        return {
          color: "#EA4335",
          label: "CRITICAL",
        };

      case "HIGH":
        return {
          color: "#FB8C00",
          label: "HIGH",
        };

      case "MODERATE":
        return {
          color: "#F9AB00",
          label: "MODERATE",
        };

      default:
        return {
          color: "#34A853",
          label: "LOW",
        };
    }
  };

  // ---------------------------------------------------------------------------
  // 1. Initialize Leaflet map
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: userLocation,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    const tileConfig = TILE_URLS["google-roadmap"];

    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || ["mt0", "mt1", "mt2", "mt3"],
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    zonesLayerRef.current = L.layerGroup().addTo(map);

    drainsLayerRef.current = L.layerGroup().addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);

    radarLayerRef.current = L.layerGroup().addTo(map);

    gridLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (onMapClickDestination) {
        onMapClickDestination([e.latlng.lat, e.latlng.lng]);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Base tile switch
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) {
      return;
    }

    const map = mapInstanceRef.current;

    map.removeLayer(tileLayerRef.current);

    const config = TILE_URLS[activeTile];

    const newLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || ["mt0", "mt1", "mt2", "mt3"],
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [activeTile]);

  // ---------------------------------------------------------------------------
  // 3. User GPS marker
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }

    const userHtml = `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="absolute inline-flex h-8 w-8 rounded-full bg-[#1a73e8] opacity-25 animate-ping"></span>

        <div class="relative w-4 h-4 rounded-full bg-[#1a73e8] border-2 border-white shadow-md flex items-center justify-center">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userHtml,
      className: "google-gps-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker(userLocation, {
      icon: userIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    marker.bindPopup(`
      <div class="p-3 bg-white text-gray-900 rounded-xl shadow-lg border border-gray-100 min-w-[210px] font-sans">

        <div class="flex items-center gap-2 border-b border-gray-100 pb-2 mb-2">
          <div class="w-3 h-3 rounded-full bg-[#1a73e8]"></div>

          <span class="font-bold text-sm text-[#1a73e8]">
            Your Location
          </span>
        </div>

        <div class="text-xs text-gray-600">
          Smart City Live GPS:
        </div>

        <div class="font-mono text-xs text-gray-900 font-semibold mt-0.5">
          ${userLocation[0].toFixed(5)}°N,
          ${userLocation[1].toFixed(5)}°E
        </div>

        <div class="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span>Nowcasting Telemetry Node</span>

          <span class="text-emerald-600 font-semibold">
            Active
          </span>
        </div>

      </div>
    `);

    userMarkerRef.current = marker;
  }, [userLocation]);

  // ---------------------------------------------------------------------------
  // 4. Load offline rainfall feature dataset
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    setIsRainfallLoading(true);

    loadRainfallFeatures()
      .then((data) => {
        if (cancelled) return;

        setRainfallRecords(data);

        if (data.length > 0) {
          setSelectedTimestamp(data[data.length - 1].timestamp);
        }

        setIsRainfallLoading(false);

        console.log(
          "OFFLINE RAINFALL FEATURES LOADED",
          "Records:",
          data.length,
          "Default timestamp:",
          data[data.length - 1]?.timestamp,
        );
      })
      .catch((error) => {
        console.error("OFFLINE RAINFALL FEATURES FAILED:", error);

        setIsRainfallLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 5. Calculate OFFLINE dynamic flood risk for selected timestamp
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!selectedTimestamp) return;

    let cancelled = false;

    calculateOfflineRisk(selectedTimestamp)
      .then((snapshot) => {
        if (cancelled) return;

        const resultMap = new Map<number, FloodRiskResult>();

        snapshot.results.forEach((result) => {
          resultMap.set(result.grid_id, result);
        });

        // Only 1-hour rainfall is used for the
        // displayed current rainfall value.
        //
        // 3-hour and 6-hour rainfall are already
        // used internally by floodRiskService.ts
        // for the dynamic risk calculation.

        const rainfallValues = [
          snapshot.rainfall.Mylapore_1hr,
          snapshot.rainfall.RedHills_1hr,
          snapshot.rainfall.Tharamani_1hr,
        ].filter((value): value is number => value != null);

        const rainfallMean =
          rainfallValues.length > 0
            ? rainfallValues.reduce((sum, value) => sum + value, 0) /
              rainfallValues.length
            : 0;

        setOfflineRiskResults(resultMap);

        console.log(
          "OFFLINE MAP RISK LOADED",
          "Rainfall timestamp:",
          snapshot.rainfall.timestamp,
          "1H Rainfall:",
          rainfallMean,
          "Grid cells:",
          snapshot.results.length,
        );
      })
      .catch((error) => {
        console.error("OFFLINE MAP RISK FAILED:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTimestamp]);

  // ---------------------------------------------------------------------------
  // 6. Calculate OFFLINE 15 / 30 / 60 minute nowcast risk
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!selectedTimestamp) return;

    const selectedRecord = rainfallRecords.find(
      (record) => record.timestamp === selectedTimestamp,
    );

    if (!selectedRecord) return;

    let cancelled = false;

    setIsNowcastLoading(true);

    fetch("/chennai_grid_data.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load Chennai grid data: ${response.status}`,
          );
        }

        return response.json() as Promise<ChennaiGridCell[]>;
      })
      .then((gridData) => {
        if (cancelled) return;

        const nowcast: RainfallNowcast = calculateRainfallNowcast(
          selectedRecord,
          selectedNowcastHorizon,
        );

        const snapshot = calculateNowcastRisk(gridData, nowcast);

        const resultMap = new Map<number, FloodRiskResult>();

        snapshot.results.forEach((result) => {
          resultMap.set(result.grid_id, result);
        });

        setNowcastSnapshot(snapshot);
        setNowcastRiskResults(resultMap);
        setIsNowcastLoading(false);

        console.log(
          "OFFLINE NOWCAST RISK LOADED",
          "Base:",
          snapshot.baseTimestamp,
          "Forecast:",
          snapshot.forecastTimestamp,
          "Horizon:",
          `${snapshot.horizon} min`,
          "Grid cells:",
          snapshot.results.length,
          "Method:",
          snapshot.method,
        );
      })
      .catch((error) => {
        console.error("OFFLINE NOWCAST RISK FAILED:", error);

        if (!cancelled) {
          setIsNowcastLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTimestamp, selectedNowcastHorizon, rainfallRecords]);

  // ---------------------------------------------------------------------------
  // 7. Render REAL Chennai 861-cell GIS grid + CURRENT / NOWCAST RISK
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!gridLayerRef.current) return;

    const layer = gridLayerRef.current;

    layer.clearLayers();

    if (!showGrid) return;

    let cancelled = false;

    fetch("/chennai_grid_data.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load grid data: ${response.status}`);
        }

        return response.json();
      })
      .then((gridData: ChennaiGridCell[]) => {
        if (cancelled) return;

        console.log(`Loaded ${gridData.length} Chennai GIS grid cells`);

        gridData.forEach((cell) => {
          const cellSize = 0.005;

          const bounds: L.LatLngBoundsExpression = [
            [cell.center_lat - cellSize, cell.center_lon - cellSize],
            [cell.center_lat + cellSize, cell.center_lon + cellSize],
          ];

          const currentRisk = offlineRiskResults.get(cell.grid_id);
          const nowcastRisk = nowcastRiskResults.get(cell.grid_id);

          const displayRisk =
            riskViewMode === "NOWCAST" ? nowcastRisk : currentRisk;

          const risk = displayRisk
            ? getOfflineRiskColor(displayRisk.risk)
            : {
                color: "#9CA3AF",
                label: "CALCULATING",
              };

          const displayTitle =
            riskViewMode === "NOWCAST"
              ? `Offline Nowcast +${selectedNowcastHorizon} min`
              : "Offline Current Risk";

          const displayTimestamp =
            riskViewMode === "NOWCAST"
              ? (nowcastSnapshot?.forecastTimestamp ?? "Calculating...")
              : (displayRisk?.timestamp ?? selectedTimestamp);

          const rectangle = L.rectangle(bounds, {
            color: risk.color,
            weight: 0.9,
            opacity: 0.85,
            fillColor: risk.color,
            fillOpacity: 0.25,
          });

          const popupHtml = `
              <div
                class="p-3 bg-white text-gray-900 rounded-xl shadow-xl border border-gray-100 min-w-[250px] font-sans"
              >

                <div
                  class="flex items-center justify-between border-b border-gray-100 pb-2 mb-2"
                >

                  <div>
                    <div class="font-bold text-sm">
                      Chennai Grid ${cell.grid_id}
                    </div>

                    <div class="text-[10px] text-gray-500 mt-0.5">
                      ${displayTitle}
                    </div>
                  </div>

                  <span
                    class="px-2 py-1 rounded-full text-[10px] font-bold text-white"
                    style="background-color: ${risk.color}"
                  >
                    ${risk.label}
                  </span>

                </div>

                ${
                  displayRisk
                    ? `
                      <div class="mb-2 px-2 py-2 bg-gray-50 rounded-lg">

                        <div class="flex justify-between text-xs">
                          <span class="text-gray-500">
                            Final Risk Score
                          </span>

                          <strong>
                            ${displayRisk.final_score.toFixed(1)} / 100
                          </strong>
                        </div>

                        <div class="flex justify-between text-xs mt-1">
                          <span class="text-gray-500">
                            1H Rainfall
                          </span>

                          <strong>
                            ${
                              displayRisk.rainfall_1hr_mm !== null
                                ? `${displayRisk.rainfall_1hr_mm.toFixed(1)} mm`
                                : "N/A"
                            }
                          </strong>
                        </div>

                        <div class="flex justify-between text-xs mt-1">
                          <span class="text-gray-500">
                            3H Rainfall
                          </span>

                          <strong>
                            ${
                              displayRisk.rainfall_3hr_mm !== null
                                ? `${displayRisk.rainfall_3hr_mm.toFixed(1)} mm`
                                : "N/A"
                            }
                          </strong>
                        </div>

                        <div class="flex justify-between text-xs mt-1">
                          <span class="text-gray-500">
                            6H Rainfall
                          </span>

                          <strong>
                            ${
                              displayRisk.rainfall_6hr_mm !== null
                                ? `${displayRisk.rainfall_6hr_mm.toFixed(1)} mm`
                                : "N/A"
                            }
                          </strong>
                        </div>

                        <div class="flex justify-between text-xs mt-1">
                          <span class="text-gray-500">
                            Static Score
                          </span>

                          <strong>
                            ${displayRisk.static_score.toFixed(1)}
                          </strong>
                        </div>

                        <div class="flex justify-between text-xs mt-1">
                          <span class="text-gray-500">
                            Dynamic Score
                          </span>

                          <strong>
                            ${displayRisk.dynamic_score.toFixed(1)}
                          </strong>
                        </div>

                        <div class="text-[10px] text-gray-500 mt-2 pt-1.5 border-t border-gray-200">
                          Rainfall time:
                          ${displayTimestamp}
                        </div>

                      </div>
                    `
                    : `
                      <div class="text-xs text-gray-500 mb-2">
                        Calculating offline risk...
                      </div>
                    `
                }

                <div class="space-y-1.5 text-xs">

                  <div class="flex justify-between">
                    <span class="text-gray-500">
                      Historical Risk
                    </span>

                    <strong>
                      ${cell.historical_risk}
                    </strong>
                  </div>

                  <div class="flex justify-between">
                    <span class="text-gray-500">
                      Elevation
                    </span>

                    <strong>
                      ${cell.elevation_m.toFixed(2)} m
                    </strong>
                  </div>

                  <div class="flex justify-between">
                    <span class="text-gray-500">
                      Slope
                    </span>

                    <strong>
                      ${cell.slope_degree.toFixed(2)}°
                    </strong>
                  </div>

                  <div class="flex justify-between">
                    <span class="text-gray-500">
                      Imperviousness
                    </span>

                    <strong>
                      ${cell.imperviousness_percent.toFixed(1)}%
                    </strong>
                  </div>

                  <div class="flex justify-between">
                    <span class="text-gray-500">
                      Land Cover
                    </span>

                    <strong>
                      Class ${cell.landcover_class}
                    </strong>
                  </div>

                  <div class="flex justify-between">
                    <span class="text-gray-500">
                      Coordinates
                    </span>

                    <strong class="font-mono text-[10px]">
                      ${cell.center_lat.toFixed(5)},
                      ${cell.center_lon.toFixed(5)}
                    </strong>
                  </div>

                </div>

                <div
                  class="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500"
                >
                  ${
                    riskViewMode === "NOWCAST"
                      ? "Persistence baseline nowcast • not ML"
                      : "Offline GIS + rainfall risk engine"
                  }
                </div>

              </div>
            `;

          rectangle.bindPopup(popupHtml, {
            className: "google-maps-popup",
          });

          layer.addLayer(rectangle);
        });
      })
      .catch((error) => {
        console.error("Chennai grid data loading error:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [
    showGrid,
    offlineRiskResults,
    nowcastRiskResults,
    riskViewMode,
    selectedNowcastHorizon,
    nowcastSnapshot,
    selectedTimestamp,
  ]);

  // ---------------------------------------------------------------------------
  // 7. Render flood risk zones
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!zonesLayerRef.current) return;

    const layer = zonesLayerRef.current;

    layer.clearLayers();

    if (!showZones) return;

    floodZones.forEach((zone) => {
      const colors = getZoneColors(zone.riskLevel);

      let shape: L.Polygon | L.Circle;

      if (zone.polygonCoords && zone.polygonCoords.length > 0) {
        shape = L.polygon(zone.polygonCoords, {
          color: colors.color,
          weight: zone.riskLevel === "Severe" ? 2.5 : 1.5,
          fillColor: colors.fill,
          fillOpacity: colors.opacity,
          dashArray: zone.riskLevel === "Severe" ? "4, 4" : undefined,
        });
      } else {
        shape = L.circle([zone.lat, zone.lng], {
          radius: zone.radius,
          color: colors.color,
          weight: 2,
          fillColor: colors.fill,
          fillOpacity: colors.opacity,
        });
      }

      const popupHtml = `
        <div
          class="bg-white text-gray-900 rounded-2xl shadow-xl overflow-hidden font-sans border border-gray-100 min-w-[240px]"
        >

          <div
            class="h-2"
            style="background-color: ${colors.color}"
          ></div>

          <div class="p-3.5 space-y-2">

            <div class="flex items-start justify-between gap-2">

              <div>
                <h4 class="font-bold text-sm text-gray-900 leading-tight">
                  ${zone.name}
                </h4>

                <p class="text-[11px] text-gray-500 mt-0.5">
                  ${zone.landCover}
                  • Elevation
                  ${zone.elevationMeters}m MSL
                </p>
              </div>

              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
                style="background-color: ${colors.color}"
              >
                ${zone.riskLevel}
              </span>

            </div>

            <div
              class="grid grid-cols-2 gap-2 py-1.5 px-2 bg-gray-50 rounded-xl text-xs"
            >

              <div>
                <span class="text-[10px] text-gray-500 uppercase block font-medium">
                  Water Depth
                </span>

                <span class="font-bold text-gray-900 text-sm">
                  ${zone.predictedWaterLevelCm} cm
                </span>
              </div>

              <div>
                <span class="text-[10px] text-gray-500 uppercase block font-medium">
                  ETA to Peak
                </span>

                <span class="font-bold text-amber-600 text-sm">
                  ~${zone.etaMinutes} mins
                </span>
              </div>

            </div>

            <div class="flex items-center gap-1.5 pt-1">

              <button
                onclick="window.dispatchEvent(new CustomEvent('open-zone-directions', { detail: '${zone.id}' }))"
                class="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Directions
              </button>

              <button
                onclick="window.dispatchEvent(new CustomEvent('open-zone-inspect', { detail: '${zone.id}' }))"
                class="py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-semibold transition-colors cursor-pointer"
              >
                Inspect
              </button>

            </div>

          </div>
        </div>
      `;

      shape.bindPopup(popupHtml, {
        className: "google-maps-popup",
      });

      shape.on("click", () => {
        onSelectZone(zone);
      });

      layer.addLayer(shape);

      const pinHtml = `
        <div class="flex flex-col items-center cursor-pointer group">

          <div
            class="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full shadow-md border border-gray-200 text-[10px] font-bold text-gray-800 whitespace-nowrap mb-0.5 group-hover:scale-105 transition-transform"
          >

            <span
              class="w-2 h-2 rounded-full"
              style="background-color: ${colors.color}"
            ></span>

            <span>
              ${zone.predictedWaterLevelCm}cm
            </span>

          </div>

          <svg
            class="w-7 h-9 drop-shadow-md"
            viewBox="0 0 24 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >

            <path
              d="M12 0C5.37258 0 0 5.37258 0 12C0 19.5 10.5 30.5 11.25 31.3C11.65 31.7 12.35 31.7 12.75 31.3C13.5 30.5 24 19.5 24 12C24 5.37258 18.6274 0 12 0Z"
              fill="${colors.color}"
            />

            <circle
              cx="12"
              cy="11"
              r="5"
              fill="white"
            />

            <path
              d="M10 11C10 9.89543 10.8954 9 12 9C13.1046 9 14 9.8954 14 11C14 12.1046 12 14.5 12 14.5C12 14.5 10 12.1046 10 11Z"
              fill="${colors.color}"
            />

          </svg>

        </div>
      `;

      const pinIcon = L.divIcon({
        html: pinHtml,
        className: "google-maps-zone-pin",
        iconSize: [40, 52],
        iconAnchor: [20, 50],
      });

      const pinMarker = L.marker([zone.lat, zone.lng], {
        icon: pinIcon,
      });

      pinMarker.bindPopup(popupHtml, {
        className: "google-maps-popup",
      });

      pinMarker.on("click", () => {
        onSelectZone(zone);
      });

      layer.addLayer(pinMarker);
    });
  }, [floodZones, showZones]);

  // ---------------------------------------------------------------------------
  // 8. Popup custom events
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleDirectionsEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string>;

      const zoneId = customEvent.detail;

      const targetZone = floodZones.find((z) => z.id === zoneId);

      if (targetZone && onOpenDirections) {
        onOpenDirections(targetZone);
      }
    };

    const handleInspectEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string>;

      const zoneId = customEvent.detail;

      const targetZone = floodZones.find((z) => z.id === zoneId);

      if (targetZone) {
        onSelectZone(targetZone);
      }
    };

    window.addEventListener("open-zone-directions", handleDirectionsEvent);

    window.addEventListener("open-zone-inspect", handleInspectEvent);

    return () => {
      window.removeEventListener("open-zone-directions", handleDirectionsEvent);

      window.removeEventListener("open-zone-inspect", handleInspectEvent);
    };
  }, [floodZones, onOpenDirections, onSelectZone]);

  // ---------------------------------------------------------------------------
  // 9. Drainage sensor nodes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!drainsLayerRef.current) return;

    const layer = drainsLayerRef.current;

    layer.clearLayers();

    if (!showDrains) return;

    drainNodes.forEach((node) => {
      const statusColor =
        node.status === "Blocked"
          ? "#EA4335"
          : node.status === "Partial"
            ? "#FBBC04"
            : "#34A853";

      const drainHtml = `
        <div
          class="flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 shadow-md cursor-pointer hover:scale-125 transition-transform"
          style="border-color: ${statusColor}"
        >

          <div
            class="w-2.5 h-2.5 rounded-full"
            style="background-color: ${statusColor}"
          ></div>

        </div>
      `;

      const drainIcon = L.divIcon({
        html: drainHtml,
        className: "drain-node-marker",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([node.lat, node.lng], {
        icon: drainIcon,
      });

      const popupHtml = `
        <div
          class="p-3 bg-white text-gray-900 rounded-xl shadow-lg border border-gray-100 min-w-[210px] font-sans text-xs"
        >

          <div
            class="font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-1.5 mb-1.5"
          >

            <span>
              ${node.name}
            </span>

            <span
              class="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style="background-color: ${statusColor}"
            >
              ${node.status}
            </span>

          </div>

          <div class="space-y-1 text-[11px] text-gray-600">

            <div class="flex justify-between">
              <span>Drain Load:</span>

              <span class="font-semibold text-gray-900">
                ${node.loadPercentage}%
                (${node.currentLoadM3s} /
                ${node.capacityM3s} m³/s)
              </span>
            </div>

            <div class="flex justify-between">
              <span>Siltation:</span>

              <span class="font-semibold text-amber-700">
                ${node.siltationCm} cm
              </span>
            </div>

            <div class="flex justify-between">
              <span>Outfall Type:</span>

              <span class="text-gray-800">
                ${node.outfallType}
              </span>
            </div>

          </div>

        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: "google-maps-popup",
      });

      if (onSelectDrain) {
        marker.on("click", () => onSelectDrain(node));
      }

      layer.addLayer(marker);
    });
  }, [drainNodes, showDrains, onSelectDrain]);

  // ---------------------------------------------------------------------------
  // 10. Evacuation route
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!routeLayerRef.current || !mapInstanceRef.current) {
      return;
    }

    const layer = routeLayerRef.current;

    layer.clearLayers();

    if (!activeRoute) return;

    const isHazard =
      activeRoute.intersectsFloodZone &&
      activeRoute.safetyScore === "Severe Hazard";

    const routeColor = isHazard ? "#EA4335" : "#1A73E8";

    const routeCasingColor = isHazard ? "#B31412" : "#1557B0";

    const casingLine = L.polyline(activeRoute.coordinates, {
      color: routeCasingColor,
      weight: 8,
      opacity: 0.9,
    });

    const mainLine = L.polyline(activeRoute.coordinates, {
      color: routeColor,
      weight: 5,
      opacity: 1,
      dashArray: isHazard ? "6, 6" : undefined,
    });

    layer.addLayer(casingLine);
    layer.addLayer(mainLine);

    const destHtml = `
      <div class="flex flex-col items-center">

        <div
          class="bg-white px-2 py-0.5 rounded-full shadow-md text-[10px] font-bold text-[#ea4335] border border-gray-200 whitespace-nowrap mb-0.5"
        >
          ${activeRoute.destinationName.split(" ")[0]}
        </div>

        <svg
          class="w-8 h-10 drop-shadow-lg"
          viewBox="0 0 24 32"
          fill="none"
        >

          <path
            d="M12 0C5.37258 0 0 5.37258 0 12C0 19.5 10.5 30.5 11.25 31.3C11.65 31.7 12.35 31.7 12.75 31.3C13.5 30.5 24 19.5 24 12C24 5.37258 18.6274 0 12 0Z"
            fill="#EA4335"
          />

          <circle
            cx="12"
            cy="11"
            r="5"
            fill="white"
          />

          <circle
            cx="12"
            cy="11"
            r="3"
            fill="#EA4335"
          />

        </svg>

      </div>
    `;

    const destIcon = L.divIcon({
      html: destHtml,
      className: "dest-marker",
      iconSize: [40, 52],
      iconAnchor: [20, 50],
    });

    const destMarker = L.marker(activeRoute.destinationCoords, {
      icon: destIcon,
    });

    destMarker.bindPopup(
      `
        <div
          class="p-3 bg-white text-gray-900 rounded-xl shadow-lg border border-gray-100 min-w-[220px] font-sans"
        >

          <div class="font-bold text-sm text-gray-900">
            ${activeRoute.destinationName}
          </div>

          <div class="text-xs text-gray-500 mt-0.5">
            ${activeRoute.distanceKm} km
            •
            ${activeRoute.durationMinutes} mins
          </div>

          <div
            class="mt-2 text-xs font-semibold ${
              isHazard ? "text-red-600" : "text-emerald-600"
            }"
          >
            Route Safety:
            ${activeRoute.safetyScore}
          </div>

        </div>
      `,
      {
        className: "google-maps-popup",
      },
    );

    layer.addLayer(destMarker);

    const bounds = L.latLngBounds(activeRoute.coordinates);

    mapInstanceRef.current.fitBounds(bounds, {
      padding: [60, 60],
    });
  }, [activeRoute]);

  // ---------------------------------------------------------------------------
  // 11. Doppler radar simulation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!radarLayerRef.current) return;

    const layer = radarLayerRef.current;

    layer.clearLayers();

    if (!showRadar) return;

    const radarRings = [800, 1600, 2400];

    radarRings.forEach((radius, idx) => {
      const ring = L.circle(userLocation, {
        radius,
        color: "#1a73e8",
        weight: 1.5,
        opacity: 0.3 - idx * 0.08,
        fill: false,
        dashArray: "4, 8",
      });

      layer.addLayer(ring);
    });

    const sweepHtml = `
      <div
        class="w-56 h-56 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-25 animate-radar-sweep"
      >

        <div
          class="w-full h-full rounded-full border border-blue-500/40"
          style="background: conic-gradient(from 0deg, rgba(26, 115, 232, 0.4) 0deg, transparent 75deg);"
        ></div>

      </div>
    `;

    const sweepIcon = L.divIcon({
      html: sweepHtml,
      className: "radar-sweep-icon",
      iconSize: [0, 0],
    });

    const sweepMarker = L.marker(userLocation, {
      icon: sweepIcon,
      interactive: false,
    });

    layer.addLayer(sweepMarker);
  }, [userLocation, showRadar]);

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------

  const handleZoomIn = () => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.flyTo(userLocation, 14, {
      duration: 1,
    });
  };

  const handleResetCompass = () => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.setView(
      userLocation,
      mapInstanceRef.current.getZoom(),
    );
  };

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div className="relative w-full h-full min-h-full overflow-hidden select-none">
      <div
        ref={mapContainerRef}
        className="w-full h-full absolute inset-0 z-0"
        style={{
          height: "100%",
          width: "100%",
        }}
      />

      {/* ------------------------------------------------------------------- */}
      {/* Offline Rainfall Timestamp Selector */}
      {/* ------------------------------------------------------------------- */}

      {!showOfflinePanel && showGrid && (
        <button
          type="button"
          onClick={() => setShowOfflinePanel(true)}
          title="Open offline rainfall and nowcast"
          aria-label="Open offline rainfall and nowcast"
          className="absolute top-32 left-0 z-[1000] flex h-12 w-8 items-center justify-center rounded-r-xl bg-slate-950 text-white shadow-xl transition-all hover:w-10"
        >
          <span className="text-xl font-bold">&gt;</span>
        </button>
      )}

      {showOfflinePanel && showGrid && (
        <div className="absolute top-32 left-4 z-[1000] w-[305px] rounded-xl border border-gray-200 bg-white px-3 py-2 font-sans shadow-xl">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Offline Rainfall Time
            </div>

            <button
              type="button"
              onClick={() => setShowOfflinePanel(false)}
              title="Hide offline rainfall and nowcast"
              aria-label="Hide offline rainfall and nowcast"
              className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <span className="text-base font-bold">&lt;</span>
            </button>
          </div>

          <select
            value={selectedTimestamp}
            onChange={(e) => setSelectedTimestamp(e.target.value)}
            disabled={isRainfallLoading || rainfallRecords.length === 0}
            className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {rainfallRecords.map((record) => (
              <option key={record.timestamp} value={record.timestamp}>
                {record.timestamp}
              </option>
            ))}
          </select>

          {selectedTimestamp && (
            <div className="mt-1 text-[9px] text-gray-500">
              861-grid offline rainfall + GIS risk engine
            </div>
          )}

          <div className="mt-2 border-t border-gray-100 pt-2">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Offline Nowcast
            </div>

            <div className="flex gap-1.5">
              {[15, 30, 60].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() =>
                    setSelectedNowcastHorizon(minutes as NowcastHorizon)
                  }
                  disabled={isNowcastLoading}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors ${
                    selectedNowcastHorizon === minutes
                      ? "bg-[#1a73e8] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  +{minutes} min
                </button>
              ))}
            </div>

            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => setRiskViewMode("CURRENT")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors ${
                  riskViewMode === "CURRENT"
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Current
              </button>

              <button
                type="button"
                onClick={() => setRiskViewMode("NOWCAST")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors ${
                  riskViewMode === "NOWCAST"
                    ? "bg-[#1a73e8] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Nowcast
              </button>
            </div>

            {nowcastSnapshot && riskViewMode === "NOWCAST" && (
              <div className="mt-1.5 text-[9px] text-gray-500">
                Forecast: {nowcastSnapshot.forecastTimestamp}
              </div>
            )}

            {riskViewMode === "NOWCAST" && (
              <div className="mt-1 text-[9px] font-semibold text-blue-600">
                Persistence baseline • not ML
              </div>
            )}

            {isNowcastLoading && (
              <div className="mt-1 text-[9px] font-semibold text-blue-600">
                Calculating offline nowcast...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Destination Picking */}
      {/* ------------------------------------------------------------------- */}

      {isDestinationPickingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-[#1a73e8] text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-bounce">
          <Navigation className="w-4 h-4" />

          <span>
            Click anywhere on the map to set custom safe evacuation shelter
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Map Controls */}
      {/* ------------------------------------------------------------------- */}

      <div className="absolute bottom-6 right-4 z-20 flex flex-col items-center gap-2">
        <button
          id="google-streetview-btn"
          onClick={() => {
            setStreetViewTarget(floodZones[0] || null);

            setShowStreetViewModal(true);
          }}
          title="Street View 360° Flood Inspection"
          className="w-10 h-10 bg-white hover:bg-gray-50 text-amber-500 rounded-lg shadow-md border border-gray-200 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <svg
            className="w-6 h-6 text-amber-500"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM9 22V15H8L10.3 8.3C10.6 7.5 11.4 7 12.3 7H12.7C13.6 7 14.4 7.5 14.7 8.3L16 12.3C16.3 13.1 15.8 14 15 14.3C14.2 14.6 13.3 14.1 13 13.3L12.5 11.5L12 15H15V22H13V17H11V22H9Z" />
          </svg>
        </button>

        <button
          id="google-compass-btn"
          onClick={handleResetCompass}
          title="Reset Orientation (North)"
          className="w-10 h-10 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md border border-gray-200 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
        >
          <Compass className="w-5 h-5 text-[#ea4335]" />
        </button>

        <button
          id="google-recenter-btn"
          onClick={handleRecenter}
          title="Recenter to Live GPS Location"
          className="w-10 h-10 bg-white hover:bg-gray-50 text-[#1a73e8] rounded-lg shadow-md border border-gray-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
        >
          <Crosshair className="w-5 h-5 text-[#1a73e8]" />
        </button>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col overflow-hidden w-10">
          <button
            id="google-zoom-in-btn"
            onClick={handleZoomIn}
            title="Zoom in"
            className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors border-b border-gray-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            id="google-zoom-out-btn"
            onClick={handleZoomOut}
            title="Zoom out"
            className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Layers */}
      {/* ------------------------------------------------------------------- */}

      {/* Map layer controls */}
      <div className="absolute bottom-6 left-4 z-[1000] flex flex-col gap-2">
        {/* Direct Flood Zones toggle */}
        <button
          onClick={() => setShowZones((prev) => !prev)}
          title={showZones ? "Hide flood zones" : "Show flood zones"}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg border text-xs font-semibold transition-all ${
            showZones
              ? "bg-white text-gray-900 border-red-300"
              : "bg-gray-100 text-gray-500 border-gray-200"
          }`}
        >
          <span
            className={`w-3 h-3 rounded-full ${
              showZones ? "bg-red-500" : "bg-gray-400"
            }`}
          />

          <span>Flood Zones</span>

          <span className="text-[10px] ml-1">{showZones ? "ON" : "OFF"}</span>
        </button>

        {/* Layers menu */}
        {showLayerMenu ? (
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-[280px] font-sans text-gray-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
              <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#1a73e8]" />
                Map Type & Layers
              </span>

              <button
                onClick={() => setShowLayerMenu(false)}
                className="text-gray-400 hover:text-gray-700 text-xs font-semibold p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[11px] font-bold uppercase text-gray-500 tracking-wider mb-2">
              Base Map
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {(
                [
                  ["google-roadmap", "Default"],
                  ["google-satellite", "Satellite"],
                  ["google-terrain", "Terrain"],
                  ["google-traffic", "Traffic"],
                  ["dark", "Dark GIS"],
                  ["osm", "Street"],
                ] as [GoogleTileType, string][]
              ).map(([tileType, label]) => (
                <button
                  key={tileType}
                  onClick={() => setActiveTile(tileType)}
                  className={`flex flex-col items-center p-1.5 rounded-xl border-2 transition-all cursor-pointer ${
                    activeTile === tileType
                      ? "border-[#1a73e8] bg-blue-50/50"
                      : "border-transparent hover:bg-gray-50"
                  }`}
                >
                  <div className="w-full h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                    {label}
                  </div>

                  <span className="text-[10px] font-semibold text-gray-800 mt-1">
                    {label}
                  </span>
                </button>
              ))}
            </div>

            <div className="text-[11px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">
              Map Overlays
            </div>

            <div className="space-y-1 text-xs">
              {/* Risk Grid */}
              <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
                  <span>Chennai Offline Risk Grid</span>
                </span>

                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded text-[#1a73e8] focus:ring-blue-500"
                />
              </label>

              {/* Flood Zones */}
              <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span>Flood Inundation Zones</span>
                </span>

                <input
                  type="checkbox"
                  checked={showZones}
                  onChange={(e) => setShowZones(e.target.checked)}
                  className="rounded text-[#1a73e8] focus:ring-blue-500"
                />
              </label>

              {/* Drainage */}
              <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Drainage Sensors & Mesh</span>
                </span>

                <input
                  type="checkbox"
                  checked={showDrains}
                  onChange={(e) => setShowDrains(e.target.checked)}
                  className="rounded text-[#1a73e8] focus:ring-blue-500"
                />
              </label>

              {/* Radar */}
              <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span>Doppler Radar Beam</span>
                </span>

                <input
                  type="checkbox"
                  checked={showRadar}
                  onChange={(e) => setShowRadar(e.target.checked)}
                  className="rounded text-[#1a73e8] focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        ) : (
          <button
            id="google-layers-btn"
            onClick={() => setShowLayerMenu(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 text-gray-800 rounded-xl shadow-md border border-gray-200 text-xs font-semibold transition-all hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center text-white">
              <Layers className="w-4 h-4 text-white" />
            </div>

            <span>Layers</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Footer */}
      {/* ------------------------------------------------------------------- */}

      <div className="absolute bottom-1 right-24 z-10 hidden sm:flex items-center gap-3 text-[10px] text-gray-500 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded shadow-xs">
        <span>Map data ©2026 Google</span>

        <span>•</span>

        <span>SIH26085 Urban Flood Early Warning</span>

        <span>•</span>

        <span className="font-mono">
          Offline GIS + Rainfall Risk Engine • Nowcast Baseline
        </span>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Street View Modal */}
      {/* ------------------------------------------------------------------- */}

      {showStreetViewModal && streetViewTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 text-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-gray-700 flex flex-col">
            <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />

                <span className="font-bold text-sm">
                  Google Street View • Simulated Flood Inspection
                </span>

                <span className="text-xs text-gray-400">
                  ({streetViewTarget.name})
                </span>
              </div>

              <button
                onClick={() => setShowStreetViewModal(false)}
                className="p-1 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative h-[360px] bg-gradient-to-b from-sky-900 via-slate-800 to-amber-950/60 overflow-hidden flex flex-col justify-end p-6">
              <div
                className="absolute inset-x-0 bottom-0 bg-blue-500/40 backdrop-blur-[1px] border-t-2 border-cyan-300 transition-all flex items-start justify-center pt-2"
                style={{
                  height: `${Math.min(
                    90,
                    Math.max(15, streetViewTarget.predictedWaterLevelCm * 0.9),
                  )}%`,
                }}
              >
                <div className="bg-black/70 px-3 py-1 rounded-full text-xs font-mono text-cyan-300 border border-cyan-500/50 flex items-center gap-2">
                  <Waves className="w-3.5 h-3.5 animate-pulse" />

                  <span>
                    Predicted Flood Line:{" "}
                    {streetViewTarget.predictedWaterLevelCm} cm Above Ground
                  </span>
                </div>
              </div>

              <div className="relative z-10 flex items-end justify-between text-gray-400 text-xs">
                <div>
                  <div className="font-bold text-white text-base">
                    {streetViewTarget.name}
                  </div>

                  <div>
                    Coordinates: {streetViewTarget.lat.toFixed(5)}
                    °N, {streetViewTarget.lng.toFixed(5)}
                    °E
                  </div>

                  <div>
                    Base DEM Elevation: {streetViewTarget.elevationMeters}m MSL
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-amber-400 font-bold text-sm">
                    Risk: {streetViewTarget.riskLevel} (
                    {streetViewTarget.riskPercentage}
                    %)
                  </div>

                  <div>Time to Peak: ~{streetViewTarget.etaMinutes} mins</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-gray-800 text-xs text-gray-400 flex items-center justify-between border-t border-gray-700">
              <span>
                Street View Imagery ©2026 Google • Sensor Node Projected
                Inundation Height
              </span>

              <button
                onClick={() => setShowStreetViewModal(false)}
                className="px-4 py-1.5 bg-[#1a73e8] text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
