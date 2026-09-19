import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import QueryBar from './QueryBar';

export const AppShell = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans antialiased">
      {/* Primary Enterprise Horizontal Navigation */}
      <TopNav />

      {/* Global Query / Filter Bar */}
      <QueryBar />

      {/* Main Workspace Area (Full Width, High Density) */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 py-5">
        <Outlet />
      </main>

      {/* Enterprise Status Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2.5 text-slate-500 text-xs font-mono flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-4">
          <span>CYBERNET Security Analytics Console</span>
          <span>•</span>
          <span>Network: 10.0.0.0/24 (3 Monitored Endpoints)</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Status: Operational</span>
          <span>•</span>
          <span>Ingest: ~342 EPS</span>
          <span>•</span>
          <span>Local Time: UTC 10:41:20</span>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;
