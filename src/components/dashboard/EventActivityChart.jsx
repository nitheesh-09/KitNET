import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Clock } from 'lucide-react';
import socService from '../../services/socService';

export const EventActivityChart = () => {
  const [timeRange, setTimeRange] = useState('Last 1h');
  const rawData = socService.getActivityTimeline(timeRange);

  const ranges = ['Last 15m', 'Last 1h', 'Last 6h', 'Last 24h'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f1726] border border-slate-700/80 p-2.5 rounded shadow-xl text-xs font-mono">
          <div className="text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-slate-500" />
            Time: {label}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-red-400">
              <span>Critical Alerts:</span>
              <span className="font-bold">{payload[2]?.value || 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-amber-400">
              <span>Suspicious Events:</span>
              <span className="font-bold">{payload[1]?.value || 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-blue-400">
              <span>Normal Traffic:</span>
              <span className="font-bold">{payload[0]?.value || 0}</span>
            </div>
            <div className="border-t border-slate-800 pt-1 mt-1 flex items-center justify-between gap-4 text-slate-300 font-bold">
              <span>Total Volume:</span>
              <span>{(payload[0]?.value || 0) + (payload[1]?.value || 0) + (payload[2]?.value || 0)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="soc-panel rounded">
      {/* Header */}
      <div className="soc-panel-header">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Security Events Over Time
          </h2>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            Ingest Rate: ~342 eps
          </span>
        </div>

        {/* Time Selector */}
        <div className="flex items-center gap-1 bg-[#090d16] p-0.5 rounded border border-slate-800">
          {ranges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                timeRange === range
                  ? 'bg-slate-800 text-slate-100 font-semibold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Legend & Chart */}
      <div className="p-3">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2 px-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/70"></span>
              Normal Ingest
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
              Suspicious
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span>
              Critical Threshold
            </span>
          </div>
          <span className="text-slate-500">Timeline: 10:00 - 10:50 UTC</span>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rawData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorSuspicious" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />

              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="normal"
                stackId="1"
                stroke="#3b82f6"
                fill="url(#colorNormal)"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="suspicious"
                stackId="1"
                stroke="#f59e0b"
                fill="url(#colorSuspicious)"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="critical"
                stackId="1"
                stroke="#ef4444"
                fill="url(#colorCritical)"
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default EventActivityChart;
