import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import socService from '../../services/socService';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-white border border-slate-200 p-2.5 rounded shadow-lg text-xs font-mono">
        <div className="text-slate-500 font-semibold mb-1.5 border-b border-slate-100 pb-1">
          Time: {label} UTC
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-red-600">
            <span>Critical:</span>
            <span className="font-bold">{payload.find((p) => p.dataKey === 'critical')?.value || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-orange-600">
            <span>High:</span>
            <span className="font-bold">{payload.find((p) => p.dataKey === 'high')?.value || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-amber-600">
            <span>Medium:</span>
            <span className="font-bold">{payload.find((p) => p.dataKey === 'medium')?.value || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-600">
            <span>Low:</span>
            <span className="font-bold">{payload.find((p) => p.dataKey === 'low')?.value || 0}</span>
          </div>
          <div className="border-t border-slate-200 pt-1 mt-1 flex items-center justify-between gap-4 text-slate-900 font-bold">
            <span>Total Alerts:</span>
            <span>{total}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const DetectionAlertTrendChart = () => {
  const data = socService.getDetectionAlertTrend();

  return (
    <div className="soc-panel rounded">
      <div className="soc-panel-header">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Detection Alert Trend
          </h2>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            By Severity Over Time
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-600" />
            Critical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
            High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
            Low
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="low" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="medium" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="high" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
              <Bar dataKey="critical" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DetectionAlertTrendChart;
