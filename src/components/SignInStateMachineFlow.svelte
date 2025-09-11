<!--
  SignInStateMachineFlow - Sign-In State Machine using Svelte Flow
-->
<script>
  import { createEventDispatcher } from 'svelte';
  import { SvelteFlow, Controls, Background } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';

  export let currentSignInState = 'emailEntry';
  export let signInMachine = null;
  export let width = 600;
  export let height = 400;
  export let onStateClick = null;

  const dispatch = createEventDispatcher();

  let nodes = [];
  let edges = [];

  function getSignInTransitions() {
    if (!signInMachine?.getStateTransitions) {
      throw new Error('❌ CRITICAL: signInMachine.getStateTransitions method missing');
    }
    return signInMachine.getStateTransitions();
  }

  function getSignInStateCategories() {
    if (!signInMachine?.getStateCategories) {
      throw new Error('❌ CRITICAL: signInMachine.getStateCategories method missing');
    }
    return signInMachine.getStateCategories();
  }

  function formatStateName(stateName) {
    return stateName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  function getCategoryForState(stateName, stateCategories) {
    for (const [category, config] of Object.entries(stateCategories)) {
      if (config.states.includes(stateName)) {
        return { category, ...config };
      }
    }
    return { category: 'unknown', color: '#64748b', states: [] };
  }

  function createFlowData() {
    if (!signInMachine) return { nodes: [], edges: [] };

    const stateCategories = getSignInStateCategories();
    const transitions = getSignInTransitions();
    
    const flowNodes = Object.values(stateCategories)
      .flatMap(category => category.states)
      .map((stateName, index) => {
        const categoryInfo = getCategoryForState(stateName, stateCategories);
        const isCurrentState = stateName === currentSignInState;
        
        const col = index % 3;
        const row = Math.floor(index / 3);
        
        return {
          id: stateName,
          position: { 
            x: col * 200 + 50, 
            y: row * 120 + 50 
          },
          data: { 
            label: formatStateName(stateName)
          },
          style: {
            background: isCurrentState ? categoryInfo.color : categoryInfo.color + '99',
            border: `2px solid ${isCurrentState ? '#f59e0b' : categoryInfo.color}`,
            color: 'white',
            fontWeight: isCurrentState ? '600' : '500',
            fontSize: '13px',
            borderRadius: '6px',
            padding: '10px 14px',
            minWidth: '120px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            ...(isCurrentState && { animation: 'pulse 2s infinite' })
          }
        };
      });

    const flowEdges = transitions.map((transition, index) => ({
      id: `edge-${transition.source}-${transition.target}-${index}`,
      source: transition.source,
      target: transition.target,
      style: { 
        stroke: '#10b981', 
        strokeWidth: 2 
      },
      markerEnd: {
        type: 'arrowclosed',
        color: '#10b981'
      }
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }

  function handleNodeClick(event) {
    const nodeId = event.detail.node.id;
    console.log('Sign-in state clicked:', nodeId);
    if (onStateClick) {
      onStateClick(nodeId);
    }
    dispatch('stateClick', { state: nodeId });
  }

  $: {
    if (signInMachine) {
      const flowData = createFlowData();
      nodes = flowData.nodes;
      edges = flowData.edges;
    }
  }
</script>

<div class="signin-machine-flow" style="width: {width}px; height: {height}px;">
  <div class="machine-header">
    <h4>Sign-In State Machine</h4>
    <span class="current-state">Current: {currentSignInState || 'emailEntry'}</span>
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
</div>

<style>
  .signin-machine-flow {
    border: 1px solid #10b981;
    border-radius: 8px;
    overflow: hidden;
    background: #fafafa;
    position: relative;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .machine-header {
    background: linear-gradient(135deg, #d1fae5, #a7f3d0);
    padding: 12px 16px;
    border-bottom: 1px solid #10b981;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 60px;
  }

  .machine-header h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #065f46;
  }

  .machine-header .current-state {
    font-size: 12px;
    color: #065f46;
    background: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: monospace;
    border: 1px solid #10b981;
  }

  .flow-container {
    width: 100%;
    position: relative;
  }

  @keyframes pulse {
    0%, 100% { 
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2); 
    }
    50% { 
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4); 
    }
  }
</style>