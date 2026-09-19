import React from 'react';
import socService from '../../services/socService';

export const EventDistributionChart = () => {
  const categories = socService.getEventDistribution();
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="soc-panel rounded">
      <div className="soc-panel-header">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Event Distribution
          </h2>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            By Activity Category
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          Total: {totalCount.toLocaleString()}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Progress bar stack */}
        <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
          {categories.map((cat) => (
            <div
              key={cat.category}
              style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
              title={`${cat.category}: ${cat.count.toLocaleString()} (${cat.percentage}%)`}
              className="h-full transition-all"
            />
          ))}
        </div>

        {/* Detailed category breakdown list */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {categories.map((cat) => (
            <div
              key={cat.category}
              className="p-2 bg-slate-50 border border-slate-200 rounded flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs font-medium text-slate-700 truncate">
                  {cat.category}
                </span>
              </div>
              <div className="flex items-baseline justify-between font-mono text-xs">
                <span className="font-bold text-slate-900">{cat.count.toLocaleString()}</span>
                <span className="text-[11px] text-slate-500">{cat.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventDistributionChart;
