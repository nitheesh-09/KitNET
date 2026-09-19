import React from 'react';

export const RiskIndicator = ({ score, size = 'sm', showBar = false }) => {
  const numericScore = typeof score === 'number' ? score : parseInt(score, 10) || 0;

  let textColor = 'text-slate-700';
  let barColor = 'bg-slate-500';
  let bgTint = 'bg-slate-100 border-slate-200';

  if (numericScore >= 80) {
    textColor = 'text-red-700';
    barColor = 'bg-red-600';
    bgTint = 'bg-red-50 border-red-200';
  } else if (numericScore >= 60) {
    textColor = 'text-orange-700';
    barColor = 'bg-orange-500';
    bgTint = 'bg-orange-50 border-orange-200';
  } else if (numericScore >= 30) {
    textColor = 'text-amber-700';
    barColor = 'bg-amber-500';
    bgTint = 'bg-amber-50 border-amber-200';
  } else {
    textColor = 'text-emerald-700';
    barColor = 'bg-emerald-600';
    bgTint = 'bg-emerald-50 border-emerald-200';
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`font-mono font-semibold px-2 py-0.5 rounded border ${bgTint} ${textColor} text-xs`}
        title={`Risk Score: ${numericScore}/100`}
      >
        {numericScore}
      </span>
      {showBar && (
        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, numericScore))}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default RiskIndicator;
