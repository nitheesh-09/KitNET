import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Drawer = ({ isOpen, onClose, title, subtitle, children, width = 'max-w-xl' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className={`w-screen ${width} bg-white border-l border-slate-200 shadow-2xl flex flex-col`}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-wide">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500 font-mono mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 text-slate-700 text-xs leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Drawer;
