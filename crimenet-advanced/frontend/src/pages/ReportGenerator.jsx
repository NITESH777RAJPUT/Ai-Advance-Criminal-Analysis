import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { entitiesApi, reportsApi } from '../services/api';
import {
  FileText,
  Download,
  Shield,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  FileCheck
} from 'lucide-react';

const ReportGenerator = () => {
  const location = useLocation();
  const [suspects, setSuspects] = useState([]);
  const [selectedSuspectId, setSelectedSuspectId] = useState(location.state?.suspectId || '');
  const [selectedSuspectProfile, setSelectedSuspectProfile] = useState(null);
  const [caseTitle, setCaseTitle] = useState('Operation ShadowNet Intelligence Dossier');
  const [notes, setNotes] = useState('Urgent tactical interception recommended based on cross-border wire transfers and safehouse co-location.');
  const [includeAssociates, setIncludeAssociates] = useState(true);
  const [includeAlerts, setIncludeAlerts] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [successMsg, setSuccessMsg] = useState(null);

  // Load suspects
  useEffect(() => {
    const loadSuspects = async () => {
      try {
        const data = await entitiesApi.list({ type: 'Person', limit: 50 });
        setSuspects(data);
        if (!selectedSuspectId && data.length > 0) {
          setSelectedSuspectId(data[0].id);
        }
      } catch (e) {
        console.error('Failed to load suspects', e);
      }
    };
    loadSuspects();
  }, []);

  // Load profile when suspect changes
  useEffect(() => {
    if (!selectedSuspectId) return;
    const loadProfile = async () => {
      try {
        const profile = await entitiesApi.getById(selectedSuspectId);
        setSelectedSuspectProfile(profile);
      } catch (e) {
        console.error('Failed to load suspect profile', e);
      }
    };
    loadProfile();
  }, [selectedSuspectId]);

  const loadHistory = async () => {
    try {
      const data = await reportsApi.getHistory();
      setHistory(data);
    } catch (e) {
      console.error('Failed to load report history', e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDownloadPdf = async () => {
    try {
      setGenerating(true);
      setSuccessMsg(null);

      const blob = await reportsApi.generatePdf({
        suspect_id: selectedSuspectId || undefined,
        case_title: caseTitle,
        include_associates: includeAssociates,
        include_alerts: includeAlerts,
        notes: notes,
      });

      // Trigger browser download
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `intelligence_dossier_${selectedSuspectId || 'network'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setSuccessMsg('PDF Dossier generated and downloaded successfully.');
      await loadHistory();
    } catch (e) {
      console.error('Failed to generate PDF', e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2.5">
          <FileText className="w-6 h-6 text-cyan-400" />
          <span>Intelligence Dossier & Report Generator</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Compile suspect connections, algorithmic risk ratings, vehicles, burner phones, safehouses, and forensic evidence into formal PDF dossiers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Report Configuration */}
        <div className="lg:col-span-5 bg-intel-900 border border-intel-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Dossier Configuration</h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1 font-medium">Target Subject:</label>
              <select
                value={selectedSuspectId}
                onChange={(e) => setSelectedSuspectId(e.target.value)}
                className="w-full bg-intel-950 border border-intel-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- Comprehensive Network Syndicate Report --</option>
                {suspects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Risk: {Number(s.risk_score || 0).toFixed(0)}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-medium">Case Classification Title:</label>
              <input
                type="text"
                value={caseTitle}
                onChange={(e) => setCaseTitle(e.target.value)}
                className="w-full bg-intel-950 border border-intel-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-medium">
                Investigator Briefing & Field Notes:
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-intel-950 border border-intel-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                placeholder="Add special instructions, surveillance dates, or warrant recommendations..."
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-intel-800">
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAssociates}
                  onChange={(e) => setIncludeAssociates(e.target.checked)}
                  className="rounded bg-intel-950 border-intel-700 text-cyan-500 focus:ring-0"
                />
                <span>Include Known Associates & Intermediaries Table</span>
              </label>

              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAlerts}
                  onChange={(e) => setIncludeAlerts(e.target.checked)}
                  className="rounded bg-intel-950 border-intel-700 text-cyan-500 focus:ring-0"
                />
                <span>Include Rule-Triggered Suspicious Activity Alerts</span>
              </label>
            </div>

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              onClick={handleDownloadPdf}
              disabled={generating}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md shadow-cyan-950 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compiling PDF Document...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Official PDF Dossier</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Live Dossier Preview */}
        <div className="lg:col-span-7 bg-intel-900 border border-intel-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-intel-800">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
              LIVE DOSSIER PREVIEW
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
              CONFIDENTIAL // LAW ENFORCEMENT
            </span>
          </div>

          {/* Dossier Mockup Paper */}
          <div className="bg-intel-950 border border-intel-800 rounded-xl p-6 space-y-4 font-mono text-xs">
            <div className="border-b border-intel-800 pb-3">
              <span className="text-red-400 text-[10px] font-bold block">
                POLICE DEPARTMENT // SPECIAL INVESTIGATION BRANCH
              </span>
              <h3 className="text-lg font-bold text-slate-100 mt-1">
                {selectedSuspectProfile ? selectedSuspectProfile.name : 'ALL-SYNDICATE OVERVIEW'}
              </h3>
              <span className="text-slate-500 text-[11px]">
                ID: {selectedSuspectProfile?.id || 'NET-001'} · Case: {caseTitle}
              </span>
            </div>

            {/* Risk Box */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-intel-900 rounded-lg border border-intel-800 text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">RISK ASSESSMENT:</span>
                <span className="text-sm font-bold text-red-400">
                  {Number(selectedSuspectProfile?.risk_score || 85.0).toFixed(1)} / 100
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">RECORDED CONTACTS:</span>
                <span className="text-sm font-bold text-slate-200">
                  {selectedSuspectProfile?.connections_count || 12} Nodes
                </span>
              </div>
            </div>

            {/* Associates Preview */}
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px] font-bold block">
                1. KNOWN ASSOCIATES & INTERMEDIARIES:
              </span>
              <div className="divide-y divide-intel-850 text-[11px] text-slate-300">
                {selectedSuspectProfile?.neighbors?.slice(0, 4).map((nbr, i) => (
                  <div key={i} className="py-1 flex justify-between">
                    <span>{nbr.name}</span>
                    <span className="text-cyan-400">{nbr.relation}</span>
                  </div>
                ))}
                {(!selectedSuspectProfile?.neighbors || selectedSuspectProfile.neighbors.length === 0) && (
                  <div className="py-1 text-slate-500">Syndicate key figures: Rahul Sharma, Aman Verma, Vikram Malhotra.</div>
                )}
              </div>
            </div>

            {/* Briefing notes */}
            {notes && (
              <div className="pt-2 border-t border-intel-800 text-[11px] text-slate-400">
                <span className="text-slate-300 block font-bold mb-0.5">INVESTIGATOR BRIEFING:</span>
                <p className="italic text-slate-400">{notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generated Reports Audit Trail */}
      <div className="bg-intel-900 border border-intel-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">Generated Reports Audit Log</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-intel-800 text-slate-400 font-mono text-[11px]">
                <th className="pb-2">SUBJECT</th>
                <th className="pb-2">ACTION</th>
                <th className="pb-2">OFFICER / INVESTIGATOR</th>
                <th className="pb-2">TIMESTAMP</th>
                <th className="pb-2 text-right">PAYLOAD SIZE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-intel-800">
              {history.map((h, idx) => (
                <tr key={idx} className="hover:bg-intel-850/50">
                  <td className="py-2.5 font-medium text-slate-200">{h.subject_name}</td>
                  <td className="py-2.5 text-cyan-400 font-mono">{h.action}</td>
                  <td className="py-2.5 text-slate-300">{h.generated_by}</td>
                  <td className="py-2.5 text-slate-400 font-mono text-[11px]">
                    {new Date(h.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-400">
                    {(h.size_bytes / 1024).toFixed(1)} KB
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500 italic">
                    No reports exported yet. Click download above to generate the first dossier.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;

