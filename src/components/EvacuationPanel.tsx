import React, { useState } from 'react';
import {
  Ambulance,
  Bus,
  Car,
  MapPin,
  Crosshair,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { DestinationPreset, EvacuationRoute, FloodRiskZone } from '../types';
import { calculateEvacuationRoute } from '../services/osmService';

interface EvacuationPanelProps {
  userLocation: [number, number];
  destinations: DestinationPreset[];
  activeRoute: EvacuationRoute | null;
  onSetRoute: (route: EvacuationRoute | null) => void;
  floodZones: FloodRiskZone[];
  isDestinationPickingMode: boolean;
  onToggleDestinationPicking: () => void;
  customDestination: [number, number] | null;
}

export const EvacuationPanel: React.FC<EvacuationPanelProps> = ({
  userLocation,
  destinations,
  activeRoute,
  onSetRoute,
  floodZones,
  isDestinationPickingMode,
  onToggleDestinationPicking,
  customDestination,
}) => {
  const [activeTab, setActiveTab] = useState<'emergency' | 'transit' | 'public'>('emergency');
  const [selectedDestId, setSelectedDestId] = useState<string>(destinations[0]?.id || 'custom');
  const [isCalculating, setIsCalculating] = useState(false);

  const selectedPreset = destinations.find((d) => d.id === selectedDestId);

  // Compute route handler
  const handleCalculateRoute = async () => {
    setIsCalculating(true);
    let destCoords: [number, number] = [0, 0];
    let destName = '';

    if (selectedDestId === 'custom' && customDestination) {
      destCoords = customDestination;
      destName = 'Custom Map Evacuation Point';
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
        activeTab,
        floodZones
      );
      onSetRoute(route);
    } catch {
      // route calculation error handled gracefully
    } finally {
      setIsCalculating(false);
    }
  };

  const handleClearRoute = () => {
    onSetRoute(null);
  };

  return (
    <div className="bg-[#1e293b]/50 border border-[#334155] rounded-lg p-3.5 text-[#f8fafc]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/40 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-[#22d3ee]" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#f8fafc]">Evacuation & Routing</h3>
            <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider font-mono">OSRM Flood Avoidance</p>
          </div>
        </div>

        {activeRoute && (
          <button
            onClick={handleClearRoute}
            className="text-[10px] text-[#94a3b8] hover:text-white uppercase font-mono flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* 3 Evacuation Mode Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0f172a] rounded-md border border-[#1e293b] mb-3">
        <button
          id="tab-emergency"
          onClick={() => setActiveTab('emergency')}
          className={`py-1.5 px-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'emergency'
              ? 'bg-[#ef4444] text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <Ambulance className="w-3.5 h-3.5" />
          <span>Emergency</span>
        </button>

        <button
          id="tab-transit"
          onClick={() => setActiveTab('transit')}
          className={`py-1.5 px-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'transit'
              ? 'bg-[#22d3ee] text-[#0f172a] shadow-[0_0_10px_rgba(34,211,238,0.4)]'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <Bus className="w-3.5 h-3.5" />
          <span>Transit</span>
        </button>

        <button
          id="tab-public"
          onClick={() => setActiveTab('public')}
          className={`py-1.5 px-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'public'
              ? 'bg-emerald-500 text-[#0f172a] shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>Public</span>
        </button>
      </div>

      {/* Destination Select & Map Pin Tool */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-[#94a3b8]">
          <span>Safe Evacuation Destination</span>
          <button
            onClick={onToggleDestinationPicking}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
              isDestinationPickingMode
                ? 'bg-[#22d3ee]/20 text-[#22d3ee] border-[#22d3ee]'
                : 'bg-[#1e293b] text-[#cbd5e1] border-[#334155] hover:border-[#64748b]'
            }`}
          >
            <Crosshair className="w-3 h-3 text-[#22d3ee]" />
            {isDestinationPickingMode ? 'Click map...' : 'Pick on Map'}
          </button>
        </div>

        <select
          id="destination-select"
          aria-label="Select Safe Evacuation Destination"
          value={selectedDestId}
          onChange={(e) => setSelectedDestId(e.target.value)}
          className="w-full bg-[#0f172a] text-xs text-[#f1f5f9] border border-[#1e293b] rounded-md p-2 focus:outline-none focus:border-[#22d3ee] cursor-pointer font-mono"
        >
          {destinations.map((dest) => (
            <option key={dest.id} value={dest.id} className="bg-[#0f172a] text-[#f1f5f9]">
              {dest.name} ({dest.elevationM}m MSL)
            </option>
          ))}
          {customDestination && (
            <option value="custom" className="bg-[#0f172a] text-[#f1f5f9]">
              Custom Clicked Point ({customDestination[0].toFixed(3)}, {customDestination[1].toFixed(3)})
            </option>
          )}
        </select>

        {selectedPreset && (
          <div className="text-[10px] text-[#94a3b8] bg-[#0f172a] p-2 rounded border border-[#1e293b] flex items-start gap-1.5 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#22d3ee]">Elevation: {selectedPreset.elevationM}m MSL (Above Inundation Line)</div>
              <div className="text-[9px] text-[#64748b]">{selectedPreset.capacityNotes}</div>
            </div>
          </div>
        )}
      </div>

      {/* Calculate Route Action Button */}
      <button
        id="calculate-route-btn"
        onClick={handleCalculateRoute}
        disabled={isCalculating}
        className="w-full py-2 px-3 rounded-md bg-[#22d3ee] hover:bg-[#22d3ee]/90 text-[#0f172a] text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(34,211,238,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mb-3"
      >
        <Navigation className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
        <span>{isCalculating ? 'Routing via OSRM Engine...' : 'Calculate Safe Route'}</span>
      </button>

      {/* Active Route Details Card */}
      {activeRoute && (
        <div className="p-3 rounded-md bg-[#0f172a] border border-[#1e293b] text-xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1e293b]">
            <div>
              <span className="text-[9px] text-[#94a3b8] uppercase font-mono">Route Summary</span>
              <div className="font-bold text-[#f8fafc] truncate max-w-[180px] uppercase text-xs">
                {activeRoute.destinationName}
              </div>
            </div>

            {/* Safety Assessment Badge */}
            <div className="text-right">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  activeRoute.safetyScore === 'Severe Hazard'
                    ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40'
                    : activeRoute.safetyScore === 'Safe Rerouted'
                    ? 'bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                {activeRoute.safetyScore}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center py-1">
            <div className="bg-[#1e293b]/40 p-1.5 rounded border border-[#334155]/60">
              <span className="text-[9px] text-[#94a3b8] block uppercase font-mono">Est. Travel Time</span>
              <span className="text-sm font-mono font-bold text-[#22d3ee]">
                {activeRoute.durationMinutes} mins
              </span>
            </div>
            <div className="bg-[#1e293b]/40 p-1.5 rounded border border-[#334155]/60">
              <span className="text-[9px] text-[#94a3b8] block uppercase font-mono">Total Distance</span>
              <span className="text-sm font-mono font-bold text-[#22d3ee]">
                {activeRoute.distanceKm} km
              </span>
            </div>
          </div>

          {/* Warning if intersects flood zones */}
          {activeRoute.intersectsFloodZone && (
            <div className="p-2 rounded bg-[#ef4444]/15 border border-[#ef4444]/30 text-[10px] text-[#ef4444] flex items-start gap-1.5 font-mono">
              <AlertTriangle className="w-3.5 h-3.5 text-[#ef4444] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Notice:</span> Trajectory passes within 150m of {activeRoute.intersectedZones.join(', ')}.
                {activeRoute.safetyScore === 'Safe Rerouted' && ' High-ground detours applied.'}
              </div>
            </div>
          )}

          {/* Turn-by-turn guidance */}
          <div className="pt-1">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#94a3b8] block mb-1">Evacuation Advisories</span>
            <div className="space-y-1 text-[10px] text-[#cbd5e1] font-mono">
              {activeRoute.instructions.map((step, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-[#22d3ee] font-bold">0{idx + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
