import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Route,
  Share2,
  FileText,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Cpu,
  Layers,
  CheckCircle2,
  Search,
  Crosshair,
  ExternalLink,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { aiApi } from '../../services/api';

export const IntelAICopilot = ({
  selectedNode,
  allNodes = [],
  allEdges = [],
  onHighlightNodes,
  onTracePath,
  onFilterCommunity,
  onExpandHops,
  onFocusNode,
  onResetHighlights,
  isOpen = true,
  onClose,
}) => {
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `### 🛡️ INTEL-AI Investigation Copilot Online\n**Protocol**: Law Enforcement Intelligence Directive 2026-B.\n\nI am actively grounded in the current investigation database. All responses are derived strictly from uploaded FIRs, CDR files, banking records, and network graph topology.\n\nSelect any entity on the canvas or enter a question below to analyze criminal associations, trace communication conduits, or justify risk scores.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reasoning: 'INTEL-AI ENGINE INITIALIZED // ZERO-HALLUCINATION POLICY ACTIVE',
      sources: [],
      entities: [],
      actions: []
    }
  ]);
  const [sessionId] = useState(() => `intel_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeReasoning, setActiveReasoning] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeReasoning]);

  // Contextual Dynamic Question Suggestions
  const suggestedQuestions = selectedNode
    ? [
        `Tell me everything available about ${selectedNode.label || selectedNode.name}`,
        `Show all associates connected to ${selectedNode.label || selectedNode.name}`,
        `Why is this person high risk?`,
        `Show all linked bank accounts`,
        `Show phone numbers and CDR communications`,
      ]
    : [
        'Explain criminal community clusters',
        'Find hidden intermediaries and brokers',
        'Show all linked bank accounts',
        'Show high-risk syndicate hubs',
      ];

  // AUTOMATIC GROUNDED DOSSIER GENERATION WHEN A NODE IS SELECTED
  useEffect(() => {
    if (!selectedNode?.id) return;

    const nodeName = selectedNode.label || selectedNode.name || selectedNode.id;
    let isCancelled = false;

    const fetchAutoDossier = async () => {
      setActiveReasoning(`RETRIEVING GROUNDED INTELLIGENCE DOSSIER FOR ${nodeName.toUpperCase()}...`);
      setIsProcessing(true);

      try {
        const res = await aiApi.query(
          `Tell me everything available about ${nodeName}`,
          selectedNode.id
        );

        if (isCancelled) return;

        setMessages((prev) => [
          ...prev,
          {
            id: `dossier-${selectedNode.id}-${Date.now()}`,
            sender: 'ai',
            text: res.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            targetNodeId: selectedNode.id,
            sources: res.sources || [],
            entities: res.entities_involved || [],
            actions: res.graph_actions || []
          }
        ]);
      } catch (err) {
        if (isCancelled) return;
        setMessages((prev) => [
          ...prev,
          {
            id: `dossier-err-${Date.now()}`,
            sender: 'ai',
            text: `⚠️ **Unable to retrieve intelligence dossier**: ${err.response?.data?.detail || err.message}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sources: [],
            entities: [],
            actions: []
          }
        ]);
      } finally {
        if (!isCancelled) {
          setActiveReasoning(null);
          setIsProcessing(false);
        }
      }
    };

    fetchAutoDossier();

    return () => {
      isCancelled = true;
    };
  }, [selectedNode?.id]);

  // QUERY SUBMIT HANDLER
  const handleSendQuery = async (queryText) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isProcessing) return;

    setInputQuery('');
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: q,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setIsProcessing(true);

    const lower = q.toLowerCase();
    if (lower.includes('associates') || lower.includes('connected')) {
      setActiveReasoning('TRAVERSING GRAPH TOPOLOGY // QUERYING 1-HOP & 2-HOP NEIGHBORS...');
    } else if (lower.includes('shortest path') || lower.includes('path')) {
      setActiveReasoning('COMPUTING SHORTEST GRAPH TRAVERSAL // DETECTING CONDUITS...');
    } else if (lower.includes('bank') || lower.includes('account') || lower.includes('transaction')) {
      setActiveReasoning('FILTERING FINANCIAL LEDGERS & RECORDED ACCOUNTS...');
    } else if (lower.includes('community') || lower.includes('cluster')) {
      setActiveReasoning('EVALUATING MODULARITY SYNDICATE CLUSTERS...');
    } else if (lower.includes('intermediar') || lower.includes('hidden')) {
      setActiveReasoning('COMPUTING BETWEENNESS CENTRALITY // LOCATING BROKERS...');
    } else {
      setActiveReasoning('QUERYING INGESTED INVESTIGATION DATA & EVIDENCE LOGS...');
    }

    try {
      const res = await aiApi.query(q, selectedNode?.id || null, sessionId);

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: res.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: res.sources || [],
          entities: res.entities_involved || [],
          actions: res.graph_actions || []
        }
      ]);

      // Automatically execute first graph action if applicable
      if (res.graph_actions && res.graph_actions.length > 0) {
        executeGraphAction(res.graph_actions[0]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: `⚠️ **Investigation Query Error**: ${err.response?.data?.detail || err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: [],
          entities: [],
          actions: []
        }
      ]);
    } finally {
      setActiveReasoning(null);
      setIsProcessing(false);
    }
  };

  // EXECUTE GRAPH ACTION
  const executeGraphAction = (action) => {
    if (!action) return;
    switch (action.type) {
      case 'focus_node':
        if (action.target_id && onFocusNode) {
          onFocusNode(action.target_id);
        }
        break;
      case 'highlight_nodes':
        if (action.target_ids && onHighlightNodes) {
          onHighlightNodes(action.target_ids);
        }
        break;
      case 'trace_path':
        if (action.path && onTracePath) {
          onTracePath(action.path);
        }
        break;
      case 'expand_neighborhood':
        if (action.target_id && onExpandHops) {
          onExpandHops(action.target_id, action.hops || 1);
        }
        break;
      case 'filter_community':
        if (action.community_id && onFilterCommunity) {
          onFilterCommunity(action.community_id);
        }
        break;
      case 'reset':
        if (onResetHighlights) {
          onResetHighlights();
        }
        break;
      default:
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-40 transition-all duration-300 ease-in-out font-sans ${
        minimized
          ? 'bottom-4 right-4 w-72 h-14'
          : 'bottom-4 right-4 w-[480px] h-[640px] max-h-[85vh]'
      } bg-slate-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden`}
    >
      {/* HEADER */}
      <div className="h-14 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border-b border-cyan-500/30 px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-cyan-300">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold tracking-wider font-mono text-cyan-300">INTEL-AI</span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 px-1.5 py-0.2 rounded font-mono">
                COPILOT
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Grounded Intelligence Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-slate-400">
          <button
            onClick={() => setMinimized(!minimized)}
            className="p-1.5 hover:text-cyan-300 hover:bg-slate-800/80 rounded-lg transition-colors"
            title={minimized ? 'Maximize Copilot' : 'Minimize Copilot'}
            aria-label={minimized ? 'Maximize Copilot' : 'Minimize Copilot'}
          >
            {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition-colors"
              title="Close Copilot"
              aria-label="Close Copilot"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* BODY CONTENT WHEN NOT MINIMIZED */}
      {!minimized && (
        <>
          {/* MESSAGES SCROLL CONTAINER */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-xl px-4 py-3 border ${
                    msg.sender === 'user'
                      ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-50'
                      : 'bg-slate-900/90 border-slate-800 text-slate-200'
                  }`}
                >
                  {/* MESSAGE TEXT (FORMATTED MARKDOWN PRESERVED) */}
                  <div className="prose prose-invert prose-xs max-w-none space-y-2 whitespace-pre-wrap font-sans text-slate-200 leading-relaxed">
                    {msg.text}
                  </div>

                  {/* SOURCES & EVIDENCE CITATIONS */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800">
                      <div className="text-[10px] font-mono text-cyan-400 font-semibold mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>INGESTED EVIDENCE & CITATIONS ({msg.sources.length}):</span>
                      </div>
                      <div className="space-y-1">
                        {msg.sources.map((s, idx) => (
                          <div key={idx} className="bg-slate-950/70 p-1.5 rounded border border-slate-800/80 text-[10px] font-mono text-slate-300">
                            <span className="text-cyan-400 font-bold">{s.source_name || 'Case File'}</span>
                            {s.case_id && <span className="text-slate-500"> [{s.case_id}]</span>}
                            {s.evidence_snippet && <p className="text-slate-400 mt-0.5 italic">"{s.evidence_snippet}"</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GRAPH ACTION BUTTONS */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap gap-1.5">
                      {msg.actions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => executeGraphAction(act)}
                          className="flex items-center gap-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold transition-all shadow-sm"
                        >
                          <Crosshair className="w-3 h-3 text-cyan-400" />
                          <span>{act.label || act.type.replace('_', ' ').toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* LIVE REASONING PULSE */}
            {activeReasoning && (
              <div className="flex items-center space-x-2 bg-slate-900/90 border border-cyan-500/30 text-cyan-400 p-2.5 rounded-xl font-mono text-[10px] animate-pulse">
                <Cpu className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>{activeReasoning}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* PRESET CONTEXTUAL QUERY PILLS */}
          <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/60 shrink-0">
            <div className="text-[10px] text-slate-500 font-mono uppercase mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Suggested Inquiries</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendQuery(q)}
                  disabled={isProcessing}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/50 px-2.5 py-1 rounded-full text-[10px] font-mono transition-all text-left truncate max-w-full disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* INPUT BAR */}
          <div className="p-3 border-t border-slate-800 bg-slate-950 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask INTEL-AI about suspects, paths, transactions..."
                disabled={isProcessing}
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl placeholder-slate-500 font-mono transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isProcessing}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 text-white p-2.5 rounded-xl border border-cyan-400/30 transition-all shadow-md shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default IntelAICopilot;
