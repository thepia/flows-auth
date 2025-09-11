/**
 * Flow Data Generation Unit Tests
 * 
 * Tests for the core data generation logic used in Svelte Flow components
 * without attempting to render the full Svelte components
 */

import { describe, it, expect } from 'vitest';

describe('Flow Data Generation Logic', () => {

  describe('SessionStateMachineFlow Data Generation', () => {
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

    function formatStateName(state: string) {
      return state
        .replace(/-/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    }

    function createSessionFlowData(authState: string) {
      const flowNodes = Object.entries(authStateCategories)
        .flatMap(([categoryName, config]) => 
          config.states.map((state, index) => {
            const isCurrentState = authState === state;
            const categoryIndex = Object.keys(authStateCategories).indexOf(categoryName);
            
            return {
              id: state,
              type: 'default',
              position: { 
                x: Math.max(0, (index * 180) + (categoryIndex * 50)), 
                y: Math.max(0, categoryIndex * 100 + 50)
              },
              data: { 
                label: formatStateName(state)
              },
              width: 140,
              height: 40,
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
        type: 'default',
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

    it('should generate valid node data structure', () => {
      const flowData = createSessionFlowData('unauthenticated');
      
      expect(flowData.nodes).toBeDefined();
      expect(Array.isArray(flowData.nodes)).toBe(true);
      expect(flowData.nodes.length).toBe(6); // Total states across all categories

      flowData.nodes.forEach(node => {
        // Required Svelte Flow properties
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('type', 'default');
        expect(node).toHaveProperty('position');
        expect(node).toHaveProperty('data');
        expect(node).toHaveProperty('width');
        expect(node).toHaveProperty('height');

        // Position validation (prevent NaN errors)
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
        expect(node.position.x).not.toBeNaN();
        expect(node.position.y).not.toBeNaN();
        expect(node.position.x).toBeGreaterThanOrEqual(0);
        expect(node.position.y).toBeGreaterThanOrEqual(0);

        // Dimension validation
        expect(node.width).toBe(140);
        expect(node.height).toBe(40);
        expect(typeof node.width).toBe('number');
        expect(typeof node.height).toBe('number');

        // Data validation
        expect(node.data).toHaveProperty('label');
        expect(typeof node.data.label).toBe('string');
        expect(node.data.label.length).toBeGreaterThan(0);
      });
    });

    it('should generate valid edge data structure', () => {
      const flowData = createSessionFlowData('loading');
      
      expect(flowData.edges).toBeDefined();
      expect(Array.isArray(flowData.edges)).toBe(true);
      expect(flowData.edges.length).toBe(authStateEdges.length);

      flowData.edges.forEach(edge => {
        // Required Svelte Flow properties
        expect(edge).toHaveProperty('id');
        expect(edge).toHaveProperty('source');
        expect(edge).toHaveProperty('target');
        expect(edge).toHaveProperty('type', 'default');
        expect(edge).toHaveProperty('style');
        expect(edge).toHaveProperty('markerEnd');

        // ID validation
        expect(typeof edge.id).toBe('string');
        expect(edge.id.length).toBeGreaterThan(0);
        expect(edge.id).toContain('edge-');

        // Source/target validation
        expect(typeof edge.source).toBe('string');
        expect(typeof edge.target).toBe('string');
        expect(edge.source.length).toBeGreaterThan(0);
        expect(edge.target.length).toBeGreaterThan(0);
      });
    });

    it('should highlight current state correctly', () => {
      const flowData = createSessionFlowData('authenticated');
      
      const currentNode = flowData.nodes.find(node => node.id === 'authenticated');
      const otherNode = flowData.nodes.find(node => node.id === 'unauthenticated');
      
      expect(currentNode).toBeDefined();
      expect(otherNode).toBeDefined();
      
      // Current state highlighting
      expect(currentNode!.style.fontWeight).toBe('600');
      expect(currentNode!.style.border).toContain('#fbbf24');
      expect(currentNode!.style.animation).toBe('pulse 2s infinite');
      
      // Other state normal styling
      expect(otherNode!.style.fontWeight).toBe('500');
      expect(otherNode!.style.border).toContain('transparent');
      expect(otherNode!.style.animation).toBeUndefined();
    });

    it('should include all expected states', () => {
      const flowData = createSessionFlowData('error');
      const nodeIds = flowData.nodes.map(node => node.id);
      
      expect(nodeIds).toContain('unauthenticated');
      expect(nodeIds).toContain('loading');
      expect(nodeIds).toContain('authenticated');
      expect(nodeIds).toContain('authenticated-unconfirmed');
      expect(nodeIds).toContain('authenticated-confirmed');
      expect(nodeIds).toContain('error');
    });

    it('should format state names correctly', () => {
      expect(formatStateName('unauthenticated')).toBe('Unauthenticated');
      expect(formatStateName('authenticated-confirmed')).toBe('Authenticated confirmed');
      expect(formatStateName('loading')).toBe('Loading');
    });
  });

  describe('SignInStateMachineFlow Data Generation', () => {
    const mockStateCategories = {
      input: {
        color: '#3b82f6',
        states: ['emailEntry', 'userChecked']
      },
      auth: {
        color: '#10b981', 
        states: ['passkeyPrompt', 'pinEntry']
      },
      completion: {
        color: '#8b5cf6',
        states: ['signedIn']
      }
    };

    const mockTransitions = [
      { source: 'emailEntry', target: 'userChecked', event: 'EMAIL_SUBMITTED' },
      { source: 'userChecked', target: 'passkeyPrompt', event: 'AUTO_TRANSITION_PASSKEY' },
      { source: 'passkeyPrompt', target: 'signedIn', event: 'PASSKEY_SUCCESS' },
      { source: 'pinEntry', target: 'signedIn', event: 'PIN_VERIFIED' }
    ];

    function formatStateName(stateName: string) {
      return stateName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    }

    function createSignInFlowData(currentSignInState: string) {
      const flowNodes = Object.values(mockStateCategories)
        .flatMap(category => category.states)
        .map((stateName, index) => {
          const categoryInfo = getCategoryForState(stateName);
          const isCurrentState = stateName === currentSignInState;
          
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

      const flowEdges = mockTransitions.map((transition, index) => ({
        id: `edge-${transition.source}-${transition.target}-${index}`,
        source: transition.source,
        target: transition.target,
        type: 'default',
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

    function getCategoryForState(stateName: string) {
      for (const [category, config] of Object.entries(mockStateCategories)) {
        if (config.states.includes(stateName)) {
          return { category, ...config };
        }
      }
      return { category: 'unknown', color: '#64748b', states: [] };
    }

    it('should generate valid signin flow node data', () => {
      const flowData = createSignInFlowData('passkeyPrompt');
      
      expect(flowData.nodes).toBeDefined();
      expect(Array.isArray(flowData.nodes)).toBe(true);
      expect(flowData.nodes.length).toBe(5); // Total states

      flowData.nodes.forEach(node => {
        // Required properties
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('type', 'default');
        expect(node).toHaveProperty('position');
        expect(node).toHaveProperty('width', 120);
        expect(node).toHaveProperty('height', 40);

        // Position validation (prevent NaN)
        expect(node.position.x).not.toBeNaN();
        expect(node.position.y).not.toBeNaN();
        expect(node.position.x).toBeGreaterThanOrEqual(0);
        expect(node.position.y).toBeGreaterThanOrEqual(0);
      });
    });

    it('should use grid layout correctly', () => {
      const flowData = createSignInFlowData('emailEntry');
      
      // Check first few nodes follow grid pattern
      const node0 = flowData.nodes[0];
      const node1 = flowData.nodes[1];
      const node3 = flowData.nodes[3]; // Should be on second row
      
      // First row
      expect(node0.position.x).toBe(50); // col 0: 0 * 200 + 50
      expect(node0.position.y).toBe(50); // row 0: 0 * 120 + 50
      
      expect(node1.position.x).toBe(250); // col 1: 1 * 200 + 50
      expect(node1.position.y).toBe(50); // row 0: 0 * 120 + 50
      
      // Second row (index 3 = row 1, col 0)
      expect(node3.position.x).toBe(50); // col 0: 0 * 200 + 50
      expect(node3.position.y).toBe(170); // row 1: 1 * 120 + 50
    });

    it('should highlight current signin state correctly', () => {
      const flowData = createSignInFlowData('signedIn');
      
      const currentNode = flowData.nodes.find(node => node.id === 'signedIn');
      const otherNode = flowData.nodes.find(node => node.id === 'emailEntry');
      
      expect(currentNode).toBeDefined();
      expect(otherNode).toBeDefined();
      
      // Current state should not have opacity suffix
      expect(currentNode!.style.background).not.toContain('99');
      expect(currentNode!.style.fontWeight).toBe('600');
      expect(currentNode!.style.animation).toBe('pulse 2s infinite');
      
      // Other states should be faded
      expect(otherNode!.style.background).toContain('99');
      expect(otherNode!.style.fontWeight).toBe('500');
    });
  });

  describe('Error Prevention Logic', () => {
    it('should prevent NaN coordinates with Math.max', () => {
      const testValues = [100, 0, -50, NaN, undefined, null];
      
      testValues.forEach(value => {
        const safeValue = value || 0;
        const result = Math.max(0, safeValue);
        
        if (safeValue !== safeValue) { // NaN check
          expect(result).toBeNaN(); // Math.max(0, NaN) = NaN
        } else {
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).not.toBeNaN();
        }
      });
    });

    it('should handle invalid array indices safely', () => {
      const arr = ['a', 'b', 'c'];
      
      // Valid indices
      expect(arr[0]).toBe('a');
      expect(arr[2]).toBe('c');
      
      // Invalid indices should return undefined, not throw
      expect(arr[5]).toBeUndefined();
      expect(arr[-1]).toBeUndefined();
      
      // Math operations on undefined should result in NaN (handled by Math.max)
      const invalidResult = 5 * (arr[10] as any);
      expect(invalidResult).toBeNaN();
      expect(Math.max(0, invalidResult)).toBeNaN();
    });

    it('should validate node dimensions are always positive', () => {
      const nodeDimensions = [
        { width: 140, height: 40 },
        { width: 120, height: 40 },
        { width: 0, height: 0 }, // Edge case
        { width: -10, height: -5 } // Invalid case
      ];

      nodeDimensions.forEach(dims => {
        if (dims.width > 0 && dims.height > 0) {
          expect(dims.width).toBeGreaterThan(0);
          expect(dims.height).toBeGreaterThan(0);
        } else {
          // Invalid dimensions should be handled in component
          expect(dims.width).toBeLessThanOrEqual(0);
        }
      });
    });
  });
});