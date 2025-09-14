<!--
  SignInStateMachineFlow - Sign-In State Machine using Svelte Flow
-->
<script>
  import { createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import { SvelteFlow, Controls, Background } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';

  export let currentSignInState = 'emailEntry';
  export let width = 600;
  export let height = 400;
  export let onStateClick = null;

  const dispatch = createEventDispatcher();

  // Static state definitions (no longer need signInMachine)
  const signInStateCategories = {
    input: { color: '#10b981', states: ['emailEntry', 'userChecked'] },
    auth: { color: '#f59e0b', states: ['passkeyPrompt', 'pinEntry'] },
    verification: { color: '#8b5cf6', states: ['emailVerification'] },
    registration: { color: '#9333ea', states: ['passkeyRegistration'] },
    success: { color: '#059669', states: ['signedIn'] },
    error: { color: '#dc2626', states: ['generalError'] }
  };

  const signInTransitions = [
    { source: 'emailEntry', target: 'userChecked', event: 'USER_CHECKED' },
    { source: 'emailEntry', target: 'generalError', event: 'ERROR' },
    { source: 'userChecked', target: 'passkeyPrompt', event: 'PASSKEY_AVAILABLE' },
    { source: 'userChecked', target: 'emailVerification', event: 'EMAIL_VERIFICATION_REQUIRED' },
    { source: 'userChecked', target: 'generalError', event: 'ERROR' },
    { source: 'passkeyPrompt', target: 'signedIn', event: 'PASSKEY_SUCCESS' },
    { source: 'passkeyPrompt', target: 'pinEntry', event: 'PIN_REQUESTED' },
    { source: 'passkeyPrompt', target: 'generalError', event: 'ERROR' },
    { source: 'pinEntry', target: 'signedIn', event: 'PIN_VERIFIED' },
    { source: 'pinEntry', target: 'generalError', event: 'ERROR' },
    { source: 'emailVerification', target: 'signedIn', event: 'EMAIL_VERIFIED' },
    { source: 'emailVerification', target: 'passkeyRegistration', event: 'REGISTER_PASSKEY' },
    { source: 'passkeyRegistration', target: 'signedIn', event: 'PASSKEY_REGISTERED' },
    { source: 'passkeyRegistration', target: 'generalError', event: 'ERROR' },
    { source: 'generalError', target: 'emailEntry', event: 'RESET' }
  ];

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
    const stateCategories = signInStateCategories;
    const transitions = signInTransitions;
    
    console.log('🎨 Creating flow data with currentSignInState:', currentSignInState);
    
    const flowNodes = Object.values(stateCategories)
      .flatMap(category => category.states)
      .map((stateName, index) => {
        const categoryInfo = getCategoryForState(stateName, stateCategories);
        const isCurrentState = stateName === currentSignInState;
        
        if (stateName === 'emailEntry') {
          console.log(`  Node ${stateName}: isCurrentState=${isCurrentState}, color=${isCurrentState ? categoryInfo.color : categoryInfo.color + '99'}`);
        }
        
        const col = index % 3;
        const row = Math.floor(index / 3);
        
        return {
          id: stateName,
          type: 'default',
          position: { 
            x: Math.max(0, col * 200 + 50), 
            y: Math.max(0, row * 120 + 50) 
          },
          data: { 
            label: formatStateName(stateName)
          },
          width: 120,
          height: 40,
          className: 'signin-node',
          style: {
            background: categoryInfo.color + '99', // Always use transparent version
            border: `2px solid ${categoryInfo.color}`,
            color: 'white',
            fontWeight: '500',
            fontSize: '13px',
            borderRadius: '6px',
            padding: '10px 14px',
            minWidth: '120px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }
        };
      });

    const flowEdges = transitions.map((transition, index) => ({
      id: `edge-${transition.source}-${transition.target}-${index}`,
      source: transition.source,
      target: transition.target,
      type: 'default',
      label: transition.event,
      style: { 
        stroke: '#10b981', 
        strokeWidth: 2 
      },
      markerEnd: {
        type: 'arrowclosed',
        color: '#10b981'
      },
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

  function handleNodeClick(event) {
    const nodeId = event.detail.node.id;
    console.log('Sign-in state clicked:', nodeId);
    if (onStateClick) {
      onStateClick(nodeId);
    }
    dispatch('stateClick', { state: nodeId });
  }

  // Create stores for v0.1.30 API
  const flowData = createFlowData();
  const nodes = writable(flowData.nodes);
  const edges = writable(flowData.edges);

  // Update nodes when currentSignInState changes
  $: {
    const updatedFlowData = createFlowData();
    nodes.set(updatedFlowData.nodes);
    edges.set(updatedFlowData.edges);
  }

  $: currentStateClass = `current-signin-state-${currentSignInState}`;
</script>

<div class="signin-machine-flow" style="width: {width}px; height: {height}px;">
  <div class="machine-header">
    <h4>Sign-In State Machine</h4>
    <span class="current-state">Current: {currentSignInState || 'emailEntry'}</span>
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

  /* Svelte Flow node styling */
  :global(.svelte-flow__node.signin-node) {
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    padding: 10px 14px;
    width: 120px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border: 2px solid transparent;
  }

  /* Dynamic state highlighting using CSS selectors */
  .current-signin-state-emailEntry :global(.svelte-flow__node[data-id="emailEntry"]),
  .current-signin-state-userChecked :global(.svelte-flow__node[data-id="userChecked"]),
  .current-signin-state-passkeyPrompt :global(.svelte-flow__node[data-id="passkeyPrompt"]),
  .current-signin-state-pinEntry :global(.svelte-flow__node[data-id="pinEntry"]),
  .current-signin-state-emailVerification :global(.svelte-flow__node[data-id="emailVerification"]),
  .current-signin-state-passkeyRegistration :global(.svelte-flow__node[data-id="passkeyRegistration"]),
  .current-signin-state-signedIn :global(.svelte-flow__node[data-id="signedIn"]),
  .current-signin-state-generalError :global(.svelte-flow__node[data-id="generalError"]) {
    border: 2px solid #f59e0b !important;
    font-weight: 600 !important;
    background: var(--signin-node-active-bg) !important;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15) !important;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { 
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15); 
    }
    50% { 
      box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.6), 0 4px 8px rgba(0, 0, 0, 0.15); 
    }
  }
</style>