<!--
  SessionStateMachineFlow - Auth State visualization using Svelte Flow
-->
<script>
  import { createEventDispatcher } from 'svelte';
  import { SvelteFlow, Controls, Background } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';

  export let authState = 'unauthenticated';
  export let width = 600;
  export let height = 300;
  export let onStateClick = null;

  const dispatch = createEventDispatcher();

  let nodes = [];
  let edges = [];

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

  const authStateEdges = [
    { source: 'unauthenticated', target: 'loading' },
    { source: 'loading', target: 'authenticated' },
    { source: 'loading', target: 'error' },
    { source: 'loading', target: 'unauthenticated' },
    { source: 'loading', target: 'authenticated-unconfirmed' },
    { source: 'authenticated-unconfirmed', target: 'authenticated-confirmed' },
    { source: 'authenticated-unconfirmed', target: 'authenticated' },
    { source: 'error', target: 'loading' },
    { source: 'error', target: 'unauthenticated' },
    { source: 'authenticated', target: 'unauthenticated' },
    { source: 'authenticated-confirmed', target: 'unauthenticated' },
    { source: 'authenticated-unconfirmed', target: 'unauthenticated' }
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

  function createFlowData() {
    const flowNodes = Object.entries(authStateCategories)
      .flatMap(([categoryName, config]) => 
        config.states.map((state, index) => {
          const isCurrentState = authState === state;
          const categoryIndex = Object.keys(authStateCategories).indexOf(categoryName);
          
          return {
            id: state,
            position: { 
              x: (index * 180) + (categoryIndex * 50), 
              y: categoryIndex * 100 + 50 
            },
            data: { 
              label: formatStateName(state)
            },
            style: {
              background: config.color,
              border: `3px solid ${isCurrentState ? '#fbbf24' : 'transparent'}`,
              color: 'white',
              fontWeight: isCurrentState ? '600' : '500',
              fontSize: '12px',
              borderRadius: '8px',
              padding: '8px 12px',
              minWidth: '140px',
              textAlign: 'center',
              boxShadow: isCurrentState ? '0 0 0 2px rgba(251, 191, 36, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
              ...(isCurrentState && { animation: 'pulse 2s infinite' })
            }
          };
        })
      );

    const flowEdges = authStateEdges.map((edge, index) => ({
      id: `edge-${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      style: { 
        stroke: '#94a3b8', 
        strokeWidth: 2 
      },
      markerEnd: {
        type: 'arrowclosed',
        color: '#94a3b8'
      }
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }

  function handleNodeClick(event) {
    const nodeId = event.detail.node.id;
    console.log('Auth state clicked:', nodeId);
    if (onStateClick) {
      onStateClick(nodeId);
    }
    dispatch('stateClick', { state: nodeId });
  }

  $: {
    const flowData = createFlowData();
    nodes = flowData.nodes;
    edges = flowData.edges;
  }
</script>

<div class="auth-state-flow" style="width: {width}px; height: {height}px;">
  <div class="header">
    <h3>Authentication State</h3>
    <div class="current-state">
      Current: <span class="state-value">{authState}</span>
    </div>
  </div>

  <div class="flow-container" style="height: {height - 60}px;">
    <SvelteFlow 
      {nodes} 
      {edges}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
      fitView={true}
      fitViewOptions={{ padding: 20 }}
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

  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    50% {
      box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.6), 0 4px 8px rgba(0, 0, 0, 0.15);
    }
  }
</style>