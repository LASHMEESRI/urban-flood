import React, { useState, useEffect } from 'react';
import {
  Search,
  Menu,
  Navigation,
  X,
  ChevronLeft,
  ChevronRight,
  Flame,
  CloudRain,
  Waves,
  Shield,
  Activity,
  Sliders,
  GitBranch,
  RotateCw,
  MapPin,
  Ambulance,
  Bus,
  Car,
  Footprints,
  Compass,
  AlertTriangle,
  ArrowRight,
  Clock,
  Radio,
  Share2,
  ExternalLink,
  Info,
  ChevronDown,
} from 'lucide-react';
import {
  CityPreset,
  DestinationPreset,
  DrainNode,
  EvacuationRoute,
  FloodRiskZone,
  NowcastInterval,
  PipelineMetrics,
  SensorHistoryPoint,
} from '../types';
import { CITY_PRESETS } from '../services/simulation';
import { calculateEvacuationRoute } from '../services/osmService';
import { DataPipelineBar } from './DataPipelineBar';
import { LiveSensorPanel } from './LiveSensorPanel';
import { NowcastPanel } from './NowcastPanel';

export type GoogleMapsTab = 'explore' | 'directions' | 'nowcast' | 'sensors' | 'pipeline';

interface GoogleMapsPanelProps {
  selectedCity: CityPreset;
  onSelectCity: (city: CityPreset) => void;
  userLocation: [number, number];
  floodZones: FloodRiskZone[];
  selectedZone: FloodRiskZone | null;
  onSelectZone: (zone: FloodRiskZone | null) => void;
  drainNodes: DrainNode[];
  onSelectDrain: (drain: DrainNode) => void;
  destinations: DestinationPreset[];
  activeRoute: EvacuationRoute | null;
  onSetRoute: (route: EvacuationRoute | null) => void;
  metrics: PipelineMetrics;
  history: SensorHistoryPoint[];
  nowcastTimeline: NowcastInterval[];
  refreshCountdown: number;
  totalCountdown: number;
  onTriggerNowcast: () => void;
  isCloudburstActive: boolean;
  onToggleCloudburst: () => void;
  isDestinationPickingMode: boolean;
  onToggleDestinationPicking: () => void;
  customDestination: [number, number] | null;
}

export const GoogleMapsPanel: React.FC<GoogleMapsPanelProps> = ({
  selectedCity,
  onSelectCity,
  userLocation,
  floodZones,
  selectedZone,
  onSelectZone,
  drainNodes,
  onSelectDrain,
  destinations,
  activeRoute,
  onSetRoute,
  metrics,
  history,
  nowcastTimeline,
  refreshCountdown,
  totalCountdown,
  onTriggerNowcast,
  isCloudburstActive,
  onToggleCloudburst,
  isDestinationPickingMode,
  onToggleDestinationPicking,
  customDestination,
}) => {
  // Panel state
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<GoogleMapsTab>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Directions state
  const [travelMode, setTravelMode] = useState<'emergency' | 'transit' | 'public'>('emergency');
  const [selectedDestId, setSelectedDestId] = useState<string>(destinations[0]?.id || 'custom');
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // When selectedZone changes from map, auto-open panel to explore tab
  useEffect(() => {
    if (selectedZone) {
      setIsOpen(true);
      setActiveTab('explore');
    }
  }, [selectedZone]);

  // Route calculation handler
  const handleCalculateRoute = async (targetDestId?: string) => {
    setIsCalculatingRoute(true);
    const destIdToUse = targetDestId || selectedDestId;
    const selectedPreset = destinations.find((d) => d.id === destIdToUse);

    let destCoords: [number, number] = [0, 0];
    let destName = '';

    if (destIdToUse === 'custom' && customDestination) {
      destCoords = customDestination;
      destName = 'Custom Safe Evacuation Point';
    } else if (selectedPreset) {
      destCoords = [selectedPreset.lat, selectedPreset.lng];
      destName = selectedPreset.name;
    } else if (destinations.length > 0) {
      destCoords = [destinations[0].lat, destinations[0].lng];
      destName = destinations[0].name;
    }

    try {
      const route = await calculateEvacuationRoute(
        userLocation[0],
        userLocation[1],
        destCoords[0],
        destCoords[1],
        destName,
        travelMode,
        floodZones
      );
      onSetRoute(route);
    } catch (err) {
      console.error('Route calculation error:', err);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Switch to Directions with a specific zone
  const handleStartEvacuationToZone = (zone: FloodRiskZone) => {
    setActiveTab('directions');
    setIsOpen(true);
    // Find closest safe destination
    if (destinations.length > 0) {
      setSelectedDestId(destinations[0].id);
      handleCalculateRoute(destinations[0].id);
    }
  };

  // Filtered zones based on search query
  const filteredZones = floodZones.filter((z) =>
    z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    z.riskLevel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    z.landCover.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* 1. Google Maps Authentic Floating Search Bar & Filter Chips (Top Left) */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 flex flex-col gap-2 max-w-[calc(100vw-24px)] sm:w-[410px]">
        {/* White Search Box */}
        <div className="bg-white text-gray-900 rounded-full sm:rounded-2xl shadow-lg border border-gray-200/80 flex items-center px-3.5 py-2.5 w-full font-sans transition-shadow hover:shadow-xl">
          {/* Hamburger Menu Toggle */}
          <button
            id="google-menu-toggle"
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? 'Collapse Navigation Panel' : 'Expand Navigation Panel'}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors cursor-pointer mr-2"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>

          {/* Search Input Field */}
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flood zones, shelters, drains..."
              className="w-full text-sm text-gray-900 placeholder-gray-500 bg-transparent border-none outline-none pr-6 font-normal"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-0 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* City Switcher Trigger */}
          <div className="relative">
            <button
              id="google-city-picker-btn"
              onClick={() => setShowCityDropdown(!showCityDropdown)}
              className="flex items-center gap-1 text-xs font-semibold px-2 py-1 text-[#1a73e8] bg-blue-50 hover:bg-blue-100 rounded-full transition-colors cursor-pointer mx-1 whitespace-nowrap"
            >
              <span>{selectedCity.name}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* City Preset Dropdown */}
            {showCityDropdown && (
              <div className="absolute top-8 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 w-48 z-50 font-sans">
                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Select Smart City
                </div>
                {CITY_PRESETS.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => {
                      onSelectCity(city);
                      setShowCityDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gray-100 cursor-pointer ${
                      selectedCity.id === city.id ? 'font-bold text-[#1a73e8] bg-blue-50' : 'text-gray-700'
                    }`}
                  >
                    <span>{city.name}</span>
                    <span className="text-[10px] text-gray-400">{city.subdivision}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-[1px] bg-gray-200 mx-1"></div>

          {/* Google Maps Authentic Blue "Directions" Arrow Button */}
          <button
            id="google-directions-btn"
            onClick={() => {
              setActiveTab('directions');
              setIsOpen(true);
            }}
            title="Open Flood-Safe Evacuation Directions"
            className="w-8 h-8 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white flex items-center justify-center shadow-sm transition-transform active:scale-95 cursor-pointer ml-1"
          >
            {/* Authentic Google Maps Directions Arrow Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.43 10.59L13.41 1.58C12.63 0.8 11.37 0.8 10.59 1.58L1.58 10.59C0.8 11.37 0.8 12.63 1.58 13.41L10.59 22.42C11.37 23.2 12.63 23.2 13.41 22.42L22.43 13.41C23.2 12.64 23.2 11.37 22.43 10.59ZM14 14.5V12H10V15H8V11C8 10.45 8.45 10 9 10H14V7.5L17.5 11L14 14.5Z" />
            </svg>
          </button>
        </div>

        {/* 2. Google Maps Style Filter Chips / Category Pills (Horizontally Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          {/* Cloudburst Simulation Trigger */}
          <button
            id="chip-cloudburst-btn"
            onClick={onToggleCloudburst}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md whitespace-nowrap transition-all cursor-pointer ${
              isCloudburstActive
                ? 'bg-[#ea4335] text-white shadow-red-500/30 animate-pulse'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span>Cloudburst (85mm/h)</span>
          </button>

          {/* Flood Zones Chip */}
          <button
            id="chip-zones-btn"
            onClick={() => {
              setActiveTab('explore');
              onSelectZone(null);
              setIsOpen(true);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'explore' && isOpen
                ? 'bg-[#1a73e8] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Waves className="w-3.5 h-3.5 text-sky-500" />
            <span>Flood Zones ({floodZones.length})</span>
          </button>

          {/* AI Nowcast Chip */}
          <button
            id="chip-nowcast-btn"
            onClick={() => {
              setActiveTab('nowcast');
              setIsOpen(true);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'nowcast' && isOpen
                ? 'bg-[#1a73e8] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Nowcast (0-3h)</span>
          </button>

          {/* Drainage Sensor Mesh Chip */}
          <button
            id="chip-sensors-btn"
            onClick={() => {
              setActiveTab('sensors');
              setIsOpen(true);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'sensors' && isOpen
                ? 'bg-[#1a73e8] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Live Sensors</span>
          </button>

          {/* SIH26085 Data Flow Pipeline Chip */}
          <button
            id="chip-pipeline-btn"
            onClick={() => {
              setActiveTab('pipeline');
              setIsOpen(true);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'pipeline' && isOpen
                ? 'bg-[#1a73e8] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
            <span>SIH26085 Pipeline</span>
          </button>

          {/* Cycle Refresh Indicator */}
          <button
            id="chip-refresh-btn"
            onClick={onTriggerNowcast}
            title="Click to Trigger Immediate Simulation Inference"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-mono font-medium bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-md whitespace-nowrap cursor-pointer"
          >
            <RotateCw className="w-3 h-3 text-blue-500 animate-spin" />
            <span>{refreshCountdown}s</span>
          </button>
        </div>
      </div>

      {/* 3. Google Maps Authentic Floating Collapsible Left Side Panel */}
      {isOpen && (
        <div className="absolute top-[108px] left-3 sm:left-4 z-20 w-[calc(100vw-24px)] sm:w-[410px] md:w-[430px] max-h-[calc(100vh-130px)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col font-sans transition-all duration-200">
          {/* Panel Header Tabs */}
          <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('explore')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'explore'
                    ? 'bg-white text-[#1a73e8] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Explore
              </button>
              <button
                onClick={() => setActiveTab('directions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'directions'
                    ? 'bg-white text-[#1a73e8] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Directions
              </button>
              <button
                onClick={() => setActiveTab('nowcast')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'nowcast'
                    ? 'bg-white text-[#1a73e8] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Nowcast
              </button>
              <button
                onClick={() => setActiveTab('sensors')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'sensors'
                    ? 'bg-white text-[#1a73e8] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sensors
              </button>
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'pipeline'
                    ? 'bg-white text-[#1a73e8] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pipeline
              </button>
            </div>

            {/* Collapse Panel Arrow Button */}
            <button
              onClick={() => setIsOpen(false)}
              title="Collapse Panel"
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Panel Body (Scrollable) */}
          <div className="overflow-y-auto flex-1 p-3.5 space-y-3.5">
            {/* VIEW 1: EXPLORE / ZONE PLACE CARD */}
            {activeTab === 'explore' && (
              <div className="space-y-3">
                {selectedZone ? (
                  /* Google Maps Place Card View for Selected Zone */
                  <div className="space-y-3">
                    {/* Place Header Banner */}
                    <div className="relative h-28 rounded-xl overflow-hidden bg-gradient-to-br from-blue-900 via-slate-800 to-indigo-950 p-4 flex flex-col justify-end text-white shadow-inner">
                      <div className="absolute top-2 right-2">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow"
                          style={{
                            backgroundColor:
                              selectedZone.riskLevel === 'Severe'
                                ? '#EA4335'
                                : selectedZone.riskLevel === 'High'
                                ? '#FA7B17'
                                : selectedZone.riskLevel === 'Moderate'
                                ? '#FBBC04'
                                : '#34A853',
                          }}
                        >
                          {selectedZone.riskLevel} Inundation Risk
                        </span>
                      </div>
                      <h3 className="font-bold text-lg leading-tight">{selectedZone.name}</h3>
                      <p className="text-xs text-blue-200 font-mono">
                        Elevation {selectedZone.elevationMeters}m MSL • {selectedZone.landCover}
                      </p>
                    </div>

                    {/* Google Maps Action Buttons Row */}
                    <div className="grid grid-cols-4 gap-2 py-1 text-center">
                      <button
                        onClick={() => handleStartEvacuationToZone(selectedZone)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-blue-50 text-[#1a73e8] transition-colors cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                          <Navigation className="w-5 h-5 text-[#1a73e8]" />
                        </div>
                        <span className="text-[11px] font-semibold">Directions</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('sensors')}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-emerald-600" />
                        </div>
                        <span className="text-[11px] font-semibold">Sensors</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('nowcast')}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <span className="text-[11px] font-semibold">Nowcast</span>
                      </button>

                      <button
                        onClick={() => onSelectZone(null)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-gray-600" />
                        </div>
                        <span className="text-[11px] font-semibold">All Zones</span>
                      </button>
                    </div>

                    {/* Zone Telemetry Metrics */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Inundation Risk Probability</span>
                        <span className="font-bold text-gray-900 text-sm font-mono">
                          {selectedZone.riskPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${selectedZone.riskPercentage}%`,
                            backgroundColor:
                              selectedZone.riskLevel === 'Severe'
                                ? '#EA4335'
                                : selectedZone.riskLevel === 'High'
                                ? '#FA7B17'
                                : '#34A853',
                          }}
                        ></div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">Predicted Depth</span>
                          <span className="font-bold text-base text-gray-900 font-mono">
                            {selectedZone.predictedWaterLevelCm} cm
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">ETA to Peak</span>
                          <span className="font-bold text-base text-amber-600 font-mono">
                            ~{selectedZone.etaMinutes} mins
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">Runoff Rate</span>
                          <span className="font-bold text-gray-800 font-mono">
                            C = {selectedZone.runoffCoefficient}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">Drain Outfalls</span>
                          <span className="font-bold text-gray-800 truncate block" title={selectedZone.affectedDrains.join(', ')}>
                            {selectedZone.affectedDrains.join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Overview: List of All Monitored Zones in City */
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                      <span className="font-bold text-sm text-gray-900">
                        {selectedCity.name} Flood Risk Zones
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        {filteredZones.length} Zones
                      </span>
                    </div>

                    <div className="space-y-2">
                      {filteredZones.map((zone) => (
                        <div
                          key={zone.id}
                          onClick={() => onSelectZone(zone)}
                          className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    zone.riskLevel === 'Severe'
                                      ? '#EA4335'
                                      : zone.riskLevel === 'High'
                                      ? '#FA7B17'
                                      : zone.riskLevel === 'Moderate'
                                      ? '#FBBC04'
                                      : '#34A853',
                                }}
                              ></span>
                              <h4 className="font-bold text-sm text-gray-900">{zone.name}</h4>
                            </div>
                            <p className="text-xs text-gray-500 pl-4.5">
                              {zone.predictedWaterLevelCm}cm depth • Peak in {zone.etaMinutes}m • {zone.elevationMeters}m MSL
                            </p>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEvacuationToZone(zone);
                            }}
                            title="Get Flood-Safe Directions"
                            className="p-2 bg-blue-50 text-[#1a73e8] hover:bg-blue-100 rounded-full transition-colors cursor-pointer"
                          >
                            <Navigation className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: DIRECTIONS / EVACUATION ROUTING (Exact Google Maps Directions UI) */}
            {activeTab === 'directions' && (
              <div className="space-y-3">
                {/* Travel Modes Bar */}
                <div className="flex items-center justify-around bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setTravelMode('emergency')}
                    className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      travelMode === 'emergency'
                        ? 'bg-white text-[#1a73e8] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Ambulance className="w-4 h-4 text-red-500" />
                    <span>Emergency</span>
                  </button>

                  <button
                    onClick={() => setTravelMode('transit')}
                    className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      travelMode === 'transit'
                        ? 'bg-white text-[#1a73e8] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Bus className="w-4 h-4 text-blue-500" />
                    <span>Transit</span>
                  </button>

                  <button
                    onClick={() => setTravelMode('public')}
                    className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      travelMode === 'public'
                        ? 'bg-white text-[#1a73e8] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Car className="w-4 h-4 text-emerald-500" />
                    <span>Public</span>
                  </button>
                </div>

                {/* Google Maps Origin / Destination Input Block */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2.5">
                  {/* Origin */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-[#1a73e8] bg-white flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1a73e8]"></div>
                    </div>
                    <div className="flex-1 text-xs font-semibold text-gray-800 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                      Your Location (Live Sensor GPS)
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-3.5 h-3.5 text-[#ea4335]" />
                    <select
                      value={selectedDestId}
                      onChange={(e) => setSelectedDestId(e.target.value)}
                      className="flex-1 text-xs font-semibold text-gray-800 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none"
                    >
                      {destinations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.elevationM}m MSL - {d.type})
                        </option>
                      ))}
                      <option value="custom">Custom Shelter (Click on map)</option>
                    </select>
                  </div>

                  {/* Destination Map Picking Trigger */}
                  {selectedDestId === 'custom' && (
                    <button
                      onClick={onToggleDestinationPicking}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isDestinationPickingMode
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-white border border-gray-300 text-gray-700'
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{isDestinationPickingMode ? 'Click Map Now to Place Goal' : 'Pick on Map'}</span>
                    </button>
                  )}

                  {/* Calculate Route CTA */}
                  <button
                    onClick={() => handleCalculateRoute()}
                    disabled={isCalculatingRoute}
                    className="w-full py-2 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>{isCalculatingRoute ? 'Calculating Safe Route...' : 'Get Flood-Safe Route'}</span>
                  </button>
                </div>

                {/* Route Result Card */}
                {activeRoute && (
                  <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-xl font-bold text-emerald-600">
                          {activeRoute.durationMinutes} min
                        </span>
                        <span className="text-xs text-gray-500 ml-1.5 font-medium">
                          ({activeRoute.distanceKm} km)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        {activeRoute.safetyScore}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600">
                      Fastest & safest route via high-ground arterial corridors avoiding submerged underpasses.
                    </p>

                    {/* Step-by-Step Instructions */}
                    <div className="pt-2 border-t border-gray-100 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider block">
                        Navigation Steps
                      </span>
                      {activeRoute.instructions.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                          <span className="text-gray-400 font-mono text-[11px] mt-0.5">{idx + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: AI NOWCAST TIMELINE & CONTROLS */}
            {activeTab === 'nowcast' && (
              <div className="space-y-3">
                <NowcastPanel
                  metrics={metrics}
                  nowcastTimeline={nowcastTimeline}
                  refreshCountdown={refreshCountdown}
                  totalCountdown={totalCountdown}
                  onTriggerNowcast={onTriggerNowcast}
                  isCloudburstActive={isCloudburstActive}
                  onToggleCloudburst={onToggleCloudburst}
                />
              </div>
            )}

            {/* VIEW 4: LIVE SENSORS TELEMETRY */}
            {activeTab === 'sensors' && (
              <div className="space-y-3">
                <LiveSensorPanel
                  metrics={metrics}
                  history={history}
                  drainNodes={drainNodes}
                  onSelectDrain={onSelectDrain}
                />
              </div>
            )}

            {/* VIEW 5: SIH26085 DATA PIPELINE */}
            {activeTab === 'pipeline' && (
              <div className="space-y-3">
                <div className="text-xs text-gray-600 bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                  <span className="font-bold text-[#1a73e8]">SIH Problem Statement SIH26085:</span>
                  <p className="mt-0.5 text-[11px]">
                    Simulates Doppler Radar → High-Res DEM → 2D Surface Model → Runoff → Drainage Graph → AI Water Level Prediction → Alerts & Routing.
                  </p>
                </div>
                <DataPipelineBar metrics={metrics} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* When Collapsed: Reopen Tab Indicator (Google Maps `<` / `>` edge button) */}
      {!isOpen && (
        <button
          id="google-reopen-panel-btn"
          onClick={() => setIsOpen(true)}
          title="Open Navigation Panel"
          className="absolute top-[108px] left-0 z-20 bg-white hover:bg-gray-50 text-gray-700 rounded-r-xl shadow-lg border-y border-r border-gray-200 p-2.5 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
        >
          <ChevronRight className="w-5 h-5 text-[#1a73e8]" />
        </button>
      )}
    </>
  );
};
