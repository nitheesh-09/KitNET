import React, { useState } from 'react';
import { Server, Search, Filter, ShieldCheck, Activity, ArrowRight } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import RiskIndicator from '../components/common/RiskIndicator';
import SeverityBadge from '../components/common/SeverityBadge';
import AssetDetailDrawer from '../components/topology/AssetDetailDrawer';
import socService from '../services/socService';

export const AssetsPage = () => {
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const assets = socService.getAssets();
  const network = socService.getNetworkInfo();

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.ip.includes(search) ||
      a.service.toLowerCase().includes(search.toLowerCase())
  );

  const handleInspect = (asset) => {
    setSelectedAsset(asset);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Hosts & Assets
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational infrastructure inventory and real-time telemetry activity for subnet {network.cidr}.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter hostname, IP, or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 font-mono shadow-2xs"
          />
        </div>
      </div>

      {/* Main Enterprise Hosts Table */}
      <div className="soc-panel rounded overflow-hidden">
        <div className="soc-panel-header">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-blue-600" />
            <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Monitored Enterprise Endpoints ({filteredAssets.length})
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Click any row to inspect host specifications and telemetry
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full soc-table">
            <thead>
              <tr>
                <th>HOST</th>
                <th>IP</th>
                <th>SERVICE</th>
                <th>STATUS</th>
                <th>RISK</th>
                <th>EVENTS</th>
                <th>LAST ACTIVITY</th>
                <th className="text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map((asset) => (
                <tr
                  key={asset.id}
                  onClick={() => handleInspect(asset)}
                  className="cursor-pointer group hover:bg-slate-50/80 transition-colors"
                >
                  <td>
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {asset.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {asset.hostname}
                    </div>
                  </td>
                  <td className="font-mono text-slate-700 font-medium">{asset.ip}</td>
                  <td className="font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] text-slate-800 border border-slate-200 font-medium">
                      {asset.service}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={asset.status} size="xs" />
                  </td>
                  <td>
                    <SeverityBadge severity={asset.riskLevel} size="xs" />
                  </td>
                  <td className="font-mono text-slate-800 font-semibold">
                    {asset.eventsCount ? asset.eventsCount.toLocaleString() : '324'}
                  </td>
                  <td className="font-mono text-slate-500 text-xs">
                    {asset.lastActivity || '10:41:02'} UTC
                  </td>
                  <td className="text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 group-hover:text-blue-600 font-medium">
                      Inspect &rarr;
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {filteredAssets.map((asset) => (
          <div
            key={`card-${asset.id}`}
            onClick={() => handleInspect(asset)}
            className="soc-panel rounded p-4 cursor-pointer hover:border-slate-300 transition-all hover:shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{asset.name}</h3>
                    <div className="text-[10px] font-mono text-slate-500">{asset.hostname}</div>
                  </div>
                </div>
                <StatusBadge status={asset.status} size="xs" />
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 my-2.5">
                {asset.description}
              </p>

              <div className="bg-slate-50 rounded p-2.5 space-y-1.5 border border-slate-200 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">IP ADDRESS:</span>
                  <span className="text-slate-900 font-semibold">{asset.ip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SERVICE:</span>
                  <span className="text-slate-700">{asset.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">OPERATING SYSTEM:</span>
                  <span className="text-slate-700">{asset.os}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500">RISK:</span>
                  <RiskIndicator score={asset.riskScore} showBar={true} />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Port {asset.port}</span>
              <span className="text-blue-600 font-medium hover:underline">
                View Host Telemetry &rarr;
              </span>
            </div>
          </div>
        ))}
      </div>

      <AssetDetailDrawer
        asset={selectedAsset}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};

export default AssetsPage;
