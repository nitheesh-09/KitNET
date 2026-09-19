import React from 'react';

/**
 * SeverityBadge - Enterprise Elastic-style restrained severity tokens
 * - CRITICAL: red
 * - HIGH: orange
 * - MEDIUM: amber
 * - LOW: green
 * - NORMAL: slate
 */
export const SeverityBadge = ({ severity, size = 'sm', className = '' }) => {
  const norm = (severity || 'NORMAL').toUpperCase();

  const styles = {
    CRITICAL: 'text-red-700 bg-red-50 border-red-200',
    HIGH: 'text-orange-700 bg-orange-50 border-orange-200',
    MEDIUM: 'text-amber-700 bg-amber-50 border-amber-200',
    LOW: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    NORMAL: 'text-slate-700 bg-slate-100 border-slate-200',
  };

  const dotStyles = {
    CRITICAL: 'bg-red-600',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-amber-500',
    LOW: 'bg-emerald-600',
    NORMAL: 'bg-slate-500',
  };

  const currentStyle = styles[norm] || styles.NORMAL;
  const dotColor = dotStyles[norm] || dotStyles.NORMAL;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium tracking-wide uppercase rounded border ${currentStyle} ${sizeClasses[size] || sizeClasses.sm} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {norm}
    </span>
  );
};

export default SeverityBadge;
