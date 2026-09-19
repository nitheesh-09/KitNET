import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  Radar,
  Activity,
  Network,
  Server,
  Zap,
  Cpu,
  Settings,
  Shield,
  Radio,
} from 'lucide-react';

export const Sidebar = () => {
  const navSections = [
    {
      title: 'SECURITY OPERATIONS',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'INVESTIGATIONS',
      items: [
        { name: 'Incidents', path: '/incidents', icon: ShieldAlert, badge: '4' },
        { name: 'Threat Detection', path: '/threats', icon: Radar },
        { name: 'Live Events', path: '/events', icon: Activity, live: true },
      ],
    },
    {
      title: 'NETWORK',
      items: [
        { name: 'Topology', path: '/topology', icon: Network },
        { name: 'Assets', path: '/assets', icon: Server, badge: '3' },
      ],
    },
    {
      title: 'RESPONSE',
      items: [
        { name: 'Autonomous Response', path: '/response', icon: Zap, sublabel: 'SIMULATION' },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'System Status', path: '/system', icon: Cpu },
        { name: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-60 flex-shrink-0 bg-[#0b101a] border-r border-slate-800 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="h-14 flex items-center px-4 gap-2.5 border-b border-slate-800 bg-[#0d131f]">
        <div className="w-7 h-7 rounded bg-blue-950/80 border border-blue-600/50 flex items-center justify-center text-blue-400">
          <Shield className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-xs tracking-wider text-slate-100">
              CYBERNET
            </span>
            <span className="text-[10px] font-mono px-1 py-0.2 bg-blue-950/80 text-blue-400 border border-blue-800/60 rounded">
              SOC
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-500 tracking-tight">
            DEFENSE CONSOLE v1.0
          </p>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-mono font-semibold tracking-wider text-slate-500 uppercase">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-950/50 text-blue-300 border-l-2 border-blue-500 pl-2 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.live && (
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                    )}
                    {item.badge && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {item.badge}
                      </span>
                    )}
                    {item.sublabel && (
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-purple-950/50 text-purple-300 border border-purple-800/40">
                        {item.sublabel}
                      </span>
                    )}
                  </div>
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Network Health Summary Footer */}
      <div className="p-3 border-t border-slate-800 bg-[#090d16] text-[11px] font-mono">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400" />
            NET: 10.0.0.0/24
          </span>
          <span className="text-emerald-400 text-[10px] font-bold">ONLINE</span>
        </div>
        <div className="text-[10px] text-slate-500 flex justify-between">
          <span>Assets: 3 Monitored</span>
          <span>Gateway: 10.0.0.1</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
