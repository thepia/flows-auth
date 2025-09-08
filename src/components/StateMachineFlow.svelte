<!--
  StateMachineFlow - Dual State Machine visualization with Dagre layout
  
  Props:
  - mode: 'legacy' | 'dual' - which state machine(s) to show
  - currentState: Current state for legacy mode
  - dualState: DualAuthState for dual mode
  - context: State machine context (legacy)
  - onStateClick: Callback when a state is clicked
  - compact: Boolean for layout density
  - width: Container width
  - height: Container height
-->
<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import dagre from '@dagrejs/dagre';

  // Props
  export let mode = 'dual'; // 'legacy' | 'dual'
  export let currentState = 'checkingSession'; // For legacy mode
  export let dualState = null; // For dual mode
  export let context = null; // For legacy mode
  export let onStateClick = null;
  export let compact = false;
  export let width = 800;
  export let height = 600;
  export let direction = 'TB'; // 'TB' (top-bottom) or 'LR' (left-right)
  export let enableZoom = true;
  export let responsive = false;
  export let stateMachineInstance = null; // Pass actual state machine instance for dynamic extraction
  export let separateCanvases = true; // Display session and signin machines separately

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

  // Legacy state machine definition (26 states)
  const legacyStateCategories = {
    session: {
      color: '#3b82f6',
      states: ['checkingSession', 'sessionValid', 'sessionInvalid']
    },
    auth: {
      color: '#10b981', 
      states: ['combinedAuth', 'emailCodeInput', 'conditionalMediation', 'autofillPasskeys', 'waitForExplicit', 'explicitAuth']
    },
    user: {
      color: '#f59e0b',
      states: ['auth0UserLookup', 'directWebAuthnAuth', 'passkeyRegistration', 'newUserRegistration', 'webauthnRegister']
    },
    authentication: {
      color: '#8b5cf6',
      states: ['authenticatedUnconfirmed', 'authenticatedConfirmed', 'biometricPrompt', 'auth0WebAuthnVerify']
    },
    error: {
      color: '#ef4444',
      states: ['passkeyError', 'errorHandling', 'credentialNotFound', 'userCancellation', 'credentialMismatch']
    },
    completion: {
      color: '#06b6d4',
      states: ['auth0TokenExchange', 'sessionCreated', 'loadingApp', 'appLoaded']
    }
  };

  // Dual state machine definitions
  const sessionStateCategories = {
    lifecycle: {
      color: '#3b82f6',
      states: ['initializing', 'unauthenticated', 'authenticated']
    },
    maintenance: {
      color: '#8b5cf6', 
      states: ['expired', 'refreshing', 'error']
    }
  };

  const signInStateCategories = {
    input: {
      color: '#10b981',
      states: ['emailEntry', 'userChecked']
    },
    auth: {
      color: '#f59e0b',
      states: ['passkeyPrompt', 'pinEntry']
    },
    verification: {
      color: '#8b5cf6',
      states: ['emailVerification']
    },
    registration: {
      color: '#9333ea',
      states: ['passkeyRegistration']
    },
    completion: {
      color: '#06b6d4',
      states: ['signedIn']
    },
    errors: {
      color: '#ef4444',
      states: ['passkeyError', 'networkError', 'userError', 'generalError']
    }
  };

  // State transitions - key transitions from the state machine
  const stateTransitions = [
    // Session flow
    { source: 'checkingSession', target: 'sessionValid' },
    { source: 'checkingSession', target: 'sessionInvalid' },
    { source: 'sessionValid', target: 'loadingApp' },
    { source: 'sessionInvalid', target: 'combinedAuth' },
    
    // Main auth flow
    { source: 'combinedAuth', target: 'emailCodeInput' },
    { source: 'combinedAuth', target: 'conditionalMediation' },
    { source: 'combinedAuth', target: 'explicitAuth' },
    { source: 'emailCodeInput', target: 'auth0TokenExchange' },
    { source: 'conditionalMediation', target: 'biometricPrompt' },
    { source: 'conditionalMediation', target: 'waitForExplicit' },
    { source: 'waitForExplicit', target: 'explicitAuth' },
    { source: 'explicitAuth', target: 'auth0UserLookup' },
    
    // User lookup flow
    { source: 'auth0UserLookup', target: 'directWebAuthnAuth' },
    { source: 'auth0UserLookup', target: 'passkeyRegistration' },
    { source: 'auth0UserLookup', target: 'newUserRegistration' },
    { source: 'directWebAuthnAuth', target: 'biometricPrompt' },
    
    // Authentication flow
    { source: 'biometricPrompt', target: 'auth0WebAuthnVerify' },
    { source: 'biometricPrompt', target: 'credentialNotFound' },
    { source: 'biometricPrompt', target: 'userCancellation' },
    { source: 'biometricPrompt', target: 'credentialMismatch' },
    { source: 'auth0WebAuthnVerify', target: 'sessionCreated' },
    { source: 'auth0WebAuthnVerify', target: 'passkeyError' },
    
    // Completion flow
    { source: 'auth0TokenExchange', target: 'sessionCreated' },
    { source: 'sessionCreated', target: 'loadingApp' },
    { source: 'loadingApp', target: 'appLoaded' },
    
    // Error recovery
    { source: 'credentialNotFound', target: 'combinedAuth' },
    { source: 'userCancellation', target: 'combinedAuth' },
    { source: 'credentialMismatch', target: 'combinedAuth' },
    { source: 'passkeyError', target: 'combinedAuth' }
  ];

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

  // Dagre layout function for hierarchical positioning
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

    // Add nodes to dagre graph
    nodes.forEach((node) => {
      g.setNode(node.id, { 
        width: compact ? 85 : 110, 
        height: compact ? 28 : 36 
      });
    });

    // Add edges to dagre graph
    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(g);

    // Apply positions to nodes
    const layoutedNodes = nodes.map((node) => {
      const dagreNode = g.node(node.id);
      return {
        ...node,
        x: dagreNode.x - (compact ? 42.5 : 55), // Center the node
        y: dagreNode.y - (compact ? 14 : 18)
      };
    });

    return layoutedNodes;
  }

  // Create grid layout for nodes
  let nodes = [];
  
  function createLegacyFlowNodes() {
    const flowNodes = [];

    Object.entries(legacyStateCategories).forEach(([categoryName, config]) => {
      config.states.forEach((state, index) => {
        const isCurrentState = state === currentState;
        
        flowNodes.push({
          id: state,
          label: formatStateName(state),
          category: categoryName,
          color: config.color,
          isCurrentState,
          machine: 'legacy',
          x: 0, // Will be positioned by Dagre
          y: 0  // Will be positioned by Dagre
        });
      });
    });

    // Apply Dagre layout with direction prop
    return getLayoutedElements(flowNodes, stateTransitions, direction);
  }

  function createDualFlowNodes() {
    const sessionNodes = [];
    const signInNodes = [];
    const machineVerticalSpacing = compact ? 180 : 220;

    // Use dynamic state categories if available, otherwise fallback to hardcoded
    const dynamicSignInCategories = stateMachineInstance?.signInMachineInstance?.getStateCategories() || signInStateCategories;
    
    // Session machine nodes
    Object.entries(sessionStateCategories).forEach(([categoryName, config]) => {
      config.states.forEach((state, index) => {
        const isCurrentState = dualState?.session.state === state;
        
        sessionNodes.push({
          id: `session-${state}`,
          label: formatStateName(state),
          category: `session-${categoryName}`,
          color: config.color,
          isCurrentState,
          machine: 'session',
          x: 0, // Will be positioned by Dagre
          y: 0  // Will be positioned by Dagre
        });
      });
    });

    // SignIn machine nodes - use dynamic categories
    Object.entries(dynamicSignInCategories).forEach(([categoryName, config]) => {
      config.states.forEach((state, index) => {
        const isCurrentState = dualState?.signIn.state === state;
        
        signInNodes.push({
          id: `signin-${state}`,
          label: formatStateName(state),
          category: `signin-${categoryName}`,
          color: config.color,
          isCurrentState,
          machine: 'signin',
          x: 0, // Will be positioned by Dagre
          y: 0  // Will be positioned by Dagre
        });
      });
    });

    // Create simplified transitions for dual mode (for now, just basic flow)
    const sessionTransitions = [
      { source: 'session-initializing', target: 'session-unauthenticated' },
      { source: 'session-unauthenticated', target: 'session-authenticated' },
      { source: 'session-authenticated', target: 'session-expired' },
      { source: 'session-expired', target: 'session-refreshing' },
      { source: 'session-refreshing', target: 'session-authenticated' },
      { source: 'session-refreshing', target: 'session-error' }
    ];

    const signInTransitions = [
      { source: 'signin-emailEntry', target: 'signin-userChecked' },
      
      // After userChecked - correct flows:
      { source: 'signin-userChecked', target: 'signin-passkeyPrompt' }, // if user exists, verified, has passkey
      { source: 'signin-userChecked', target: 'signin-emailVerification' }, // email signin - always available
      
      // Passkey flow goes straight to signed in
      { source: 'signin-passkeyPrompt', target: 'signin-signedIn' },
      
      // Email verification flow
      { source: 'signin-emailVerification', target: 'signin-pinEntry' }, // pin entry comes after email signin
      { source: 'signin-pinEntry', target: 'signin-signedIn' },
      
      // Passkey registration only after signed in
      { source: 'signin-signedIn', target: 'signin-passkeyRegistration' }
    ];

    // Apply Dagre layout to each machine separately with direction prop
    const layoutedSessionNodes = getLayoutedElements(sessionNodes, sessionTransitions, direction);
    const layoutedSignInNodes = getLayoutedElements(signInNodes, signInTransitions, direction);

    // Offset SignIn nodes vertically to be below Session nodes
    const offsetSignInNodes = layoutedSignInNodes.map(node => ({
      ...node,
      y: node.y + machineVerticalSpacing
    }));

    return [...layoutedSessionNodes, ...offsetSignInNodes];
  }

  function createFlowNodes() {
    if (mode === 'dual') {
      return createDualFlowNodes();
    } else {
      return createLegacyFlowNodes();
    }
  }

  // Update nodes when state, direction or compact changes
  $: {
    // Force re-creation when direction or compact changes
    direction; compact; currentState; dualState;
    nodes = createFlowNodes();
  }

  // Handle responsive sizing
  function updateDimensions() {
    if (responsive && containerEl) {
      const rect = containerEl.getBoundingClientRect();
      actualWidth = rect.width || width;
      actualHeight = rect.height || height;
    } else {
      actualWidth = width;
      actualHeight = height;
    }
  }

  // Zoom functions
  function zoomIn() {
    scale = Math.min(scale * 1.2, 3);
  }

  function zoomOut() {
    scale = Math.max(scale / 1.2, 0.5);
  }

  function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
  }

  function fitToView() {
    if (!nodes.length) return;
    
    const padding = 40;
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + (compact ? 85 : 110)));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y + (compact ? 28 : 36)));
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const scaleX = (actualWidth - padding * 2) / contentWidth;
    const scaleY = (actualHeight - padding * 2) / contentHeight;
    scale = Math.min(scaleX, scaleY, 1);
    
    translateX = (actualWidth - contentWidth * scale) / 2 - minX * scale;
    translateY = (actualHeight - contentHeight * scale) / 2 - minY * scale;
  }

  // Pan handlers
  function handleMouseDown(e) {
    if (!enableZoom) return;
    isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    e.preventDefault();
  }

  function handleMouseMove(e) {
    if (!isPanning || !enableZoom) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
  }

  function handleMouseUp() {
    isPanning = false;
  }

  function handleWheel(e) {
    if (!enableZoom) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(3, scale * delta));
    
    // Zoom to mouse position
    const rect = containerEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    translateX = x - (x - translateX) * (newScale / scale);
    translateY = y - (y - translateY) * (newScale / scale);
    scale = newScale;
  }

  onMount(() => {
    updateDimensions();
    if (responsive) {
      window.addEventListener('resize', updateDimensions);
    }
    // Fit to view immediately - no delay needed
    fitToView();
  });

  onDestroy(() => {
    if (responsive) {
      window.removeEventListener('resize', updateDimensions);
    }
  });

  // Get transitions based on current mode
  function getTransitionsForMode() {
    console.log('🔍 StateMachineFlow.getTransitionsForMode() called');
    console.log('📊 Current props:', { mode, stateMachineInstance: !!stateMachineInstance });
    
    if (mode === 'dual') {
      console.log('🎯 Mode is dual, checking for dynamic extraction...');
      console.log('🔧 stateMachineInstance exists:', !!stateMachineInstance);
      console.log('🔧 signInMachineInstance exists:', !!stateMachineInstance?.signInMachineInstance);
      console.log('🔧 getStateTransitions method exists:', typeof stateMachineInstance?.signInMachineInstance?.getStateTransitions);
      
      // Use dynamic state machine extraction if available
      if (stateMachineInstance?.signInMachineInstance?.getStateTransitions) {
        console.log('✅ Using DYNAMIC state machine extraction!');
        
        try {
          const dynamicTransitions = stateMachineInstance.signInMachineInstance.getStateTransitions();
          console.log('🔄 Raw dynamic transitions:', dynamicTransitions);
          
          const signInTransitions = dynamicTransitions.map(t => ({
            source: `signin-${t.source}`,
            target: `signin-${t.target}`
          }));
          
          const sessionTransitions = [
            { source: 'session-initializing', target: 'session-unauthenticated' },
            { source: 'session-unauthenticated', target: 'session-authenticated' },
            { source: 'session-authenticated', target: 'session-expired' },
            { source: 'session-expired', target: 'session-refreshing' },
            { source: 'session-refreshing', target: 'session-authenticated' },
            { source: 'session-refreshing', target: 'session-error' }
          ];

          console.log('🔄 Final dynamic transitions (session + signin):', [...sessionTransitions, ...signInTransitions]);
          return [...sessionTransitions, ...signInTransitions];
        } catch (error) {
          console.error('❌ Error in dynamic extraction:', error);
        }
      } else {
        console.log('⚠️ Dynamic extraction not available, using HARDCODED fallback');
        console.log('   Reasons:', {
          noInstance: !stateMachineInstance,
          noSignInMachine: !stateMachineInstance?.signInMachineInstance, 
          noMethod: typeof stateMachineInstance?.signInMachineInstance?.getStateTransitions !== 'function'
        });
      }

      // Fallback to hardcoded transitions
      const sessionTransitions = [
        { source: 'session-initializing', target: 'session-unauthenticated' },
        { source: 'session-unauthenticated', target: 'session-authenticated' },
        { source: 'session-authenticated', target: 'session-expired' },
        { source: 'session-expired', target: 'session-refreshing' },
        { source: 'session-refreshing', target: 'session-authenticated' },
        { source: 'session-refreshing', target: 'session-error' }
      ];

      // Real signin transitions based on corrected flow (no userLookup, no biometricAuth/processing)
      const signInTransitions = [
        // Basic flow - direct from emailEntry to userChecked
        { source: 'signin-emailEntry', target: 'signin-userChecked' },
        { source: 'signin-emailEntry', target: 'signin-userError' }, // invalid email
        { source: 'signin-emailEntry', target: 'signin-networkError' }, // network error
        
        // After userChecked - based on corrected flow:
        { source: 'signin-userChecked', target: 'signin-passkeyPrompt' }, // user exists + has passkey
        { source: 'signin-userChecked', target: 'signin-emailVerification' }, // user exists/new - needs email verification first
        
        // Passkey flow - direct to signedIn
        { source: 'signin-passkeyPrompt', target: 'signin-signedIn' },
        { source: 'signin-passkeyPrompt', target: 'signin-passkeyError' },
        
        // Email verification + PIN flow (correct order)
        { source: 'signin-emailVerification', target: 'signin-pinEntry' }, // email sent, now enter PIN
        { source: 'signin-pinEntry', target: 'signin-signedIn' }, // PIN verified
        
        // Registration flow - only accessible from signedIn
        { source: 'signin-signedIn', target: 'signin-passkeyRegistration' },
        { source: 'signin-passkeyRegistration', target: 'signin-signedIn' },
        
        // Error recovery flows
        { source: 'signin-userError', target: 'signin-emailEntry' },
        { source: 'signin-networkError', target: 'signin-emailEntry' },
        { source: 'signin-passkeyError', target: 'signin-emailEntry' },
        { source: 'signin-generalError', target: 'signin-emailEntry' }
      ];

      return [...sessionTransitions, ...signInTransitions];
    } else {
      // Return legacy transitions
      return stateTransitions;
    }
  }

  // Handle node clicks
  function handleNodeClick(nodeId) {
    if (onStateClick) {
      onStateClick(nodeId);
    }
    dispatch('stateClick', { state: nodeId });
  }
</script>

<div class="state-machine-flow" 
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
  
  <!-- Separate canvases for dual mode when requested -->
  {#if mode === 'dual' && separateCanvases}
    <div class="dual-machine-container">
      <!-- Session Machine Canvas -->
      <div class="machine-section session-section">
        <div class="machine-header">
          <h4>Session State Machine</h4>
          <span class="current-state">Current: {dualState?.session.state || 'initializing'}</span>
        </div>
        <div class="machine-canvas session-canvas"
          style="transform: translate({translateX}px, {translateY}px) scale({scale}); transform-origin: 0 0;"
          on:mousedown={handleMouseDown}
          on:mousemove={handleMouseMove}
          on:mouseup={handleMouseUp}
          on:mouseleave={handleMouseUp}
          on:wheel={handleWheel}
          role="application"
          aria-label="Session state machine diagram"
        >
          <!-- Session nodes -->
          {#each nodes.filter(n => n.machine === 'session') as node}
            <div 
              class="flow-node session-node"
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
              role="button"
              tabindex="0"
              title="{node.label} ({node.category})"
            >
              {node.label}
            </div>
          {/each}
          
          <!-- Session transitions -->
          <svg class="connections-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
            {#each getTransitionsForMode().filter(t => t.source.startsWith('session-') && t.target.startsWith('session-')) as transition}
              {@const sourceNode = nodes.find(n => n.id === transition.source)}
              {@const targetNode = nodes.find(n => n.id === transition.target)}
              {#if sourceNode && targetNode}
                <line
                  x1={sourceNode.x + (compact ? 42.5 : 55)}
                  y1={sourceNode.y + (compact ? 14 : 18)}
                  x2={targetNode.x + (compact ? 42.5 : 55)}
                  y2={targetNode.y + (compact ? 14 : 18)}
                  stroke="#3b82f6"
                  stroke-width="2"
                  opacity="0.7"
                  marker-end="url(#arrowhead-session)"
                />
              {/if}
            {/each}
            <defs>
              <marker id="arrowhead-session" markerWidth="10" markerHeight="7" 
                      refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" opacity="0.7" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>

      <!-- Sign-In Machine Canvas -->
      <div class="machine-section signin-section">
        <div class="machine-header">
          <h4>Sign-In State Machine</h4>
          <span class="current-state">Current: {dualState?.signIn.state || 'emailEntry'}</span>
        </div>
        <div class="machine-canvas signin-canvas"
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
          {#each nodes.filter(n => n.machine === 'signin') as node}
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
              role="button"
              tabindex="0"
              title="{node.label} ({node.category})"
            >
              {node.label}
            </div>
          {/each}
          
          <!-- Sign-in transitions -->
          <svg class="connections-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
            {#each getTransitionsForMode().filter(t => t.source.startsWith('signin-') && t.target.startsWith('signin-')) as transition}
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
    </div>

  {:else}
    <!-- Single canvas (original layout) -->
    <div class="flow-container"
      style="transform: translate({translateX}px, {translateY}px) scale({scale}); transform-origin: 0 0;"
      on:mousedown={handleMouseDown}
      on:mousemove={handleMouseMove}
      on:mouseup={handleMouseUp}
      on:mouseleave={handleMouseUp}
      on:wheel={handleWheel}
      role="application"
      aria-label="State machine diagram"
    >
      
      <!-- Machine labels for dual mode -->
      {#if mode === 'dual'}
        <div class="machine-labels">
          <div class="machine-label session-label" style="left: {compact ? 60 : 80}px; top: {compact ? 5 : 10}px;">
            <h4>Session Machine</h4>
            <span class="current-state">Current: {dualState?.session.state || 'initializing'}</span>
          </div>
          <div class="machine-label signin-label" style="left: {compact ? 60 : 80}px; top: {compact ? 190 : 240}px;">
            <h4>Sign-In Machine</h4>
            <span class="current-state">Current: {dualState?.signIn.state || 'emailEntry'}</span>
          </div>
        </div>
      {/if}

    <!-- Render nodes in Svelte Flow style -->
    {#each nodes as node}
      <div 
        class="flow-node"
        class:current-state={node.isCurrentState}
        class:session-node={node.machine === 'session'}
        class:signin-node={node.machine === 'signin'}
        style="
          position: absolute;
          left: {node.x}px;
          top: {node.y + (mode === 'dual' ? (compact ? 40 : 50) : 0)}px;
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
        role="button"
        tabindex="0"
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleNodeClick(node.id);
          }
        }}
        title="{node.label} ({node.category}) - {node.machine || 'legacy'}"
      >
        {node.label}
      </div>
    {/each}
    
    <!-- Simple connection lines (SVG overlay) -->
    <svg class="connections-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
      {#each getTransitionsForMode() as transition}
        {@const sourceNode = nodes.find(n => n.id === transition.source)}
        {@const targetNode = nodes.find(n => n.id === transition.target)}
        {#if sourceNode && targetNode}
          <line
            x1={sourceNode.x + (compact ? 42.5 : 55)}
            y1={sourceNode.y + (compact ? 14 : 18) + (mode === 'dual' ? (compact ? 40 : 50) : 0)}
            x2={targetNode.x + (compact ? 42.5 : 55)}
            y2={targetNode.y + (compact ? 14 : 18) + (mode === 'dual' ? (compact ? 40 : 50) : 0)}
            stroke="#64748b"
            stroke-width="1"
            opacity="0.3"
            marker-end="url(#arrowhead)"
          />
        {/if}
      {/each}
      
      <!-- Arrow marker definition -->
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" opacity="0.3" />
        </marker>
      </defs>
    </svg>
    </div>
  {/if}
</div>

<style>
  .state-machine-flow {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: auto;
    background: #fafafa;
    position: relative;
    user-select: none;
  }

  .zoom-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 4px;
    align-items: center;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 4px;
    z-index: 100;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .zoom-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
    color: #374151;
  }

  .zoom-btn:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }

  .zoom-btn:active {
    background: #e5e7eb;
  }

  /* Dual machine container styles */
  .dual-machine-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
  }

  .machine-section {
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: white;
    overflow: hidden;
  }

  .machine-header {
    background: linear-gradient(135deg, #f8fafc, #e2e8f0);
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .machine-header h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .machine-header .current-state {
    font-size: 12px;
    color: #6b7280;
    background: #f3f4f6;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: monospace;
  }

  .machine-canvas {
    min-height: 200px;
    position: relative;
    background: #fefefe;
    overflow: visible;
  }

  .session-section .machine-header {
    background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  }

  .signin-section .machine-header {
    background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  }

  .zoom-level {
    margin-left: 4px;
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
    min-width: 40px;
    text-align: center;
  }

  .flow-container {
    position: relative;
    width: 100%;
    height: 100%;
    padding: 20px;
    cursor: grab;
    transition: transform 0.1s ease-out;
  }

  .flow-container:active {
    cursor: grabbing;
  }

  .machine-labels {
    position: relative;
    z-index: 10;
  }

  .machine-label {
    position: absolute;
    text-align: center;
  }
  
  .machine-label h4 {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }
  
  .machine-label .current-state {
    font-size: 11px;
    color: #6b7280;
    font-weight: 500;
  }

  .flow-node {
    font-family: system-ui, -apple-system, sans-serif;
    user-select: none;
    z-index: 5;
  }
  
  .flow-node:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 20;
  }
  
  .flow-node.current-state {
    animation: pulse 2s infinite;
    z-index: 15;
  }
  
  .session-node {
    border-left: 4px solid #3b82f6;
  }
  
  .signin-node {
    border-left: 4px solid #10b981;
  }
  
  .connections-overlay {
    z-index: 1;
  }
  
  @keyframes pulse {
    0%, 100% { 
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    50% { 
      box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
    }
  }
</style>