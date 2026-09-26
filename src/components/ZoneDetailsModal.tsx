import React from 'react';
import {
  X,
  Waves,
  Mountain,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Navigation,
} from 'lucide-react';
import { FloodRiskZone } from '../types';

interface ZoneDetailsModalProps {
  zone: FloodRiskZone | null;
  onClose: () => void;
  onSetEvacuationDestination?: (coords: [number, number], name: string) => void;
}

export const ZoneDetailsModal: React.FC<ZoneDetailsModalProps> = ({
  zone,
  onClose,
  onSetEvacuationDestination,
}) => {
  if (!zone) return null;

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'Severe':
        return 'bg-red-50 text-[#ea4335] border-red-200';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Moderate':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-gray-900 border border-gray-100 animate-in fade-in zoom-in duration-150">
        {/* Header with Google styling */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-[#1a73e8]">
              <Waves className="w-5 h-5 text-[#1a73e8]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 leading-tight">{zone.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Zone {zone.id} • [{zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}]
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Inundation Risk
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-gray-900">
                  {zone.riskPercentage}%
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getRiskBadge(zone.riskLevel)}`}>
                  {zone.riskLevel}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Water Depth
              </span>
              <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
                {zone.predictedWaterLevelCm}
                <span className="text-xs text-gray-500 font-normal ml-1">cm</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                ETA to Peak
              </span>
              <div className="text-base font-bold font-mono text-amber-600 mt-1">
                ~{zone.etaMinutes} mins
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                <Mountain className="w-3 h-3 text-emerald-500" />
                Elevation
              </span>
              <div className="text-base font-bold font-mono text-emerald-600 mt-1">
                {zone.elevationMeters}m MSL
              </div>
            </div>
          </div>

          {/* Environmental Characteristics */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Land Cover:</span>
              <span className="font-semibold text-gray-800">{zone.landCover}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Runoff Coefficient (C):</span>
              <span className="font-semibold font-mono text-blue-600">{zone.runoffCoefficient}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Inundation Radius:</span>
              <span className="font-semibold text-gray-800">{zone.radius}m</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <span className="text-gray-500 font-medium block mb-1.5">Affected Storm Drainage Nodes:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {zone.affectedDrains.map((drain, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-full bg-blue-50 text-[#1a73e8] text-[11px] font-medium border border-blue-200"
                  >
                    {drain}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Disaster Advisory */}
          {zone.riskLevel === 'Severe' || zone.riskLevel === 'High' ? (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-red-800 mb-0.5">Disaster Management Warning</strong>
                Surface water exceeds vehicular threshold. Metro & railway underpasses impassable. Use high-elevation corridors.
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              Water levels remain within designed drainage capacity margins.
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          {onSetEvacuationDestination ? (
            <button
              onClick={() => {
                onSetEvacuationDestination([zone.lat, zone.lng], zone.name);
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Route Safe Evacuation</span>
            </button>
          ) : <div></div>}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
