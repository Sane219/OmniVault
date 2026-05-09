"use client"
import React, { useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeProps,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Network } from 'lucide-react';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// 1. Define the Custom Node
function CustomNode({ data }: NodeProps) {
  return (
    <div className="px-4 py-3 shadow-lg rounded-xl bg-secondary/90 backdrop-blur-md border border-gray-700 min-w-[150px] relative group hover:border-cta transition-colors">
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-cta border-none opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-background rounded-lg border border-gray-700">
          <Network className="w-4 h-4 text-cta" />
        </div>
        <div>
          <div className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">{data.label as string}</div>
          {data.type && <div className="text-[10px] text-gray-500">{data.type as string}</div>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-cta border-none opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

// 2. Auto-Layout function with Dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // We estimate node width/height as it renders dynamically
    dagreGraph.setNode(node.id, { width: 180, height: 60 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // We are shifting the dagre node position (anchor=center) to the top left
    // so it matches the React Flow node anchor point (top left).
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - 90,
        y: nodeWithPosition.y - 30,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// 3. The Graph Component
interface KnowledgeGraphProps {
  graphData: {
    nodes: any[];
    edges: any[];
  }
}

function Graph({ graphData }: KnowledgeGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!graphData || !graphData.nodes || !graphData.edges) return;
    
    // Map backend data to React Flow format
    const initialNodes: Node[] = graphData.nodes.map((n) => ({
      id: String(n.id),
      type: 'custom',
      data: { label: n.label, type: n.type },
      position: { x: 0, y: 0 }, // Dagre will override
    }));

    const initialEdges: Edge[] = graphData.edges.map((e) => ({
      id: String(e.id),
      source: String(e.source),
      target: String(e.target),
      label: e.label,
      animated: true,
      style: { stroke: '#475569', strokeWidth: 1.5 },
      labelStyle: { fill: '#94A3B8', fontWeight: 500, fontSize: 10 },
      labelBgStyle: { fill: '#0F172A' },
      labelBgPadding: [4, 4],
      labelBgBorderRadius: 4,
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [graphData, setNodes, setEdges]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="bg-transparent"
        minZoom={0.2}
      >
        <Background color="#1E293B" gap={20} size={1} />
        <Controls className="bg-secondary border-gray-700 fill-gray-400" />
      </ReactFlow>
    </div>
  );
}

export function KnowledgeGraph(props: KnowledgeGraphProps) {
  return (
    <ReactFlowProvider>
      <Graph {...props} />
    </ReactFlowProvider>
  );
}
