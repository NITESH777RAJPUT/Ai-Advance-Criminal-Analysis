import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, alertsApi } from '../services/api';
import {
  Users,
  Share2,
  AlertTriangle,
  MapPin,
  FolderArchive,
  ArrowUpRight,
  Shield,
  Activity,
  Upload,
  FileText,
  Search,
  RefreshCw,
  Phone,
  Car
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningAlerts, setRunningAlerts] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load dashboard stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRunDetection = async () => {
    try {
      setRunningAlerts(true);
      await alertsApi.runDetection();
      await fetchStats();
    } catch (e) {
      console.error('Error running detection engine', e);
    } finally {
      setRunningAlerts(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm font-mono text-slate-400">Loading intelligence metrics...</span>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Persons', value: stats?.total_persons || 0, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
    { label: 'Total Relationships', value: stats?.total_relationships || 0, icon: Share2, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
    { label: 'Total Alerts', value: stats?.total_alerts || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
    { label: 'Total Locations', value: stats?.total_locations || 0, icon: MapPin, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
    { label: 'Uploaded Cases', value: stats?.total_cases || 0, icon: FolderArchive, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  ];

  const riskDist = stats?.risk_distribution || {};

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto">
      {/* Header & Quick Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2.5">
            <span>Intelligence Operations Dashboard</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-source criminal network surveillance and suspicious activity telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunDetection}
            disabled={runningAlerts}
            className="px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center space-x-2 transition-all"
          >
            <Activity className={`w-3.5 h-3.5 ${runningAlerts ? 'animate-spin' : ''}`} />
            <span>{runningAlerts ? 'Scanning Graph...' : 'Run Detection Engine'}</span>
          </button>

          <button
            onClick={() => navigate('/upload')}
            className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center space-x-2 transition-all shadow-md shadow-cyan-950"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Ingest Evidence</span>
          </button>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="p-4 rounded-xl bg-intel-900 border border-intel-800 flex flex-col justify-between hover:border-intel-700 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{card.label}</span>
                <div className={`p-2 rounded-lg border ${card.bg} ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-slate-100 font-mono tracking-tight">
                  {card.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Metrics: Risk Distribution & Quick Graph Jump */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Breakdown */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-intel-900 border border-intel-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Threat & Risk Score Distribution</h2>
              <p className="text-[11px] text-slate-400">Algorithmic centrality & flag weighting breakdown</p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-intel-850 text-slate-400 border border-intel-800">
              {stats?.total_persons || 0} Actors Assessed
            </span>
          </div>

          <div className="space-y-3.5">
            {[
              { key: 'Critical (>=70)', color: 'bg-red-500', barColor: 'bg-red-500', text: 'text-red-400' },
              { key: 'High (50-69)', color: 'bg-amber-500', barColor: 'bg-amber-500', text: 'text-amber-400' },
              { key: 'Medium (30-49)', color: 'bg-yellow-500', barColor: 'bg-yellow-500', text: 'text-yellow-400' },
              { key: 'Low (<30)', color: 'bg-emerald-500', barColor: 'bg-emerald-500', text: 'text-emerald-400' },
            ].map((tier) => {
              const count = riskDist[tier.key] || 0;
              const total = Math.max(stats?.total_persons || 1, 1);
              const pct = Math.round((count / total) * 100);
              return (
                <div key={tier.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">{tier.key}</span>
                    <span className={`font-mono font-bold ${tier.text}`}>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-intel-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${tier.barColor} rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-intel-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4 text-slate-400 text-[11px]">
              <div className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>{stats?.total_phones || 0} Phones</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Car className="w-3.5 h-3.5 text-purple-400" />
                <span>{stats?.total_vehicles || 0} Vehicles</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/network')}
              className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1 transition-colors"
            >
              <span>Explore Full Graph Canvas</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Actions / Operations Launchpad */}
        <div className="p-5 rounded-xl bg-intel-900 border border-intel-800 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Investigation Launchpad</h2>
            <p className="text-[11px] text-slate-400 mb-4">Direct operational investigative shortcuts</p>

            <div className="space-y-2.5">
              <button
                onClick={() => navigate('/network')}
                className="w-full p-3 rounded-lg bg-intel-850 hover:bg-intel-800 border border-intel-750 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Interactive Graph</span>
                    <span className="text-[10px] text-slate-400">Trace connection chains & paths</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </button>

              <button
                onClick={() => navigate('/entities')}
                className="w-full p-3 rounded-lg bg-intel-850 hover:bg-intel-800 border border-intel-750 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Search Entities</span>
                    <span className="text-[10px] text-slate-400">Search phones, vehicles, suspects</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </button>

              <button
                onClick={() => navigate('/reports')}
                className="w-full p-3 rounded-lg bg-intel-850 hover:bg-intel-800 border border-intel-750 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Generate Dossier</span>
                    <span className="text-[10px] text-slate-400">Export downloadable PDF report</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-intel-800 text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span>DISPATCH: LAW ENFORCEMENT</span>
            <span className="text-cyan-400">ONLINE</span>
          </div>
        </div>
      </div>

      {/* High-Risk Targets Leaderboard & Recent Alert Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top High-Risk Suspects */}
        <div className="p-5 rounded-xl bg-intel-900 border border-intel-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">High-Risk Syndicate Targets</h2>
              <p className="text-[11px] text-slate-400">Ranked by network degree and betweenness broker role</p>
            </div>
            <button
              onClick={() => navigate('/entities')}
              className="text-xs text-cyan-400 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-intel-800">
            {stats?.top_suspects?.slice(0, 5).map((suspect, idx) => {
              const risk = Number(suspect.risk_score || 0);
              return (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-intel-800 border border-intel-700 flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                      0{idx + 1}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">{suspect.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {suspect.properties?.role || suspect.type} · {suspect.degree} Links
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        risk >= 70
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {risk.toFixed(0)}%
                    </span>
                    <button
                      onClick={() => navigate('/network', { state: { highlightId: suspect.id } })}
                      className="p-1 text-slate-400 hover:text-cyan-400 transition-colors"
                      title="Inspect in Network Canvas"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Suspicious Activity Stream */}
        <div className="p-5 rounded-xl bg-intel-900 border border-intel-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Suspicious Activity Telemetry</h2>
              <p className="text-[11px] text-slate-400">Rule-triggered syndicate alerts</p>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs text-red-400 hover:underline"
            >
              Alert Center
            </button>
          </div>

          <div className="space-y-2.5">
            {stats?.recent_alerts?.slice(0, 4).map((alert, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-intel-950/80 border border-intel-800 flex items-start justify-between"
              >
                <div className="space-y-1 pr-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{alert.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{alert.description}</p>
                </div>
                <button
                  onClick={() => navigate('/alerts')}
                  className="p-1 text-slate-500 hover:text-slate-200"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {(!stats?.recent_alerts || stats.recent_alerts.length === 0) && (
              <div className="text-center py-6 text-xs text-slate-500">
                No active threats detected. Click "Run Detection Engine" above.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

