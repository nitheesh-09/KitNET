import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, Bell, User } from 'lucide-react';

export const TopNav = () => {
  const navItems = [
    { name: 'Overview', path: '/dashboard' },
    { name: 'Detections', path: '/threats' },
    { name: 'Incidents', path: '/incidents' },
    { name: 'Events', path: '/events' },
    { name: 'Hosts', path: '/assets' },
    { name: 'Network', path: '/topology' },
    { name: 'Investigations', path: '/investigations/INC-001' },
    { name: 'Cases', path: '/incidents' },
    { name: 'Response', path: '/response' },
    { name: 'System', path: '/system' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 select-none">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-13">
          {/* Brand & Left Navigation Links */}
          <div className="flex items-center gap-6 overflow-x-auto py-1">
            {/* Brand */}
            <NavLink to="/dashboard" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs tracking-wider text-slate-900 group-hover:text-blue-600 transition-colors">
                    CYBERNET
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Security Operations
                </div>
              </div>
            </NavLink>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200 hidden sm:block flex-shrink-0" />

            {/* Horizontal Nav Links */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-100 text-blue-600 font-semibold border-b-2 border-blue-600 rounded-b-none'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right Status & Profile Area */}
          <div className="flex items-center gap-3 font-mono text-xs flex-shrink-0 pl-4">
            {/* Environment Badge */}
            <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px]">
              <span className="text-slate-400 font-sans font-medium text-[10px]">ENV</span>
              <span className="text-slate-700 font-semibold">CYBERNET</span>
            </div>

            {/* Monitoring Status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 font-medium text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Monitoring</span>
            </div>

            {/* Notifications */}
            <button
              className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
              title="Alert Notifications (2 unread)"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="hidden lg:block text-left font-sans">
                <div className="text-[11px] font-semibold text-slate-800 leading-tight">
                  Analyst-04
                </div>
                <div className="text-[9px] text-slate-500">SOC Tier 2</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
