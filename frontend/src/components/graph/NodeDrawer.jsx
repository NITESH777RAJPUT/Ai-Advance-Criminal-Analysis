import React from 'react';
import {
  X,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  MapPin,
  Phone,
  Car,
  Landmark,
  Building2,
  FolderArchive,
  CalendarDays,
  User,
  Bot,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NodeDrawer = ({ node, onClose, onSelectTargetForPath, onAskCopilot }) => {
  const navigate = useNavigate();
  if (!node) return null;

  const risk = Number(node.risk_score || node.data?.risk_score || 0);
  const influence = Number(node.influence_score || node.data?.influence_score || 0.5);
  const community = node.community_id || node.data?.community_id || 'C-1';
  const nodeType = node.type || 'Person';
  const props = node.properties || node.data?.properties || {};

  const isHighRisk = risk >= 80;
  const isMedRisk = risk >= 50 && risk < 80;

  const riskColor = isHighRisk
    ? 'text-red-400 bg-red-500/10 border-red-500/40'
    : isMedRisk
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/40'
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40';

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Location':
        return <MapPin className="w-4 h-4 text-blue-400" />;
      case 'Phone':
      case 'PhoneNumber':
        return <Phone className="w-4 h-4 text-amber-400" />;
      case 'Vehicle':
        return <Car className="w-4 h-4 text-purple-400" />;
      case 'BankAccount':
        return <Landmark className="w-4 h-4 text-emerald-400" />;
      case 'Organization':
        return <Building2 className="w-4 h-4 text-teal-400" />;
      case 'Case':
        return <FolderArchive className="w-4 h-4 text-red-400" />;
      case 'Event':
        return <CalendarDays className="w-4 h-4 text-indigo-400" />;
      default:
        return <User className="w-4 h-4 text-cyan-400" />;
    }
  };

  const handleGenerateReport = () => {
    navigate('/reports', { state: { suspectId: node.id, suspectName: node.label } });
  };

  return (
    <div className="w-84 bg-intel-900/95 backdrop-blur-xl border-l border-cyan-500/30 flex flex-col h-full shadow-2xl z-30 animate-in slide-in-from-right duration-200 text-slate-100 select-none">
      {/* Drawer Header */}
      <div className="p-4 border-b border-intel-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getTypeIcon(nodeType)}
          <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
            {nodeType} DOSSIER
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
            {community}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-intel-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs font-sans">
        {/* Entity Title & ID */}
        <div>
          <h2 className="text-base font-bold text-slate-100 leading-tight">
            {node.label || node.data?.label || node.id}
          </h2>
          <span className="text-[11px] font-mono text-cyan-400/80 mt-0.5 block">{node.id}</span>
        </div>

        {/* Threat & Influence Metrics */}
        <div className="p-3.5 rounded-xl bg-intel-950/80 border border-intel-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Threat Risk Rating</span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${riskColor}`}>
              {risk.toFixed(0)}%
            </span>
          </div>

          <div className="w-full bg-intel-850 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isHighRisk ? 'bg-red-500' : isMedRisk ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(risk, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-intel-900">
            <span className="text-slate-400">Influence Hub Metric:</span>
            <span className="text-purple-400 font-bold">{Math.round(influence * 100)}%</span>
          </div>
        </div>

        {/* Quick Attributes */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider flex items-center space-x-1.5">
            <span>Intelligence Ledger</span>
          </h3>
          <div className="bg-intel-950/60 rounded-xl p-3 border border-intel-800 text-xs space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Graph Links:</span>
              <span className="text-cyan-400 font-bold">
                {node.connections_count ?? node.data?.connections_count ?? 0} Contacts
              </span>
            </div>

            {props.role && (
              <div className="flex justify-between">
                <span className="text-slate-400">Syndicate Role:</span>
                <span className="text-slate-200 text-right">{props.role}</span>
              </div>
            )}

            {props.status && (
              <div className="flex justify-between">
                <span className="text-slate-400">Legal Status:</span>
                <span className="text-amber-400">{props.status}</span>
              </div>
            )}

            {props.account_number && (
              <div className="flex justify-between">
                <span className="text-slate-400">Account / Hash:</span>
                <span className="text-emerald-400 truncate max-w-[140px]" title={props.account_number}>
                  {props.account_number}
                </span>
              </div>
            )}

            {props.total_volume && (
              <div className="flex justify-between">
                <span className="text-slate-400">Flow Volume:</span>
                <span className="text-purple-400 font-bold">{props.total_volume}</span>
              </div>
            )}

            {props.city && (
              <div className="flex justify-between">
                <span className="text-slate-400">City / Transit:</span>
                <span className="text-slate-200">{props.city}</span>
              </div>
            )}

            {props.registration_no && (
              <div className="flex justify-between">
                <span className="text-slate-400">Corporate CIN:</span>
                <span className="text-slate-200">{props.registration_no}</span>
              </div>
            )}
          </div>
        </div>

        {/* Entity Summary */}
        {props.summary && (
          <div className="p-3 rounded-xl bg-intel-950/60 border border-intel-800/80 text-[11.5px] text-slate-300 leading-relaxed">
            <span className="font-mono text-[10px] text-slate-500 uppercase block mb-1">
              Field Observations
            </span>
            {props.summary}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          {onAskCopilot && (
            <button
              onClick={() => onAskCopilot(node)}
              className="w-full py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold flex items-center justify-center space-x-2 transition-all shadow-glow-cyan"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ask INTEL-AI About Entity</span>
            </button>
          )}

          <button
            onClick={() => onSelectTargetForPath && onSelectTargetForPath(node.id)}
            className="w-full py-2 px-3 rounded-xl bg-intel-850 hover:bg-intel-800 text-slate-200 border border-intel-700 text-xs font-medium flex items-center justify-center space-x-2 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            <span>Trace Connection Path</span>
          </button>

          <button
            onClick={handleGenerateReport}
            className="w-full py-2 px-3 rounded-xl bg-intel-850 hover:bg-intel-800 text-slate-200 border border-intel-700 text-xs font-medium flex items-center justify-center space-x-2 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Official PDF Dossier</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeDrawer;

