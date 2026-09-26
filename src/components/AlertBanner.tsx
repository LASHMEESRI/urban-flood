import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  History,
  ShieldAlert,
  ArrowRight,
  BellRing,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AlertItem } from '../types';

interface AlertBannerProps {
  currentAlert: AlertItem | null;
  alertHistory: AlertItem[];
  onDismissAlert: (id: string) => void;
  onOpenEvacuation: () => void;
  onSelectZoneByName?: (zoneName: string) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  currentAlert,
  alertHistory,
  onDismissAlert,
  onOpenEvacuation,
  onSelectZoneByName,
}) => {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Web Audio synthesizer for gentle emergency chime
  const playAlertChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio not permitted or supported in background
    }
  };

  return (
    <>
      {/* Prominent Emergency Alert Toast/Banner */}
      {currentAlert && (
        <div
          id="active-flood-alert-banner"
          className="relative z-30 bg-[#ef4444] text-white px-4 sm:px-6 py-2.5 shadow-2xl border-b border-red-400"
        >
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-1.5 rounded bg-white/20 text-white shrink-0">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[10px] uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded font-mono">
                    {currentAlert.severity === 'Severe' ? 'CRITICAL ALERT' : 'FLOOD WARNING'}
                  </span>
                  <span className="text-[10px] text-red-100 font-mono">[{currentAlert.timestamp}]</span>
                  <span className="text-xs font-bold uppercase tracking-tight text-white">{currentAlert.title}</span>
                </div>
                <p className="text-[11px] text-white/90 mt-0.5 max-w-2xl leading-snug uppercase tracking-tight">
                  {currentAlert.message}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => {
                  playAlertChime();
                  onOpenEvacuation();
                }}
                className="px-3 py-1 rounded bg-black/30 hover:bg-black/40 text-white text-[10px] font-bold uppercase tracking-wider shadow flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20"
              >
                <span>Evacuate</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              <button
                onClick={() => setShowHistoryModal(true)}
                title="View alert history log"
                className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Mute Alert Audio' : 'Unmute Alert Audio'}
                className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => onDismissAlert(currentAlert.id)}
                title="Dismiss banner"
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0a0c10] border border-[#1e293b] rounded-lg shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden text-[#f8fafc]">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-[#1e293b] bg-[#0f172a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#ef4444]" />
                <h3 className="font-bold text-xs uppercase tracking-widest text-[#f8fafc]">Incident History Log</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-[#94a3b8] hover:text-white p-1 rounded hover:bg-[#1e293b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: List of recent alerts */}
            <div className="p-5 overflow-y-auto space-y-4">
              {alertHistory.length === 0 ? (
                <div className="text-center py-8 text-[#64748b] text-xs uppercase font-mono">
                  No previous flood alerts recorded in this session.
                </div>
              ) : (
                <div className="border-l-2 border-[#1e293b] ml-2 pl-4 space-y-4">
                  {alertHistory.slice(0, 10).map((item) => (
                    <div key={item.id} className="relative">
                      <div
                        className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${
                          item.severity === 'Severe'
                            ? 'bg-[#ef4444] shadow-[0_0_6px_#ef4444]'
                            : item.severity === 'High'
                            ? 'bg-orange-500'
                            : 'bg-yellow-500'
                        }`}
                      />
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#64748b] uppercase">
                        <span>{item.timestamp} • {item.severity}</span>
                        <span className="text-[#22d3ee] font-bold">{item.zoneName}</span>
                      </div>
                      <div className="text-xs font-semibold text-[#f1f5f9] mt-0.5">{item.title}</div>
                      <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-relaxed">{item.message}</p>
                      {onSelectZoneByName && (
                        <button
                          onClick={() => {
                            onSelectZoneByName(item.zoneName);
                            setShowHistoryModal(false);
                          }}
                          className="mt-1 text-[10px] uppercase font-bold text-[#22d3ee] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Locate on Map →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#1e293b] bg-[#0f172a] flex items-center justify-between text-[10px] text-[#64748b] uppercase tracking-wider font-mono">
              <span>Automatic Disaster Broadcast Sync</span>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-3 py-1 bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] rounded text-[10px] uppercase font-bold border border-[#334155]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
