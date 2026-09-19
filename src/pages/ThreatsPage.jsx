import React, { useState, useEffect } from 'react';
import { Radar, Search, Filter, AlertTriangle, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import SeverityBadge from '../components/common/SeverityBadge';
import StatusBadge from '../components/common/StatusBadge';
import socService from '../services/socService';

export const ThreatsPage = () => {
  const [threats, setThreats] = useState(() => socService.getThreats());
  const categories = socService.getThreatCategories();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const loadThreats = async () => {
    setIsRefreshing(true);
    const live = await socService.fetchThreats();
    if (Array.isArray(live) && live.length > 0) {
      setThreats(live);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadThreats();
  }, []);

  const filteredThreats = threats.filter((threat) => {
    const matchesSearch =
      threat.detection.toLowerCase().includes(searchTerm.toLowerCase()) ||
      threat.source.includes(searchTerm) ||
      threat.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      threat.detectionReason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' || threat.category === selectedCategory;

    const matchesSeverity =
      selectedSeverity === 'ALL' || threat.severity === selectedSeverity;

    const matchesStatus =
      selectedStatus === 'ALL' || threat.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesSeverity && matchesStatus;
  });

  // Light category badge styles
  const getCategoryLightClass = (key) => {
    switch (key) {
      case 'INCIDENT':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'DETECTION':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'SUSPICIOUS_ACTIVITY':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'ANOMALY':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'EVENT':
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Title & Subtitle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Detections
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational security detections, behavioral anomalies, and rule-correlated indicators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded shadow-2xs">
            Active Rules: <strong className="text-slate-800">8 Heuristic Engines</strong>
          </div>
          <button
            onClick={loadThreats}
            disabled={isRefreshing}
            className="p-1.5 rounded bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh Detections"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Security Classification Hierarchy Ribbon */}
      <div className="soc-panel rounded p-3">
        <div className="text-[11px] font-mono uppercase text-slate-500 font-semibold mb-2">
          Security Classification Taxonomy:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Object.entries(categories).map(([key, cat]) => {
            const isSelected = selectedCategory === key;
            return (
              <div
                key={key}
                onClick={() => setSelectedCategory(isSelected ? 'ALL' : key)}
                className={`p-2.5 rounded border cursor-pointer transition-all ${getCategoryLightClass(key)} ${
                  isSelected ? 'ring-2 ring-blue-600 font-bold shadow-xs' : 'hover:shadow-2xs'
                }`}
              >
                <div className="text-xs font-mono font-semibold flex items-center justify-between">
                  <span>{cat.label}</span>
                  {isSelected && <span className="text-[10px] text-blue-600 font-sans">Active</span>}
                </div>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5 line-clamp-2 leading-tight">
                  {cat.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="soc-panel rounded p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search detection, rule ID, or source..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
            <span className="text-[10px] uppercase text-slate-400">Class:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ALL CLASSES</option>
              <option value="EVENT">EVENT</option>
              <option value="ANOMALY">ANOMALY</option>
              <option value="SUSPICIOUS_ACTIVITY">SUSPICIOUS ACTIVITY</option>
              <option value="DETECTION">DETECTION</option>
              <option value="INCIDENT">INCIDENT</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
            <span className="text-[10px] uppercase text-slate-400">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ALL SEVERITIES</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
              <option value="NORMAL">NORMAL</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
            <span className="text-[10px] uppercase text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="UNDER_REVIEW">UNDER REVIEW</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="OBSERVED">OBSERVED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Detections Queue Table */}
      <div className="soc-panel rounded overflow-hidden">
        <div className="soc-panel-header">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Detections Queue ({filteredThreats.length})
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Differentiated: Events vs Anomalies vs Incidents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full soc-table">
            <thead>
              <tr>
                <th>DETECTION</th>
                <th>CATEGORY</th>
                <th>SEVERITY</th>
                <th>CONFIDENCE</th>
                <th>SOURCE</th>
                <th>TARGET</th>
                <th>DETECTION REASON</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredThreats.map((threat) => (
                <tr key={threat.id} className="hover:bg-slate-50/80 transition-colors">
                  <td>
                    <div className="font-semibold text-slate-900 text-xs">
                      {threat.detection}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {threat.ruleId} • {threat.timestamp} UTC
                    </div>
                  </td>
                  <td>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${getCategoryLightClass(threat.category)}`}
                    >
                      {threat.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <SeverityBadge severity={threat.severity} size="xs" />
                  </td>
                  <td>
                    <span className="font-mono text-xs font-semibold text-slate-800">
                      {threat.confidence}
                    </span>
                  </td>
                  <td className="font-mono text-slate-700">{threat.source}</td>
                  <td className="font-mono text-slate-700 max-w-[160px] truncate">
                    {threat.target}
                  </td>
                  <td className="text-slate-600 max-w-sm truncate text-xs font-sans">
                    {threat.detectionReason}
                  </td>
                  <td>
                    <StatusBadge status={threat.status} size="xs" />
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

export default ThreatsPage;
