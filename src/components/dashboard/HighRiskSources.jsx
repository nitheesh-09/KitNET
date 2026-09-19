import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SeverityBadge from '../common/SeverityBadge';
import RiskIndicator from '../common/RiskIndicator';
import socService from '../../services/socService';

export const HighRiskSources = () => {
  const navigate = useNavigate();
  const sources = socService.getHighRiskSources();

  return (
    <div className="soc-panel rounded overflow-hidden">
      <div className="soc-panel-header">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
          <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            High-Risk Sources
          </h2>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Internal & Rogue Hosts
          </span>
        </div>
        <button
          onClick={() => navigate('/events')}
          className="text-xs font-mono text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
        >
          View Telemetry
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full soc-table">
          <thead>
            <tr>
              <th>SOURCE</th>
              <th>RISK</th>
              <th>EVENTS</th>
              <th>STATE</th>
              <th>PRIMARY TARGET</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sources.map((item) => (
              <tr
                key={item.source}
                onClick={() => navigate('/events')}
                className="cursor-pointer group"
              >
                <td>
                  <div className="font-mono font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {item.source}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {item.category}
                  </div>
                </td>
                <td>
                  <RiskIndicator score={item.risk} />
                </td>
                <td className="font-mono text-slate-600">
                  {item.events.toString().padStart(2, '0')}
                </td>
                <td>
                  <SeverityBadge severity={item.state} size="xs" />
                </td>
                <td className="font-mono text-slate-600 text-xs truncate max-w-[140px]">
                  {item.target}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HighRiskSources;
