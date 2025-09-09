<!--
  StateMachineFlow - Legacy State Machine visualization with Dagre layout
  
  Props:
  - currentState: Current state for legacy mode
  - context: State machine context (legacy)
  - onStateClick: Callback when a state is clicked
  - compact: Boolean for layout density
  - width: Container width
  - height: Container height
-->
<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import dagre from '@dagrejs/dagre';

  // Props - Only supporting legacy mode now
  export let currentState = 'checkingSession';
  export let context = null;
  export let onStateClick = null;
  export let compact = false;
  export let width = 800;
  export let height = 600;
  export let direction = 'TB'; // 'TB' (top-bottom) or 'LR' (left-right)
  export let enableZoom = true;
  export let responsive = false;

  const dispatch = createEventDispatcher();

  // Zoom and pan state
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let containerEl = null;
  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let actualWidth = width;
  let actualHeight = height;

  // Legacy state machine definition (AuthMachineState)
  const legacyStateCategories = {
    session: {
      color: '#3b82f6',
      states: ['checkingSession', 'sessionValid', 'sessionInvalid']
    },
    auth: {
      color: '#10b981',
      states: ['combinedAuth', 'conditionalMediation', 'autofillPasskeys', 'waitForExplicit', 'explicitAuth']
    },
    lookup: {
      color: '#f59e0b',
      states: ['auth0UserLookup']
    },
    webauthn: {
      color: '#8b5cf6',
      states: ['directWebAuthnAuth', 'biometricPrompt', 'auth0WebAuthnVerify']
    },
    registration: {
      color: '#06b6d4',
      states: ['passkeyRegistration', 'newUserRegistration', 'webauthnRegister']
    },
    authenticated: {
      color: '#84cc16',
      states: ['authenticatedUnconfirmed', 'authenticatedConfirmed']
    },
    errors: {
      color: '#ef4444',
      states: ['passkeyError', 'errorHandling', 'credentialNotFound', 'userCancellation', 'credentialMismatch']
    },
    completion: {
      color: '#6366f1',
      states: ['auth0TokenExchange', 'sessionCreated', 'loadingApp', 'appLoaded']
    },
    emailCode: {
      color: '#ec4899',
      states: ['emailCodeInput']
    }
  };

  // Edges for legacy state machine
  const legacyEdges = [
    // Session flow
    { source: 'checkingSession', target: 'sessionValid' },
    { source: 'checkingSession', target: 'sessionInvalid' },
    { source: 'sessionValid', target: 'loadingApp' },
    { source: 'sessionInvalid', target: 'combinedAuth' },
    
    // Auth flow
    { source: 'combinedAuth', target: 'conditionalMediation' },
    { source: 'combinedAuth', target: 'auth0UserLookup' },
    { source: 'conditionalMediation', target: 'autofillPasskeys' },
    { source: 'conditionalMediation', target: 'waitForExplicit' },
    { source: 'autofillPasskeys', target: 'directWebAuthnAuth' },
    { source: 'waitForExplicit', target: 'explicitAuth' },
    { source: 'explicitAuth', target: 'directWebAuthnAuth' },
    { source: 'explicitAuth', target: 'emailCodeInput' },
    
    // WebAuthn flow
    { source: 'directWebAuthnAuth', target: 'biometricPrompt' },
    { source: 'biometricPrompt', target: 'auth0WebAuthnVerify' },
    { source: 'biometricPrompt', target: 'passkeyError' },
    
    // Registration flow
    { source: 'auth0UserLookup', target: 'newUserRegistration' },
    { source: 'newUserRegistration', target: 'webauthnRegister' },
    { source: 'webauthnRegister', target: 'passkeyRegistration' },
    
    // Success flows
    { source: 'auth0WebAuthnVerify', target: 'auth0TokenExchange' },
    { source: 'passkeyRegistration', target: 'auth0TokenExchange' },
    { source: 'emailCodeInput', target: 'auth0TokenExchange' },
    { source: 'auth0TokenExchange', target: 'sessionCreated' },
    { source: 'sessionCreated', target: 'loadingApp' },
    { source: 'loadingApp', target: 'appLoaded' },
    { source: 'loadingApp', target: 'authenticatedUnconfirmed' },
    { source: 'authenticatedUnconfirmed', target: 'authenticatedConfirmed' },
    
    // Error flows
    { source: 'directWebAuthnAuth', target: 'credentialNotFound' },
    { source: 'biometricPrompt', target: 'userCancellation' },
    { source: 'auth0WebAuthnVerify', target: 'credentialMismatch' },
    { source: 'passkeyError', target: 'errorHandling' },
    { source: 'credentialNotFound', target: 'errorHandling' },
    { source: 'userCancellation', target: 'errorHandling' },
    { source: 'credentialMismatch', target: 'errorHandling' }
  ];

  let nodes = [];
  let edges = legacyEdges;

  function formatStateName(state) {
    return state
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  function createFlowNodes() {
    const flowNodes = [];

    // Legacy mode - create nodes for all states
    Object.entries(legacyStateCategories).forEach(([categoryName, config]) => {
      config.states.forEach((state) => {
        const isCurrentState = currentState === state;
        
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
      nodesep: compact ? 30 : 50,
      ranksep: compact ? 40 : 80,
      marginx: 20,
      marginy: 20
    });

    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes to graph
    nodes.forEach(node => {
      const nodeWidth = compact ? 80 : 120;
      const nodeHeight = compact ? 25 : 35;
      
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

  // Update nodes when state changes
  $: {
    currentState; direction; compact;
    nodes = createFlowNodes();
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

  onDestroy(() => {
    // Cleanup any listeners if needed
  });
</script>

<div class="state-machine-flow" bind:this={containerEl} style="width: {actualWidth}px; height: {actualHeight}px;">
  
  {#if enableZoom}
    <div class="zoom-controls">
      <button on:click={() => scale = Math.min(3, scale + 0.2)}>+</button>
      <button on:click={() => scale = Math.max(0.1, scale - 0.2)}>-</button>
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
    aria-label="State machine diagram">

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
            stroke-width="1"
            marker-end="url(#arrowhead)"
          />
        {/if}
      {/each}
      
      <!-- Define arrowhead marker -->
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" 
         refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
        </marker>
      </defs>
    </svg>

    <!-- Render nodes -->
    {#each nodes as node}
      <div 
        class="flow-node"
        class:current-state={node.isCurrentState}
        style="position: absolute; 
               left: {node.x - (compact ? 40 : 60)}px; 
               top: {node.y - (compact ? 12.5 : 17.5)}px;
               background-color: {node.color};
               width: {compact ? 80 : 120}px;
               height: {compact ? 25 : 35}px;"
        on:click={() => handleStateClick(node.id)}
        on:keydown={(e) => e.key === 'Enter' && handleStateClick(node.id)}
        role="button"
        tabindex="0"
        title="State: {node.id}">
        <span class="node-label">{node.label}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .state-machine-flow {
    position: relative;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background-color: #f8fafc;
  }

  .zoom-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 5px;
    z-index: 10;
  }

  .zoom-controls button {
    padding: 5px 10px;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .zoom-controls button:hover {
    background: #f3f4f6;
  }

  .flow-container {
    width: 100%;
    height: 100%;
    position: relative;
    cursor: grab;
  }

  .flow-container:active {
    cursor: grabbing;
  }

  .flow-node {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    color: white;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .flow-node:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .flow-node.current-state {
    border: 3px solid #fbbf24;
    box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15);
    animation: pulse 2s infinite;
  }

  .node-label {
    text-align: center;
    line-height: 1.2;
    padding: 2px 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .edges-svg {
    z-index: 1;
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