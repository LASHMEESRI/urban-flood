import React, { useEffect, useState, useRef, useCallback } from "react";
import LstmTest from "./components/LstmTest";
import {
  AlertItem,
  CityPreset,
  DestinationPreset,
  DrainNode,
  EvacuationRoute,
  FloodRiskZone,
  NowcastInterval,
  PipelineMetrics,
  SensorHistoryPoint,
} from "./types";

import {
  CITY_PRESETS,
  advanceSimulation,
  generateDestinations,
  generateDrainNodes,
  generateInitialHistory,
  generateInitialZones,
  generateNowcastTimeline,
  getRiskLevel,
} from "./services/simulation";

import { reverseGeocode } from "./services/osmService";
import { calculateOfflineRisk } from "./services/offlineRiskEngine";

import { MapContainer } from "./components/MapContainer";
import { GoogleMapsPanel } from "./components/GoogleMapsPanel";
import { ZoneDetailsModal } from "./components/ZoneDetailsModal";

import {
  AlertTriangle,
  CloudRain,
  X,
  Navigation,
  ExternalLink,
  Flame,
  ShieldCheck,
} from "lucide-react";

const REFRESH_INTERVAL_SECONDS = 18;

export default function App() {
  // ---------------------------------------------------------------------------
  // OFFLINE RISK ENGINE TEST
  // ---------------------------------------------------------------------------

  useEffect(() => {
    calculateOfflineRisk()
      .then((snapshot) => {
        const rainfallValues = Object.values(snapshot.rainfall).filter(
          (value): value is number =>
            typeof value === "number" && Number.isFinite(value),
        );
        const rainfallMean =
          rainfallValues.length > 0
            ? rainfallValues.reduce((sum, value) => sum + value, 0) /
              rainfallValues.length
            : 0;

        console.log(
          "OFFLINE RISK ENGINE TEST",
          "Rainfall timestamp:",
          snapshot.rainfall.timestamp,
          "Rainfall mean:",
          rainfallMean,
          "Grid cells:",
          snapshot.results.length,
        );

        console.log("First risk result:", snapshot.results[0]);
      })
      .catch((error) => {
        console.error("OFFLINE RISK ENGINE TEST FAILED:", error);
      });
  }, []);

  // ---------------------------------------------------------------------------
  // 1. Core State
  // ---------------------------------------------------------------------------

  const [selectedCity, setSelectedCity] = useState<CityPreset>(CITY_PRESETS[1]);

  const [userLocation, setUserLocation] = useState<[number, number]>([
    CITY_PRESETS[1].lat,
    CITY_PRESETS[1].lng,
  ]);

  const [detectedLocationName, setDetectedLocationName] = useState<string>(
    CITY_PRESETS[1].name,
  );

  // ---------------------------------------------------------------------------
  // Simulation Entities
  // ---------------------------------------------------------------------------

  const [floodZones, setFloodZones] = useState<FloodRiskZone[]>(() =>
    generateInitialZones(CITY_PRESETS[1].lat, CITY_PRESETS[1].lng),
  );

  const [drainNodes, setDrainNodes] = useState<DrainNode[]>(() =>
    generateDrainNodes(CITY_PRESETS[1].lat, CITY_PRESETS[1].lng),
  );

  const [destinations, setDestinations] = useState<DestinationPreset[]>(() =>
    generateDestinations(CITY_PRESETS[1].lat, CITY_PRESETS[1].lng),
  );

  const [history, setHistory] = useState<SensorHistoryPoint[]>(() =>
    generateInitialHistory(),
  );

  // ---------------------------------------------------------------------------
  // Pipeline Metrics
  // ---------------------------------------------------------------------------

  const [metrics, setMetrics] = useState<PipelineMetrics>(() => {
    const initialRisk = 68;
    const now = new Date();

    const timeStr =
      `${now.getHours().toString().padStart(2, "0")}:` +
      `${now.getMinutes().toString().padStart(2, "0")}:` +
      `${now.getSeconds().toString().padStart(2, "0")}`;

    return {
      dopplerRainfallMmHr: 48,
      radarReflectivityDbz: 42,
      demElevationMeanM: 16.2,
      imperviousCoverPct: 78,
      runoffRateM3s: 24.6,
      drainCapacityM3s: 142.0,
      drainLoadPct: 74,
      networkBlockagePct: 35,
      waterLevelCm: 48,
      rateOfRiseCmHr: 8,
      aiRiskScore: initialRisk,
      overallRiskLevel: getRiskLevel(initialRisk),
      lastUpdated: timeStr,
    };
  });

  // ---------------------------------------------------------------------------
  // Nowcast timeline
  // ---------------------------------------------------------------------------

  const [nowcastTimeline, setNowcastTimeline] = useState<NowcastInterval[]>(
    () => generateNowcastTimeline(68, 48),
  );

  // ---------------------------------------------------------------------------
  // Alerts
  // ---------------------------------------------------------------------------

  const [currentAlert, setCurrentAlert] = useState<AlertItem | null>(() => ({
    id: "initial-alert-1",
    timestamp: "Just now",
    severity: "High",
    title: "⚠️ Urban Flood Early Warning",
    message:
      "High runoff detected at Sector 4 Metro Underpass. Predicted water level 52cm. Avoid low-lying underpasses.",
    zoneName: "Sector 4 Metro Underpass",
    acknowledged: false,
  }));

  const [alertHistory, setAlertHistory] = useState<AlertItem[]>([
    {
      id: "initial-alert-1",
      timestamp: "10 mins ago",
      severity: "High",
      title: "⚠️ Urban Flood Early Warning",
      message:
        "High runoff detected at Sector 4 Metro Underpass. Avoid low-lying underpass links.",
      zoneName: "Sector 4 Metro Underpass",
    },
    {
      id: "initial-alert-0",
      timestamp: "25 mins ago",
      severity: "Moderate",
      title: "Monsoon Surcharge Watch",
      message:
        "Drain trunk D-1 operating at 78% capacity with silt choke near culvert 02.",
      zoneName: "Central Railway Culvert",
    },
  ]);

  // ---------------------------------------------------------------------------
  // Route state
  // ---------------------------------------------------------------------------

  const [activeRoute, setActiveRoute] = useState<EvacuationRoute | null>(null);

  const [customDestination, setCustomDestination] = useState<
    [number, number] | null
  >(null);

  const [isDestinationPickingMode, setIsDestinationPickingMode] =
    useState(false);

  // ---------------------------------------------------------------------------
  // Selected Zone state
  // ---------------------------------------------------------------------------

  const [selectedZone, setSelectedZone] = useState<FloodRiskZone | null>(null);

  const [selectedZoneModal, setSelectedZoneModal] =
    useState<FloodRiskZone | null>(null);

  // ---------------------------------------------------------------------------
  // Cloudburst Simulation State
  // ---------------------------------------------------------------------------

  const [isCloudburstActive, setIsCloudburstActive] = useState(false);

  const [refreshCountdown, setRefreshCountdown] = useState(
    REFRESH_INTERVAL_SECONDS,
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [showAlertPill, setShowAlertPill] = useState(true);

  // ---------------------------------------------------------------------------
  // 2. Geolocation on initial mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          setUserLocation([lat, lng]);

          const gpsPreset: CityPreset = {
            id: "gps",
            name: "Live GPS Location",
            subdivision: "Browser Geolocation",
            lat,
            lng,
            defaultRainfall: 40,
            notableHazard: "Live Smart City Stream",
          };

          setSelectedCity(gpsPreset);

          setFloodZones(generateInitialZones(lat, lng));

          setDrainNodes(generateDrainNodes(lat, lng));

          setDestinations(generateDestinations(lat, lng));

          const area = await reverseGeocode(lat, lng);

          setDetectedLocationName(area);
        },
        () => {
          reverseGeocode(CITY_PRESETS[1].lat, CITY_PRESETS[1].lng).then(
            (name) => {
              setDetectedLocationName(name);
            },
          );
        },
        {
          timeout: 8000,
          enableHighAccuracy: true,
        },
      );
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 3. Handle Changing City Preset
  // ---------------------------------------------------------------------------

  const handleSelectCity = async (city: CityPreset) => {
    setSelectedCity(city);
    setUserLocation([city.lat, city.lng]);
    setActiveRoute(null);
    setCustomDestination(null);
    setSelectedZone(null);

    const newZones = generateInitialZones(city.lat, city.lng);

    const newDrains = generateDrainNodes(city.lat, city.lng);

    const newDests = generateDestinations(city.lat, city.lng);

    setFloodZones(newZones);
    setDrainNodes(newDrains);
    setDestinations(newDests);

    const geoName = await reverseGeocode(city.lat, city.lng);

    setDetectedLocationName(geoName);
  };

  // ---------------------------------------------------------------------------
  // 4. Advance Simulation Step
  // ---------------------------------------------------------------------------

  const runSimulationStep = useCallback(() => {
    setIsRefreshing(true);

    setTimeout(() => {
      const result = advanceSimulation(
        metrics,
        floodZones,
        drainNodes,
        history,
        isCloudburstActive,
      );

      setMetrics(result.metrics);
      setFloodZones(result.zones);
      setDrainNodes(result.drains);
      setHistory(result.history);
      setNowcastTimeline(result.nowcast);

      if (result.newAlert) {
        setCurrentAlert(result.newAlert);

        setAlertHistory((prev) => [result.newAlert!, ...prev.slice(0, 9)]);

        setShowAlertPill(true);
      }

      setRefreshCountdown(REFRESH_INTERVAL_SECONDS);

      setIsRefreshing(false);
    }, 400);
  }, [metrics, floodZones, drainNodes, history, isCloudburstActive]);

  // ---------------------------------------------------------------------------
  // 5. Countdown timer for auto-nowcasting
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          runSimulationStep();

          return REFRESH_INTERVAL_SECONDS;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [runSimulationStep]);

  // ---------------------------------------------------------------------------
  // Destination pick click handler on map
  // ---------------------------------------------------------------------------

  const handleMapClickDestination = (coords: [number, number]) => {
    if (isDestinationPickingMode) {
      setCustomDestination(coords);
      setIsDestinationPickingMode(false);
    }
  };

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans bg-[#e5e3df] select-none">
      {/* FULL-SCREEN GOOGLE MAPS INTERACTIVE CANVAS */}

      <MapContainer
        userLocation={userLocation}
        floodZones={floodZones}
        drainNodes={drainNodes}
        activeRoute={activeRoute}
        onSelectZone={(zone) => {
          setSelectedZone(zone);
        }}
        onSelectDrain={(drain) => {
          const matchingZone = floodZones[0];

          if (matchingZone) {
            setSelectedZone(matchingZone);
          }
        }}
        onMapClickDestination={handleMapClickDestination}
        isDestinationPickingMode={isDestinationPickingMode}
        onOpenDirections={(zone) => {
          if (zone) {
            setSelectedZone(zone);
          }
        }}
      />
      <LstmTest />

      {/* FLOATING GOOGLE MAPS SEARCH BAR, CHIPS & COLLAPSIBLE LEFT SIDE PANEL */}

      <GoogleMapsPanel
        selectedCity={selectedCity}
        onSelectCity={handleSelectCity}
        userLocation={userLocation}
        floodZones={floodZones}
        selectedZone={selectedZone}
        onSelectZone={setSelectedZone}
        drainNodes={drainNodes}
        onSelectDrain={(drain) => {
          const matchingZone = floodZones[0];

          if (matchingZone) {
            setSelectedZone(matchingZone);
          }
        }}
        destinations={destinations}
        activeRoute={activeRoute}
        onSetRoute={setActiveRoute}
        metrics={metrics}
        history={history}
        nowcastTimeline={nowcastTimeline}
        refreshCountdown={refreshCountdown}
        totalCountdown={REFRESH_INTERVAL_SECONDS}
        onTriggerNowcast={runSimulationStep}
        isCloudburstActive={isCloudburstActive}
        onToggleCloudburst={() => setIsCloudburstActive(!isCloudburstActive)}
        isDestinationPickingMode={isDestinationPickingMode}
        onToggleDestinationPicking={() =>
          setIsDestinationPickingMode(!isDestinationPickingMode)
        }
        customDestination={customDestination}
      />

      {/* FLOATING GOOGLE MAPS TOP-RIGHT LIVE ALERT & WEATHER PILL */}

      {currentAlert && showAlertPill && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 max-w-[340px] font-sans animate-in fade-in slide-in-from-top duration-200">
          <div className="bg-white text-gray-900 rounded-2xl shadow-xl border border-gray-200/90 p-3 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>

                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ea4335]"></span>
                </span>

                <span className="font-bold text-xs text-gray-900 leading-tight">
                  {currentAlert.title}
                </span>
              </div>

              <button
                onClick={() => setShowAlertPill(false)}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
              {currentAlert.message}
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[11px]">
              <span className="text-gray-400 font-mono">
                Rain: {metrics.dopplerRainfallMmHr} mm/h
              </span>

              <button
                onClick={() => {
                  const found = floodZones.find((z) =>
                    z.name
                      .toLowerCase()
                      .includes(currentAlert.zoneName.toLowerCase()),
                  );

                  if (found) {
                    setSelectedZone(found);
                  } else if (floodZones.length > 0) {
                    setSelectedZone(floodZones[0]);
                  }
                }}
                className="font-bold text-[#1a73e8] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Inspect Zone</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZONE DETAILS MODAL */}

      <ZoneDetailsModal
        zone={selectedZoneModal}
        onClose={() => setSelectedZoneModal(null)}
        onSetEvacuationDestination={(coords, name) => {
          setCustomDestination(coords);
          setSelectedZoneModal(null);
        }}
      />
    </div>
  );
}
