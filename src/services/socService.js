// SOC Service Layer: Centralized API abstraction isolating UI components from backend data sources.
// Supports both synchronous cache access and live asynchronous FastAPI communication.
// If the backend is unreachable or offline, automatically falls back gracefully to local mock data.

import { NETWORK_INFO, MOCK_ASSETS, MOCK_HIGH_RISK_SOURCES } from '../data/mockAssets.js';
import { MOCK_INCIDENTS } from '../data/mockIncidents.js';
import {
  MOCK_EVENTS,
  MOCK_ACTIVITY_TIMELINE,
  MOCK_DETECTION_ALERT_TREND,
  MOCK_EVENT_DISTRIBUTION,
} from '../data/mockEvents.js';
import { MOCK_THREATS, THREAT_CATEGORIES } from '../data/mockThreats.js';
import { MOCK_RESPONSES, RESPONSE_MODE } from '../data/mockResponses.js';
import { MOCK_SYSTEM_STATUS } from '../data/mockSystem.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// In-memory cache initialized with default data
const cache = {
  incidents: [...MOCK_INCIDENTS],
  events: [...MOCK_EVENTS],
  threats: [...MOCK_THREATS],
  responses: [...MOCK_RESPONSES],
  systemStatus: { ...MOCK_SYSTEM_STATUS },
  isBackendOnline: false,
};

// Asset lookup helpers
function getAssetName(ip) {
  const asset = MOCK_ASSETS.find((a) => a.ip === ip);
  if (asset) return asset.name;
  if (ip === '10.0.0.200') return 'Attacker Host (Rogue)';
  return `Host (${ip})`;
}

function getAssetService(ip) {
  const asset = MOCK_ASSETS.find((a) => a.ip === ip);
  if (asset) return asset.service;
  if (ip === '10.0.0.200') return 'Adversary Scanner / Tooling';
  return 'Unknown Service';
}

// Data Normalizers: transform backend response objects to match frontend component contracts
function normalizeIncident(raw) {
  if (!raw) return null;
  const incId = raw.incident_id || (raw.id ? `INC-${String(raw.id).padStart(3, '0')}` : 'INC-001');

  // Format timeline items
  const timeline = Array.isArray(raw.timeline) && raw.timeline.length > 0
    ? raw.timeline.map((t) => {
        let timeStr = '10:32:00';
        if (t.timestamp) {
          timeStr = t.timestamp.includes('T')
            ? t.timestamp.split('T')[1].slice(0, 8)
            : t.timestamp.slice(-8);
        }
        return {
          time: timeStr,
          event: (t.event_type || 'SECURITY_EVENT').toUpperCase(),
          source: raw.source_ip || '10.0.0.200',
          destination: raw.primary_destination_ip || '10.0.0.30',
          details: t.description || 'Observed correlated security telemetry step.',
          severity: (raw.severity || 'HIGH').toUpperCase(),
        };
      })
    : [
        {
          time: '10:32:01',
          event: 'SECURITY_INCIDENT',
          source: raw.source_ip || '10.0.0.200',
          destination: raw.primary_destination_ip || '10.0.0.30',
          details: raw.summary || 'Correlated security event sequence.',
          severity: (raw.severity || 'HIGH').toUpperCase(),
        },
      ];

  // Format affected assets
  const affectedAssets = Array.isArray(raw.affected_assets) && raw.affected_assets.length > 0
    ? raw.affected_assets.map((ip) => ({
        name: getAssetName(ip),
        ip: ip,
        service: getAssetService(ip),
        role: ip === raw.primary_destination_ip ? 'Initial Target Host' : 'Lateral Target Host',
        status: 'ONLINE',
        risk: raw.risk_score || 85,
      }))
    : [
        {
          name: getAssetName(raw.primary_destination_ip || '10.0.0.30'),
          ip: raw.primary_destination_ip || '10.0.0.30',
          service: getAssetService(raw.primary_destination_ip || '10.0.0.30'),
          role: 'Target Host',
          status: 'ONLINE',
          risk: raw.risk_score || 85,
        },
      ];

  // Format entities
  const entities = [
    {
      type: 'IP Address',
      value: raw.source_ip || '10.0.0.200',
      role: 'Attacker / Rogue Host',
      state: 'UNMANAGED',
    },
    {
      type: 'IP Address',
      value: raw.primary_destination_ip || '10.0.0.30',
      role: 'Target Asset',
      state: 'COMPROMISED',
    },
  ];

  if (Array.isArray(raw.affected_assets)) {
    raw.affected_assets.forEach((ip) => {
      if (ip !== raw.source_ip && ip !== raw.primary_destination_ip) {
        entities.push({
          type: 'IP Address',
          value: ip,
          role: 'Lateral Host',
          state: 'ACCESSED',
        });
      }
    });
  }

  // Calculate timestamp
  let formattedTime = '10:32';
  let formattedTimestamp = '2026-09-19 10:32:01 UTC';
  if (raw.created_at) {
    formattedTimestamp = `${raw.created_at.replace('T', ' ').slice(0, 19)} UTC`;
    formattedTime = raw.created_at.includes('T') ? raw.created_at.split('T')[1].slice(0, 5) : '10:32';
  }

  return {
    id: incId,
    db_id: raw.id,
    time: formattedTime,
    timestamp: formattedTimestamp,
    title: raw.title || `${raw.attack_type || 'Security Incident'} (${raw.source_ip || '10.0.0.200'} → ${raw.primary_destination_ip || '10.0.0.30'})`,
    severity: (raw.severity || 'HIGH').toUpperCase(),
    attackType: raw.attack_type || 'Multi-Stage Intrusion',
    source: raw.source_ip || '10.0.0.200',
    target: raw.primary_destination_ip || '10.0.0.30',
    targetService: getAssetService(raw.primary_destination_ip || '10.0.0.30'),
    risk: typeof raw.risk_score === 'number' ? raw.risk_score : 85,
    status: raw.status ? (raw.status.charAt(0).toUpperCase() + raw.status.slice(1)) : 'Investigating',
    assignee: raw.assignee || 'SOC Tier 2 Analyst',
    summary: raw.summary || 'Correlated security attack sequence.',
    entities,
    affectedAssets,
    timeline,
    notes: raw.notes || [
      {
        id: 'note-auto',
        author: 'SOC Ingestion Pipeline',
        time: formattedTime,
        content: `Correlated ${raw.event_count || 0} events and ${raw.detection_count || 0} detections into unified case.`,
      },
    ],
    risk_breakdown: raw.risk_breakdown || null,
    ai_summary: raw.ai_summary || null,
    ai_analysis: raw.ai_analysis || null,
    ai_generated_at: raw.ai_generated_at || null,
  };
}

function normalizeEvent(e) {
  if (!e) return null;
  let timeStr = '10:32:00';
  if (e.timestamp) {
    timeStr = e.timestamp.includes('T') ? e.timestamp.split('T')[1].slice(0, 8) : e.timestamp.slice(-8);
  }

  let rawMsg = `${(e.event_type || 'EVENT').toUpperCase()} from ${e.source_ip || '10.0.0.200'} to ${e.destination_ip || '10.0.0.30'}`;
  if (e.username) rawMsg += ` user=${e.username}`;
  if (e.service) rawMsg += ` service=${e.service}`;

  return {
    id: `EVT-${String(e.id || Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
    timestamp: e.timestamp || '2026-09-19T10:32:00',
    time: timeStr,
    source: e.source_ip || '10.0.0.200',
    destination: e.destination_ip || '10.0.0.30',
    event: (e.event_type || 'EVENT').toUpperCase(),
    severity: (e.severity || 'MEDIUM').toUpperCase(),
    protocol: e.protocol || 'TCP',
    service: e.service || 'HTTP',
    status: (e.status || 'LOGGED').toUpperCase(),
    user: e.username || null,
    host: getAssetName(e.destination_ip),
    rawMessage: rawMsg,
    details: typeof e.metadata === 'object' && e.metadata ? JSON.stringify(e.metadata) : (e.event_type || 'Network Telemetry'),
  };
}

function normalizeDetection(d) {
  if (!d) return null;
  let timeStr = '10:32:00';
  if (d.timestamp) {
    timeStr = d.timestamp.includes('T') ? d.timestamp.split('T')[1].slice(0, 8) : d.timestamp.slice(-8);
  }

  const detectionName = d.detection_name || d.rule_id || 'Detection Alert';
  const categoryKey = d.rule_id?.startsWith('AUTH') ? 'DETECTION' : (d.rule_id?.startsWith('SCAN') ? 'SUSPICIOUS_ACTIVITY' : 'DETECTION');

  return {
    id: d.detection_id || `DET-${String(d.id || Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    detection: detectionName,
    name: detectionName,
    ruleId: d.rule_id || 'RULE-001',
    category: categoryKey,
    severity: (d.severity || 'HIGH').toUpperCase(),
    confidence: '95%',
    source: d.source_ip || '10.0.0.200',
    target: d.destination_ip ? `${d.destination_ip} (${getAssetName(d.destination_ip)})` : '10.0.0.30',
    user: d.username || null,
    detectionReason: d.description || 'Behavioral heuristic detection triggered.',
    description: d.description || 'Behavioral heuristic detection triggered.',
    evidence: d.evidence || {},
    status: (d.status || 'ACTIVE').toUpperCase(),
    time: timeStr,
    timestamp: d.timestamp,
  };
}

function normalizeResponse(r) {
  if (!r) return null;
  let timeStr = '10:33:00';
  if (r.executed_at || r.created_at) {
    const t = r.executed_at || r.created_at;
    timeStr = t.includes('T') ? t.split('T')[1].slice(0, 8) : t.slice(-8);
  }

  const actionName = r.action || 'SIMULATED CONTAINMENT';
  return {
    id: r.response_id || `ACT-${String(r.id || Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    incidentId: r.incident_id || 'INC-001',
    action: actionName,
    target: actionName.includes('10.0.0.') ? (actionName.match(/\b10\.0\.0\.\d+\b/)?.[0] || '10.0.0.200') : '10.0.0.200',
    targetType: 'Host / IP Address',
    severity: 'HIGH',
    status: (r.status || 'SUCCESS').toUpperCase(),
    executionTime: timeStr,
    reason: r.reason || 'Automated risk containment simulation',
    durationMs: 32,
    mode: r.simulation_mode !== false ? 'SIMULATION' : 'LIVE',
    playbook: 'PB-AUTO-CONTAIN-01',
    policy: 'Dry-run containment simulation rule executed non-destructively in sandbox environment',
    auditLog: [
      `Response triggered for ${r.incident_id || 'INC-001'}`,
      `Action: ${actionName}`,
      `Reason: ${r.reason || 'Severity-based rule execution'}`,
      `Simulation Mode: ${r.simulation_mode !== false ? 'ACTIVE (Zero network mutation)' : 'DISABLED'}`,
    ],
  };
}

// Central API fetcher with timeout
async function apiRequest(endpoint, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    clearTimeout(timer);
    cache.isBackendOnline = true;
    return res;
  } catch (err) {
    clearTimeout(timer);
    // Silent fallback to mock data on network errors
    cache.isBackendOnline = false;
    return null;
  }
}

export const socService = {
  // Operational Metrics
  getDashboardMetrics: () => {
    const activeIncidents = cache.incidents.filter((i) => i.status !== 'Resolved').length;
    const criticalAlerts = cache.incidents.filter((i) => i.severity === 'CRITICAL').length;
    const highRiskSources = MOCK_HIGH_RISK_SOURCES.filter((s) => s.risk >= 70).length;
    const affectedAssets = 3;
    const activeInvestigations = activeIncidents;
    const eventsToday = cache.events.length > 0 ? cache.events.length * 128 : 12847;

    return {
      activeIncidents,
      criticalAlerts,
      eventsToday,
      highRiskSources,
      affectedAssets,
      activeInvestigations,
    };
  },

  // Network & Assets
  getNetworkInfo: () => NETWORK_INFO,
  getAssets: () => MOCK_ASSETS,
  getAssetByIp: (ip) => MOCK_ASSETS.find((a) => a.ip === ip) || null,
  getHighRiskSources: () => MOCK_HIGH_RISK_SOURCES,

  // Incidents (Synchronous Getters for instant UI hydration)
  getIncidents: () => cache.incidents,
  getIncidentById: (id) => cache.incidents.find((inc) => inc.id === id || String(inc.db_id) === String(id)) || null,

  // Live Events & Telemetry
  getLiveEvents: () => cache.events,
  getActivityTimeline: (timeRange = 'Last 1h') => MOCK_ACTIVITY_TIMELINE,
  getDetectionAlertTrend: () => MOCK_DETECTION_ALERT_TREND,
  getEventDistribution: () => MOCK_EVENT_DISTRIBUTION,

  // Threats / Detections
  getThreats: () => cache.threats,
  getThreatCategories: () => THREAT_CATEGORIES,

  // Response (Simulation)
  getResponses: () => cache.responses,
  getResponseMode: () => RESPONSE_MODE,

  // System & Health
  getSystemStatus: () => cache.systemStatus,

  // -------------------------------------------------------------
  // ASYNCHRONOUS LIVE API METHODS
  // -------------------------------------------------------------

  // Fetch Incidents from FastAPI /incidents
  fetchIncidents: async () => {
    const res = await apiRequest('/incidents');
    if (res && res.ok) {
      try {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map(normalizeIncident);
          cache.incidents = normalized;
          return normalized;
        }
      } catch (e) {
        console.warn('Error parsing incidents response', e);
      }
    }
    return cache.incidents;
  },

  // Fetch Incident Detail from FastAPI /incidents/{id}
  fetchIncidentById: async (id) => {
    // Determine lookup id (INC-001 or numeric id)
    const lookupId = id || 'INC-001';
    const res = await apiRequest(`/incidents/${lookupId}`);
    if (res && res.ok) {
      try {
        const data = await res.json();
        const normalized = normalizeIncident(data);
        if (normalized) {
          // Update cache
          const idx = cache.incidents.findIndex((i) => i.id === normalized.id);
          if (idx >= 0) cache.incidents[idx] = normalized;
          else cache.incidents.unshift(normalized);
          return normalized;
        }
      } catch (e) {
        console.warn('Error parsing incident detail response', e);
      }
    }
    return socService.getIncidentById(id) || cache.incidents[0] || null;
  },

  // Fetch Live Events from FastAPI /events
  fetchLiveEvents: async () => {
    const res = await apiRequest('/events?limit=100');
    if (res && res.ok) {
      try {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map(normalizeEvent);
          cache.events = normalized;
          return normalized;
        }
      } catch (e) {
        console.warn('Error parsing events response', e);
      }
    }
    return cache.events;
  },

  // Fetch Detections from FastAPI /detections
  fetchThreats: async () => {
    const res = await apiRequest('/detections');
    if (res && res.ok) {
      try {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map(normalizeDetection);
          cache.threats = normalized;
          return normalized;
        }
      } catch (e) {
        console.warn('Error parsing detections response', e);
      }
    }
    return cache.threats;
  },

  // Fetch Response Actions from FastAPI /responses
  fetchResponses: async () => {
    const res = await apiRequest('/responses');
    if (res && res.ok) {
      try {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map(normalizeResponse);
          cache.responses = normalized;
          return normalized;
        }
      } catch (e) {
        console.warn('Error parsing responses response', e);
      }
    }
    return cache.responses;
  },

  // Fetch System Health & Subsystem Status from FastAPI /system/status
  fetchSystemStatus: async () => {
    const res = await apiRequest('/system/status');
    if (res && res.ok) {
      try {
        const data = await res.json();
        if (data && data.components) {
          cache.systemStatus = {
            ...cache.systemStatus,
            pipelineStatus: data,
            isBackendConnected: true,
          };
          return cache.systemStatus;
        }
      } catch (e) {
        console.warn('Error parsing system status response', e);
      }
    }
    cache.systemStatus.isBackendConnected = false;
    return cache.systemStatus;
  },

  // Trigger AI Investigation for Incident: POST /incidents/{id}/investigate
  investigateIncident: async (incidentId) => {
    const targetId = incidentId || 'INC-001';
    try {
      const res = await apiRequest(`/incidents/${targetId}/investigate`, { method: 'POST' }, 45000);
      if (!res) {
        return {
          success: false,
          status: 503,
          message: 'Backend server unreachable. Connect backend to run AI investigation.',
          isOffline: true,
        };
      }

      if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        return {
          success: false,
          status: 503,
          message: body.detail || 'OpenAI API key not configured on backend. RAG references available.',
          ragReferenceAvailable: true,
        };
      }

      if (res.status === 502) {
        const body = await res.json().catch(() => ({}));
        return {
          success: false,
          status: 502,
          message: body.detail || 'AI engine returned malformed analysis output.',
        };
      }

      if (res.ok) {
        const analysis = await res.json();
        // Update cached incident
        const inc = socService.getIncidentById(targetId);
        if (inc) {
          inc.ai_summary = analysis.summary;
          inc.ai_analysis = analysis;
          inc.ai_generated_at = new Date().toISOString();
        }
        return {
          success: true,
          analysis,
        };
      }

      return {
        success: false,
        status: res.status,
        message: `Investigation request failed with status ${res.status}`,
      };
    } catch (err) {
      return {
        success: false,
        status: 500,
        message: err.message || 'Error executing AI investigation',
      };
    }
  },

  // Trigger Simulated Containment Response for Incident: POST /incidents/{id}/response
  triggerResponse: async (incidentId) => {
    const targetId = incidentId || 'INC-001';
    const res = await apiRequest(`/incidents/${targetId}/response`, { method: 'POST' });
    if (res && res.ok) {
      try {
        const result = await res.json();
        if (result && Array.isArray(result.actions)) {
          const normalizedActions = result.actions.map(normalizeResponse);
          // Prepend to cached responses
          cache.responses = [...normalizedActions, ...cache.responses];
          return { success: true, result, actions: normalizedActions };
        }
      } catch (e) {
        console.warn('Error parsing response actions result', e);
      }
    }
    return { success: false, message: 'Could not execute simulated response on backend' };
  },

  // Submit Analyst Feedback: POST /incidents/{id}/feedback
  submitFeedback: async (incidentId, feedbackData) => {
    const targetId = incidentId || 'INC-001';
    const res = await apiRequest(`/incidents/${targetId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
    if (res && (res.ok || res.status === 201)) {
      try {
        const saved = await res.json();
        return { success: true, feedback: saved };
      } catch (e) {
        return { success: true };
      }
    }
    return { success: false, message: 'Could not submit analyst feedback to backend' };
  },

  // Fetch Feedback History: GET /incidents/{id}/feedback
  fetchFeedback: async (incidentId) => {
    const targetId = incidentId || 'INC-001';
    const res = await apiRequest(`/incidents/${targetId}/feedback`);
    if (res && res.ok) {
      try {
        const list = await res.json();
        return Array.isArray(list) ? list : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  },

  // Recalculate Risk Score: POST /incidents/{id}/risk
  recalculateRisk: async (incidentId) => {
    const targetId = incidentId || 'INC-001';
    const res = await apiRequest(`/incidents/${targetId}/risk`, { method: 'POST' });
    if (res && res.ok) {
      try {
        const updated = await res.json();
        return { success: true, incident: normalizeIncident(updated) };
      } catch (e) {
        return { success: false };
      }
    }
    return { success: false };
  },

  // Run Correlation: POST /incidents/correlate
  correlateIncidents: async () => {
    const res = await apiRequest('/incidents/correlate', { method: 'POST' });
    if (res && res.ok) {
      await socService.fetchIncidents();
      return true;
    }
    return false;
  },

  // Run Detection Engine: POST /detections/run
  runDetections: async () => {
    const res = await apiRequest('/detections/run', { method: 'POST' });
    if (res && res.ok) {
      await socService.fetchThreats();
      return true;
    }
    return false;
  },

  // Ingest New Event: POST /events
  ingestEvent: async (eventData) => {
    const res = await apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
    if (res && (res.ok || res.status === 201)) {
      await socService.fetchLiveEvents();
      return true;
    }
    return false;
  },
};

export default socService;
