<!--
  SessionStateMachineFlow - AuthState visualization with Dagre layout
  
  Now reflects the actual store.state: AuthState instead of the removed SessionStateMachine
  
  Props:
  - authState: Current AuthState from the store
  - compact: Boolean for layout density
  - width: Container width
  - height: Container height
  - direction: 'TB' (top-bottom) or 'LR' (left-right)
  - enableZoom: Boolean for zoom controls
  - responsive: Boolean for responsive sizing
  - onStateClick: Callback when a state is clicked
-->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import dagre from '@dagrejs/dagre';

  // Props - now works with AuthState instead of SessionStateMachine
  export let authState = 'unauthenticated'; // AuthState from store
  export let compact = false;
  export let width = 600;
  export let height = 300;
  export let direction = 'TB';
  export let enableZoom = true;
  export let responsive = false;
  export let onStateClick = null;

  const dispatch = createEventDispatcher();

  // Zoom and pan state
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let containerEl = null;
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  // AuthState categories - simplified and focused
  const authStateCategories = {
    lifecycle: {
      color: '#3b82f6',
      states: ['unauthenticated', 'loading', 'authenticated']
    },
    verification: {
      color: '#8b5cf6', 
      states: ['authenticated-unconfirmed', 'authenticated-confirmed']
    },
    errors: {
      color: '#ef4444',
      states: ['error']
    }
  };

  // Simplified state transitions for AuthState
  const authStateEdges = [
    // Basic flow
    { source: 'unauthenticated', target: 'loading' },
    { source: 'loading', target: 'authenticated' },
    { source: 'loading', target: 'error' },
    { source: 'loading', target: 'unauthenticated' },
    
    // Email verification flow
    { source: 'loading', target: 'authenticated-unconfirmed' },
    { source: 'authenticated-unconfirmed', target: 'authenticated-confirmed' },
    { source: 'authenticated-unconfirmed', target: 'authenticated' }, // fallback
    
    // Error recovery
    { source: 'error', target: 'loading' },
    { source: 'error', target: 'unauthenticated' },
    
    // Logout flows
    { source: 'authenticated', target: 'unauthenticated' },
    { source: 'authenticated-confirmed', target: 'unauthenticated' },
    { source: 'authenticated-unconfirmed', target: 'unauthenticated' }
  ];

  let nodes = [];
  let edges = authStateEdges;

  function formatStateName(state) {
    return state
      .replace(/-/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  function createAuthStateNodes() {
    const flowNodes = [];

    Object.entries(authStateCategories).forEach(([categoryName, config]) => {
      config.states.forEach((state, index) => {
        const isCurrentState = authState === state;
        
        flowNodes.push({
          id: state,
          label: formatStateName(state),
          category: categoryName,
          color: config.color,
          isCurrentState,
          x: 0, // Will be positioned by Dagre
          y: 0  // Will be positioned by Dagre
        });
      });
    });

    return flowNodes;
  }

  function layoutNodes() {
    if (!nodes.length) return;

    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: direction,
      nodesep: compact ? 40 : 60,
      ranksep: compact ? 50 : 80,
      marginx: 20,
      marginy: 20
    });

    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes to graph
    nodes.forEach(node => {
      const nodeWidth = compact ? 100 : 140;
      const nodeHeight = compact ? 30 : 40;
      
      g.setNode(node.id, {
        width: nodeWidth,
        height: nodeHeight,
        label: node.label
      });
    });

    // Add edges to graph
    edges.forEach(edge => {
      if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
        g.setEdge(edge.source, edge.target);
      }
    });

    // Layout the graph
    dagre.layout(g);

    // Update node positions
    nodes = nodes.map(node => {
      const graphNode = g.node(node.id);
      if (graphNode) {
        return {
          ...node,
          x: graphNode.x,
          y: graphNode.y
        };
      }
      return node;
    });
  }

  // Update nodes when authState changes
  $: {
    authState; direction; compact;
    nodes = createAuthStateNodes();
    layoutNodes();
  }

  // Zoom and pan handlers
  function handleMouseDown(event) {
    if (!enableZoom) return;
    
    isPanning = true;
    startX = event.clientX - translateX;
    startY = event.clientY - translateY;
    containerEl.style.cursor = 'grabbing';
  }

  function handleMouseMove(event) {
    if (!isPanning || !enableZoom) return;
    
    translateX = event.clientX - startX;
    translateY = event.clientY - startY;
  }

  function handleMouseUp() {
    if (!enableZoom) return;
    
    isPanning = false;
    if (containerEl) {
      containerEl.style.cursor = enableZoom ? 'grab' : 'default';
    }
  }

  function handleWheel(event) {
    if (!enableZoom) return;
    
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    scale = Math.max(0.1, Math.min(3, scale + delta));
  }

  function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
  }

  function handleStateClick(state) {
    if (onStateClick) {
      onStateClick(state);
    }
    dispatch('stateClick', { state });
  }

  onMount(() => {
    if (containerEl && enableZoom) {
      containerEl.style.cursor = 'grab';
    }
    layoutNodes();
  });
</script>

<div class="auth-state-flow" bind:this={containerEl} style="width: {width}px; height: {height}px;">
  
  <div class="header">
    <h3>Authentication State</h3>
    <div class="current-state">
      Current: <span class="state-value">{authState}</span>
    </div>
  </div>

  {#if enableZoom}
    <div class="zoom-controls">
      <button on:click={() => scale = Math.min(3, scale + 0.2)}>+</button>
      <button on:click={() => scale = Math.max(0.1, scale - 0.2)}>−</button>
      <button on:click={resetZoom}>Reset</button>
    </div>
  {/if}

  <div class="flow-container"
    style="transform: translate({translateX}px, {translateY}px) scale({scale}); transform-origin: 0 0;"
    on:mousedown={handleMouseDown}
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseUp}
    on:wheel={handleWheel}
    role="application"
    aria-label="Authentication state diagram">

    <!-- Render edges -->
    <svg class="edges-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
      {#each edges as edge}
        {@const sourceNode = nodes.find(n => n.id === edge.source)}
        {@const targetNode = nodes.find(n => n.id === edge.target)}
        {#if sourceNode && targetNode}
          <line
            x1={sourceNode.x}
            y1={sourceNode.y}
            x2={targetNode.x}
            y2={targetNode.y}
            stroke="#94a3b8"
            stroke-width="2"
            marker-end="url(#arrowhead)"
          />
        {/if}
      {/each}
      
      <!-- Define arrowhead marker -->
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" 
         refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
        </marker>
      </defs>
    </svg>

    <!-- Render nodes -->
    {#each nodes as node}
      <div 
        class="flow-node"
        class:current-state={node.isCurrentState}
        class:lifecycle={node.category === 'lifecycle'}
        class:verification={node.category === 'verification'}
        class:errors={node.category === 'errors'}
        style="position: absolute; 
               left: {node.x - (compact ? 50 : 70)}px; 
               top: {node.y - (compact ? 15 : 20)}px;
               background-color: {node.color};
               width: {compact ? 100 : 140}px;
               height: {compact ? 30 : 40}px;"
        on:click={() => handleStateClick(node.id)}
        on:keydown={(e) => e.key === 'Enter' && handleStateClick(node.id)}
        role="button"
        tabindex="0"
        title="AuthState: {node.id}">
        <span class="node-label">{node.label}</span>
      </div>
    {/each}
  </div>

  <div class="legend">
    <div class="legend-item">
      <div class="legend-color lifecycle"></div>
      <span>Core States</span>
    </div>
    <div class="legend-item">
      <div class="legend-color verification"></div>
      <span>Email Verification</span>
    </div>
    <div class="legend-item">
      <div class="legend-color errors"></div>
      <span>Error States</span>
    </div>
  </div>
</div>

<style>
  .auth-state-flow {
    position: relative;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background-color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
    background: #ffffff;
    border-radius: 8px 8px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
  }

  .current-state {
    font-size: 14px;
    color: #6b7280;
  }

  .state-value {
    font-weight: 600;
    color: #3b82f6;
    padding: 2px 8px;
    background: #dbeafe;
    border-radius: 12px;
    font-size: 12px;
  }

  .zoom-controls {
    position: absolute;
    top: 60px;
    right: 10px;
    display: flex;
    gap: 4px;
    z-index: 10;
  }

  .zoom-controls button {
    padding: 4px 8px;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    width: 28px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .zoom-controls button:hover {
    background: #f3f4f6;
  }

  .flow-container {
    width: 100%;
    height: calc(100% - 120px);
    position: relative;
    cursor: grab;
    margin-top: 10px;
  }

  .flow-container:active {
    cursor: grabbing;
  }

  .flow-node {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: white;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border: 2px solid transparent;
  }

  .flow-node:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .flow-node.current-state {
    border: 3px solid #fbbf24;
    box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15);
    animation: pulse 2s infinite;
    transform: scale(1.1);
  }

  .node-label {
    text-align: center;
    line-height: 1.2;
    padding: 4px 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .edges-svg {
    z-index: 1;
  }

  .legend {
    position: absolute;
    bottom: 10px;
    left: 10px;
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #6b7280;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }

  .legend-color.lifecycle {
    background-color: #3b82f6;
  }

  .legend-color.verification {
    background-color: #8b5cf6;
  }

  .legend-color.errors {
    background-color: #ef4444;
  }

  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    50% {
      box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.6), 0 4px 8px rgba(0, 0, 0, 0.15);
    }
  }
</style>