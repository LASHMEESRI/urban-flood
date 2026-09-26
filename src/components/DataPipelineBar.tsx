import React, { useState } from 'react';
import {
  Radio,
  Mountain,
  Waves,
  GitBranch,
  Gauge,
  Cpu,
  Map,
  Navigation,
  ChevronRight,
  Info,
} from 'lucide-react';
import { PipelineMetrics } from '../types';

interface DataPipelineBarProps {
  metrics: PipelineMetrics;
}

export const DataPipelineBar: React.FC<DataPipelineBarProps> = ({ metrics }) => {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  const steps = [
    {
      id: 1,
      name: 'Doppler Radar',
      source: 'IMD / Radar Nowcast',
      metric: `${metrics.dopplerRainfallMmHr} mm/hr`,
      subMetric: `${metrics.radarReflectivityDbz} dBZ`,
      icon: Radio,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/30',
      desc: 'High-frequency radar reflectivity scans converted into precipitation intensity using Z-R Marshall-Palmer relationship.',
    },
    {
      id: 2,
      name: 'DEM + Land Cover',
      source: 'ISRO Bhuvan CartoSAT',
      metric: `${metrics.demElevationMeanM}m MSL`,
      subMetric: `${metrics.imperviousCoverPct}% Impervious`,
      icon: Mountain,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      desc: 'High-resolution Digital Elevation Model (DEM) and Land Use/Land Cover (LULC) classify surface runoff potential and depression storage.',
    },
    {
      id: 3,
      name: '2D Surface Runoff',
      source: 'Hydrological Engine',
      metric: `${metrics.runoffRateM3s} m³/s`,
      subMetric: 'Overland Flow',
      icon: Waves,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/30',
      desc: 'Shallow water hydrodynamic equation balances precipitation volume with slope gradient to calculate peak discharge rate.',
    },
    {
      id: 4,
      name: 'Drainage Graph',
      source: 'IoT Telemetry Mesh',
      metric: `${metrics.drainLoadPct}% Load`,
      subMetric: `${metrics.networkBlockagePct}% Silt Choke`,
      icon: GitBranch,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      desc: 'Node-pipe drainage graph combining hydraulic conduit diameter, siltation sensors, and gravity outfall tidal backpressure.',
    },
    {
      id: 5,
      name: 'Water Level Calc',
      source: 'Net Inflow Dynamics',
      metric: `${metrics.waterLevelCm} cm`,
      subMetric: `${metrics.rateOfRiseCmHr > 0 ? '+' : ''}${metrics.rateOfRiseCmHr} cm/hr`,
      icon: Gauge,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/30',
      desc: 'Differential accumulation equation: Inundation Depth = Surface Runoff - Effective Drainage Infiltration.',
    },
    {
      id: 6,
      name: 'AI Flood Nowcast',
      source: 'LSTM / Spatial Ensemble',
      metric: `${metrics.aiRiskScore}/100`,
      subMetric: `${metrics.overallRiskLevel} Risk`,
      icon: Cpu,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/30',
      desc: 'Recurrent Neural Network model trained on historical monsoon inundations predicts 0-3 hour flood probabilities across city wards.',
    },
    {
      id: 7,
      name: 'GIS & Alert Engine',
      source: 'Leaflet Spatial Engine',
      metric: 'Active Overlays',
      subMetric: 'Ward Broadcast',
      icon: Map,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30',
      desc: 'Real-time polygon rasterization on OpenStreetMap tiles and instant dispatch of emergency citizen flash flood alerts.',
    },
    {
      id: 8,
      name: 'Safe Routing API',
      source: 'OSRM Engine',
      metric: 'Dynamic Detour',
      subMetric: 'Flood-Avoidance',
      icon: Navigation,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/30',
      desc: 'Open Source Routing Machine (OSRM) queries with real-time dynamic edge weighting to circumvent flooded roads and underpasses.',
    },
  ];

  return (
    <section className="bg-[#0a0c10] border-b border-[#1e293b] px-4 sm:px-6 py-2.5 text-xs transition-all relative">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[#94a3b8] font-bold text-[10px] uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] shadow-[0_0_6px_#22d3ee]"></span>
            SIH26085 Data Flow Pipeline • Hydro-Spatial Synthesis
          </div>
          <span className="text-[10px] text-[#64748b] uppercase tracking-wider hidden sm:inline">
            Select node for algorithm &amp; governing equation
          </span>
        </div>

        {/* Pipeline Horizontal Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = selectedStep === step.id;
            return (
              <div key={step.id} className="relative group">
                <button
                  id={`pipeline-step-${step.id}`}
                  onClick={() => setSelectedStep(isSelected ? null : step.id)}
                  className={`w-full text-left p-2 rounded-md border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#22d3ee] bg-[#22d3ee]/15 shadow-[0_0_12px_rgba(34,211,238,0.25)] ring-1 ring-[#22d3ee]'
                      : 'bg-[#1e293b]/40 border-[#334155]/70 hover:border-[#22d3ee]/50 hover:bg-[#1e293b]/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono font-bold text-[#64748b]">0{step.id}</span>
                    <Icon className="w-3.5 h-3.5 text-[#22d3ee]" />
                  </div>
                  <div className="font-bold text-[#f1f5f9] truncate text-[11px] uppercase tracking-tight leading-tight">
                    {step.name}
                  </div>
                  <div className="font-mono text-[#22d3ee] font-bold text-xs mt-0.5">
                    {step.metric}
                  </div>
                  <div className="text-[9px] text-[#94a3b8] truncate font-mono">
                    {step.subMetric}
                  </div>
                </button>

                {/* Connector Arrow for desktop */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-[#334155]">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detailed Explanation Drawer when clicked */}
        {selectedStep !== null && (
          <div className="mt-2.5 p-3 rounded-md bg-[#0f172a] border border-[#1e293b] text-[#cbd5e1] flex items-start gap-2.5 text-xs animate-fadeIn">
            <Info className="w-4 h-4 text-[#22d3ee] shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-[#f8fafc] flex items-center gap-2">
                <span className="uppercase tracking-wide">Step 0{selectedStep}: {steps[selectedStep - 1].name}</span>
                <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-[#1e293b] text-[#22d3ee] border border-[#334155]">
                  Source: {steps[selectedStep - 1].source}
                </span>
              </div>
              <p className="mt-1 text-[#94a3b8] leading-relaxed text-[11px]">
                {steps[selectedStep - 1].desc}
              </p>
            </div>
            <button
              onClick={() => setSelectedStep(null)}
              className="text-[#94a3b8] hover:text-white text-[10px] uppercase font-bold px-2.5 py-1 rounded bg-[#1e293b] border border-[#334155] cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
