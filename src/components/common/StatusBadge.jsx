import React from 'react';

export const StatusBadge = ({ status, size = 'sm', className = '' }) => {
  const norm = (status || 'UNKNOWN').toUpperCase();

  const getStyle = () => {
    switch (norm) {
      case 'ONLINE':
      case 'SUCCESS':
      case 'COMPLETED':
      case 'RESOLVED':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'INVESTIGATING':
      case 'ACTIVE':
      case 'MONITORING':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'FAILED':
      case 'BLOCKED':
      case 'OFFLINE':
      case 'FLAGGED':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'ALERT':
      case 'QUEUED':
      case 'SUSPICIOUS':
      case 'UNDER_REVIEW':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'NOT CONNECTED':
        return 'text-slate-500 bg-slate-100 border-slate-300 border-dashed';
      case 'SIMULATION':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center font-mono font-medium tracking-wide uppercase rounded border ${getStyle()} ${sizeClasses[size] || sizeClasses.sm} ${className}`}
    >
      {norm}
    </span>
  );
};

export default StatusBadge;
