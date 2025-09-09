<!--
  SignInStateMachineFlow - Sign-In State Machine visualization with Dagre layout
  
  Props:
  - currentSignInState: Current SignInState for highlighting
  - signInMachine: Sign-in state machine instance for dynamic extraction
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

  // Props
  export let currentSignInState = 'emailEntry'; // Current SignInState
  export let signInMachine = null;
  export let compact = false;
  export let width = 600;
  export let height = 400;
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

  let nodes = [];
  let transitions = [];
  let stateCategories = {};

  // Get dynamic transitions or fallback to static
  function getSignInTransitions() {
    console.log('🔍 SignInStateMachineFlow getting transitions');
    console.log('🔧 signInMachine exists:', !!signInMachine);
    console.log('🔧 getStateTransitions method exists:', typeof signInMachine?.getStateTransitions);
    
    if (!signInMachine) {
      throw new Error('❌ CRITICAL: signInMachine instance is required - no fallback allowed!');
    }
    
    if (!signInMachine.getStateTransitions) {
      throw new Error('❌ CRITICAL: signInMachine.getStateTransitions method missing - no fallback allowed!');
    }
    
    console.log('✅ Using DYNAMIC sign-in transitions - SINGLE SOURCE OF TRUTH!');
    const dynamicTransitions = signInMachine.getStateTransitions();
    console.log('🔄 Dynamic sign-in transitions:', dynamicTransitions);
    return dynamicTransitions;
  }

  // Get dynamic state categories or fallback to static  
  function getSignInStateCategories() {
    if (!signInMachine) {
      throw new Error('❌ CRITICAL: signInMachine instance is required - no fallback allowed!');
    }
    
    if (!signInMachine.getStateCategories) {
      throw new Error('❌ CRITICAL: signInMachine.getStateCategories method missing - no fallback allowed!');
    }
    
    console.log('✅ Using DYNAMIC sign-in state categories - SINGLE SOURCE OF TRUTH!');
    return signInMachine.getStateCategories();
  }

  // Format state name for display
  function formatStateName(stateName) {
    return stateName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  // Get category for state
  function getCategoryForState(stateName) {
    for (const [category, config] of Object.entries(stateCategories)) {
      if (config.states.includes(stateName)) {
        return { category, ...config };
      }
    }
    return { category: 'unknown', color: '#64748b', states: [] };
  }

  // Dagre layout function
  function getLayoutedElements(nodes, edges, layoutDirection = 'TB') {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ 
      rankdir: layoutDirection || direction,
      nodesep: compact ? 40 : 60,
      ranksep: compact ? 30 : 50,
      marginx: 20,
      marginy: 20
    });

    nodes.forEach((node) => {
      g.setNode(node.id, { 
        width: compact ? 85 : 110, 
        height: compact ? 28 : 36 
      });
    });

    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = g.node(node.id);
      return {
        ...node,
        x: nodeWithPosition.x - (compact ? 42.5 : 55),
        y: nodeWithPosition.y - (compact ? 14 : 18)
      };
    });

    return { nodes: layoutedNodes, edges };
  }

  // Create flow nodes
  function createFlowNodes() {
    const currentState = currentSignInState || 'emailEntry';
    
    // Get all unique states from categories
    const allStates = Object.values(stateCategories)
      .flatMap(category => category.states);

    return allStates.map(stateName => {
      const categoryInfo = getCategoryForState(stateName);
      return {
        id: stateName,
        label: formatStateName(stateName),
        category: categoryInfo.category,
        color: categoryInfo.color,
        isCurrentState: stateName === currentState
      };
    });
  }

  // Zoom controls
  function zoomIn() {
    scale = Math.min(scale * 1.2, 3);
  }

  function zoomOut() {
    scale = Math.max(scale / 1.2, 0.1);
  }

  function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
  }

  function fitToView() {
    if (nodes.length === 0) return;
    
    const bounds = nodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.x),
        maxX: Math.max(acc.maxX, node.x + (compact ? 85 : 110)),
        minY: Math.min(acc.minY, node.y),
        maxY: Math.max(acc.maxY, node.y + (compact ? 28 : 36))
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const containerWidth = containerEl?.clientWidth || width;
    const containerHeight = containerEl?.clientHeight || height;

    const scaleX = (containerWidth - 40) / contentWidth;
    const scaleY = (containerHeight - 40) / contentHeight;
    scale = Math.min(scaleX, scaleY, 1);

    translateX = (containerWidth - contentWidth * scale) / 2 - bounds.minX * scale;
    translateY = (containerHeight - contentHeight * scale) / 2 - bounds.minY * scale;
  }

  // Mouse event handlers for panning
  function handleMouseDown(e) {
    if (e.target.classList.contains('flow-node')) return;
    isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    e.preventDefault();
  }

  function handleMouseMove(e) {
    if (!isPanning) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    e.preventDefault();
  }

  function handleMouseUp() {
    isPanning = false;
  }

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.1), 3);
    
    if (newScale !== scale) {
      const rect = containerEl.getBoundingClientRect();
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;
      
      translateX = centerX - (centerX - translateX) * (newScale / scale);
      translateY = centerY - (centerY - translateY) * (newScale / scale);
      scale = newScale;
    }
  }

  // Handle node clicks
  function handleNodeClick(nodeId) {
    console.log('Sign-in state clicked:', nodeId);
    if (onStateClick) {
      onStateClick(nodeId);
    }
    dispatch('stateClick', { state: nodeId });
  }

  // Reactive statements
  $: {
    // Trigger re-layout when key props change
    direction; compact; currentSignInState; signInMachine;
    
    // Get dynamic data
    stateCategories = getSignInStateCategories();
    transitions = getSignInTransitions();
    nodes = createFlowNodes();
    
    if (nodes.length > 0) {
      const { nodes: layoutedNodes } = getLayoutedElements(nodes, transitions, direction);
      nodes = layoutedNodes;
    }
  }

  onMount(() => {
    if (nodes.length > 0) {
      setTimeout(fitToView, 100);
    }
  });
</script>

<div class="signin-machine-flow" 
  style="width: {responsive ? '100%' : width + 'px'}; {responsive ? '' : 'height: ' + height + 'px;'}"
  bind:this={containerEl}
>
  {#if enableZoom}
    <div class="zoom-controls">
      <button class="zoom-btn" on:click={zoomIn} title="Zoom In">+</button>
      <button class="zoom-btn" on:click={zoomOut} title="Zoom Out">−</button>
      <button class="zoom-btn" on:click={resetZoom} title="Reset">⟲</button>
      <button class="zoom-btn" on:click={fitToView} title="Fit to View">⊡</button>
      <span class="zoom-level">{Math.round(scale * 100)}%</span>
    </div>
  {/if}
  
  <div class="machine-header">
    <h4>Sign-In State Machine</h4>
    <span class="current-state">Current: {currentSignInState || 'emailEntry'}</span>
  </div>

  <div class="flow-container"
    style="transform: translate({translateX}px, {translateY}px) scale({scale}); transform-origin: 0 0;"
    on:mousedown={handleMouseDown}
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseUp}
    on:wheel={handleWheel}
    role="application"
    aria-label="Sign-in state machine diagram"
  >
    <!-- Sign-in nodes -->
    {#each nodes as node}
      <div 
        class="flow-node signin-node"
        class:current-state={node.isCurrentState}
        style="
          position: absolute;
          left: {node.x}px;
          top: {node.y}px;
          background-color: {node.isCurrentState ? node.color : node.color + '99'};
          border: 2px solid {node.isCurrentState ? '#f59e0b' : node.color};
          color: white;
          font-weight: {node.isCurrentState ? '600' : '500'};
          font-size: {compact ? '10px' : '13px'};
          padding: {compact ? '6px 10px' : '10px 14px'};
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          min-width: {compact ? '85px' : '110px'};
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        "
        on:click={() => handleNodeClick(node.id)}
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleNodeClick(node.id);
          }
        }}
        role="button"
        tabindex="0"
        title="{node.label} ({node.category})"
      >
        {node.label}
      </div>
    {/each}
    
    <!-- Sign-in transitions -->
    <svg class="connections-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
      {#each transitions as transition}
        {@const sourceNode = nodes.find(n => n.id === transition.source)}
        {@const targetNode = nodes.find(n => n.id === transition.target)}
        {#if sourceNode && targetNode}
          <line
            x1={sourceNode.x + (compact ? 42.5 : 55)}
            y1={sourceNode.y + (compact ? 14 : 18)}
            x2={targetNode.x + (compact ? 42.5 : 55)}
            y2={targetNode.y + (compact ? 14 : 18)}
            stroke="#10b981"
            stroke-width="2"
            opacity="0.7"
            marker-end="url(#arrowhead-signin)"
          />
        {/if}
      {/each}
      <defs>
        <marker id="arrowhead-signin" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" opacity="0.7" />
        </marker>
      </defs>
    </svg>
  </div>
</div>

<style>
  .signin-machine-flow {
    border: 1px solid #10b981;
    border-radius: 8px;
    overflow: auto;
    background: #fafafa;
    position: relative;
    user-select: none;
  }

  .machine-header {
    background: linear-gradient(135deg, #d1fae5, #a7f3d0);
    padding: 12px 16px;
    border-bottom: 1px solid #10b981;
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    min-height: 300px;
    position: relative;
    background: #fefefe;
    overflow: visible;
    padding: 20px;
  }

  .zoom-controls {
    position: absolute;
    top: 60px;
    right: 10px;
    display: flex;
    gap: 4px;
    align-items: center;
    background: white;
    border: 1px solid #10b981;
    border-radius: 6px;
    padding: 4px;
    z-index: 100;
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
  }

  .zoom-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #a7f3d0;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
    color: #065f46;
  }

  .zoom-btn:hover {
    background: #d1fae5;
    border-color: #10b981;
  }

  .zoom-btn:active {
    background: #a7f3d0;
  }

  .zoom-level {
    margin-left: 4px;
    font-size: 12px;
    color: #065f46;
    font-weight: 500;
  }

  .flow-node.signin-node {
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
  }

  .flow-node.current-state {
    animation: pulse-signin 2s infinite;
  }

  @keyframes pulse-signin {
    0% { box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2); }
    50% { box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4); }
    100% { box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2); }
  }
</style>