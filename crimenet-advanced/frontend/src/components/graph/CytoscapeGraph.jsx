import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import cytoscape from 'cytoscape';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  LayoutGrid,
  Download,
  Eye,
  Sliders
} from 'lucide-react';

const NODE_COLORS = {
  Person: '#06b6d4',       // Cyan
  PhoneNumber: '#f59e0b',  // Amber
  Vehicle: '#a855f7',      // Purple
  BankAccount: '#10b981',  // Emerald
  Location: '#3b82f6',     // Blue
  Organization: '#14b8a6', // Teal
  Default: '#64748b',      // Slate
};

const EDGE_COLORS = {
  CALLED: '#f59e0b',
  TRANSFERRED_MONEY: '#10b981',
  TRANSACTED_WITH: '#10b981',
  VISITED: '#3b82f6',
  LOCATED_AT: '#3b82f6',
  OWNS: '#a855f7',
  ASSOCIATED_WITH: '#06b6d4',
  WORKS_FOR: '#14b8a6',
  Default: '#475569',
};

export const CytoscapeGraph = forwardRef(({
  nodes = [],
  edges = [],
  onNodeSelect,
  onEdgeSelect,
  selectedNodeId,
  onExpandNode,
}, ref) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [currentLayout, setCurrentLayout] = useState('cose');
  const [zoomLevel, setZoomLevel] = useState(100);

  // Initialize Cytoscape Instance
  useEffect(() => {
    if (!containerRef.current) return;

    // Strict node ID set
    const validNodeIds = new Set(nodes.map((n) => String(n.id)));

    // Transform and validate nodes
    const cyNodes = nodes.map((n) => ({
      group: 'nodes',
      data: {
        id: String(n.id),
        label: n.label || n.name || String(n.id),
        type: n.type || 'Person',
        risk_score: Number(n.risk_score || 0),
        influence_score: Number(n.influence_score || 0),
        community_id: String(n.community_id || 'C-1'),
        connections_count: Number(n.connections_count || 0),
        properties: n.properties || {},
      },
    }));

    // Transform and strictly validate edges (both source and target must exist)
    const cyEdges = [];
    const edgeKeyCount = {};

    edges.forEach((e) => {
      const src = String(e.source);
      const tgt = String(e.target);

      if (validNodeIds.has(src) && validNodeIds.has(tgt)) {
        const edgeType = e.type || e.label || 'ASSOCIATED_WITH';
        const pairKey = `${src}->${tgt}:${edgeType}`;
        edgeKeyCount[pairKey] = (edgeKeyCount[pairKey] || 0) + 1;
        const uniqueId = e.id && String(e.id).includes(':') ? String(e.id) : `${pairKey}:${edgeKeyCount[pairKey]}`;

        cyEdges.push({
          group: 'edges',
          data: {
            id: uniqueId,
            source: src,
            target: tgt,
            type: edgeType,
            label: e.label || edgeType,
            confidence: Number(e.confidence || 1.0),
            frequency: Number(e.frequency || 1),
            timestamp: e.timestamp,
            source_document: e.source_document,
            evidence: e.evidence || '',
            properties: e.properties || {},
          },
        });
      }
    });

    const elements = [...cyNodes, ...cyEdges];

    // Destroy prior instance if any
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      boxSelectionEnabled: false,
      autounselectify: false,
      wheelSensitivity: 0.25,
      style: [
        // BASE NODE STYLE
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'width': 'mapData(connections_count, 0, 15, 42, 68)',
            'height': 'mapData(connections_count, 0, 15, 42, 68)',
            'background-color': '#0d1527',
            'border-width': 2.5,
            'border-color': '#06b6d4',
            'color': '#f1f5f9',
            'font-size': '11px',
            'font-family': 'Inter, system-ui, sans-serif',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 7,
            'text-background-color': '#090d16',
            'text-background-opacity': 0.88,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'text-border-width': 1,
            'text-border-color': '#1e293b',
            'text-border-opacity': 0.8,
            'transition-property': 'background-color, border-color, border-width, opacity, text-margin-y',
            'transition-duration': '0.2s',
          },
        },

        // NODE TYPES
        {
          selector: 'node[type = "Person"]',
          style: {
            'background-color': '#082f49',
            'border-color': '#06b6d4',
          },
        },
        {
          selector: 'node[type = "PhoneNumber"]',
          style: {
            'background-color': '#451a03',
            'border-color': '#f59e0b',
            'shape': 'round-rectangle',
          },
        },
        {
          selector: 'node[type = "Vehicle"]',
          style: {
            'background-color': '#3b0764',
            'border-color': '#a855f7',
            'shape': 'diamond',
          },
        },
        {
          selector: 'node[type = "BankAccount"]',
          style: {
            'background-color': '#022c22',
            'border-color': '#10b981',
            'shape': 'hexagon',
          },
        },
        {
          selector: 'node[type = "Location"]',
          style: {
            'background-color': '#172554',
            'border-color': '#3b82f6',
            'shape': 'tag',
          },
        },
        {
          selector: 'node[type = "Organization"]',
          style: {
            'background-color': '#042f2e',
            'border-color': '#14b8a6',
            'shape': 'round-octagon',
          },
        },

        // HIGH RISK NODE GLOW
        {
          selector: 'node[risk_score >= 75]',
          style: {
            'border-color': '#ef4444',
            'border-width': 3.5,
            'border-opacity': 1,
            'shadow-blur': 18,
            'shadow-color': '#ef4444',
            'shadow-opacity': 0.8,
          },
        },
        {
          selector: 'node[risk_score >= 50][risk_score < 75]',
          style: {
            'border-color': '#f97316',
            'border-width': 3,
            'shadow-blur': 12,
            'shadow-color': '#f97316',
            'shadow-opacity': 0.6,
          },
        },

        // BASE EDGE STYLE (BEZIER + DIRECTIONAL ARROWS + LABELS + MULTI-EDGE SUPPORT)
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'control-point-step-size': 44,
            'width': 'mapData(frequency, 1, 10, 2.5, 6.5)',
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.25,
            'label': 'data(label)',
            'font-size': '10px',
            'font-family': 'Inter, system-ui, sans-serif',
            'font-weight': 500,
            'text-rotation': 'autorotate',
            'text-margin-y': -8,
            'color': '#cbd5e1',
            'text-background-color': '#090d16',
            'text-background-opacity': 0.85,
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
            'opacity': 0.8,
            'transition-property': 'line-color, target-arrow-color, width, opacity',
            'transition-duration': '0.2s',
          },
        },

        // EDGE TYPES COLORING
        {
          selector: 'edge[type = "CALLED"]',
          style: {
            'line-color': '#f59e0b',
            'target-arrow-color': '#f59e0b',
            'color': '#fbbf24',
          },
        },
        {
          selector: 'edge[type = "TRANSFERRED_MONEY"], edge[type = "TRANSACTED_WITH"]',
          style: {
            'line-color': '#10b981',
            'target-arrow-color': '#10b981',
            'color': '#34d399',
          },
        },
        {
          selector: 'edge[type = "VISITED"], edge[type = "LOCATED_AT"]',
          style: {
            'line-color': '#3b82f6',
            'target-arrow-color': '#3b82f6',
            'color': '#60a5fa',
          },
        },
        {
          selector: 'edge[type = "OWNS"]',
          style: {
            'line-color': '#a855f7',
            'target-arrow-color': '#a855f7',
            'color': '#c084fc',
          },
        },
        {
          selector: 'edge[type = "ASSOCIATED_WITH"], edge[type = "WORKS_FOR"]',
          style: {
            'line-color': '#06b6d4',
            'target-arrow-color': '#06b6d4',
            'color': '#22d3ee',
          },
        },

        // INTERACTIVITY: SELECTED STATE
        {
          selector: 'node:selected, node.selected',
          style: {
            'border-color': '#38bdf8',
            'border-width': 4.5,
            'background-color': '#0284c7',
            'shadow-blur': 25,
            'shadow-color': '#38bdf8',
            'shadow-opacity': 0.95,
          },
        },
        {
          selector: 'edge:selected, edge.selected',
          style: {
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'width': 5,
            'opacity': 1,
            'shadow-blur': 12,
            'shadow-color': '#38bdf8',
          },
        },

        // INTERACTIVITY: HOVERED
        {
          selector: 'node.hovered',
          style: {
            'border-color': '#38bdf8',
            'border-width': 4,
            'shadow-blur': 20,
            'shadow-color': '#38bdf8',
            'shadow-opacity': 0.9,
          },
        },
        {
          selector: 'edge.hovered',
          style: {
            'width': 4.5,
            'opacity': 1,
          },
        },

        // INTERACTIVITY: PATH HIGHLIGHT (NEON ROUTE)
        {
          selector: 'node.path-highlight',
          style: {
            'border-color': '#f43f5e',
            'border-width': 4,
            'background-color': '#881337',
            'shadow-blur': 25,
            'shadow-color': '#f43f5e',
            'shadow-opacity': 0.9,
          },
        },
        {
          selector: 'edge.path-highlight',
          style: {
            'line-color': '#f43f5e',
            'target-arrow-color': '#f43f5e',
            'width': 5.5,
            'opacity': 1,
            'shadow-blur': 15,
            'shadow-color': '#f43f5e',
          },
        },

        // DIMMED STATE (FOR UNRELATED NODES DURING HOVER / SELECTION)
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.14,
            'text-opacity': 0.15,
          },
        },
      ],
      layout: getLayoutConfig(currentLayout),
    });

    cyRef.current = cy;

    // Track zoom updates
    cy.on('zoom', () => {
      setZoomLevel(Math.round(cy.zoom() * 100));
    });

    // EVENT: Node Selection
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeData = node.data();

      // Highlight 1-hop connected neighborhood
      cy.elements().removeClass('dimmed hovered selected');
      node.addClass('selected');

      const neighborhood = node.neighborhood().add(node);
      cy.elements().not(neighborhood).addClass('dimmed');

      if (onNodeSelect) {
        onNodeSelect({
          id: nodeData.id,
          name: nodeData.label,
          label: nodeData.label,
          type: nodeData.type,
          risk_score: nodeData.risk_score,
          influence_score: nodeData.influence_score,
          community_id: nodeData.community_id,
          connections_count: nodeData.connections_count,
          properties: nodeData.properties,
        });
      }
    });

    // EVENT: Edge Selection
    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target;
      const edgeData = edge.data();

      cy.elements().removeClass('dimmed hovered selected');
      edge.addClass('selected');
      edge.connectedNodes().addClass('selected');
      cy.elements().not(edge.union(edge.connectedNodes())).addClass('dimmed');

      if (onEdgeSelect) {
        onEdgeSelect(edgeData);
      }
    });

    // EVENT: Background Canvas Click (Deselect / Reset)
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('dimmed hovered selected path-highlight');
        if (onNodeSelect) onNodeSelect(null);
        if (onEdgeSelect) onEdgeSelect(null);
      }
    });

    // EVENT: Node Hover
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      // Only apply hover dimming if nothing is currently selected
      if (cy.elements('.selected, .path-highlight').length === 0) {
        const neighborhood = node.neighborhood().add(node);
        node.addClass('hovered');
        neighborhood.edges().addClass('hovered');
        cy.elements().not(neighborhood).addClass('dimmed');
      }
    });

    cy.on('mouseout', 'node', (evt) => {
      const node = evt.target;
      if (cy.elements('.selected, .path-highlight').length === 0) {
        cy.elements().removeClass('dimmed hovered');
      }
    });

    // EVENT: Double Tap / Double Click on Node -> Expand
    let lastTapTime = 0;
    cy.on('tap', 'node', (evt) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapTime;
      if (tapLength < 300 && tapLength > 0) {
        const node = evt.target;
        if (onExpandNode) {
          onExpandNode(node.data());
        }
      }
      lastTapTime = currentTime;
    });

    return () => {
      cy.destroy();
    };
  }, [nodes, edges]);

  // Handle selectedNodeId change from props
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (selectedNodeId) {
      const node = cy.getElementById(String(selectedNodeId));
      if (node.length > 0) {
        cy.elements().removeClass('dimmed hovered selected');
        node.addClass('selected');
        const neighborhood = node.neighborhood().add(node);
        cy.elements().not(neighborhood).addClass('dimmed');
        cy.animate({
          center: { eles: node },
          zoom: 1.4,
          duration: 400,
        });
      }
    }
  }, [selectedNodeId]);

  // Helper for Layout Configurations
  function getLayoutConfig(layoutName) {
    switch (layoutName) {
      case 'cose':
        return {
          name: 'cose',
          animate: true,
          animationDuration: 500,
          nodeRepulsion: 8500,
          idealEdgeLength: 95,
          edgeElasticity: 100,
          nestingFactor: 1.2,
          gravity: 0.25,
          numIter: 1000,
          padding: 40,
        };
      case 'concentric':
        return {
          name: 'concentric',
          animate: true,
          padding: 40,
          concentric: (node) => node.data('risk_score') || 10,
          levelWidth: () => 20,
        };
      case 'breadthfirst':
        return {
          name: 'breadthfirst',
          directed: true,
          padding: 40,
          spacingFactor: 1.3,
          animate: true,
        };
      case 'circle':
        return {
          name: 'circle',
          padding: 40,
          animate: true,
        };
      default:
        return { name: 'cose', padding: 40 };
    }
  }

  // Imperative Action Methods Exposed to Parent (e.g. AI Copilot actions)
  useImperativeHandle(ref, () => ({
    focusNode: (nodeId) => {
      if (!cyRef.current) return;
      const cy = cyRef.current;
      const node = cy.getElementById(String(nodeId));
      if (node.length > 0) {
        cy.elements().removeClass('dimmed hovered selected');
        node.addClass('selected');
        const neighborhood = node.neighborhood().add(node);
        cy.elements().not(neighborhood).addClass('dimmed');
        cy.animate({
          center: { eles: node },
          zoom: 1.6,
          duration: 450,
        });
      }
    },
    highlightNodes: (nodeIds = []) => {
      if (!cyRef.current) return;
      const cy = cyRef.current;
      cy.elements().removeClass('dimmed hovered selected path-highlight');

      const targetEles = cy.collection();
      nodeIds.forEach((id) => {
        const ele = cy.getElementById(String(id));
        if (ele.length > 0) targetEles.merge(ele);
      });

      if (targetEles.length > 0) {
        const connectedEdges = targetEles.edgesWith(targetEles);
        targetEles.addClass('selected');
        connectedEdges.addClass('selected');
        cy.elements().not(targetEles.union(connectedEdges)).addClass('dimmed');
        cy.animate({
          fit: { eles: targetEles, padding: 60 },
          duration: 400,
        });
      }
    },
    tracePath: (pathNodeIds = []) => {
      if (!cyRef.current || pathNodeIds.length < 2) return;
      const cy = cyRef.current;
      cy.elements().removeClass('dimmed hovered selected path-highlight');

      const pathElements = cy.collection();
      for (let i = 0; i < pathNodeIds.length; i++) {
        const currentId = String(pathNodeIds[i]);
        const nodeEle = cy.getElementById(currentId);
        if (nodeEle.length > 0) pathElements.merge(nodeEle);

        if (i < pathNodeIds.length - 1) {
          const nextId = String(pathNodeIds[i + 1]);
          const nextEle = cy.getElementById(nextId);
          if (nodeEle.length > 0 && nextEle.length > 0) {
            const edgeEle = nodeEle.edgesWith(nextEle);
            if (edgeEle.length > 0) pathElements.merge(edgeEle);
          }
        }
      }

      if (pathElements.length > 0) {
        pathElements.addClass('path-highlight');
        cy.elements().not(pathElements).addClass('dimmed');
        cy.animate({
          fit: { eles: pathElements, padding: 70 },
          duration: 500,
        });
      }
    },
    filterCommunity: (communityId) => {
      if (!cyRef.current) return;
      const cy = cyRef.current;
      cy.elements().removeClass('dimmed hovered selected path-highlight');
      const commNodes = cy.nodes(`[community_id = "${communityId}"]`);
      if (commNodes.length > 0) {
        const commEdges = commNodes.edgesWith(commNodes);
        commNodes.addClass('selected');
        commEdges.addClass('selected');
        cy.elements().not(commNodes.union(commEdges)).addClass('dimmed');
        cy.animate({
          fit: { eles: commNodes, padding: 60 },
          duration: 400,
        });
      }
    },
    resetView: () => {
      if (!cyRef.current) return;
      const cy = cyRef.current;
      cy.elements().removeClass('dimmed hovered selected path-highlight');
      cy.animate({
        fit: { padding: 40 },
        duration: 400,
      });
    },
  }));

  // Handlers for Toolbar Controls
  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.animate({
        zoom: cyRef.current.zoom() * 1.3,
        duration: 200,
      });
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.animate({
        zoom: cyRef.current.zoom() * 0.7,
        duration: 200,
      });
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.elements().removeClass('dimmed hovered selected path-highlight');
      cyRef.current.animate({
        fit: { padding: 40 },
        duration: 350,
      });
    }
  };

  const handleLayoutChange = (newLayout) => {
    setCurrentLayout(newLayout);
    if (cyRef.current) {
      const layoutInstance = cyRef.current.layout(getLayoutConfig(newLayout));
      layoutInstance.run();
    }
  };

  const handleExportPNG = () => {
    if (!cyRef.current) return;
    const png64 = cyRef.current.png({ full: true, scale: 2, bg: '#030712' });
    const link = document.createElement('a');
    link.download = `criminal-network-graph-${Date.now()}.png`;
    link.href = png64;
    link.click();
  };

  return (
    <div className="relative w-full h-full bg-[#030712] overflow-hidden select-none">
      {/* CYTOSCAPE CANVAS DOM CONTAINER */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ width: '100%', height: '100%', position: 'relative' }}
      />

      {/* FLOATING TOP-LEFT INTEL TELEMETRY BADGE */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 shadow-xl text-xs font-mono">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-slate-400">NODES:</span>
        <span className="text-cyan-300 font-bold">{nodes.length}</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">RELATIONSHIPS:</span>
        <span className="text-emerald-400 font-bold">{edges.length}</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">ZOOM:</span>
        <span className="text-amber-300 font-bold">{zoomLevel}%</span>
      </div>

      {/* FLOATING TOP-RIGHT GRAPH CONTROL BAR */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
        {/* Layout Switcher */}
        <div className="relative flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <select
            value={currentLayout}
            onChange={(e) => handleLayoutChange(e.target.value)}
            aria-label="Graph Layout Algorithm"
            className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
          >
            <option value="cose" className="bg-slate-900 text-slate-200">Force Directed (CoSE)</option>
            <option value="concentric" className="bg-slate-900 text-slate-200">Concentric Threat Rings</option>
            <option value="breadthfirst" className="bg-slate-900 text-slate-200">Hierarchical Tree</option>
            <option value="circle" className="bg-slate-900 text-slate-200">Circular Ring</option>
          </select>
        </div>

        <div className="w-[1px] h-6 bg-slate-700 mx-0.5" />

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          aria-label="Zoom In"
          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-lg transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          aria-label="Zoom Out"
          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-lg transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Fit to Screen */}
        <button
          onClick={handleFit}
          title="Fit Viewport"
          aria-label="Fit Viewport"
          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-lg transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Reset Selection */}
        <button
          onClick={handleFit}
          title="Reset Highlights"
          aria-label="Reset Highlights"
          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-6 bg-slate-700 mx-0.5" />

        {/* Export PNG */}
        <button
          onClick={handleExportPNG}
          title="Export Canvas to PNG"
          aria-label="Export Canvas to PNG"
          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* FLOATING BOTTOM-LEFT LEGEND */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 shadow-2xl text-[11px] font-mono">
        <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
          <Eye className="w-3 h-3 text-cyan-400" />
          <span>Entity & Edge Legend</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-300">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Person</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded bg-amber-500" />
            <span>Phone No.</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>Bank Account</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rotate-45 bg-purple-500" />
            <span>Vehicle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-500" />
            <span>Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444]" />
            <span>High Risk (&ge;75%)</span>
          </div>
        </div>
      </div>
    </div>
  );
});

CytoscapeGraph.displayName = 'CytoscapeGraph';

export default CytoscapeGraph;
