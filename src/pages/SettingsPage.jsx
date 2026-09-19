import React from 'react';
import { Settings, Shield, Sliders } from 'lucide-react';

export const SettingsPage = () => {
  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Platform Settings & Thresholds
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Global alert thresholds, SIEM ingestion limits, and analyst preference settings.
          </p>
        </div>
        <span className="text-[10px] font-mono text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs">
          Environment: CYBERNET
        </span>
      </div>

      <div className="space-y-4">
        {/* Section 1 */}
        <div className="soc-panel rounded p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            Incident Escalation Thresholds
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
              <div className="text-slate-500 text-[11px]">CRITICAL INCIDENT RISK FLOOR</div>
              <div className="text-slate-900 font-bold text-sm">Score &ge; 80</div>
              <div className="text-[10px] text-slate-500 font-sans">
                Automatically triggers Tier 2 analyst notification
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
              <div className="text-slate-500 text-[11px]">BRUTE FORCE ATTACK THRESHOLD</div>
              <div className="text-slate-900 font-bold text-sm">&ge; 3 failed logins in 10s</div>
              <div className="text-[10px] text-slate-500 font-sans">
                Promotes anomaly to detections queue
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="soc-panel rounded p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-purple-600" />
            Autonomous Response Policy Safety
          </h2>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-slate-700">Default Response Execution Mode</span>
              <span className="px-2.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-700 font-mono text-[11px] font-bold">
                SIMULATION (DRY-RUN)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
              Protective lock: Real host isolation requires manual hardware security key verification in subsequent phases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
