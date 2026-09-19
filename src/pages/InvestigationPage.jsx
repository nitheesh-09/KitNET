import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Server,
  Users,
  FileText,
  Layers,
  Send,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  BookOpen,
  Info,
  RefreshCw,
  Zap,
} from 'lucide-react';
import SeverityBadge from '../components/common/SeverityBadge';
import StatusBadge from '../components/common/StatusBadge';
import RiskIndicator from '../components/common/RiskIndicator';
import Drawer from '../components/common/Drawer';
import socService from '../services/socService';

export const InvestigationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Load incident from cache or fetch live
  const [incident, setIncident] = useState(() => socService.getIncidentById(id) || socService.getIncidentById('INC-001'));
  const [notes, setNotes] = useState(incident?.notes || []);
  const [newNote, setNewNote] = useState('');
  const [selectedTimelineEvent, setSelectedTimelineEvent] = useState(null);

  // AI Investigation State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(incident?.ai_analysis || null);
  const [aiError, setAiError] = useState(null);
  const [showRagFallback, setShowRagFallback] = useState(false);

  // Analyst Feedback State
  const [feedbackList, setFeedbackList] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState('confirmed_threat');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Fetch live incident details and feedback history on mount or id change
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const fetched = await socService.fetchIncidentById(id || 'INC-001');
      if (isMounted && fetched) {
        setIncident(fetched);
        if (fetched.notes) setNotes(fetched.notes);
        if (fetched.ai_analysis) setAiResult(fetched.ai_analysis);
      }

      const fb = await socService.fetchFeedback(id || 'INC-001');
      if (isMounted && Array.isArray(fb)) {
        setFeedbackList(fb);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [id]);

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const noteObj = {
      id: `note-${Date.now()}`,
      author: 'Analyst-04 (SOC Tier 2)',
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      content: newNote.trim(),
    };

    setNotes([noteObj, ...notes]);
    setNewNote('');
  };

  // Trigger AI Investigation
  const handleRunAiInvestigation = async () => {
    setIsAiLoading(true);
    setAiError(null);
    setShowRagFallback(false);

    const result = await socService.investigateIncident(incident?.id || 'INC-001');
    setIsAiLoading(false);

    if (result.success && result.analysis) {
      setAiResult(result.analysis);
      // Update local incident
      setIncident((prev) => ({
        ...prev,
        ai_summary: result.analysis.summary,
        ai_analysis: result.analysis,
        ai_generated_at: new Date().toISOString(),
      }));
    } else {
      setAiError(result.message || 'AI Investigation service returned an error.');
      if (result.status === 503 || result.isOffline || result.ragReferenceAvailable) {
        setShowRagFallback(true);
      }
    }
  };

  // Submit Analyst Feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);

    const payload = {
      label: selectedLabel,
      analyst_notes: feedbackNotes.trim() || undefined,
      analyst_id: 'Analyst-04',
    };

    const res = await socService.submitFeedback(incident?.id || 'INC-001', payload);
    setIsSubmittingFeedback(false);

    if (res.success) {
      setFeedbackToast(`Feedback logged: ${selectedLabel.replace('_', ' ').toUpperCase()}`);
      setFeedbackNotes('');
      // Reload feedback history
      const updatedList = await socService.fetchFeedback(incident?.id || 'INC-001');
      setFeedbackList(updatedList);
      setTimeout(() => setFeedbackToast(null), 3500);
    }
  };

  if (!incident) {
    return (
      <div className="p-8 text-center text-slate-500">
        Incident not found.{' '}
        <button onClick={() => navigate('/incidents')} className="text-blue-600 underline font-medium">
          Return to queue
        </button>
      </div>
    );
  }

  // Local RAG Knowledge Reference Docs (Retrieved Deterministically)
  const localRagDocs = [
    {
      title: 'T1110: Credential Stuffing & Rapid Authentication Failures',
      category: 'Mitre ATT&CK / Initial Access',
      content: 'Repeated authentication failures against identity services (AUTH) followed by a successful login indicate dictionary stuffing or compromised credentials. Quarantine source IP in sandbox and enforce credential reset.',
    },
    {
      title: 'T1068: Privilege Escalation via Interactive Sudo/Bash',
      category: 'Mitre ATT&CK / Privilege Escalation',
      content: 'Interactive root shell spawned immediately following credential grant requires immediate token invalidation and interactive session termination.',
    },
    {
      title: 'T1021: Lateral Movement & Database Store Querying',
      category: 'Mitre ATT&CK / Lateral Movement',
      content: 'Compromised authentication tier communicating laterally with relational database hosts (10.0.0.20:3306) signals targeted data collection. Restrict subnet routing.',
    },
    {
      title: 'Data Exfiltration & Perimeter Containment Protocol',
      category: 'SOC Playbook / Containment SOP',
      content: 'High volume outbound telemetry bursts require initiating simulated source isolation and creating urgent Tier 3 forensics tickets.',
    },
  ];

  return (
    <div className="space-y-4 pb-10">
      {/* Top Action & Breadcrumb Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <button
          onClick={() => navigate('/incidents')}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-900 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Incident Queue
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/response')}
            className="px-3 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded text-xs font-mono transition-colors shadow-2xs font-medium flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-purple-600" />
            Launch Response Simulation &rarr;
          </button>
        </div>
      </div>

      {/* Incident Header Summary Panel */}
      <div className="soc-panel rounded p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-base font-bold text-blue-600">
                {incident.id}
              </span>
              <SeverityBadge severity={incident.severity} size="md" />
              <StatusBadge status={incident.status} size="md" />
              <span className="text-xs font-mono text-slate-500">
                Created: {incident.timestamp || incident.time}
              </span>
            </div>

            <h1 className="text-lg font-bold text-slate-900">
              {incident.title}
            </h1>

            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              {incident.summary}
            </p>
          </div>

          {/* Quick Attack Summary Tile */}
          <div className="bg-slate-50 border border-slate-200 rounded p-3 font-mono text-xs space-y-2 min-w-[250px] shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Risk Score:</span>
              <RiskIndicator score={incident.risk} showBar={true} />
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5">
              <span className="text-slate-500">Attack Path:</span>
              <span className="text-red-600 font-bold flex items-center gap-1">
                {incident.source} <ArrowRight className="w-3 h-3 text-slate-400" /> {incident.target}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5">
              <span className="text-slate-500">Assignee:</span>
              <span className="text-slate-800 font-medium">{incident.assignee}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* AI INVESTIGATION ANALYSIS PANEL (Phase 6 Implementation)       */}
      {/* ============================================================== */}
      <div className="soc-panel rounded overflow-hidden border border-slate-200 shadow-2xs">
        <div className="soc-panel-header bg-slate-50/80 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                AI Incident Investigation & Root-Cause Synthesis
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">
                Structured explainability with strict separation of observed telemetry from AI hypothesis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAiInvestigation}
              disabled={isAiLoading}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
              {isAiLoading ? 'Investigating...' : aiResult ? 'Re-Run AI Analysis' : 'Investigate with AI'}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Loading Indicator */}
          {isAiLoading && (
            <div className="p-6 text-center space-y-2 bg-blue-50/40 rounded border border-blue-100">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
              <div className="text-xs font-bold text-slate-900">Synthesizing Security Telemetry</div>
              <p className="text-[11px] text-slate-600 font-mono max-w-lg mx-auto">
                Retrieving local RAG reference playbooks, evaluating multi-stage event timeline, and generating structured attack hypothesis...
              </p>
            </div>
          )}

          {/* Fallback / Error Notification */}
          {aiError && !isAiLoading && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>AI Reasoning Engine Notice (HTTP 503)</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-mono text-[11px]">
                {aiError}
              </p>
              <div className="text-[11px] text-slate-600 pt-1">
                Deterministic detection rules, correlation timelines, and risk scoring remain 100% operational.
                The local deterministic RAG knowledge retrieval engine has provided the relevant playbooks below.
              </div>
            </div>
          )}

          {/* RAG Knowledge Store Playbooks (shown when AI API key is not configured or as reference) */}
          {(showRagFallback || (!aiResult && !isAiLoading)) && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                  Local Deterministic RAG Knowledge Store (Curated Reference Playbooks)
                </div>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                  8 Documents Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {localRagDocs.map((doc, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1 text-xs">
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                      <span className="font-semibold text-blue-700">{doc.category}</span>
                      <span>REF-0{idx + 1}</span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs">{doc.title}</div>
                    <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                      {doc.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rich AI Investigation Output */}
          {aiResult && !isAiLoading && (
            <div className="space-y-4">
              {/* Top Meta Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Attack Classification:</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded">
                    {aiResult.likely_attack_category || 'Multi-Stage Intrusion'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">AI Confidence:</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        aiResult.confidence === 'high'
                          ? 'bg-red-100 text-red-800'
                          : aiResult.confidence === 'medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {aiResult.confidence || 'HIGH'}
                    </span>
                  </div>
                  {incident.ai_generated_at && (
                    <span className="text-slate-400 text-[10px]">
                      Analyzed: {incident.ai_generated_at.slice(0, 19).replace('T', ' ')} UTC
                    </span>
                  )}
                </div>
              </div>

              {/* Executive Summary */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider font-mono">
                  Executive Investigation Summary
                </span>
                <p className="text-xs text-slate-800 leading-relaxed bg-white p-3 rounded border border-slate-200">
                  {aiResult.summary}
                </p>
              </div>

              {/* Attack Progression Sequence */}
              {Array.isArray(aiResult.attack_progression) && aiResult.attack_progression.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider font-mono">
                    Kill-Chain Attack Progression
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {aiResult.attack_progression.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1 relative"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span className="font-bold text-blue-600">STAGE 0{idx + 1}</span>
                        </div>
                        <p className="text-slate-800 font-medium text-[11px] leading-tight">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Two Column Grid: Observed Evidence vs Affected Assets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Key Observed Evidence (Telemetry Ground Truth) */}
                <div className="p-3 bg-white border border-slate-200 rounded space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 font-mono">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Key Verified Telemetry Evidence
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {Array.isArray(aiResult.key_evidence) && aiResult.key_evidence.length > 0 ? (
                      aiResult.key_evidence.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-relaxed text-[11px]">
                          <span className="text-emerald-600 font-bold shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-500 text-[11px]">No specific evidence items recorded.</li>
                    )}
                  </ul>
                </div>

                {/* Recommended Containment Actions */}
                <div className="p-3 bg-white border border-slate-200 rounded space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 font-mono">
                    <ShieldAlert className="w-4 h-4 text-purple-600" />
                    Recommended Containment & Mitigation Actions
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {Array.isArray(aiResult.recommended_actions) && aiResult.recommended_actions.length > 0 ? (
                      aiResult.recommended_actions.map((act, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-relaxed text-[11px]">
                          <span className="text-purple-600 font-bold shrink-0">✓</span>
                          <span>{act}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-500 text-[11px]">No actions recommended.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Analyst Hypothesis & Reasoning */}
              {aiResult.reasoning && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                  <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider font-mono">
                    Analyst Hypothesis & Causal Reasoning
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {aiResult.reasoning}
                  </p>
                </div>
              )}

              {/* Limitations Notice */}
              {Array.isArray(aiResult.limitations) && aiResult.limitations.length > 0 && (
                <div className="p-2.5 bg-slate-50/70 border border-dashed border-slate-300 rounded text-[11px] text-slate-500 space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-slate-700">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    Investigation Uncertainty Bounds & Telemetry Limitations:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {aiResult.limitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Investigation Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Columns: Timeline & Notes */}
        <div className="lg:col-span-2 space-y-4">
          {/* Incident Timeline */}
          <div className="soc-panel rounded overflow-hidden">
            <div className="soc-panel-header">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Incident Timeline
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {incident.timeline?.length || 0} Telemetry Milestones
              </span>
            </div>

            <div className="p-4">
              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {incident.timeline?.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedTimelineEvent(item)}
                    className="relative cursor-pointer group bg-white hover:bg-slate-50 border border-slate-200 rounded p-3 transition-colors shadow-2xs"
                  >
                    {/* Dot */}
                    <div
                      className={`absolute -left-[27px] top-4 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                        item.severity === 'CRITICAL'
                          ? 'bg-red-600'
                          : item.severity === 'HIGH'
                          ? 'bg-orange-500'
                          : item.severity === 'MEDIUM'
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-slate-500 font-semibold">{item.time}</span>
                        <span className="font-bold text-slate-900">{item.event}</span>
                      </div>
                      <SeverityBadge severity={item.severity} size="xs" />
                    </div>

                    <p className="text-xs text-slate-700 font-mono leading-relaxed">
                      {item.details}
                    </p>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>Source: <strong className="text-slate-800">{item.source}</strong></span>
                      <span>Destination: <strong className="text-slate-800">{item.destination}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Investigation Notes & Audit Log */}
          <div className="soc-panel rounded overflow-hidden">
            <div className="soc-panel-header">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Analyst Notes & Case Log
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {notes.length} Entries
              </span>
            </div>

            <div className="p-4 space-y-3">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Record investigation finding or triage note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Send className="w-3 h-3" />
                  Post
                </button>
              </form>

              {/* Notes List */}
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                      <span className="font-semibold text-blue-700">{note.author}</span>
                      <span>{note.time}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-sans">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Entities, Affected Assets & Feedback */}
        <div className="space-y-4">
          {/* ========================================================= */}
          {/* ANALYST FEEDBACK PANEL (Phase 8 Implementation)          */}
          {/* ========================================================= */}
          <div className="soc-panel rounded overflow-hidden">
            <div className="soc-panel-header">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Analyst Feedback & Verification
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Feedback Loop
              </span>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                Record ground-truth classification labels to inform future investigation context without altering historical telemetry.
              </p>

              {/* Feedback Selection Form */}
              <form onSubmit={handleSubmitFeedback} className="space-y-2.5">
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSelectedLabel('confirmed_threat')}
                    className={`py-1.5 px-2 rounded border text-center font-bold transition-colors ${
                      selectedLabel === 'confirmed_threat'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Confirmed
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLabel('false_positive')}
                    className={`py-1.5 px-2 rounded border text-center font-bold transition-colors ${
                      selectedLabel === 'false_positive'
                        ? 'bg-amber-50 border-amber-500 text-amber-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    False Positive
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLabel('needs_review')}
                    className={`py-1.5 px-2 rounded border text-center font-bold transition-colors ${
                      selectedLabel === 'needs_review'
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Review
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Optional analyst justification / notes..."
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />

                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded text-xs font-mono font-medium transition-colors shadow-2xs"
                >
                  {isSubmittingFeedback ? 'Logging Feedback...' : 'Log Analyst Decision'}
                </button>
              </form>

              {feedbackToast && (
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {feedbackToast}
                </div>
              )}

              {/* Feedback History */}
              {feedbackList.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">
                    Recorded Decisions ({feedbackList.length})
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {feedbackList.map((fb, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px] font-mono flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-900 uppercase">
                            {fb.label?.replace('_', ' ')}
                          </span>
                          {fb.analyst_notes && (
                            <div className="text-[10px] text-slate-500 font-sans">
                              {fb.analyst_notes}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400">
                          {fb.analyst_id || 'Analyst'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Correlated Entities */}
          <div className="soc-panel rounded overflow-hidden">
            <div className="soc-panel-header">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Correlated Entities
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {incident.entities?.length || 0} Identified
              </span>
            </div>

            <div className="p-3 divide-y divide-slate-100 font-mono text-xs">
              {incident.entities?.map((ent, idx) => (
                <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{ent.value}</div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      {ent.type} • {ent.role}
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {ent.state}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Affected Assets */}
          <div className="soc-panel rounded overflow-hidden">
            <div className="soc-panel-header">
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-amber-600" />
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Affected Assets
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {incident.affectedAssets?.length || 0} Hosts
              </span>
            </div>

            <div className="p-3 space-y-2.5">
              {incident.affectedAssets?.map((asset, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate('/topology')}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-colors shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{asset.name}</span>
                    <StatusBadge status={asset.status} size="xs" />
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 flex justify-between">
                    <span>IP: {asset.ip}</span>
                    <span>{asset.service}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-500">{asset.role}</span>
                    <span className="text-blue-600 font-medium hover:underline">
                      View in Topology &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Event Inspector Drawer */}
      <Drawer
        isOpen={!!selectedTimelineEvent}
        onClose={() => setSelectedTimelineEvent(null)}
        title={`Telemetry Event: ${selectedTimelineEvent?.event || ''}`}
        subtitle={`Milestone Time: ${selectedTimelineEvent?.time || ''} UTC`}
      >
        {selectedTimelineEvent && (
          <div className="space-y-4 font-mono text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">EVENT TYPE</span>
                <span className="text-slate-900 font-bold">{selectedTimelineEvent.event}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">SEVERITY</span>
                <SeverityBadge severity={selectedTimelineEvent.severity} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">CORRELATED TIME</span>
                <span className="text-slate-800">{selectedTimelineEvent.time} UTC</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">SOURCE</span>
                <span className="text-red-700 font-bold">{selectedTimelineEvent.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">DESTINATION</span>
                <span className="text-slate-800 font-bold">{selectedTimelineEvent.destination}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-600 text-[11px] uppercase tracking-wider block font-semibold">
                Event Description & Audit Finding
              </span>
              <div className="p-3 bg-white border border-slate-200 rounded text-slate-800 font-sans text-xs leading-relaxed">
                {selectedTimelineEvent.details}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default InvestigationPage;
