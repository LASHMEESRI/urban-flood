import React from 'react';
import { Database, ShieldCheck, ExternalLink, Activity } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0f172a] border-t border-[#1e293b] px-4 sm:px-6 py-2.5 text-[#64748b] text-[10px] uppercase tracking-widest">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
        <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start font-mono">
          <span className="flex items-center gap-1.5 text-[#f1f5f9] font-bold">
            <Database className="w-3.5 h-3.5 text-[#22d3ee]" />
            Data Feeds:
          </span>
          <span className="text-[#94a3b8]">
            IMD Doppler Radar • CWC Hydrological • CartoSAT DEM • OpenStreetMap &amp; OSRM
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-[#64748b] flex-wrap justify-center font-mono">
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Simulation Engine: 15s Cycle
          </span>
          <span className="text-[#334155]">•</span>
          <span className="text-[#94a3b8]">SIH26085 Prototype</span>
        </div>
      </div>
    </footer>
  );
};
