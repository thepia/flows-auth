<!--
  SessionStateMachineFlow - Auth State visualization using Svelte Flow
-->
<script>
  import { writable } from 'svelte/store';
  import { SvelteFlow, Controls, Background } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { createEventDispatcher } from 'svelte';

  export let authState = 'unauthenticated';
  export let width = 600;
  export let height = 300;
  export let onStateClick = null;

  const dispatch = createEventDispatcher();

  const authStateCategories = {
    lifecycle: {
      color: '#3b82f6',
      states: ['unauthenticated', 'authenticated']
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

  // Simplified transitions without loading state
  const authStateTransitions = [
    // Direct authentication transitions
    { source: 'unauthenticated', target: 'authenticated', event: 'SIGN_IN_SUCCESS' },
    { source: 'unauthenticated', target: 'authenticated-unconfirmed', event: 'SIGN_IN_UNVERIFIED' },
    { source: 'unauthenticated', target: 'error', event: 'SIGN_IN_ERROR' },
    
    // From authenticated states  
    { source: 'authenticated', target: 'unauthenticated', event: 'SIGN_OUT' },
    { source: 'authenticated-confirmed', target: 'unauthenticated', event: 'SIGN_OUT' },
    { source: 'authenticated-unconfirmed', target: 'unauthenticated', event: 'SIGN_OUT' },
    { source: 'authenticated-unconfirmed', target: 'authenticated-confirmed', event: 'EMAIL_VERIFIED' },
    
    // Error recovery
    { source: 'error', target: 'unauthenticated', event: 'RESET' }
  ];

  function formatStateName(state) {
    return state
      .replace(/-/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  function getCategoryForState(stateName) {
    for (const [category, config] of Object.entries(authStateCategories)) {
      if (config.states.includes(stateName)) {
        return { category, ...config };
      }
    }
    return { category: 'unknown', color: '#64748b', states: [] };
  }

  function createStaticFlowData() {
    const flowNodes = Object.entries(authStateCategories)
      .flatMap(([categoryName, config]) => 
        config.states.map((state, index) => {
          const categoryIndex = Object.keys(authStateCategories).indexOf(categoryName);
          
          return {
            id: state,
            type: 'default',
            position: { 
              x: Math.max(0, (index * 160) + (categoryIndex * 40)), 
              y: Math.max(0, categoryIndex * 80 + 50)
            },
            data: { 
              label: formatStateName(state)
            },
            className: 'auth-node' // Static class for all nodes
          };
        })
      );

    const flowEdges = authStateTransitions.map((transition, index) => ({
      id: `edge-${transition.source}-${transition.target}-${index}`,
      source: transition.source,
      target: transition.target,
      type: 'default',
      label: transition.event,
      labelStyle: {
        fontSize: '10px',
        fill: '#374151',
        fontWeight: '500'
      },
      labelBgStyle: {
        fill: 'white',
        fillOpacity: 0.8
      }
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }

  // Create complete state machine data using bind pattern
  function createFlowData() {
    const flowNodes = Object.entries(authStateCategories)
      .flatMap(([categoryName, config]) => 
        config.states.map((state, index) => {
          const categoryIndex = Object.keys(authStateCategories).indexOf(categoryName);
          
          return {
            id: state,
            type: 'default',
            position: { 
              x: Math.max(0, (index * 160) + (categoryIndex * 40)), 
              y: Math.max(0, categoryIndex * 80 + 50)
            },
            data: { 
              label: formatStateName(state)
            },
            className: 'auth-node'
          };
        })
      );

    const flowEdges = authStateTransitions.map((transition, index) => ({
      id: `edge-${transition.source}-${transition.target}-${index}`,
      source: transition.source,
      target: transition.target,
      type: 'default',
      label: transition.event,
      labelStyle: {
        fontSize: '10px',
        fill: '#374151',
        fontWeight: '500'
      },
      labelBgStyle: {
        fill: 'white',
        fillOpacity: 0.8
      }
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }

  // Create stores for v0.1.30 API
  const flowData = createFlowData();
  const nodes = writable(flowData.nodes);
  const edges = writable(flowData.edges);

  // Update nodes when authState changes
  $: {
    const updatedFlowData = createFlowData();
    nodes.set(updatedFlowData.nodes);
    edges.set(updatedFlowData.edges);
  }

  function handleNodeClick(event) {
    const nodeId = event.detail.node.id;
    console.log('Auth state clicked:', nodeId);
    if (onStateClick) {
      onStateClick(nodeId);
    }
    dispatch('stateClick', { state: nodeId });
  }

  $: currentStateClass = `current-state-${authState}`;
</script>

<div class="auth-state-flow" style="width: {width}px; height: {height}px;">
  <div class="header">
    <h3>Authentication State</h3>
    <div class="current-state">
      Current: <span class="state-value">{authState}</span>
    </div>
  </div>

  <div class="flow-container {currentStateClass}" style="height: {height - 60}px;">
    <SvelteFlow 
      {nodes}
      {edges}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
      fitView={true}
      on:nodeclick={handleNodeClick}
    >
      <Controls />
      <Background variant="dots" gap={20} size={1} />
    </SvelteFlow>
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
    overflow: hidden;
  }

  .header {
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
    background: #ffffff;
    border-radius: 8px 8px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 60px;
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

  .flow-container {
    width: 100%;
    position: relative;
  }

  .legend {
    position: absolute;
    bottom: 10px;
    left: 10px;
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #6b7280;
    background: white;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

  /* Svelte Flow node styling */
  :global(.svelte-flow__node.auth-node) {
    font-size: 12px;
    font-weight: 500;
    border-radius: 6px;
    padding: 8px;
    width: 120px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border: 2px solid transparent;
  }

  /* Dynamic state highlighting using CSS selectors */
  .current-state-unauthenticated :global(.svelte-flow__node[data-id="unauthenticated"]),
  .current-state-loading :global(.svelte-flow__node[data-id="loading"]),  
  .current-state-authenticated :global(.svelte-flow__node[data-id="authenticated"]),
  .current-state-authenticated-unconfirmed :global(.svelte-flow__node[data-id="authenticated-unconfirmed"]),
  .current-state-authenticated-confirmed :global(.svelte-flow__node[data-id="authenticated-confirmed"]),
  .current-state-error :global(.svelte-flow__node[data-id="error"]) {
    border: 2px solid #fbbf24 !important;
    font-weight: 600;
    box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15);
    animation: pulse 2s infinite;
  }

  :global(.svelte-flow__edge path) {
    stroke: #94a3b8;
    stroke-width: 2;
  }

  :global(.svelte-flow__edge .svelte-flow__edge-path) {
    stroke: #94a3b8;
    stroke-width: 2;
  }

  :global(.svelte-flow__arrowhead) {
    fill: #94a3b8;
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