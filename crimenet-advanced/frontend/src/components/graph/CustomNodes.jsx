import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import {
  User,
  Phone,
  Car,
  Landmark,
  MapPin,
  Building2,
  FolderArchive,
  CalendarDays,
  Zap,
} from 'lucide-react';

// Helper to determine risk styling
const getRiskStyle = (risk) => {
  const r = Number(risk || 0);
  if (r >= 80) {
    return {
      glowClass: 'node-critical-glow',
      borderClass: 'border-red-500/90',
      badgeBg: 'bg-red-500/20 text-red-400 border-red-500/50',
      textAccent: 'text-red-400',
      level: 'CRITICAL'
    };
  }
  if (r >= 65) {
    return {
      glowClass: 'node-high-glow',
      borderClass: 'border-orange-500/80',
      badgeBg: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
      textAccent: 'text-orange-400',
      level: 'HIGH'
    };
  }
  if (r >= 40) {
    return {
      glowClass: 'node-medium-glow',
      borderClass: 'border-yellow-500/70',
      badgeBg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      textAccent: 'text-yellow-400',
      level: 'MEDIUM'
    };
  }
  return {
    glowClass: 'node-low-glow',
    borderClass: 'border-emerald-500/60',
    badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    textAccent: 'text-emerald-400',
    level: 'LOW'
  };
};

// Community colors mapping
const getCommunityBadge = (communityId) => {
  const map = {
    'C-1': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    'C-2': 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'C-3': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'C-4': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'C-5': 'bg-red-500/20 text-red-300 border-red-500/40',
  };
  return map[communityId] || 'bg-slate-500/20 text-slate-300 border-slate-500/40';
};

// Reusable Base Node Container
const BaseNodeCard = ({
  icon: Icon,
  typeLabel,
  iconBg,
  iconColor,
  data,
  selected,
  handleColor = '!bg-cyan-500'
}) => {
  const risk = Number(data.risk_score || 0);
  const influence = Number(data.influence_score || 0);
  const connections = data.connections_count ?? 0;
  const community = data.community_id || 'C-1';
  const riskStyle = getRiskStyle(risk);
  const isHighInfluence = influence >= 0.75;

  const haloClass = isHighInfluence
    ? influence >= 0.88 ? 'node-pulsing-halo-purple' : 'node-pulsing-halo'
    : '';

  const selectedClass = selected
    ? 'ring-2 ring-cyan-400 !border-cyan-400 shadow-glow-cyan'
    : riskStyle.glowClass;

  return (
    <div
      className={`relative px-3.5 py-3 rounded-xl bg-intel-900/95 backdrop-blur-md border ${riskStyle.borderClass} ${selectedClass} ${haloClass} text-slate-100 shadow-2xl min-w-[210px] max-w-[250px] transition-all cursor-pointer group`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`w-2.5 h-2.5 ${handleColor} border-2 border-intel-950`}
      />

      {/* Top Header: Entity Type & Badges */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">
            {typeLabel}
          </span>
          {isHighInfluence && (
            <span
              className="flex items-center space-x-0.5 px-1 py-0.2 rounded bg-purple-500/25 text-purple-300 border border-purple-500/40 text-[9px] font-mono font-semibold"
              title={`High Influence Hub: ${Math.round(influence * 100)}%`}
            >
              <Zap className="w-2.5 h-2.5 text-purple-400" />
              <span>HUB</span>
            </span>
          )}
        </div>

        {/* Community ID */}
        <span
          className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${getCommunityBadge(
            community
          )}`}
          title={`Louvain Community Cluster: ${community}`}
        >
          {community}
        </span>
      </div>

      {/* Center Row: Icon + Entity Label + Subtitle */}
      <div className="flex items-start space-x-2.5">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${iconBg} ${iconColor}`}
        >
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="font-bold text-xs text-slate-100 truncate group-hover:text-cyan-300 transition-colors"
            title={data.label}
          >
            {data.label}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
            {data.properties?.role ||
              data.properties?.classification ||
              data.properties?.city ||
              data.properties?.phone_type ||
              data.properties?.lead_agency ||
              data.properties?.event_type ||
              'Monitored Entity'}
          </div>
        </div>
      </div>

      {/* Metrics Row: Risk Score + Influence + Connections */}
      <div className="mt-2.5 pt-2 border-t border-intel-800/90 grid grid-cols-3 gap-1 text-center font-mono">
        {/* Risk Metric */}
        <div className="bg-intel-950/70 rounded px-1 py-1 border border-intel-800/60">
          <div className="text-[8px] text-slate-500 uppercase tracking-tighter">RISK</div>
          <div className={`text-[11px] font-bold ${riskStyle.textAccent}`}>
            {risk}%
          </div>
        </div>

        {/* Influence Metric */}
        <div className="bg-intel-950/70 rounded px-1 py-1 border border-intel-800/60">
          <div className="text-[8px] text-slate-500 uppercase tracking-tighter">INFL</div>
          <div className="text-[11px] font-bold text-purple-400">
            {Math.round(influence * 100)}%
          </div>
        </div>

        {/* Connections Metric */}
        <div className="bg-intel-950/70 rounded px-1 py-1 border border-intel-800/60">
          <div className="text-[8px] text-slate-500 uppercase tracking-tighter">LINKS</div>
          <div className="text-[11px] font-bold text-cyan-400">
            {connections}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={`w-2.5 h-2.5 ${handleColor} border-2 border-intel-950`}
      />
    </div>
  );
};

// 1. PERSON NODE
export const PersonNode = memo((props) => (
  <BaseNodeCard
    {...props}
    icon={User}
    typeLabel="PERSON"
    iconBg="bg-cyan-500/15 border-cyan-500/30"
    iconColor="text-cyan-400"
    handleColor="!bg-cyan-400"
  />
));

// 2. PHONE NODE
export const PhoneNode = memo((props) => (
  <BaseNodeCard
    {...props}
    icon={Phone}
    typeLabel="PHONE"
    iconBg="bg-amber-500/15 border-amber-500/30"
    iconColor="text-amber-400"
    handleColor="!bg-amber-400"
  />
));

// 3. VEHICLE NODE
export const VehicleNode = memo((props) => (
  <BaseNodeCard
    {...props}
    icon={Car}
    typeLabel="VEHICLE"
    iconBg="bg-purple-500/15 border-purple-500/30"
    iconColor="text-purple-400"
    handleColor="!bg-purple-400"
  />
));

// 4. BANK ACCOUNT NODE
export const BankAccountNode = memo((props) => (
  <BaseNodeCard
    {...props}
    icon={Landmark}
    typeLabel="BANK ACCOUNT"
    iconBg="bg-emerald-500/15 border-emerald-500/30"
    iconColor="text-emerald-400"
    handleColor="!bg-emerald-400"
  />
));

// 5. LOCATION NODE
export const LocationNode = memo((props) => (
  <BaseNodeCard
    {...props}
    icon={MapPin}
    typeLabel="LOCATION"
    iconBg="bg-blue-500/15 border-blue-500/30"
    iconColor="text-blue-400"
    handleColor="!bg-blue-400"
  />
));

// 6. ORGANIZATION NODE
export const OrganizationNode = memo((props) => (
  <BaseNodeCard
    {...props}
    icon={Building2}
    typeLabel="ORGANIZATION"
    iconBg="bg-teal-500/15 border-teal-500/30"
    iconColor="text-teal-400"
    handleColor="!bg-teal-400"
  />
));

// 7. CASE NODE
export const CaseNode = memo((props) => (
  <BaseNodeCard
    {...props}
    icon={FolderArchive}
    typeLabel="CASE FILE"
    iconBg="bg-red-500/15 border-red-500/30"
    iconColor="text-red-400"
    handleColor="!bg-red-400"
  />
));

// 8. EVENT NODE
export const EventNode = memo((props) => (
  <BaseNodeCard
    {...props}
    icon={CalendarDays}
    typeLabel="EVENT"
    iconBg="bg-indigo-500/15 border-indigo-500/30"
    iconColor="text-indigo-400"
    handleColor="!bg-indigo-400"
  />
));

export const nodeTypes = {
  Person: PersonNode,
  Phone: PhoneNode,
  PhoneNumber: PhoneNode,
  Vehicle: VehicleNode,
  BankAccount: BankAccountNode,
  Location: LocationNode,
  Organization: OrganizationNode,
  Case: CaseNode,
  Event: EventNode,
};

