import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { graphApi } from '../services/api';
import CytoscapeGraph from '../components/graph/CytoscapeGraph';
import NodeDrawer from '../components/graph/NodeDrawer';
import IntelAICopilot from '../components/copilot/IntelAICopilot';
import GraphAnalyticsPanel from '../components/graph/GraphAnalyticsPanel';
import AIInsightsPanel from '../components/graph/AIInsightsPanel';
import TimelineBar from '../components/graph/TimelineBar';
import {
  Filter,
  Search,
  Route,
  RotateCcw,
  ShieldAlert,
  Layers,
  Flame,
  Activity,
  BarChart3,
  Bot,
  Sparkles,
  Calendar,
  Sliders,
  ArrowRight,
  ChevronRight,
  UploadCloud,
  FilePlus2,
  Cpu,
  Radar
} from 'lucide-react';

const NetworkGraph = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cyGraphRef = useRef(null);

  // Raw Graph Data from live database (NEVER MOCK)
  const [rawNetwork, setRawNetwork] = useState({ nodes: [], edges: [] });
  const [analysisData, setAnalysisData] = useState({
    degree_centrality: [],
    betweenness_centrality: [],
    pagerank: [],
    communities: [],
  });
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [relFilter, setRelFilter] = useState('ALL');
  const [communityFilter, setCommunityFilter] = useState('ALL');
  const [minRisk, setMinRisk] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Panels & Overlays
  const [timelineMode, setTimelineMode] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState('analytics');
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // Shortest Path Finder
  const [pathMode, setPathMode] = useState(false);
  const [pathSource, setPathSource] = useState('');
  const [pathTarget, setPathTarget] = useState('');
  const [pathResult, setPathResult] = useState(null);
  const [pathLoading, setPathLoading] = useState(false);

  // LOAD REAL GRAPH DATA FROM BACKEND
  const loadGraph = useCallback(async () => {
    try {
      setLoading(true);
      const res = await graphApi.getNetwork({ limit: 500 });
      const nodes = res?.nodes || [];
      const edges = res?.edges || [];

      setRawNetwork({ nodes, edges });

      // Fetch network analysis metrics
      try {
        const analysis = await graphApi.getAnalysis();
        if (analysis) {
          // Format metrics for analytics panel
          const maxDeg = Math.max(...nodes.map((n) => n.connections_count || 0), 1);
          const degCentrality = (analysis.most_connected || []).map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            connections: c.degree,
            score: Number((c.degree / maxDeg).toFixed(3)),
          }));

          const pageRank = (nodes || [])
            .slice()
            .sort((a, b) => (b.influence_score || 0) - (a.influence_score || 0))
            .slice(0, 10)
            .map((n) => ({
              id: n.id,
              name: n.label,
              hub_type: n.type,
              score: n.influence_score || 0.1,
            }));

          const betweenness = (analysis.hidden_links || []).slice(0, 8).map((h, idx) => ({
            id: h.source?.id || `broker-${idx}`,
            name: `${h.source?.name || 'Subject'} ⇋ ${h.target?.name || 'Target'}`,
            role: h.inference || 'Shared mutual associate',
            score: Math.min(1.0, (h.shared_count || 1) * 0.25),
          }));

          const communities = (analysis.communities || []).map((c, idx) => ({
            id: c.cluster_id || `C-${idx + 1}`,
            name: `${c.size} Entity Syndicate Cell`,
            color: ['#06b6d4', '#f59e0b', '#a855f7', '#10b981', '#3b82f6', '#ec4899'][idx % 6],
            count: c.size,
            density: 0.72,
            risk_avg: Math.round(
              (c.members || []).reduce((acc, m) => acc + (m.risk_score || 0), 0) / Math.max(1, c.size)
            ),
          }));

          setAnalysisData({
            degree_centrality: degCentrality,
            pagerank: pageRank,
            betweenness_centrality: betweenness,
            communities: communities,
          });
        }
      } catch (aErr) {
        console.warn('Network analysis metrics endpoint unavailable', aErr);
      }

      // Check if location state requested a specific node to highlight
      if (location.state?.highlightId) {
        const target = nodes.find((n) => n.id === location.state.highlightId);
        if (target) {
          setSelectedNode(target);
          setTimeout(() => {
            cyGraphRef.current?.focusNode(target.id);
          }, 400);
        }
      }
    } catch (err) {
      console.error('Failed to load live network graph:', err);
      setRawNetwork({ nodes: [], edges: [] });
    } finally {
      setLoading(false);
    }
  }, [location.state]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph, refreshKey]);

  // DERIVE FILTERED GRAPH ELEMENTS FOR CYTOSCAPE
  const filteredData = useMemo(() => {
    if (!rawNetwork.nodes.length) return { nodes: [], edges: [] };

    const matchingNodes = rawNetwork.nodes.filter((n) => {
      const matchesType = typeFilter === 'ALL' || n.type === typeFilter;
      const matchesCommunity = communityFilter === 'ALL' || n.community_id === communityFilter;
      const matchesRisk = (n.risk_score || 0) >= minRisk;
      const matchesSearch =
        !searchQuery ||
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.properties?.role && n.properties.role.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesType && matchesCommunity && matchesRisk && matchesSearch;
    });

    const validIds = new Set(matchingNodes.map((n) => String(n.id)));

    const matchingEdges = rawNetwork.edges.filter((e) => {
      const hasNodes = validIds.has(String(e.source)) && validIds.has(String(e.target));
      const matchesRel = relFilter === 'ALL' || e.type === relFilter || e.label === relFilter;
      return hasNodes && matchesRel;
    });

    return { nodes: matchingNodes, edges: matchingEdges };
  }, [rawNetwork, typeFilter, relFilter, communityFilter, minRisk, searchQuery]);

  // DERIVE TIMELINE EVENTS FROM REAL EDGES WITH TIMESTAMPS
  const timelineEvents = useMemo(() => {
    return rawNetwork.edges
      .filter((e) => e.timestamp || e.source_document)
      .map((e, idx) => ({
        id: e.id || `evt-${idx}`,
        title: `${e.source} ➔ ${e.target}`,
        category:
          e.type === 'CALLED'
            ? 'Calls'
            : e.type === 'TRANSFERRED_MONEY'
            ? 'Transactions'
            : e.type === 'VISITED'
            ? 'Location Events'
            : 'Meetings',
        description: e.evidence || `Relationship: ${e.type} recorded in ${e.source_document || 'case file'}`,
        timestamp: e.timestamp || new Date().toISOString(),
        entity_ids: [e.source, e.target],
      }));
  }, [rawNetwork.edges]);

  // UNIQUE FILTER OPTIONS EXTRACTED DIRECTLY FROM DATA
  const availableNodeTypes = useMemo(() => {
    return Array.from(new Set(rawNetwork.nodes.map((n) => n.type))).filter(Boolean);
  }, [rawNetwork.nodes]);

  const availableRelTypes = useMemo(() => {
    return Array.from(new Set(rawNetwork.edges.map((e) => e.type || e.label))).filter(Boolean);
  }, [rawNetwork.edges]);

  const availableCommunities = useMemo(() => {
    return Array.from(new Set(rawNetwork.nodes.map((n) => n.community_id))).filter(Boolean);
  }, [rawNetwork.nodes]);

  // HANDLERS
  const handleNodeSelect = (node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const handleEdgeSelect = (edge) => {
    setSelectedEdge(edge);
  };

  const handleExpandHops = async (nodeId, hops = 1) => {
    try {
      const subgraph = await graphApi.getPersonSubgraph(nodeId, hops);
      if (subgraph && subgraph.nodes && subgraph.nodes.length > 0) {
        // Merge without duplicates
        const existingNodeIds = new Set(rawNetwork.nodes.map((n) => n.id));
        const newNodes = subgraph.nodes.filter((n) => !existingNodeIds.has(n.id));

        const existingEdgeIds = new Set(rawNetwork.edges.map((e) => e.id));
        const newEdges = subgraph.edges.filter((e) => !existingEdgeIds.has(e.id));

        if (newNodes.length > 0 || newEdges.length > 0) {
          setRawNetwork((prev) => ({
            nodes: [...prev.nodes, ...newNodes],
            edges: [...prev.edges, ...newEdges],
          }));
        }

        setTimeout(() => {
          cyGraphRef.current?.highlightNodes([nodeId, ...subgraph.nodes.map((n) => n.id)]);
        }, 300);
      }
    } catch (err) {
      console.error('Failed to expand neighborhood:', err);
    }
  };

  const handleFindShortestPath = async () => {
    if (!pathSource || !pathTarget || pathSource === pathTarget) return;

    setPathLoading(true);
    setPathResult(null);

    try {
      const res = await graphApi.findPath(pathSource, pathTarget);
      setPathResult(res);

      if (res.found && res.path && res.path.length > 0) {
        const pathIds = res.path.map((n) => n.id);
        cyGraphRef.current?.tracePath(pathIds);
      }
    } catch (err) {
      console.error('Shortest path error:', err);
      setPathResult({ found: false, error: err.message });
    } finally {
      setPathLoading(false);
    }
  };

  const handleResetFilters = () => {
    setTypeFilter('ALL');
    setRelFilter('ALL');
    setCommunityFilter('ALL');
    setMinRisk(0);
    setSearchQuery('');
    setPathMode(false);
    setPathResult(null);
    setSelectedNode(null);
    setSelectedEdge(null);
    cyGraphRef.current?.resetView();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#030712] overflow-hidden select-none font-sans text-slate-100">
      {/* TOP COMMAND & FILTER BAR */}
      <div className="h-14 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between gap-3 shrink-0 shadow-lg z-20">
        {/* Left: Search & Quick Filters */}
        <div className="flex items-center gap-2.5 flex-1 max-w-4xl">
          {/* Search Box */}
          <div className="relative w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suspect, phone, plate..."
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 focus:outline-none text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-lg font-mono placeholder-slate-500 transition-colors"
            />
          </div>

          {/* Entity Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by Entity Type"
            className="bg-slate-950/80 border border-slate-700/80 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="ALL">All Entity Types</option>
            {availableNodeTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Relationship Filter */}
          <select
            value={relFilter}
            onChange={(e) => setRelFilter(e.target.value)}
            aria-label="Filter by Relationship Type"
            className="bg-slate-950/80 border border-slate-700/80 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="ALL">All Relationships</option>
            {availableRelTypes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Community Filter */}
          {availableCommunities.length > 0 && (
            <select
              value={communityFilter}
              onChange={(e) => setCommunityFilter(e.target.value)}
              aria-label="Filter by Syndicate Community"
              className="bg-slate-950/80 border border-slate-700/80 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="ALL">All Syndicate Clusters</option>
              {availableCommunities.map((c) => (
                <option key={c} value={c}>
                  Cluster {c}
                </option>
              ))}
            </select>
          )}

          {/* Min Risk Slider */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-mono">
            <span className="text-slate-400 text-[11px]">Risk &ge;</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={minRisk}
              onChange={(e) => setMinRisk(Number(e.target.value))}
              className="w-16 h-1 accent-cyan-400 cursor-pointer"
            />
            <span className={`text-[11px] font-bold ${minRisk >= 75 ? 'text-red-400' : 'text-cyan-400'}`}>
              {minRisk}%
            </span>
          </div>

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            title="Reset All Filters"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Path Tracer Toggle */}
          <button
            onClick={() => setPathMode(!pathMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
              pathMode
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-cyan-300'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>PATH TRACER</span>
          </button>

          {/* Timeline Scrubber Toggle */}
          <button
            onClick={() => setTimelineMode(!timelineMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
              timelineMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-amber-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>TIMELINE</span>
          </button>

          {/* AI Copilot Toggle */}
          <button
            onClick={() => setCopilotOpen(!copilotOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
              copilotOpen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-cyan-300'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>INTEL-AI</span>
          </button>

          {/* Right Analytics Panel Toggle */}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
              rightPanelOpen
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-purple-300'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>ANALYTICS</span>
          </button>
        </div>
      </div>

      {/* SHORTEST PATH FINDER BAR (IF OPEN) */}
      {pathMode && (
        <div className="bg-slate-950/95 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs font-mono gap-3 z-10 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <Route className="w-4 h-4" />
              <span>SHORTEST PATH:</span>
            </span>

            {/* Source */}
            <select
              value={pathSource}
              onChange={(e) => setPathSource(e.target.value)}
              aria-label="Path Traversal Origin Node"
              className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-slate-200 focus:outline-none focus:border-rose-400"
            >
              <option value="">Select Origin Node...</option>
              {rawNetwork.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} ({n.type})
                </option>
              ))}
            </select>

            <span className="text-slate-500">➔</span>

            {/* Target */}
            <select
              value={pathTarget}
              onChange={(e) => setPathTarget(e.target.value)}
              aria-label="Path Traversal Destination Node"
              className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-slate-200 focus:outline-none focus:border-rose-400"
            >
              <option value="">Select Destination Node...</option>
              {rawNetwork.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} ({n.type})
                </option>
              ))}
            </select>

            <button
              onClick={handleFindShortestPath}
              disabled={!pathSource || !pathTarget || pathLoading}
              className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white px-3 py-1 rounded font-semibold transition-colors"
            >
              {pathLoading ? 'Traversing...' : 'Trace Path'}
            </button>
          </div>

          {pathResult && (
            <div className="text-[11px] text-slate-300">
              {pathResult.found ? (
                <span className="text-emerald-400">
                  ✔ Path identified ({pathResult.length} hops). Traced on visual canvas in neon rose.
                </span>
              ) : (
                <span className="text-amber-400">
                  ✖ No path found connecting these entities in the current network.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* MAIN GRAPH CANVAS & SIDEBAR CONTAINER */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* CANVAS WORKSPACE */}
        <div className="flex-1 relative h-full bg-[#030712]">
          {loading ? (
            /* Loading State */
            <div className="w-full h-full flex flex-col items-center justify-center space-y-3 bg-[#030712]">
              <Cpu className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="font-mono text-xs text-slate-400 tracking-wider">
                INITIALIZING CRIMINAL TOPOLOGY CANVAS...
              </p>
            </div>
          ) : rawNetwork.nodes.length === 0 ? (
            /* PALANTIR GOTHAM INSPIRED EMPTY STATE (CRITICAL RULE 10) */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-950 via-[#030712] to-slate-950">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-slate-900/80 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.2)]">
                  <Radar className="w-10 h-10 text-cyan-400 animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-[9px] font-mono text-slate-950 font-bold">
                  0
                </div>
              </div>

              <h2 className="text-lg font-bold font-mono tracking-wider text-slate-100 uppercase mb-2">
                No Intelligence Records Ingested
              </h2>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6 font-sans">
                The criminal network knowledge graph is currently empty. Upload First Information Reports (FIRs),
                Call Detail Records (CDRs), financial transaction ledgers, or officer notes to automatically extract
                entities and generate the live interactive graph.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/upload')}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-semibold px-4 py-2.5 rounded-xl border border-cyan-400/40 shadow-lg transition-all"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Navigate to Upload Center</span>
                </button>

                <button
                  onClick={() => setCopilotOpen(true)}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-mono text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-all"
                >
                  <Bot className="w-4 h-4" />
                  <span>Consult INTEL-AI</span>
                </button>
              </div>
            </div>
          ) : (
            /* CYTOSCAPE GRAPH IMPLEMENTATION */
            <CytoscapeGraph
              ref={cyGraphRef}
              nodes={filteredData.nodes}
              edges={filteredData.edges}
              selectedNodeId={selectedNode?.id}
              onNodeSelect={handleNodeSelect}
              onEdgeSelect={handleEdgeSelect}
              onExpandNode={(node) => handleExpandHops(node.id, 1)}
            />
          )}

          {/* Edge Detail Floating Bar (When Edge Clicked) */}
          {selectedEdge && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-slate-700 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-cyan-400 font-bold">{selectedEdge.type || selectedEdge.label}</span>
                <span className="text-slate-400 ml-2">
                  {selectedEdge.source} ➔ {selectedEdge.target}
                </span>
                {selectedEdge.evidence && (
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5 max-w-md truncate">
                    Evidence: "{selectedEdge.evidence}"
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedEdge(null)}
                className="text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800 text-xs"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* RIGHT DRAWER / ANALYTICS SIDEBAR */}
        {rightPanelOpen && (
          <aside className="w-88 xl:w-96 bg-slate-950/95 border-l border-slate-800 flex flex-col h-full shadow-2xl z-20 shrink-0 select-none">
            <div className="h-12 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between shrink-0">
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => setRightPanelTab('analytics')}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    rightPanelTab === 'analytics'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>ANALYTICS</span>
                </button>
                <button
                  onClick={() => setRightPanelTab('insights')}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    rightPanelTab === 'insights'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI INSIGHTS</span>
                </button>
              </div>

              <button
                onClick={() => setRightPanelOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {rightPanelTab === 'analytics' ? (
              <GraphAnalyticsPanel
                analyticsData={analysisData}
                onHighlightNodes={(ids) => cyGraphRef.current?.highlightNodes(ids)}
                onFilterCommunity={(cId) => setCommunityFilter(cId)}
                onFilterRisk={(r) => setMinRisk(r)}
              />
            ) : (
              <AIInsightsPanel
                insightsData={null}
                onHighlightNodes={(ids) => cyGraphRef.current?.highlightNodes(ids)}
                onInspectEntity={(id) => {
                  const target = rawNetwork.nodes.find((n) => n.id === id);
                  if (target) setSelectedNode(target);
                }}
              />
            )}
          </aside>
        )}

        {/* SELECTED NODE DETAIL SLIDE-OUT DRAWER */}
        {selectedNode && (
          <NodeDrawer
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onSelectTargetForPath={(nodeId) => {
              setPathMode(true);
              setPathSource(nodeId);
            }}
            onAskCopilot={(node) => {
              setCopilotOpen(true);
            }}
          />
        )}
      </div>

      {/* BOTTOM TIMELINE SCRUBBER */}
      {timelineMode && (
        <TimelineBar
          events={timelineEvents}
          onTimeChange={(evt) => {
            if (evt?.entity_ids) {
              cyGraphRef.current?.highlightNodes(evt.entity_ids);
            }
          }}
          onSelectEvent={(evt) => {
            if (evt?.entity_ids) {
              cyGraphRef.current?.highlightNodes(evt.entity_ids);
            }
          }}
        />
      )}

      {/* FLOATING INTEL-AI INVESTIGATION COPILOT WIDGET */}
      <IntelAICopilot
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        selectedNode={selectedNode}
        allNodes={rawNetwork.nodes}
        allEdges={rawNetwork.edges}
        onFocusNode={(nodeId) => cyGraphRef.current?.focusNode(nodeId)}
        onHighlightNodes={(nodeIds) => cyGraphRef.current?.highlightNodes(nodeIds)}
        onTracePath={(pathIds) => cyGraphRef.current?.tracePath(pathIds)}
        onFilterCommunity={(cId) => {
          setCommunityFilter(cId);
          cyGraphRef.current?.filterCommunity(cId);
        }}
        onExpandHops={(nodeId, hops) => handleExpandHops(nodeId, hops)}
        onResetHighlights={() => cyGraphRef.current?.resetView()}
      />
    </div>
  );
};

export default NetworkGraph;
