import React from 'react';
import {
  CloudRain,
  Activity,
  Waves,
  GitBranch,
  Gauge,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { DrainNode, PipelineMetrics, SensorHistoryPoint } from '../types';

interface LiveSensorPanelProps {
  metrics: PipelineMetrics;
  history: SensorHistoryPoint[];
  drainNodes: DrainNode[];
  onSelectDrain?: (drain: DrainNode) => void;
}

export const LiveSensorPanel: React.FC<LiveSensorPanelProps> = ({
  metrics,
  history,
  drainNodes,
  onSelectDrain,
}) => {
  // SVG Chart helpers
  const maxRain = Math.max(80, ...history.map((h) => h.rainfallMmHr));
  const maxWater = Math.max(100, ...history.map((h) => h.waterLevelCm));

  // Count drain statuses
  const clearCount = drainNodes.filter((d) => d.status === 'Clear').length;
  const partialCount = drainNodes.filter((d) => d.status === 'Partial').length;
  const blockedCount = drainNodes.filter((d) => d.status === 'Blocked').length;

  // Build SVG points for rainfall trend (width 260, height 70)
  const chartWidth = 260;
  const chartHeight = 70;
  const padX = 10;
  const padY = 8;
  const usableW = chartWidth - padX * 2;
  const usableH = chartHeight - padY * 2;

  const rainPoints = history.map((pt, idx) => {
    const x = padX + (idx / Math.max(1, history.length - 1)) * usableW;
    const y = chartHeight - padY - (pt.rainfallMmHr / maxRain) * usableH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const waterPoints = history.map((pt, idx) => {
    const x = padX + (idx / Math.max(1, history.length - 1)) * usableW;
    const y = chartHeight - padY - (pt.waterLevelCm / maxWater) * usableH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Closed path for rainfall gradient area
  const rainAreaPath =
    rainPoints.length > 0
      ? `M ${rainPoints[0]} L ${rainPoints.join(' L ')} L ${chartWidth - padX},${chartHeight - padY} L ${padX},${chartHeight - padY} Z`
      : '';

  // Closed path for water level gradient area
  const waterAreaPath =
    waterPoints.length > 0
      ? `M ${waterPoints[0]} L ${waterPoints.join(' L ')} L ${chartWidth - padX},${chartHeight - padY} L ${padX},${chartHeight - padY} Z`
      : '';

  return (
    <div className="space-y-3.5 text-[#f8fafc]">
      {/* 1. Atmospheric Data / Doppler Rainfall Gauge & 1-Hour Chart */}
      <section className="bg-[#1e293b]/50 p-3.5 rounded-lg border border-[#334155]">
        <h3 className="text-[11px] uppercase font-bold text-[#94a3b8] mb-2 tracking-widest flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CloudRain className="w-3.5 h-3.5 text-[#22d3ee]" />
            Atmospheric Data
          </span>
          <span className="text-[9px] font-mono text-[#64748b]">{metrics.radarReflectivityDbz} dBZ</span>
        </h3>

        <div className="flex justify-between items-end mb-2">
          <span className="text-xs text-[#94a3b8]">Rainfall Intensity</span>
          <span className="text-xl font-mono font-bold text-[#22d3ee]">
            {metrics.dopplerRainfallMmHr}
            <span className="text-xs font-normal ml-1 text-[#64748b]">mm/h</span>
          </span>
        </div>

        {/* 1-Hour Trend Line Chart */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded p-2">
          <div className="flex justify-between text-[10px] text-[#94a3b8] mb-1 font-mono">
            <span>60M NOWCAST</span>
            <span className="text-[#22d3ee] font-bold">PEAK: {maxRain} MM/H</span>
          </div>
          <div className="w-full overflow-hidden flex justify-center">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-14 overflow-visible"
            >
              <defs>
                <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line
                x1={padX}
                y1={chartHeight / 2}
                x2={chartWidth - padX}
                y2={chartHeight / 2}
                stroke="#1e293b"
                strokeDasharray="2,2"
              />
              {/* Area */}
              {rainAreaPath && <path d={rainAreaPath} fill="url(#rainGrad)" />}
              {/* Line */}
              {rainPoints.length > 0 && (
                <polyline
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={rainPoints.join(' ')}
                />
              )}
              {/* Current pulse point */}
              {rainPoints.length > 0 && (
                <circle
                  cx={rainPoints[rainPoints.length - 1].split(',')[0]}
                  cy={rainPoints[rainPoints.length - 1].split(',')[1]}
                  r="3"
                  fill="#22d3ee"
                  className="animate-ping-slow"
                />
              )}
            </svg>
          </div>
          <div className="flex justify-between text-[9px] text-[#64748b] mt-1 font-mono uppercase">
            <span>-60m</span>
            <span>-30m</span>
            <span className="text-[#22d3ee] font-bold">Now</span>
          </div>
        </div>
      </section>

      {/* 2. Drainage Telemetry */}
      <section className="bg-[#1e293b]/40 p-3.5 rounded-lg border border-[#334155]">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[11px] uppercase font-bold text-[#94a3b8] tracking-widest flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-[#22d3ee]" />
            Drainage Telemetry
          </h3>
          <span className="text-[10px] font-mono text-amber-400 font-bold">{metrics.drainLoadPct}% LOAD</span>
        </div>

        {/* Global Load Progress Bar */}
        <div className="w-full bg-[#0f172a] h-2 rounded-full overflow-hidden mb-3 border border-[#1e293b]">
          <div
            className={`h-full transition-all duration-500 ${
              metrics.drainLoadPct >= 85
                ? 'bg-[#ef4444] shadow-[0_0_8px_#ef4444]'
                : metrics.drainLoadPct >= 65
                ? 'bg-orange-500'
                : 'bg-[#22d3ee]'
            }`}
            style={{ width: `${Math.min(100, metrics.drainLoadPct)}%` }}
          />
        </div>

        {/* Drain Status summary chips */}
        <div className="grid grid-cols-3 gap-1.5 mb-2.5 text-center">
          <div className="bg-[#0f172a] p-1.5 rounded border border-[#1e293b]">
            <div className="text-[9px] font-mono uppercase text-emerald-400">Clear</div>
            <div className="text-xs font-mono font-bold text-[#f1f5f9]">{clearCount}</div>
          </div>
          <div className="bg-[#0f172a] p-1.5 rounded border border-[#1e293b]">
            <div className="text-[9px] font-mono uppercase text-orange-400">Partial</div>
            <div className="text-xs font-mono font-bold text-[#f1f5f9]">{partialCount}</div>
          </div>
          <div className="bg-[#0f172a] p-1.5 rounded border border-[#1e293b]">
            <div className="text-[9px] font-mono uppercase text-[#ef4444]">Blocked</div>
            <div className="text-xs font-mono font-bold text-[#f1f5f9]">{blockedCount}</div>
          </div>
        </div>

        {/* Scrollable list of drains styled like Geometric Balance snippet */}
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {drainNodes.map((drain) => {
            const isBlocked = drain.status === 'Blocked';
            const isPartial = drain.status === 'Partial';
            const statusColor = isBlocked ? 'text-[#ef4444]' : isPartial ? 'text-orange-400' : 'text-[#22d3ee]';
            const barColor = isBlocked ? 'bg-[#ef4444]' : isPartial ? 'bg-orange-500' : 'bg-[#22d3ee]';
            const dotColor = isBlocked ? 'bg-[#ef4444]' : isPartial ? 'bg-orange-400' : 'bg-[#22d3ee]';

            return (
              <div
                key={drain.id}
                onClick={() => onSelectDrain && onSelectDrain(drain)}
                className="bg-[#1e293b]/30 hover:bg-[#1e293b]/60 p-2 rounded border border-[#334155] transition-colors cursor-pointer"
              >
                <div className="flex justify-between text-[10px] mb-1 uppercase font-mono">
                  <span className="text-[#f1f5f9] font-medium truncate max-w-[130px]">{drain.name}</span>
                  <span className={statusColor}>{drain.loadPercentage}% Load</span>
                </div>
                <div className="w-full bg-[#0f172a] h-1.5 rounded-full overflow-hidden">
                  <div className={`${barColor} h-full`} style={{ width: `${Math.min(100, drain.loadPercentage)}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between items-center">
                  <span className={`text-[9px] ${statusColor} font-bold uppercase`}>
                    Status: {drain.status === 'Clear' ? 'Flowing Clear' : drain.status === 'Partial' ? 'Partial Blockage' : 'Full Silt Block'}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Water Level Trend Section with Dot Matrix Texture */}
      <section className="bg-[#1e293b]/40 p-3.5 rounded-lg border border-[#334155]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase font-bold text-[#94a3b8] tracking-widest flex items-center gap-1.5">
            <Waves className="w-3.5 h-3.5 text-[#22d3ee]" />
            Water Level Trend
          </span>
          <span className="text-[10px] text-[#ef4444] font-bold font-mono">
            {metrics.rateOfRiseCmHr > 0 ? `+${metrics.rateOfRiseCmHr}` : metrics.rateOfRiseCmHr}cm / hr
          </span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-[#94a3b8]">Current Inundation</span>
          <span className="text-xl font-mono font-bold text-[#22d3ee]">
            {metrics.waterLevelCm}
            <span className="text-xs font-normal ml-1 text-[#64748b]">cm</span>
          </span>
        </div>

        {/* Water Level Chart */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded p-2">
          <div className="w-full overflow-hidden flex justify-center">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-14 overflow-visible"
            >
              <defs>
                <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Threshold line 40cm */}
              <line
                x1={padX}
                y1={chartHeight - padY - (40 / maxWater) * usableH}
                x2={chartWidth - padX}
                y2={chartHeight - padY - (40 / maxWater) * usableH}
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              {/* Threshold line 70cm */}
              <line
                x1={padX}
                y1={chartHeight - padY - (70 / maxWater) * usableH}
                x2={chartWidth - padX}
                y2={chartHeight - padY - (70 / maxWater) * usableH}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              {/* Area */}
              {waterAreaPath && <path d={waterAreaPath} fill="url(#waterGrad)" />}
              {/* Line */}
              {waterPoints.length > 0 && (
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={waterPoints.join(' ')}
                />
              )}
              {/* Latest circle */}
              {waterPoints.length > 0 && (
                <circle
                  cx={waterPoints[waterPoints.length - 1].split(',')[0]}
                  cy={waterPoints[waterPoints.length - 1].split(',')[1]}
                  r="3"
                  fill="#38bdf8"
                />
              )}
            </svg>
          </div>
          <div className="flex justify-between text-[9px] text-[#64748b] mt-1 font-mono uppercase">
            <span>Base</span>
            <span className="text-amber-400">40cm Warn</span>
            <span className="text-[#ef4444]">70cm Crit</span>
          </div>
        </div>

        {/* Dot Matrix visual accent from Geometric Balance HTML */}
        <div className="h-8 w-full opacity-40 rounded mt-2 bg-dot-matrix"></div>
      </section>

      {/* 4. System Confidence from Geometric Balance Design */}
      <div className="bg-[#1e293b]/40 p-3 rounded-lg border border-[#334155]">
        <div className="text-[9px] text-[#64748b] uppercase tracking-widest mb-1 font-bold">
          Model Inference Confidence
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-mono font-bold text-emerald-400">94.8%</span>
          <span className="text-[9px] font-mono text-emerald-400/70 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            High Precision Mode
          </span>
        </div>
      </div>
    </div>
  );
};
