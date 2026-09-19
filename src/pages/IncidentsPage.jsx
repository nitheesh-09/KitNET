import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  AlertOctagon,
  Clock,
  FolderLock,
  RefreshCw,
} from 'lucide-react';
import SeverityBadge from '../components/common/SeverityBadge';
import StatusBadge from '../components/common/StatusBadge';
import RiskIndicator from '../components/common/RiskIndicator';
import socService from '../services/socService';

export const IncidentsPage = () => {
  const navigate = useNavigate();
  const [allIncidents, setAllIncidents] = useState(() => socService.getIncidents());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterAttackType, setFilterAttackType] = useState('ALL');

  const loadIncidents = async () => {
    setIsRefreshing(true);
    const live = await socService.fetchIncidents();
    if (Array.isArray(live) && live.length > 0) {
      setAllIncidents(live);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const filteredIncidents = allIncidents.filter((inc) => {
    const matchesSearch =
      inc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.source.includes(searchTerm) ||
      inc.target.includes(searchTerm);

    const matchesSeverity =
      filterSeverity === 'ALL' || inc.severity === filterSeverity;

    const matchesStatus =
      filterStatus === 'ALL' || inc.status === filterStatus;

    const matchesAttackType =
      filterAttackType === 'ALL' || inc.attackType === filterAttackType;

    return matchesSearch && matchesSeverity && matchesStatus && matchesAttackType;
  });

  const criticalCount = allIncidents.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = allIncidents.filter((i) => i.severity === 'HIGH').length;
  const mediumCount = allIncidents.filter((i) => i.severity === 'MEDIUM').length;

  return (
    <div className="space-y-4">
      {/* Page Title & Count Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Security Incidents & Cases
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Triaged security incidents correlated across network endpoints, requiring analyst investigation and response.
          </p>
        </div>

        {/* Quick count chips & Refresh */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-700 flex items-center gap-1.5 font-medium shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
            Critical: {criticalCount}
          </span>
          <span className="px-2.5 py-1 rounded bg-orange-50 border border-orange-200 text-orange-700 flex items-center gap-1.5 font-medium shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            High: {highCount}
          </span>
          <span className="px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1.5 font-medium shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Medium: {mediumCount}
          </span>

          <button
            onClick={loadIncidents}
            disabled={isRefreshing}
            className="p-1.5 rounded bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs ml-1"
            title="Refresh Incidents"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="soc-panel rounded p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search incident ID, source, target, or attack type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
            <span className="text-[10px] uppercase text-slate-400">Severity:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ALL SEVERITIES</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
            <span className="text-[10px] uppercase text-slate-400">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="Investigating">Investigating</option>
              <option value="Active">Active</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
            <span className="text-[10px] uppercase text-slate-400">Type:</span>
            <select
              value={filterAttackType}
              onChange={(e) => setFilterAttackType(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ALL TYPES</option>
              <option value="Multi-Stage Intrusion">Multi-Stage Intrusion</option>
              <option value="Credential Compromise">Credential Compromise</option>
              <option value="Lateral Movement">Lateral Movement</option>
              <option value="Web Application Attack">Web Application Attack</option>
              <option value="Persistence Mechanism">Persistence Mechanism</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cases Queue Table */}
      <div className="soc-panel rounded overflow-hidden">
        <div className="soc-panel-header">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Cases Queue ({filteredIncidents.length})
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Click an incident to open the investigation workbench
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full soc-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>SEVERITY</th>
                <th>STATUS</th>
                <th>ATTACK TYPE</th>
                <th>SOURCE</th>
                <th>AFFECTED ASSETS</th>
                <th>RISK</th>
                <th>CREATED</th>
                <th className="text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIncidents.map((incident) => (
                <tr
                  key={incident.id}
                  onClick={() => navigate(`/investigations/${incident.id}`)}
                  className="cursor-pointer group hover:bg-slate-50/80 transition-colors"
                >
                  <td>
                    <div className="font-mono font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                      {incident.id}
                    </div>
                    <div className="text-[11px] text-slate-600 max-w-xs truncate font-sans">
                      {incident.title}
                    </div>
                  </td>
                  <td>
                    <SeverityBadge severity={incident.severity} size="xs" />
                  </td>
                  <td>
                    <StatusBadge status={incident.status} size="xs" />
                  </td>
                  <td className="font-mono text-slate-800 text-xs font-medium">
                    {incident.attackType}
                  </td>
                  <td className="font-mono text-slate-700">{incident.source}</td>
                  <td className="font-mono text-slate-600 text-xs">
                    {incident.affectedAssets?.map((a) => a.name).join(', ') || incident.target}
                  </td>
                  <td>
                    <RiskIndicator score={incident.risk} />
                  </td>
                  <td className="font-mono text-slate-500 text-xs">{incident.time}</td>
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
    </div>
  );
};

export default IncidentsPage;
