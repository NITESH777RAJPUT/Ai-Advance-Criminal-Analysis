import React from 'react';
import {
  Sparkles,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  TrendingUp,
  Link2,
  Users,
  Eye,
  CheckCircle,
  FileCheck,
  Zap,
  Radio
} from 'lucide-react';

const DEFAULT_INSIGHTS = {
  top_influencers: [],
  suspicious_patterns: [],
  rapid_network_growth: { metric: '0%', summary: 'No growth anomalies detected in current dataset.' },
  emerging_communities: [],
  cross_case_links: [],
  hidden_associates: [],
  investigation_recommendations: [],
};

export const AIInsightsPanel = ({
  onHighlightNodes,
  onInspectEntity,
  insightsData = DEFAULT_INSIGHTS
}) => {
  const data = insightsData || DEFAULT_INSIGHTS;
  const growth = data.rapid_network_growth || DEFAULT_INSIGHTS.rapid_network_growth;

  return (
    <div className="flex-1 flex flex-col h-full bg-intel-950/80 overflow-y-auto text-slate-200 p-4 space-y-4 font-sans text-xs">
      {/* Header Banner */}
      <div className="rounded-xl bg-gradient-to-r from-purple-950/60 to-cyan-950/60 border border-purple-500/30 p-3.5 shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono font-bold text-slate-100 text-xs flex items-center space-x-1.5">
              <span>AUTOMATED INTEL SCAN</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>
            <p className="text-[10.5px] text-slate-400">
              Correlating ingested entities, communication logs, and evidence ledgers.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Top Influencers */}
      <div className="rounded-xl bg-intel-900/90 border border-intel-800 p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between text-purple-400 font-mono font-bold text-xs uppercase tracking-wider">
          <div className="flex items-center space-x-1.5">
            <Flame className="w-3.5 h-3.5" />
            <span>Top Network Influencers & Hubs</span>
          </div>
        </div>

        <div className="space-y-2">
          {(data.top_influencers || []).map((item, idx) => (
            <div
              key={idx}
              onClick={() => onHighlightNodes?.([item.entity_id])}
              className="p-2.5 rounded-lg bg-intel-950/70 hover:bg-purple-500/10 border border-intel-800 hover:border-purple-500/40 transition-all cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100 text-xs">{item.name}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                  {item.badge}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-tight">
                {item.reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Suspicious Patterns */}
      <div className="rounded-xl bg-intel-900/90 border border-intel-800 p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between text-red-400 font-mono font-bold text-xs uppercase tracking-wider">
          <div className="flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Suspicious Pattern Detections</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800">
            3 ACTIVE
          </span>
        </div>

        <div className="space-y-2">
          {(data.suspicious_patterns || []).map((pat, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-intel-950/70 border border-red-500/20 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-xs">{pat.pattern_name}</span>
                <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  {pat.threat_level}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-tight">
                {pat.description}
              </p>
              <div className="flex items-center justify-end pt-1">
                <button
                  onClick={() => onHighlightNodes?.(pat.involved_nodes)}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                >
                  <span>Highlight Nodes on Graph</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {(data.suspicious_patterns || []).length === 0 && (
            <div className="text-slate-500 text-center py-2 font-mono text-[11px]">No active pattern anomalies flagged.</div>
          )}
        </div>
      </div>

      {/* 3. Emerging Communities & Rapid Network Growth */}
      <div className="rounded-xl bg-intel-900/90 border border-intel-800 p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between text-cyan-400 font-mono font-bold text-xs uppercase tracking-wider">
          <div className="flex items-center space-x-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Rapid Network Growth & Clusters</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">
            {growth.metric}
          </span>
        </div>

        <p className="text-[10.5px] text-slate-400">
          {growth.summary}
        </p>

        <div className="space-y-2 pt-1">
          {(data.emerging_communities || []).map((comm, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-intel-950/70 border border-intel-800 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs">{comm.title}</span>
                <span className="text-[9px] font-mono text-cyan-400">{comm.detected_on}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                Velocity: {comm.velocity}
              </div>
              <p className="text-[10.5px] text-slate-300">
                {comm.alert}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Cross-Case Links */}
      <div className="rounded-xl bg-intel-900/90 border border-intel-800 p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-center space-x-1.5 text-blue-400 font-mono font-bold text-xs uppercase tracking-wider">
          <Link2 className="w-3.5 h-3.5" />
          <span>Cross-Case Linkages (Shared Entities)</span>
        </div>

        <div className="space-y-2">
          {(data.cross_case_links || []).map((link, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-intel-950/70 border border-intel-800 space-y-1"
            >
              <div className="font-semibold text-slate-200 text-xs">{link.entity}</div>
              <div className="flex flex-wrap gap-1">
                {link.cases.map((c, cIdx) => (
                  <span
                    key={cIdx}
                    className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-[10.5px] text-slate-400 leading-tight pt-0.5">
                {link.intelligence_note}
              </p>
            </div>
          ))}
          {(data.cross_case_links || []).length === 0 && (
            <div className="text-slate-500 text-center py-2 font-mono text-[11px]">No multi-case overlaps detected.</div>
          )}
        </div>
      </div>

      {/* 5. Hidden Associates */}
      <div className="rounded-xl bg-intel-900/90 border border-intel-800 p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-center space-x-1.5 text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
          <Eye className="w-3.5 h-3.5" />
          <span>Hidden & Unmonitored Associates</span>
        </div>

        <div className="space-y-2">
          {(data.hidden_associates || []).map((assoc, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-intel-950/70 border border-intel-800 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs">{assoc.name}</span>
                <span className="text-[9px] font-mono text-amber-400">{assoc.connection_type}</span>
              </div>
              <p className="text-[10.5px] text-slate-300 leading-tight">
                {assoc.importance}
              </p>
              <div className="text-[10px] font-mono text-slate-500 pt-0.5">
                ⚡ Action Advised: {assoc.action_advised}
              </div>
            </div>
          ))}
          {(data.hidden_associates || []).length === 0 && (
            <div className="text-slate-500 text-center py-2 font-mono text-[11px]">No hidden conduit pairs detected.</div>
          )}
        </div>
      </div>

      {/* 6. Investigation Recommendations */}
      <div className="rounded-xl bg-intel-900/90 border border-intel-800 p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between text-emerald-400 font-mono font-bold text-xs uppercase tracking-wider">
          <div className="flex items-center space-x-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Tactical Recommendations</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">PRIORITIZED</span>
        </div>

        <div className="space-y-2">
          {(data.investigation_recommendations || []).map((rec) => (
            <div
              key={rec.id}
              className="p-2.5 rounded-lg bg-intel-950/70 border border-emerald-500/20 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {rec.priority}
                </span>
                <span className="font-mono text-slate-500 text-[10px]">{rec.id}</span>
              </div>
              <div className="font-semibold text-slate-200 text-xs">{rec.action}</div>
              <p className="text-[10.5px] text-slate-400 leading-tight">
                {rec.rationale}
              </p>
              <div className="pt-1 flex justify-end">
                <button
                  onClick={() => onHighlightNodes?.([rec.target_id])}
                  className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono transition-colors"
                >
                  Locate Target on Graph
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIInsightsPanel;

