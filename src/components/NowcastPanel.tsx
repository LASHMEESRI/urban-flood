import React from 'react';
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  Flame,
  Shield,
  Zap,
} from 'lucide-react';
import { NowcastInterval, PipelineMetrics, RiskLevel } from '../types';

interface NowcastPanelProps {
  metrics: PipelineMetrics;
  nowcastTimeline: NowcastInterval[];
  refreshCountdown: number;
  totalCountdown: number;
  onTriggerNowcast: () => void;
  isCloudburstActive: boolean;
  onToggleCloudburst: () => void;
}

export const NowcastPanel: React.FC<NowcastPanelProps> = ({
  metrics,
  nowcastTimeline,
  refreshCountdown,
  totalCountdown,
  onTriggerNowcast,
  isCloudburstActive,
  onToggleCloudburst,
}) => {
  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'Severe':
        return { text: 'text-red-400', bg: 'bg-red-500', bar: '#EF4444' };
      case 'High':
        return { text: 'text-amber-400', bg: 'bg-amber-500', bar: '#F59E0B' };
      case 'Moderate':
        return { text: 'text-yellow-400', bg: 'bg-yellow-400', bar: '#FBBF24' };
      default:
        return { text: 'text-emerald-400', bg: 'bg-emerald-500', bar: '#10B981' };
    }
  };

  const currentColors = getRiskColor(metrics.overallRiskLevel);
  const countdownPct = Math.round(((totalCountdown - refreshCountdown) / totalCountdown) * 100);

  return (
    <div className="bg-[#1e293b]/50 border border-[#334155] rounded-lg p-3.5 text-[#f8fafc]">
      {/* Header: AI Prediction Model Status & Auto-refresh Progress */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/40 flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#22d3ee]" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#f8fafc]">AI Flood Nowcast</h3>
            <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider font-mono">0–3h Prediction Window</p>
          </div>
        </div>

        {/* Refresh countdown ticker */}
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#94a3b8] justify-end uppercase">
            <Clock className="w-3 h-3 text-[#22d3ee]" />
            <span>Cycle: {refreshCountdown}s</span>
          </div>
          <div className="w-20 bg-[#0f172a] h-1.5 rounded-full overflow-hidden mt-1 ml-auto border border-[#1e293b]">
            <div
              className="bg-[#22d3ee] h-full transition-all duration-300"
              style={{ width: `${countdownPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Overall Risk Score Badge Card */}
      <div className="p-3 rounded-md bg-[#0f172a] border border-[#1e293b] mb-3 flex items-center justify-between">
        <div>
          <span className="text-[9px] uppercase font-bold tracking-widest text-[#94a3b8]">
            Current Risk Severity
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className={`text-lg font-bold uppercase tracking-tight ${currentColors.text}`}>
              {metrics.overallRiskLevel}
            </span>
            <span className="text-xs font-mono text-[#94a3b8]">
              Score: <strong className="text-[#22d3ee]">{metrics.aiRiskScore}</strong>/100
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[9px] text-[#94a3b8] uppercase tracking-widest block font-mono">Peak Inundation</span>
          <span className="text-xs font-mono font-bold text-[#22d3ee] mt-0.5 inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            +45m to +90m
          </span>
        </div>
      </div>

      {/* 0-3 Hour Timeline Bar Chart (30-min intervals) */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-[#94a3b8]">
          <span>Timeline (30-min Intervals)</span>
          <span>Probability %</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {nowcastTimeline.map((item, idx) => {
            const colors = getRiskColor(item.riskLevel);
            return (
              <div
                key={idx}
                className="flex flex-col items-center bg-[#0f172a] rounded p-1.5 border border-[#1e293b] hover:border-[#334155] transition-colors text-center"
              >
                <span className="text-[10px] font-mono font-bold text-[#f1f5f9] mb-1">{item.label}</span>

                {/* Vertical Bar Container */}
                <div className="h-20 w-full flex items-end justify-center py-1">
                  <div
                    className="w-full max-w-[16px] rounded-t transition-all duration-500 relative group"
                    style={{
                      height: `${Math.max(12, item.probability)}%`,
                      backgroundColor: colors.bar,
                      opacity: 0.9,
                    }}
                  >
                    {/* Hover tooltip for depth */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-[#0a0c10] border border-[#1e293b] text-[#22d3ee] text-[9px] rounded font-mono pointer-events-none whitespace-nowrap z-20 shadow-lg">
                      {item.expectedDepthCm}cm
                    </div>
                  </div>
                </div>

                {/* Probability & Water depth */}
                <span className="text-[10px] font-mono font-bold text-[#f1f5f9] mt-1">
                  {item.probability}%
                </span>
                <span className="text-[9px] font-mono text-[#64748b]">
                  {item.expectedDepthCm}cm
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Controls */}
      <div className="mt-3.5 pt-2.5 border-t border-[#1e293b] flex items-center justify-between gap-2">
        <button
          id="trigger-nowcast-btn"
          onClick={onTriggerNowcast}
          className="flex-1 py-1.5 px-3 rounded-md bg-[#22d3ee]/20 hover:bg-[#22d3ee]/30 text-[#22d3ee] border border-[#22d3ee]/40 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-[#22d3ee]" />
          Run Inference
        </button>

        <button
          id="cloudburst-panel-btn"
          onClick={onToggleCloudburst}
          className={`py-1.5 px-3 rounded-md border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
            isCloudburstActive
              ? 'bg-[#ef4444] border-[#ef4444] text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]'
              : 'bg-[#1e293b] hover:bg-[#334155] border-[#334155] text-[#94a3b8]'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${isCloudburstActive ? 'text-white' : 'text-amber-400'}`} />
          {isCloudburstActive ? 'Reset Rain' : 'Simulate 85mm/h'}
        </button>
      </div>
    </div>
  );
};
