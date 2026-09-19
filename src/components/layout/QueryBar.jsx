import React, { useState } from 'react';
import { Search, RefreshCw, Clock, X } from 'lucide-react';

export const QueryBar = ({ onSearch, defaultQuery = '' }) => {
  const [query, setQuery] = useState(defaultQuery);
  const [timeRange, setTimeRange] = useState('Last 24h');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTag, setActiveTag] = useState('All Sources');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  const quickFilters = ['All Sources', '10.0.0.200 (Rogue)', 'Critical Severity', 'Auth Failures'];

  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 shadow-2xs">
      <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Query Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, incidents, IP addresses, users... (e.g. source:10.0.0.200 or event:LOGIN_FAILED)"
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 p-0.5 rounded text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Quick Filter Tags & Time Controls */}
        <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
          {/* Quick tags */}
          <div className="hidden lg:flex items-center gap-1.5 border-r border-slate-200 pr-2">
            {quickFilters.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  activeTag === tag
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-mono focus:outline-none cursor-pointer"
            >
              <option>Last 15m</option>
              <option>Last 1h</option>
              <option>Last 6h</option>
              <option>Last 24h</option>
              <option>Last 7d</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 hover:text-slate-900 transition-colors shadow-2xs font-sans text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueryBar;
