import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, ArrowUpRight } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import RiskIndicator from '../common/RiskIndicator';
import socService from '../../services/socService';

export const AssetHealthSummary = () => {
  const navigate = useNavigate();
  const assets = socService.getAssets();
  const network = socService.getNetworkInfo();

  return (
    <div className="soc-panel rounded overflow-hidden">
      <div className="soc-panel-header">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-blue-600" />
          <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Asset Health & Status
          </h2>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Network: {network.cidr}
          </span>
        </div>
        <button
          onClick={() => navigate('/topology')}
          className="text-xs font-mono text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
        >
          View Topology
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full soc-table">
          <thead>
            <tr>
              <th>ASSET</th>
              <th>IP</th>
              <th>SERVICE</th>
              <th>STATUS</th>
              <th>RISK</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.map((asset) => (
              <tr
                key={asset.id}
                onClick={() => navigate('/topology')}
                className="cursor-pointer group"
              >
                <td>
                  <div className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {asset.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {asset.hostname}
                  </div>
                </td>
                <td className="font-mono text-slate-700">{asset.ip}</td>
                <td className="font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] text-slate-700 border border-slate-200">
                    {asset.service}
                  </span>
                </td>
                <td>
                  <StatusBadge status={asset.status} size="xs" />
                </td>
                <td>
                  <RiskIndicator score={asset.riskScore} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssetHealthSummary;
