import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import SeverityBadge from '../common/SeverityBadge';
import StatusBadge from '../common/StatusBadge';
import RiskIndicator from '../common/RiskIndicator';
import socService from '../../services/socService';

export const RecentIncidentsTable = () => {
  const navigate = useNavigate();
  const incidents = socService.getIncidents();

  return (
    <div className="soc-panel rounded overflow-hidden">
      <div className="soc-panel-header">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
          <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Recent Incidents
          </h2>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            {incidents.length} Active Cases
          </span>
        </div>
        <button
          onClick={() => navigate('/incidents')}
          className="text-xs font-mono text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
        >
          View Case Queue
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full soc-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>TIME</th>
              <th>SEVERITY</th>
              <th>ATTACK TYPE</th>
              <th>SOURCE</th>
              <th>TARGET</th>
              <th>RISK</th>
              <th>STATUS</th>
              <th className="text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {incidents.map((incident) => (
              <tr
                key={incident.id}
                onClick={() => navigate(`/investigations/${incident.id}`)}
                className="cursor-pointer group transition-colors"
              >
                <td className="font-mono font-bold text-blue-600 group-hover:text-blue-700">
                  {incident.id}
                </td>
                <td className="font-mono text-slate-500">{incident.time}</td>
                <td>
                  <SeverityBadge severity={incident.severity} size="xs" />
                </td>
                <td className="font-medium text-slate-800">
                  {incident.attackType}
                </td>
                <td className="font-mono text-slate-600">{incident.source}</td>
                <td className="font-mono text-slate-600">{incident.target}</td>
                <td>
                  <RiskIndicator score={incident.risk} />
                </td>
                <td>
                  <StatusBadge status={incident.status} size="xs" />
                </td>
                <td className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 group-hover:text-blue-600 font-medium">
                    Investigate &rarr;
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentIncidentsTable;
