import React, { useState, useEffect } from 'react';
import {
  Zap,
  AlertTriangle,
  Play,
  CheckCircle2,
  Clock,
  Terminal,
  FileCode,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import SeverityBadge from '../components/common/SeverityBadge';
import StatusBadge from '../components/common/StatusBadge';
import Drawer from '../components/common/Drawer';
import socService from '../services/socService';

export const ResponsePage = () => {
  const [responses, setResponses] = useState(() => socService.getResponses());
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationToast, setSimulationToast] = useState(null);
  const [targetIncident, setTargetIncident] = useState('INC-001');

  // Load live responses on mount
  useEffect(() => {
    let isMounted = true;
    async function loadResponses() {
      const live = await socService.fetchResponses();
      if (isMounted && Array.isArray(live) && live.length > 0) {
        setResponses(live);
      }
    }
    loadResponses();
    return () => { isMounted = false; };
  }, []);

  const handleTriggerSimulatedAction = async (actionName, target) => {
    setIsSimulating(true);

    // Call live response engine endpoint: POST /incidents/{id}/response
    const result = await socService.triggerResponse(targetIncident);

    if (result.success && Array.isArray(result.actions) && result.actions.length > 0) {
      setResponses(result.actions);
      setIsSimulating(false);
      setSimulationToast(`Simulated response playbooks executed: ${result.actions.length} sandbox actions generated for ${targetIncident}`);
      setTimeout(() => setSimulationToast(null), 4500);
      return;
    }

    // Graceful fallback simulation if backend is offline or no incidents
    setTimeout(() => {
      const newAction = {
        id: `ACT-${Math.floor(100 + Math.random() * 900)}`,
        incidentId: targetIncident,
        action: actionName,
        target: target,
        targetType: 'Host / IP Address',
        severity: 'HIGH',
        status: 'SIMULATED',
        executionTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        reason: 'Critical correlated threat severity evaluation',
        durationMs: 34,
        mode: 'SIMULATION',
        playbook: 'PB-CONTAIN-DRYRUN-01',
        policy: 'Operator requested dry-run simulation of threat containment procedure',
        auditLog: [
          'Dry-run containment sequence initiated by SOC analyst',
          `Target evaluated: ${target}`,
          `Simulated iptables -I INPUT -s ${target} -j DROP executed in sandbox`,
          'Status confirmed: NON-DESTRUCTIVE DRY-RUN COMPLETE (Zero host mutation)',
        ],
      };

      setResponses((prev) => [newAction, ...prev]);
      setIsSimulating(false);
      setSimulationToast(`Simulated action executed: ${actionName} on ${target} (Success)`);
      setTimeout(() => setSimulationToast(null), 4000);
    }, 450);
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Header & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Response Actions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational containment playbooks, automated host isolation, and security policy execution audit.
          </p>
        </div>

        {/* Prominent Simulation Badge */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-3 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider shadow-2xs">
            SIMULATION MODE ACTIVE
          </span>
        </div>
      </div>

      {/* Simulation Banner */}
      <div className="bg-purple-50/70 border border-purple-200 rounded p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-purple-100 text-purple-700">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-900">
                Non-Destructive Sandbox Execution
              </span>
              <span className="text-[10px] font-mono text-purple-600 bg-white px-1.5 py-0.2 rounded border border-purple-200">
                Dry-Run Policy
              </span>
            </div>
            <p className="text-xs text-purple-800 mt-0.5 max-w-2xl leading-relaxed">
              All containment playbooks and host isolation procedures execute in virtual dry-run mode (<code className="font-mono bg-purple-100/70 px-1 py-0.5 rounded">simulation_mode = true</code>). Production network sockets and host routing tables are strictly untouched.
            </p>
          </div>
        </div>

        {/* Trigger Button */}
        <div className="flex items-center gap-2">
          <select
            value={targetIncident}
            onChange={(e) => setTargetIncident(e.target.value)}
            className="bg-white border border-purple-200 rounded px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:outline-none"
          >
            <option value="INC-001">Target: INC-001</option>
            <option value="INC-002">Target: INC-002</option>
          </select>

          <button
            onClick={() => handleTriggerSimulatedAction('SIMULATE SOURCE ISOLATION', '10.0.0.200')}
            disabled={isSimulating}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-mono font-medium rounded flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            {isSimulating ? 'Simulating Dry-Run...' : 'Trigger Isolation Dry-Run'}
          </button>
        </div>
      </div>

      {simulationToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded text-xs font-mono flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {simulationToast}
        </div>
      )}

      {/* Response Actions Audit Table */}
      <div className="soc-panel rounded overflow-hidden">
        <div className="soc-panel-header">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Response Action Audit Log ({responses.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Click any row to inspect execution logs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full soc-table">
            <thead>
              <tr>
                <th>INCIDENT</th>
                <th>ACTION</th>
                <th>TARGET</th>
                <th>REASON</th>
                <th>TIME</th>
                <th>STATUS</th>
                <th>SEVERITY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {responses.map((action) => (
                <tr
                  key={action.id}
                  onClick={() => setSelectedResponse(action)}
                  className="cursor-pointer group hover:bg-slate-50/80 transition-colors"
                >
                  <td className="font-mono font-bold text-blue-600 group-hover:text-blue-700">
                    {action.incidentId}
                  </td>
                  <td className="font-mono font-semibold text-slate-900">
                    {action.action}
                  </td>
                  <td className="font-mono text-slate-700">{action.target}</td>
                  <td className="text-slate-600 text-xs max-w-xs truncate">
                    {action.reason || action.policy || 'Critical correlated threat'}
                  </td>
                  <td className="font-mono text-slate-500 text-xs">
                    {action.executionTime || '10:33:02'}
                  </td>
                  <td>
                    <StatusBadge status={action.status || 'SIMULATED'} size="xs" />
                  </td>
                  <td>
                    <SeverityBadge severity={action.severity || 'HIGH'} size="xs" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Drawer */}
      <Drawer
        isOpen={!!selectedResponse}
        onClose={() => setSelectedResponse(null)}
        title={`Audit Trail: ${selectedResponse?.action || ''}`}
        subtitle={`Action ID: ${selectedResponse?.id} • Mode: ${selectedResponse?.mode || 'SIMULATION'}`}
      >
        {selectedResponse && (
          <div className="space-y-4 font-mono text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">TARGET</span>
                <span className="text-slate-900 font-bold">{selectedResponse.target}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CORRELATED INCIDENT</span>
                <span className="text-blue-600 font-bold">{selectedResponse.incidentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PLAYBOOK</span>
                <span className="text-slate-700">{selectedResponse.playbook || 'PB-AUTO-CONTAIN-01'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">LATENCY / DURATION</span>
                <span className="text-slate-700">{selectedResponse.durationMs || 32} ms</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-600 text-[11px] uppercase tracking-wider block font-semibold">
                Policy Objective
              </span>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 font-sans text-xs">
                {selectedResponse.reason || selectedResponse.policy}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-600 text-[11px] uppercase tracking-wider block font-semibold">
                Execution Audit Log
              </span>
              <div className="p-3 bg-slate-900 text-slate-100 rounded space-y-1 text-[11px] font-mono leading-relaxed">
                {selectedResponse.auditLog && selectedResponse.auditLog.length > 0 ? (
                  selectedResponse.auditLog.map((line, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-slate-500 select-none">&gt;</span>
                      <span>{line}</span>
                    </div>
                  ))
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-2 text-emerald-400">
                      <span className="text-slate-500 select-none">&gt;</span>
                      <span>Execution mode: SANDBOX SIMULATION (Verified Non-Destructive)</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-500 select-none">&gt;</span>
                      <span>Action verified: {selectedResponse.action}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-500 select-none">&gt;</span>
                      <span>Status: SUCCESS (Simulated host isolation rule)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ResponsePage;
