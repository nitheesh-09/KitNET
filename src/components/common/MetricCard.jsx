import React from 'react';

/**
 * MetricCard: Compact operational enterprise metric tile
 */
export const MetricCard = ({
  label,
  value,
  secondaryText,
  status = 'normal',
  icon: Icon,
  className = '',
}) => {
  const statusColors = {
    critical: 'text-red-700 border-red-200 bg-red-50/40',
    high: 'text-orange-700 border-orange-200 bg-orange-50/40',
    medium: 'text-amber-700 border-amber-200 bg-amber-50/40',
    low: 'text-emerald-700 border-emerald-200 bg-emerald-50/40',
    normal: 'text-slate-800 border-slate-200 bg-white',
  };

  return (
    <div
      className={`rounded border px-3.5 py-2.5 transition-colors shadow-xs ${statusColors[status] || statusColors.normal} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <div className="font-mono text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </div>
        {secondaryText && (
          <span className="text-[11px] font-mono text-slate-500">
            {secondaryText}
          </span>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
