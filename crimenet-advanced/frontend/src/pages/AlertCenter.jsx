import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { alertsApi, dashboardApi } from '../services/api';
import {
  AlertTriangle,
  Activity,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  Share2,
  Clock,
  Filter,
  RefreshCw,
  Phone,
  MapPin,
  Flame,
  ArrowRight
} from 'lucide-react';

const AlertCenter = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [topSuspects, setTopSuspects] = useState([]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await alertsApi.list({
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        limit: 100,
      });
      setAlerts(data);

      const stats = await dashboardApi.getStats();
      setTopSuspects(stats?.top_suspects || []);
    } catch (e) {
      console.error('Failed to load alerts', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter]);

  const handleRunDetection = async () => {
    try {
      setRunning(true);
      await alertsApi.runDetection();
      await fetchAlerts();
    } catch (e) {
      console.error('Failed to run detection rules', e);
    } finally {
      setRunning(false);
    }
  };

  const handleUpdateStatus = async (alertId, newStatus) => {
    try {
      await alertsApi.updateStatus(alertId, newStatus, 'Status updated via Alert Center triage.');
      await fetchAlerts();
    } catch (e) {
      console.error('Failed to update alert status', e);
    }
  };

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter((a) => a.severity === 'HIGH').length;

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2.5">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <span>Suspicious Activity & Alert Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Algorithmic detection of multi-suspect burner phones, safehouse co-location clusters, dense criminal cells, and repeated operations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunDetection}
            disabled={running}
            className="px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-slate-950 font-bold text-xs flex items-center space-x-2 transition-all shadow-md shadow-red-950 disabled:opacity-50"
          >
            <Activity className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
            <span>{running ? 'Executing Detection Engine...' : 'Run Suspicious Activity Engine'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-intel-900 border border-intel-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium block">Total Active Alerts</span>
            <span className="text-2xl font-bold font-mono text-slate-100">{alerts.length}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-intel-950 border border-intel-800 text-slate-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-intel-900 border border-intel-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium block">Critical Threats</span>
            <span className="text-2xl font-bold font-mono text-red-400">{criticalCount}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-intel-900 border border-intel-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium block">High Priority</span>
            <span className="text-2xl font-bold font-mono text-amber-400">{highCount}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-intel-900 border border-intel-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium block">Flagged Suspects</span>
            <span className="text-2xl font-bold font-mono text-cyan-400">{topSuspects.length}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Alert Feed & High Risk Targets Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Alerts List */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filters Bar */}
          <div className="p-3 bg-intel-900 border border-intel-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-1">
              <span className="text-slate-400 font-mono text-[11px] mr-1">SEVERITY:</span>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    severityFilter === s
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-slate-400 font-mono text-[11px] mr-1">STATUS:</span>
              {['ALL', 'NEW', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    statusFilter === st
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Alert Cards */}
          <div className="space-y-3">
            {alerts.map((alert) => {
              const isCrit = alert.severity === 'CRITICAL';
              const isHigh = alert.severity === 'HIGH';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl bg-intel-900 border transition-all space-y-3 ${
                    isCrit
                      ? 'border-red-500/50 shadow-md shadow-red-950/20'
                      : isHigh
                      ? 'border-amber-500/50 shadow-md shadow-amber-950/20'
                      : 'border-intel-800'
                  }`}
                >
                  {/* Alert Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            isCrit
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                              : isHigh
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-intel-800 text-slate-300'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          {alert.rule_type}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(alert.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">{alert.title}</h3>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                        alert.status === 'NEW'
                          ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                          : alert.status === 'INVESTIGATING'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : alert.status === 'RESOLVED'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-intel-800 text-slate-400 border-intel-700'
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 leading-relaxed">{alert.description}</p>

                  {/* Entities Involved */}
                  {alert.entities_involved?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-mono text-slate-500 mr-1 uppercase">
                        ENTITIES INVOLVED:
                      </span>
                      {alert.entities_involved.map((ent, i) => (
                        <button
                          key={i}
                          onClick={() => navigate('/network', { state: { highlightId: ent.id } })}
                          className="px-2 py-0.5 rounded bg-intel-950 hover:bg-intel-850 border border-intel-800 text-xs font-mono text-cyan-300 transition-colors flex items-center space-x-1"
                        >
                          <span>{ent.name}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-cyan-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Evidence note */}
                  {alert.evidence && (
                    <div className="p-2.5 rounded bg-intel-950/80 border border-intel-800/80 text-[11px] text-slate-400 font-mono">
                      <span className="text-slate-500">Forensic Evidence: </span>
                      {alert.evidence}
                    </div>
                  )}

                  {/* Triage Actions */}
                  <div className="pt-2 border-t border-intel-800 flex items-center justify-between text-xs">
                    <button
                      onClick={() => navigate('/network')}
                      className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Inspect in Network Canvas</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      {alert.status !== 'INVESTIGATING' && (
                        <button
                          onClick={() => handleUpdateStatus(alert.id, 'INVESTIGATING')}
                          className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px]"
                        >
                          Investigate
                        </button>
                      )}
                      {alert.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateStatus(alert.id, 'RESOLVED')}
                          className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px]"
                        >
                          Resolve
                        </button>
                      )}
                      {alert.status !== 'DISMISSED' && (
                        <button
                          onClick={() => handleUpdateStatus(alert.id, 'DISMISSED')}
                          className="px-2 py-1 rounded bg-intel-800 hover:bg-intel-750 text-slate-400 text-[11px]"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {alerts.length === 0 && !loading && (
              <div className="text-center py-16 bg-intel-900 border border-intel-800 rounded-xl space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-200">No matching threat alerts</h3>
                <p className="text-xs text-slate-400">
                  Run the detection engine to evaluate the current criminal graph against intelligence rules.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: High Risk Targets & Rules Overview */}
        <div className="lg:col-span-4 space-y-4">
          {/* Top High-Risk Suspects Box */}
          <div className="p-4 rounded-xl bg-intel-900 border border-intel-800 space-y-3">
            <h2 className="text-xs font-mono font-bold uppercase text-slate-300 tracking-wider flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Priority High-Risk Targets</span>
            </h2>

            <div className="divide-y divide-intel-800">
              {topSuspects.slice(0, 5).map((suspect, idx) => {
                const risk = Number(suspect.risk_score || 0);
                return (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">{suspect.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {suspect.properties?.role || suspect.type} · {suspect.degree} Links
                      </span>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        risk >= 70
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {risk.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Rule Policies */}
          <div className="p-4 rounded-xl bg-intel-900 border border-intel-800 space-y-3 text-xs">
            <h2 className="text-xs font-mono font-bold uppercase text-slate-300 tracking-wider">
              Configured Intelligence Rules
            </h2>

            <div className="space-y-2 text-slate-400">
              <div className="p-2.5 rounded bg-intel-950 border border-intel-800 space-y-1">
                <span className="font-semibold text-slate-200 block">Rule 1: Burner Phone Sharing</span>
                <p className="text-[11px]">Flags phones connected to ≥ 2 distinct criminal suspects.</p>
              </div>

              <div className="p-2.5 rounded bg-intel-950 border border-intel-800 space-y-1">
                <span className="font-semibold text-slate-200 block">Rule 2: Safehouse Co-location</span>
                <p className="text-[11px]">Flags locations visited by ≥ 2 flagged individuals.</p>
              </div>

              <div className="p-2.5 rounded bg-intel-950 border border-intel-800 space-y-1">
                <span className="font-semibold text-slate-200 block">Rule 3: Syndicate Subgraph Density</span>
                <p className="text-[11px]">Detects tightly meshed multi-person cliques.</p>
              </div>

              <div className="p-2.5 rounded bg-intel-950 border border-intel-800 space-y-1">
                <span className="font-semibold text-slate-200 block">Rule 4: Multi-Channel Interactions</span>
                <p className="text-[11px]">Detects repeated cross-cutting calls and wire transactions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertCenter;

