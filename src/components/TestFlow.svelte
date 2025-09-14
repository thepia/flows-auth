<!--
  Simple test of Svelte Flow to verify it's working
-->
<script>
  import { SvelteFlow, SvelteFlowProvider, Controls, Background } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';

  // Simple test data
  let nodes = [
    { id: '1', type: 'default', position: { x: 100, y: 100 }, data: { label: 'Node 1' } },
    { id: '2', type: 'default', position: { x: 300, y: 100 }, data: { label: 'Node 2' } }
  ];

  let edges = [
    { id: 'e1-2', source: '1', target: '2', type: 'default' }
  ];
</script>

<div style="width: 400px; height: 300px; border: 1px solid #ccc;">
  <h4>Svelte Flow Test</h4>
  <div style="width: 100%; height: 250px;">
    <SvelteFlowProvider 
      initialNodes={nodes}
      initialEdges={edges}
      initialWidth={400}
      initialHeight={250}
      fitView={true}
    >
      <SvelteFlow 
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Controls />
        <Background variant="dots" gap={20} size={1} />
      </SvelteFlow>
    </SvelteFlowProvider>
  </div>
</div>