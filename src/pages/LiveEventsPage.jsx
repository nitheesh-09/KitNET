import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  Pause,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Terminal,
  Clock,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import SeverityBadge from '../components/common/SeverityBadge';
import Drawer from '../components/common/Drawer';
import socService from '../services/socService';

export const LiveEventsPage = () => {
  const [events, setEvents] = useState(() => socService.getLiveEvents());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedService, setSelectedService] = useState('ALL');
  const [timeRange, setTimeRange] = useState('Last 1h');
  const [isStreaming, setIsStreaming] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLiveEvents = async () => {
    setIsRefreshing(true);
    const live = await socService.fetchLiveEvents();
    if (Array.isArray(live) && live.length > 0) {
      setEvents(live);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadLiveEvents();
  }, []);

  const handleRefresh = () => {
    loadLiveEvents();
  };

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      evt.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.source.includes(searchTerm) ||
      evt.destination.includes(searchTerm) ||
      (evt.host && evt.host.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (evt.user && evt.user.toLowerCase().includes(searchTerm.toLowerCase())) ||
      evt.rawMessage.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity =
      selectedSeverity === 'ALL' || evt.severity === selectedSeverity;

    const matchesService =
      selectedService === 'ALL' || evt.service === selectedService;

    return matchesSearch && matchesSeverity && matchesService;
  });

  return (
    <div className="space-y-4">
      {/* Header & Stream Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Network Events
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dense technical telemetry feed capturing protocol packets, service logs, and authentication handshakes.
          </p>
        </div>

        {/* Stream Control Toolbar */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 border transition-colors shadow-2xs ${
              isStreaming
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Stream</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Stream</span>
              </>
            )}
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs font-mono rounded px-2.5 py-1.5 focus:outline-none shadow-2xs cursor-pointer"
          >
            <option>Last 15m</option>
            <option>Last 1h</option>
            <option>Last 6h</option>
            <option>Last 24h</option>
          </select>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="soc-panel rounded p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by IP, event name, user, or host..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
            <span className="text-[10px] uppercase text-slate-400">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ALL SEVERITIES</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
              <option value="NORMAL">NORMAL</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
            <span className="text-[10px] uppercase text-slate-400">Service:</span>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ALL SERVICES</option>
              <option value="AUTH">AUTH</option>
              <option value="MYSQL">MYSQL</option>
              <option value="NGINX">NGINX</option>
              <option value="SSH">SSH</option>
              <option value="NETWORK">NETWORK</option>
            </select>
          </div>
        </div>
      </div>

      {/* Network Events Table */}
      <div className="soc-panel rounded overflow-hidden">
        <div className="soc-panel-header">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Network Event Log
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              Showing {filteredEvents.length} of {events.length} records
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            {isStreaming ? (
              <span className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Stream Active
              </span>
            ) : (
              <span className="text-amber-700 text-[11px] font-medium">Stream Paused</span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full soc-table font-mono">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>EVENT</th>
                <th>SOURCE</th>
                <th>DESTINATION</th>
                <th>HOST</th>
                <th>USER</th>
                <th>PROTOCOL</th>
                <th>SERVICE</th>
                <th>STATUS</th>
                <th>SEVERITY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map((evt) => (
                <tr
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className="cursor-pointer group hover:bg-slate-50/80 transition-colors"
                >
                  <td className="text-slate-500">{evt.time}</td>
                  <td className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {evt.event}
                  </td>
                  <td className="text-slate-700 font-semibold">{evt.source}</td>
                  <td className="text-slate-600">{evt.destination}</td>
                  <td className="text-slate-600">{evt.host || '-'}</td>
                  <td className="text-slate-800">{evt.user || '-'}</td>
                  <td className="text-slate-500">{evt.protocol}</td>
                  <td>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] text-slate-700 border border-slate-200 font-medium">
                      {evt.service}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={evt.status} size="xs" />
                  </td>
                  <td>
                    <SeverityBadge severity={evt.severity} size="xs" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Details Drawer */}
      <Drawer
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={`Event Payload: ${selectedEvent?.id || ''}`}
        subtitle={`${selectedEvent?.event} • ${selectedEvent?.time} UTC`}
      >
        {selectedEvent && (
          <div className="space-y-4 font-mono text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">EVENT TYPE</span>
                <span className="text-slate-900 font-bold">{selectedEvent.event}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">SEVERITY</span>
                <SeverityBadge severity={selectedEvent.severity} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">STATUS</span>
                <StatusBadge status={selectedEvent.status} />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">SOURCE IP</span>
                <span className="text-blue-700 font-bold">{selectedEvent.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">DESTINATION</span>
                <span className="text-slate-800">{selectedEvent.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">HOST</span>
                <span className="text-slate-800">{selectedEvent.host || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">USER</span>
                <span className="text-slate-800">{selectedEvent.user || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PROTOCOL</span>
                <span className="text-slate-700">{selectedEvent.protocol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SERVICE</span>
                <span className="text-slate-700">{selectedEvent.service}</span>
              </div>
              {selectedEvent.bytes && (
                <div className="flex justify-between">
                  <span className="text-slate-500">PAYLOAD SIZE</span>
                  <span className="text-slate-700">{selectedEvent.bytes}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-500 text-[11px] uppercase tracking-wider block font-semibold">
                Raw Ingest Payload
              </span>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded text-xs font-mono whitespace-pre-wrap leading-relaxed">
                {selectedEvent.rawMessage}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default LiveEventsPage;
