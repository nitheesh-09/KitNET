import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  Activity,
  AlertTriangle,
  Server,
  FolderSearch,
  Radio,
} from 'lucide-react';
import MetricCard from '../components/common/MetricCard';
import DetectionAlertTrendChart from '../components/dashboard/DetectionAlertTrendChart';
import SecurityEventTrendChart from '../components/dashboard/SecurityEventTrendChart';
import EventDistributionChart from '../components/dashboard/EventDistributionChart';
import RecentIncidentsTable from '../components/dashboard/RecentIncidentsTable';
import HighRiskSources from '../components/dashboard/HighRiskSources';
import AssetHealthSummary from '../components/dashboard/AssetHealthSummary';
import socService from '../services/socService';

export const DashboardPage = () => {
  const [metrics, setMetrics] = useState(() => socService.getDashboardMetrics());
  const network = socService.getNetworkInfo();

  useEffect(() => {
    let isMounted = true;
    async function syncBackendData() {
      await Promise.allSettled([
        socService.fetchIncidents(),
        socService.fetchLiveEvents(),
        socService.fetchThreats(),
      ]);
      if (isMounted) {
        setMetrics(socService.getDashboardMetrics());
      }
    }
    syncBackendData();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="space-y-5">
      {/* Title & Compact Subtitle Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Security Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time attack telemetry, anomaly correlation, and incident tracking for enterprise subnet ({network.cidr}).
          </p>
        </div>

        {/* Compact Subnet & Monitoring Badge */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-2.5 py-1 bg-white border border-slate-200 rounded shadow-2xs flex items-center gap-1.5 text-slate-600">
            <span className="text-slate-400 font-sans text-[10px]">ENV:</span>
            <span className="font-semibold text-slate-800">{network.name}</span>
            <span className="text-slate-400">({network.cidr})</span>
          </div>

          <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 flex items-center gap-1.5 font-medium shadow-2xs">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
            <span>Active Telemetry Ingest</span>
          </div>
        </div>
      </div>

      {/* Compact Operational Metrics Strip (Restrained, not dominating) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Active Incidents"
          value={metrics.activeIncidents.toString().padStart(2, '0')}
          secondaryText="Require Triage"
          status="high"
          icon={ShieldAlert}
        />
        <MetricCard
          label="Critical Alerts"
          value={metrics.criticalAlerts.toString().padStart(2, '0')}
          secondaryText="Immediate Action"
          status="critical"
          icon={AlertOctagon}
        />
        <MetricCard
          label="Events Today"
          value={metrics.eventsToday.toLocaleString()}
          secondaryText="~342 EPS"
          status="normal"
          icon={Activity}
        />
        <MetricCard
          label="High-Risk Sources"
          value={metrics.highRiskSources.toString().padStart(2, '0')}
          secondaryText="Under Watch"
          status="medium"
          icon={AlertTriangle}
        />
        <MetricCard
          label="Affected Assets"
          value={metrics.affectedAssets.toString().padStart(2, '0')}
          secondaryText="In 10.0.0.0/24"
          status="medium"
          icon={Server}
        />
        <MetricCard
          label="Active Investigations"
          value={metrics.activeInvestigations.toString().padStart(2, '0')}
          secondaryText="Tier 1 & Tier 2"
          status="normal"
          icon={FolderSearch}
        />
      </div>

      {/* Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Detection Alert Trend Chart */}
        <DetectionAlertTrendChart />

        {/* Security Event Trend Chart */}
        <SecurityEventTrendChart />
      </div>

      {/* Event Distribution Chart (Full Width) */}
      <div>
        <EventDistributionChart />
      </div>

      {/* Operational Split: Recent Incidents & High-Risk Sources */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <RecentIncidentsTable />
        </div>
        <div>
          <HighRiskSources />
        </div>
      </div>

      {/* Asset Health Section */}
      <div>
        <AssetHealthSummary />
      </div>
    </div>
  );
};

export default DashboardPage;
