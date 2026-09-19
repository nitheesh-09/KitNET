import React, { useState } from 'react';
import {
  Network,
  Server,
  ShieldAlert,
  ArrowDown,
  Info,
  Database,
  Globe,
  KeyRound,
  Skull,
  ArrowRight,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import RiskIndicator from '../components/common/RiskIndicator';
import SeverityBadge from '../components/common/SeverityBadge';
import AssetDetailDrawer from '../components/topology/AssetDetailDrawer';
import socService from '../services/socService';

export const TopologyPage = () => {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const assets = socService.getAssets();

  const webServer = assets.find((a) => a.ip === '10.0.0.10');
  const dbServer = assets.find((a) => a.ip === '10.0.0.20');
  const authServer = assets.find((a) => a.ip === '10.0.0.30');
  const attacker = {
    name: 'Rogue Host (Attacker)',
    hostname: 'unknown-rogue',
    ip: '10.0.0.200',
    service: 'Unauthorized Scanner / Exploit Kit',
    status: 'FLAGGED',
    riskScore: 91,
    riskLevel: 'CRITICAL',
    os: 'Unknown Linux / Kali',
    category: 'Rogue Host',
    description: 'Unmanaged rogue host generating brute-force authentication bursts against 10.0.0.30, followed by lateral traversal queries.',
  };

  const handleSelectAsset = (asset) => {
    setSelectedAsset(asset);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Topology Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Network Topology & Attack Path
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enterprise subnet mapping for 10.0.0.0/24 displaying correlated lateral traversal path from rogue source to database tier.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded shadow-2xs">
          <Info className="w-3.5 h-3.5 text-blue-600" />
          <span>Click any node card to inspect host specifications and telemetry</span>
        </div>
      </div>

      {/* Main Network Graph Canvas */}
      <div className="soc-panel rounded p-6 bg-white relative">
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 mb-6 text-xs font-mono text-slate-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-red-600" />
              Compromised / Rogue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-orange-500" />
              Targeted Lateral
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-600" />
              Monitored Healthy
            </span>
          </div>
          <div className="text-slate-500">
            Subnet: <strong className="text-slate-800 font-semibold">10.0.0.0/24</strong> • Gateway:{' '}
            <strong className="text-slate-800 font-semibold">10.0.0.1</strong>
          </div>
        </div>

        {/* Graph Columns: Left Attack Path, Right DMZ Perimeter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-5xl mx-auto py-2">
          {/* Attack Path Column (Attacker -> Auth Server -> DB Server) */}
          <div className="md:col-span-2 flex flex-col items-center space-y-4">
            {/* NODE 1: ATTACKER */}
            <div
              onClick={() => handleSelectAsset(attacker)}
              className="w-80 cursor-pointer bg-red-50/50 hover:bg-red-50 border-2 border-red-300 hover:border-red-400 rounded-lg p-3.5 shadow-xs transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-red-100 text-red-700">
                    <Skull className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-red-800 uppercase tracking-wide">
                      ATTACKER
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">Rogue Internal IP</div>
                  </div>
                </div>
                <SeverityBadge severity="CRITICAL" size="xs" />
              </div>

              <div className="bg-white rounded p-2.5 text-xs font-mono space-y-1 border border-red-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">IP:</span>
                  <span className="text-red-700 font-bold">{attacker.ip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SERVICE:</span>
                  <span className="text-slate-700 truncate max-w-[170px]">Rogue Kali / Scanner</span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-500">RISK:</span>
                  <RiskIndicator score={91} />
                </div>
              </div>
            </div>

            {/* Attack Flow 1 */}
            <div className="flex flex-col items-center py-0.5">
              <div className="w-0.5 h-6 bg-red-400" />
              <div className="px-2.5 py-0.5 rounded bg-red-50 border border-red-200 text-[11px] font-mono text-red-700 flex items-center gap-1 shadow-2xs font-medium">
                <ArrowDown className="w-3 h-3 text-red-600 animate-bounce" />
                Brute-Force Bursts (8080/TCP)
              </div>
              <div className="w-0.5 h-6 bg-red-400" />
            </div>

            {/* NODE 2: AUTH SERVER */}
            {authServer && (
              <div
                onClick={() => handleSelectAsset(authServer)}
                className="w-80 cursor-pointer bg-red-50/30 hover:bg-red-50/70 border-2 border-red-300 hover:border-red-400 rounded-lg p-3.5 shadow-xs transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-red-100 text-red-700">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        AUTH SERVER
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">{authServer.hostname}</div>
                    </div>
                  </div>
                  <StatusBadge status={authServer.status} size="xs" />
                </div>

                <div className="bg-white rounded p-2.5 text-xs font-mono space-y-1 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">IP:</span>
                    <span className="text-slate-900 font-bold">{authServer.ip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SERVICE:</span>
                    <span className="text-slate-700">{authServer.service}</span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-slate-500">RISK:</span>
                    <RiskIndicator score={authServer.riskScore} />
                  </div>
                </div>
              </div>
            )}

            {/* Attack Flow 2 */}
            <div className="flex flex-col items-center py-0.5">
              <div className="w-0.5 h-6 bg-orange-400" />
              <div className="px-2.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-[11px] font-mono text-orange-700 flex items-center gap-1 shadow-2xs font-medium">
                <ArrowDown className="w-3 h-3 text-orange-600" />
                Lateral Database Exfiltration (3306/TCP)
              </div>
              <div className="w-0.5 h-6 bg-orange-400" />
            </div>

            {/* NODE 3: DB SERVER */}
            {dbServer && (
              <div
                onClick={() => handleSelectAsset(dbServer)}
                className="w-80 cursor-pointer bg-orange-50/30 hover:bg-orange-50/70 border-2 border-orange-300 hover:border-orange-400 rounded-lg p-3.5 shadow-xs transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-orange-100 text-orange-700">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        DB SERVER
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">{dbServer.hostname}</div>
                    </div>
                  </div>
                  <StatusBadge status={dbServer.status} size="xs" />
                </div>

                <div className="bg-white rounded p-2.5 text-xs font-mono space-y-1 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">IP:</span>
                    <span className="text-slate-900 font-bold">{dbServer.ip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SERVICE:</span>
                    <span className="text-slate-700">{dbServer.service}</span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-slate-500">RISK:</span>
                    <RiskIndicator score={dbServer.riskScore} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DMZ Perimeter Column (Web Server) */}
          <div className="flex flex-col items-center justify-center space-y-4 pt-8 md:pt-24">
            <span className="text-[10px] font-mono uppercase text-slate-500 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 font-semibold">
              DMZ Perimeter Proxy
            </span>

            {webServer && (
              <div
                onClick={() => handleSelectAsset(webServer)}
                className="w-80 cursor-pointer bg-emerald-50/30 hover:bg-emerald-50/70 border-2 border-emerald-300 hover:border-emerald-400 rounded-lg p-3.5 shadow-xs transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-emerald-100 text-emerald-700">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        WEB SERVER
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">{webServer.hostname}</div>
                    </div>
                  </div>
                  <StatusBadge status={webServer.status} size="xs" />
                </div>

                <div className="bg-white rounded p-2.5 text-xs font-mono space-y-1 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">IP:</span>
                    <span className="text-slate-900 font-bold">{webServer.ip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SERVICE:</span>
                    <span className="text-slate-700">{webServer.service}</span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-slate-500">RISK:</span>
                    <RiskIndicator score={webServer.riskScore} />
                  </div>
                </div>
              </div>
            )}

            <div className="text-center p-3 rounded bg-slate-50 border border-slate-200 max-w-[280px] text-slate-600 text-xs font-mono">
              Web Server receives external ingress and routes internal API queries through internal VLAN router.
            </div>
          </div>
        </div>
      </div>

      {/* Asset Detail Drawer */}
      <AssetDetailDrawer
        asset={selectedAsset}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};

export default TopologyPage;
