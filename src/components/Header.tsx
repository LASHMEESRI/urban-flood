import React from 'react';
import {
  CloudRain,
  Radio,
  AlertTriangle,
  Flame,
  RotateCw,
  Sliders,
  MapPin,
  Compass,
} from 'lucide-react';
import { CityPreset, RiskLevel } from '../types';
import { CITY_PRESETS } from '../services/simulation';

interface HeaderProps {
  detectedLocation: string;
  selectedCity: CityPreset;
  onSelectCity: (city: CityPreset) => void;
  overallRisk: RiskLevel;
  aiRiskScore: number;
  lastUpdated: string;
  isCloudburstActive: boolean;
  onToggleCloudburst: () => void;
  showPipelineBar: boolean;
  onTogglePipelineBar: () => void;
  onManualRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  detectedLocation,
  selectedCity,
  onSelectCity,
  overallRisk,
  aiRiskScore,
  lastUpdated,
  isCloudburstActive,
  onToggleCloudburst,
  showPipelineBar,
  onTogglePipelineBar,
  onManualRefresh,
  isRefreshing,
}) => {
  const getRiskBadgeColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'Severe':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'High':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'Moderate':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
    }
  };

  return (
    <header className="bg-[#0f172a] border-b border-[#1e293b] text-[#f8fafc] sticky top-0 z-40 px-4 sm:px-6 py-3">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Brand & City Identification */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#22d3ee] flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)] shrink-0">
            <CloudRain className="w-6 h-6 text-[#0f172a]" strokeWidth={2.5} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase leading-none text-[#f8fafc]">
                Urban Flood Nowcasting
              </h1>
              <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-[#1e293b] text-[#22d3ee] border border-[#334155] tracking-widest">
                SIH26085 • Real-Time GIS
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-[#94a3b8] uppercase tracking-widest mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[#22d3ee] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <MapPin className="w-3 h-3 text-[#22d3ee] shrink-0" />
                <span className="truncate max-w-[220px] sm:max-w-xs">{detectedLocation || selectedCity.name}</span>
              </span>
              <span className="text-[#334155]">•</span>
              <span className="text-[#94a3b8] flex items-center gap-1">
                <Radio className="w-3 h-3 text-[#22d3ee]" />
                Doppler Radar Telemetry Active
              </span>
            </div>
          </div>
        </div>

        {/* Center & Right: Controls, City Selector & Risk Status */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between md:justify-end">
          {/* Current Catchment Location box */}
          <div className="bg-[#1e293b] rounded-md px-3 py-1 text-left hidden xl:block border border-[#334155]/60">
            <div className="text-[9px] text-[#94a3b8] uppercase tracking-widest">Catchment Area</div>
            <div className="text-xs font-mono font-bold text-[#22d3ee] truncate max-w-[160px]">
              {selectedCity.name}
            </div>
          </div>

          {/* City Presets Dropdown */}
          <div className="relative flex items-center">
            <Compass className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 pointer-events-none" />
            <select
              id="city-selector"
              aria-label="Select City Catchment"
              value={selectedCity.id}
              onChange={(e) => {
                const found = CITY_PRESETS.find((c) => c.id === e.target.value);
                if (found) onSelectCity(found);
              }}
              className="bg-[#1e293b] text-xs text-[#f1f5f9] border border-[#334155] rounded-md pl-8 pr-7 py-1.5 focus:outline-none focus:border-[#22d3ee] hover:border-[#475569] transition-colors cursor-pointer appearance-none font-mono"
            >
              {CITY_PRESETS.map((city) => (
                <option key={city.id} value={city.id} className="bg-[#0f172a] text-[#f1f5f9]">
                  {city.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2 text-[#94a3b8] text-[10px]">▼</div>
          </div>

          {/* Overall City Risk Badge */}
          <div
            id="overall-risk-badge"
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
              overallRisk === 'Severe' || overallRisk === 'High'
                ? 'bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#ef4444]'
                : overallRisk === 'Moderate'
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                overallRisk === 'Severe' || overallRisk === 'High'
                  ? 'bg-[#ef4444]'
                  : overallRisk === 'Moderate'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span>{overallRisk} Risk ({aiRiskScore}%)</span>
          </div>

          {/* Pipeline Toggle */}
          <button
            id="toggle-pipeline-btn"
            onClick={onTogglePipelineBar}
            title="Toggle SIH26085 Data Flow Pipeline architecture"
            className={`text-xs px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 transition-all cursor-pointer font-medium uppercase tracking-wide text-[10px] ${
              showPipelineBar
                ? 'bg-[#22d3ee]/20 border-[#22d3ee]/60 text-[#22d3ee] shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:border-[#64748b] hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#22d3ee]" />
            <span className="hidden sm:inline">Pipeline</span>
          </button>

          {/* Cloudburst Simulation Trigger */}
          <button
            id="simulate-cloudburst-btn"
            onClick={onToggleCloudburst}
            title={isCloudburstActive ? 'Reset to normal rain' : 'Simulate high-intensity cloudburst (>80mm/h)'}
            className={`text-xs px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${
              isCloudburstActive
                ? 'bg-[#ef4444] border-[#ef4444] text-white shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse'
                : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:border-amber-500/50 hover:text-amber-400'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${isCloudburstActive ? 'text-white' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">
              {isCloudburstActive ? 'Cloudburst' : 'Simulate Rain'}
            </span>
          </button>

          {/* Manual Refresh & Timestamp */}
          <button
            id="manual-refresh-btn"
            onClick={onManualRefresh}
            disabled={isRefreshing}
            title={`Last updated ${lastUpdated}. Click to force nowcast refresh.`}
            className="text-xs p-1.5 bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] border border-[#334155] rounded-md flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#22d3ee] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-mono text-[#94a3b8] hidden lg:inline">{lastUpdated}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
