import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import socService from '../../services/socService';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-2.5 rounded shadow-lg text-xs font-mono">
        <div className="text-slate-500 font-semibold mb-1">Time: {label} UTC</div>
        <div className="flex items-center justify-between gap-4 text-blue-700">
          <span>Total Ingest Volume:</span>
          <span className="font-bold">{payload[0]?.value} events</span>
        </div>
      </div>
    );
  }
  return null;
};

export const SecurityEventTrendChart = () => {
  const data = socService.getActivityTimeline();

  return (
    <div className="soc-panel rounded">
      <div className="soc-panel-header">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Security Event Trend
          </h2>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Telemetry Rate (~342 EPS)
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">12,847 Events Ingested</span>
      </div>

      <div className="p-4">
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="eventVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="totalEvents"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#eventVolumeGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SecurityEventTrendChart;
