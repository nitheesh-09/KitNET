import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import InvestigationPage from './pages/InvestigationPage';
import ThreatsPage from './pages/ThreatsPage';
import LiveEventsPage from './pages/LiveEventsPage';
import TopologyPage from './pages/TopologyPage';
import AssetsPage from './pages/AssetsPage';
import ResponsePage from './pages/ResponsePage';
import SystemStatusPage from './pages/SystemStatusPage';
import SettingsPage from './pages/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="cases" element={<IncidentsPage />} />
          <Route path="investigations/:id" element={<InvestigationPage />} />
          <Route path="threats" element={<ThreatsPage />} />
          <Route path="events" element={<LiveEventsPage />} />
          <Route path="topology" element={<TopologyPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="response" element={<ResponsePage />} />
          <Route path="system" element={<SystemStatusPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
