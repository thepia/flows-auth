<!--
  ProfessionalStateMachine - Professional state machine visualization with improved Dagre + enhanced SVG
  
  Props:
  - dualState: DualAuthState for current state highlighting
  - signInMachine: Sign-in state machine instance for dynamic extraction
  - title: Display title for the flow
  - theme: Color theme ('green' for sign-in, 'blue' for session)
  - width: Container width
  - height: Container height
  - onStateClick: Callback when a state is clicked
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import dagre from '@dagrejs/dagre';
  
  // Props
  export let dualState = null;
  export let signInMachine = null;
  export let title = 'State Machine';
  export let theme: 'green' | 'blue' = 'green';
  export let width = 600;
  export let height = 400;
  export let onStateClick = null;

  const dispatch = createEventDispatcher();

  // Zoom and pan state
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let containerEl = null;
  let svgEl = null;
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  let nodes = [];
  let edges = [];
  let stateCategories = {};

  // Theme colors
  const themes = {
    green: {
      primary: '#10b981',
      secondary: '#d1fae5',
      accent: '#065f46',
      current: '#f59e0b',
      background: '#fefefe'
    },
    blue: {
      primary: '#3b82f6', 
      secondary: '#dbeafe',
      accent: '#1e40af',
      current: '#f59e0b',
      background: '#fefefe'
    }
  };

  const currentTheme = themes[theme];

  // Get state machine data with error handling
  function getStateMachineData() {
    if (!signInMachine) {
      throw new Error('❌ CRITICAL: signInMachine instance is required - no fallback allowed!');
    }
    
    if (!signInMachine.getStateTransitions || !signInMachine.getStateCategories) {
      throw new Error('❌ CRITICAL: signInMachine methods missing - no fallback allowed!');
    }
    
    const transitions = signInMachine.getStateTransitions();
    const categories = signInMachine.getStateCategories();
    
    console.log(`✅ Using DYNAMIC ${title} data - SINGLE SOURCE OF TRUTH!`);
    return { transitions, categories };
  }

  // Format state name for display
  function formatStateName(stateName: string): string {
    return stateName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  // Get category info for state
  function getCategoryForState(stateName: string) {
    for (const [category, config] of Object.entries(stateCategories)) {
      if ((config as any).states.includes(stateName)) {
        return { category, ...(config as any) };
      }
    }
    return { category: 'unknown', color: '#64748b', states: [] };
  }

  // Enhanced Dagre layout with professional spacing
  function getLayoutedElements(nodes, transitions) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ 
      rankdir: 'TB',
      nodesep: 80,      // Increased horizontal spacing
      ranksep: 100,     // Increased vertical spacing  
      marginx: 40,
      marginy: 40,
      acyclicer: 'greedy',
      ranker: 'network-simplex'
    });

    // Enhanced node dimensions for better readability
    const nodeWidth = 160;
    const nodeHeight = 60;

    nodes.forEach((node) => {
      g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    transitions.forEach((transition) => {
      g.setEdge(transition.source, transition.target);
    });

    dagre.layout(g);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = g.node(node.id);
      return {
        ...node,
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
        width: nodeWidth,
        height: nodeHeight
      };
    });

    return { nodes: layoutedNodes, transitions };
  }

  // Create enhanced nodes with better styling
  function createFlowNodes() {
    try {
      const { transitions, categories } = getStateMachineData();
      const currentState = dualState?.signIn?.state || dualState?.session?.state || 'emailEntry';
      
      stateCategories = categories;
      
      // Get all unique states from categories
      const allStates = Object.values(categories).flatMap((cat: any) => cat.states);
      
      const flowNodes = allStates.map(stateName => {
        const categoryInfo = getCategoryForState(stateName);
        return {
          id: stateName,
          label: formatStateName(stateName),
          category: categoryInfo.category,
          color: categoryInfo.color,
          isCurrentState: stateName === currentState
        };
      });

      return { nodes: flowNodes, transitions };
    } catch (error) {
      console.error('❌ Failed to create flow nodes:', error);
      throw error;
    }
  }

  // Enhanced edge path calculation for smooth curves
  function createSmoothPath(sourceNode, targetNode) {
    const sourceCenterX = sourceNode.x + sourceNode.width / 2;
    const sourceCenterY = sourceNode.y + sourceNode.height / 2;
    const targetCenterX = targetNode.x + targetNode.width / 2;
    const targetCenterY = targetNode.y + targetNode.height / 2;

    // Calculate connection points on node edges
    const sourcePoint = getConnectionPoint(sourceNode, targetCenterX, targetCenterY);
    const targetPoint = getConnectionPoint(targetNode, sourceCenterX, sourceCenterY);

    // Create smooth curved path
    const dx = targetPoint.x - sourcePoint.x;
    const dy = targetPoint.y - sourcePoint.y;
    const curve = Math.abs(dy) * 0.3; // Curve intensity based on vertical distance

    return `M ${sourcePoint.x} ${sourcePoint.y} 
            C ${sourcePoint.x} ${sourcePoint.y + curve}, 
              ${targetPoint.x} ${targetPoint.y - curve}, 
              ${targetPoint.x} ${targetPoint.y}`;
  }

  // Calculate optimal connection point on node edge
  function getConnectionPoint(node, toX, toY) {
    const centerX = node.x + node.width / 2;
    const centerY = node.y + node.height / 2;
    
    const angle = Math.atan2(toY - centerY, toX - centerX);
    
    // Determine which edge to connect to
    const absAngle = Math.abs(angle);
    let x, y;
    
    if (absAngle < Math.PI / 4 || absAngle > 3 * Math.PI / 4) {
      // Connect to left/right edge
      x = angle > -Math.PI / 2 && angle < Math.PI / 2 ? node.x + node.width : node.x;
      y = centerY;
    } else {
      // Connect to top/bottom edge  
      x = centerX;
      y = angle > 0 ? node.y + node.height : node.y;
    }
    
    return { x, y };
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
        maxX: Math.max(acc.maxX, node.x + node.width),
        minY: Math.min(acc.minY, node.y),
        maxY: Math.max(acc.maxY, node.y + node.height)
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const containerWidth = containerEl?.clientWidth || width;
    const containerHeight = (containerEl?.clientHeight || height) - 57; // Account for header

    const scaleX = (containerWidth - 80) / contentWidth;
    const scaleY = (containerHeight - 80) / contentHeight;
    scale = Math.min(scaleX, scaleY, 1);

    translateX = (containerWidth - contentWidth * scale) / 2 - bounds.minX * scale;
    translateY = (containerHeight - contentHeight * scale) / 2 - bounds.minY * scale + 57;
  }

  // Mouse event handlers for enhanced panning
  function handleMouseDown(e) {
    if (e.target.classList.contains('node-clickable')) return;
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
    const rect = containerEl.getBoundingClientRect();
    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.1), 3);
    
    if (newScale !== scale) {
      translateX = centerX - (centerX - translateX) * (newScale / scale);
      translateY = centerY - (centerY - translateY) * (newScale / scale);
      scale = newScale;
    }
  }

  // Handle node clicks
  function handleNodeClick(nodeId) {
    console.log(`${title} state clicked:`, nodeId);
    if (onStateClick) {
      onStateClick(nodeId);
    }
    dispatch('stateClick', { state: nodeId });
  }

  // Layout nodes and edges
  function layoutGraph() {
    const { nodes: flowNodes, transitions } = createFlowNodes();
    const { nodes: layoutedNodes } = getLayoutedElements(flowNodes, transitions);
    
    nodes = layoutedNodes;
    edges = transitions;
    
    setTimeout(fitToView, 100);
  }

  // Reactive layout updates
  $: if (signInMachine || dualState) {
    layoutGraph();
  }

  onMount(() => {
    layoutGraph();
  });
</script>

<div class="professional-flow-container" 
  style="width: {width}px; height: {height}px; border: 1px solid {currentTheme.primary}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px {currentTheme.primary}20;"
  bind:this={containerEl}
>
  <!-- Enhanced Header -->
  <div class="flow-header" 
    style="
      background: linear-gradient(135deg, {currentTheme.secondary}, {currentTheme.primary}15);
      border-bottom: 1px solid {currentTheme.primary}30;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    "
  >
    <h4 style="margin: 0; font-size: 15px; font-weight: 600; color: {currentTheme.accent}; letter-spacing: 0.025em;">
      {title}
    </h4>
    <div style="display: flex; align-items: center; gap: 12px;">
      <!-- Zoom Controls -->
      <div class="zoom-controls" style="display: flex; gap: 4px; align-items: center;">
        <button class="zoom-btn" on:click={zoomIn} title="Zoom In">+</button>
        <button class="zoom-btn" on:click={zoomOut} title="Zoom Out">−</button>
        <button class="zoom-btn" on:click={resetZoom} title="Reset">⟲</button>
        <button class="zoom-btn" on:click={fitToView} title="Fit to View">⊡</button>
        <span class="zoom-level">{Math.round(scale * 100)}%</span>
      </div>
      <!-- Current State -->
      <span class="current-state" 
        style="
          font-size: 12px;
          color: {currentTheme.accent};
          background: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          border: 1px solid {currentTheme.primary}40;
          font-weight: 500;
        "
      >
        Current: {dualState?.signIn?.state || dualState?.session?.state || 'unknown'}
      </span>
    </div>
  </div>

  <!-- Enhanced SVG Canvas -->
  <div style="height: calc(100% - 69px); background: {currentTheme.background}; position: relative;">
    <svg
      bind:this={svgEl}
      width="100%"
      height="100%"
      style="cursor: {isPanning ? 'grabbing' : 'grab'};"
      on:mousedown={handleMouseDown}
      on:mousemove={handleMouseMove}
      on:mouseup={handleMouseUp}
      on:mouseleave={handleMouseUp}
      on:wheel={handleWheel}
    >
      <!-- Enhanced Definitions -->
      <defs>
        <!-- Drop shadow filter -->
        <filter id="drop-shadow-{theme}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="{currentTheme.primary}" flood-opacity="0.15"/>
        </filter>
        
        <!-- Glow filter for current state -->
        <filter id="glow-{theme}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/> 
          </feMerge>
        </filter>

        <!-- Enhanced Arrow Markers -->
        <marker id="arrowhead-{theme}" markerWidth="10" markerHeight="8" 
                refX="9" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,8 L10,4 z" fill="{currentTheme.primary}" opacity="0.8"/>
        </marker>
        
        <!-- Current state arrow -->
        <marker id="arrowhead-current-{theme}" markerWidth="12" markerHeight="10" 
                refX="11" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,10 L12,5 z" fill="{currentTheme.current}" opacity="0.9"/>
        </marker>
      </defs>
      
      <!-- Transform Group -->
      <g transform="translate({translateX}, {translateY}) scale({scale})">
        <!-- Enhanced Edges with smooth curves -->
        {#each edges as edge, index}
          {@const sourceNode = nodes.find(n => n.id === edge.source)}
          {@const targetNode = nodes.find(n => n.id === edge.target)}
          {#if sourceNode && targetNode}
            {@const isCurrentPath = sourceNode.isCurrentState || targetNode.isCurrentState}
            <path
              d={createSmoothPath(sourceNode, targetNode)}
              stroke={isCurrentPath ? currentTheme.current : currentTheme.primary}
              stroke-width={isCurrentPath ? "3" : "2"}
              fill="none"
              opacity={isCurrentPath ? "0.9" : "0.7"}
              marker-end="url(#arrowhead-{isCurrentPath ? 'current-' : ''}{theme})"
              style="transition: all 0.3s ease;"
            />
          {/if}
        {/each}

        <!-- Enhanced Nodes -->
        {#each nodes as node}
          <g class="node-group" style="transition: all 0.3s ease;">
            <!-- Node Background with enhanced styling -->
            <rect
              class="node-clickable"
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              rx="12"
              fill={node.isCurrentState ? currentTheme.current : node.color + '99'}
              stroke={node.isCurrentState ? currentTheme.current : node.color}
              stroke-width={node.isCurrentState ? "3" : "2"}
              filter="url(#drop-shadow-{theme})"
              style="cursor: pointer; transition: all 0.3s ease;"
              on:click={() => handleNodeClick(node.id)}
              on:keydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleNodeClick(node.id);
                }
              }}
              role="button"
              tabindex="0"
            />
            
            <!-- Current state glow effect -->
            {#if node.isCurrentState}
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx="12"
                fill="none"
                stroke={currentTheme.current}
                stroke-width="1"
                opacity="0.6"
                filter="url(#glow-{theme})"
                style="animation: pulse 2s infinite;"
              />
            {/if}
            
            <!-- Node Label with enhanced typography -->
            <text
              x={node.x + node.width / 2}
              y={node.y + node.height / 2}
              text-anchor="middle"
              dominant-baseline="middle"
              fill="white"
              font-size="13"
              font-weight={node.isCurrentState ? "600" : "500"}
              font-family="system-ui, -apple-system, sans-serif"
              style="pointer-events: none; text-shadow: 0 1px 2px rgba(0,0,0,0.1);"
            >
              {node.label}
            </text>
          </g>
        {/each}
      </g>
    </svg>
  </div>
</div>

<style>
  .professional-flow-container {
    background: #fafafa;
    position: relative;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .zoom-controls {
    background: white;
    border: 1px solid var(--primary-color, #10b981);
    border-radius: 8px;
    padding: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  
  .zoom-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    color: #374151;
    font-weight: 500;
  }
  
  .zoom-btn:hover {
    background: #f9fafb;
    border-color: var(--primary-color, #10b981);
    transform: translateY(-1px);
  }
  
  .zoom-btn:active {
    transform: translateY(0);
  }
  
  .zoom-level {
    margin-left: 8px;
    font-size: 11px;
    color: #6b7280;
    font-weight: 500;
    min-width: 32px;
    text-align: center;
  }
  
  .node-group:hover rect {
    transform: scale(1.02);
  }
  
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 0.8; }
    100% { opacity: 0.6; }
  }
  
  /* Smooth hover effects for nodes */
  .node-group:hover {
    filter: brightness(1.05);
  }
</style>