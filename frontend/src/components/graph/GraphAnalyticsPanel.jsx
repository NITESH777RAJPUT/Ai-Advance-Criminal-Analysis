import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Network,
  Share2,
  Zap,
  TrendingUp,
  ShieldAlert,
  Layers,
  ChevronRight,
  Filter,
  Info
} from 'lucide-react';

const DEFAULT_ANALYTICS = {
  degree_centrality: [],
  betweenness_centrality: [],
  pagerank: [],
  communities: [],
};

export const GraphAnalyticsPanel = ({
  onHighlightNodes,
  onFilterCommunity,
  onFilterRisk,
  analyticsData = DEFAULT_ANALYTICS
}) => {
  const [activeTab, setActiveTab] = useState('centrality');

  return (
    <div className="flex-1 flex flex-col h-full bg-intel-950/80 overflow-y-auto text-slate-200 p-4 space-y-4 font-sans text-xs">
      {/* Mini Sub-Nav */}
      <div className="flex rounded-lg bg-intel-900 p-1 border border-intel-800 shrink-0">
        <button
          onClick={() => setActiveTab('centrality')}
          className={`flex-1 py-1.5 rounded-md font-mono text-[11px] font-semibold transition-all ${
            activeTab === 'centrality'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Centrality & PageRank
        </button>
        <button
          onClick={() => setActiveTab('communities')}
          className={`flex-1 py-1.5 rounded-md font-mono text-[11px] font-semibold transition-all ${
            activeTab === 'communities'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Communities & Components
        </button>
      </div>

      {activeTab === 'centrality' && (
        <>
          {/* Card 1: Degree Centrality Leaderboard */}
          <div className="rounded-xl bg-intel-900/90 border border-intel-800 p-3.5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-cyan-400 font-mono font-bold text-xs uppercase tracking-wider">
                <Share2 className="w-3.5 h-3.5" />
                <span>Degree Centrality Top Hubs</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                REAL-TIME
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Measures direct connection density. Identifies command coordinators and high-traffic nodes.
            </p>

            <div className="space-y-2">
              {(analyticsData?.degree_centrality || []).map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => onHighlightNodes?.([item.id])}
                  className="group flex items-center justify-between p-2 rounded-lg bg-intel-950/70 hover:bg-cyan-500/10 border border-intel-800/80 hover:border-cyan-500/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="font-mono text-slate-500 text-[10px] w-4 font-bold">
                      0{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-200 truncate group-hover:text-cyan-300 text-xs">
                        {item.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {item.type} • {item.connections} Links
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-cyan-400 text-xs">
                      {Math.round(item.score * 100)}%
                    </div>
                    <div className="w-16 h-1.5 bg-intel-800 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        style={{ width: `${item.score * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(analyticsData?.degree_centrality || []).length === 0 && (
                <div className="text-slate-500 text-center py-3 font-mono text-[11px]">No node centrality data available.</div>
              )}
            </div>
          </div>

          {/* Card 2: PageRank (Influence Topology) */}
          <div className="rounded-xl bg-intel-900/90 border border-intel-800 p-3.5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-purple-400 font-mono font-bold text-xs uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                <span>PageRank Influence Vectors</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800">
                EIGENVECTOR
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Evaluates prestige and influence based on the centrality of neighbors.
            </p>

            <div className="space-y-1.5">
              {(analyticsData?.pagerank || []).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onHighlightNodes?.([item.id])}
                  className="flex items-center justify-between p-2 rounded-lg bg-intel-950/60 hover:bg-purple-500/10 border border-intel-800 hover:border-purple-500/40 transition-all cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 text-xs truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] font-mono text-purple-400">
                      {item.hub_type}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-purple-300 text-xs">
                    {(item.score * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
              {(analyticsData?.pagerank || []).length === 0 && (
                <div className="text-slate-500 text-center py-3 font-mono text-[11px]">No PageRank records available.</div>
              )}
            </div>
          </div>

          {/* Card 3: Betweenness Centrality (Hidden Brokers) */}
          <div className="rounded-xl bg-intel-900/90 border border-intel-800 p-3.5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Betweenness (Chokepoints & Brokers)</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                BOTTLENECKS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Pinpoints entities controlling information flow between separate syndicates.
            </p>

            <div className="space-y-2">
              {(analyticsData?.betweenness_centrality || []).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onHighlightNodes?.([item.id])}
                  className="p-2.5 rounded-lg bg-intel-950/70 hover:bg-amber-500/10 border border-intel-800 hover:border-amber-500/40 transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 text-xs">{item.name}</span>
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      {Math.round(item.score * 100)}% Brokerage
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-tight">
                    {item.role}
                  </p>
                </div>
              ))}
              {(analyticsData?.betweenness_centrality || []).length === 0 && (
                <div className="text-slate-500 text-center py-3 font-mono text-[11px]">No broker bottlenecks detected.</div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'communities' && (
        <>
          {/* Card 4: Community Detection (Louvain Algorithm) */}
          <div className="rounded-xl bg-intel-900/90 border border-intel-800 p-3.5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-cyan-400 font-mono font-bold text-xs uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" />
                <span>Modularity Community Clusters</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Clustering partitions criminal entities into operational syndicates:
            </p>

            <div className="space-y-2">
              {(analyticsData?.communities || []).map((comm) => (
                <div
                  key={comm.id}
                  className="p-2.5 rounded-lg bg-intel-950/70 border border-intel-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: comm.color }}
                      />
                      <span className="font-semibold text-slate-200 text-xs">
                        {comm.id}: {comm.name}
                      </span>
                    </div>
                    <button
                      onClick={() => onFilterCommunity?.(comm.id)}
                      className="px-2 py-0.5 rounded bg-intel-800 hover:bg-cyan-500/20 text-cyan-300 border border-intel-700 hover:border-cyan-500/40 text-[10px] font-mono transition-colors"
                    >
                      Isolate
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-intel-900">
                    <span>{comm.count} Entities</span>
                    <span>Density: {Math.round(comm.density * 100)}%</span>
                    <span className="text-red-400 font-bold">Avg Risk: {comm.risk_avg}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5: Connected Components & Topology Metrics */}
          <div className="rounded-xl bg-intel-900/90 border border-intel-800 p-3.5 space-y-2.5 shadow-lg">
            <div className="flex items-center space-x-2 text-blue-400 font-mono font-bold text-xs uppercase tracking-wider">
              <Network className="w-3.5 h-3.5" />
              <span>Network Topology Invariants</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-intel-950 border border-intel-800">
                <div className="text-[9px] text-slate-500 uppercase">Giant Component</div>
                <div className="font-bold text-emerald-400 mt-0.5">100% (1 Island)</div>
              </div>
              <div className="p-2 rounded bg-intel-950 border border-intel-800">
                <div className="text-[9px] text-slate-500 uppercase">Graph Diameter</div>
                <div className="font-bold text-cyan-400 mt-0.5">4 Max Hops</div>
              </div>
              <div className="p-2 rounded bg-intel-950 border border-intel-800">
                <div className="text-[9px] text-slate-500 uppercase">Avg Path Length</div>
                <div className="font-bold text-slate-200 mt-0.5">2.31 Hops</div>
              </div>
              <div className="p-2 rounded bg-intel-950 border border-intel-800">
                <div className="text-[9px] text-slate-500 uppercase">Clustering Coeff</div>
                <div className="font-bold text-purple-400 mt-0.5">0.46 (Dense)</div>
              </div>
            </div>
          </div>

          {/* Card 6: Risk Scores Breakdown */}
          <div className="rounded-xl bg-intel-900/90 border border-intel-800 p-3.5 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between text-red-400 font-mono font-bold text-xs uppercase tracking-wider">
              <div className="flex items-center space-x-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Threat Risk Stratification</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
              <button
                onClick={() => onFilterRisk?.(80)}
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-400 transition-all"
              >
                <div className="text-sm font-bold">{analyticsData.risk_distribution.critical}</div>
                <div className="text-[8px] uppercase">Critical (80%+)</div>
              </button>
              <button
                onClick={() => onFilterRisk?.(65)}
                className="p-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/25 border border-orange-500/30 text-orange-400 transition-all"
              >
                <div className="text-sm font-bold">{analyticsData.risk_distribution.high}</div>
                <div className="text-[8px] uppercase">High (65-79%)</div>
              </button>
              <button
                onClick={() => onFilterRisk?.(40)}
                className="p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/25 border border-yellow-500/30 text-yellow-400 transition-all"
              >
                <div className="text-sm font-bold">{analyticsData.risk_distribution.medium}</div>
                <div className="text-[8px] uppercase">Med (40-64%)</div>
              </button>
              <button
                onClick={() => onFilterRisk?.(0)}
                className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 transition-all"
              >
                <div className="text-sm font-bold">{analyticsData.risk_distribution.low}</div>
                <div className="text-[8px] uppercase">Low (&lt;40%)</div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GraphAnalyticsPanel;

