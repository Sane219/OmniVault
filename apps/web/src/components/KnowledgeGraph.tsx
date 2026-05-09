"use client"
import React, { useEffect, useCallback } from 'react';
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
  Edge,
  NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Network } from 'lucide-react';
import { useStore } from '../store/useStore';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// ── Custom Node ───────────────────────────────────────────────────────────────
function CustomNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-xl backdrop-blur-md border min-w-[150px] relative group transition-all duration-150 ${
        selected
          ? 'bg-cta/20 border-cta shadow-[0_0_16px_rgba(34,197,94,0.35)]'
          : 'bg-secondary/90 border-gray-700 hover:border-cta/60'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-cta border-none opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg border transition-colors ${selected ? 'bg-cta/20 border-cta/50' : 'bg-background border-gray-700'}`}>
          <Network className={`w-4 h-4 ${selected ? 'text-cta' : 'text-cta'}`} />
        </div>
        <div>
          <div className={`text-xs font-mono font-bold uppercase tracking-wider ${selected ? 'text-white' : 'text-gray-300'}`}>
            {data.label as string}
          </div>
          {data.type && (
            <div className={`text-[10px] ${selected ? 'text-cta/70' : 'text-gray-500'}`}>
              {data.type as string}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-cta border-none opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

// ── Dagre Auto-Layout ─────────────────────────────────────────────────────────
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 180, height: 60 }));
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const pos = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: { x: pos.x - 90, y: pos.y - 30 },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// ── Graph Inner Component ─────────────────────────────────────────────────────
interface KnowledgeGraphProps {
  graphData: {
    nodes: any[];
    edges: any[];
  };
}

function Graph({ graphData }: KnowledgeGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { setSelectedNode } = useStore();

  useEffect(() => {
    if (!graphData?.nodes || !graphData?.edges) return;

    const initialNodes: Node[] = graphData.nodes.map((n) => ({
      id: String(n.id),
      type: 'custom',
      data: { label: n.label, type: n.type },
      position: { x: 0, y: 0 },
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
      labelBgPadding: [4, 4] as [number, number],
      labelBgBorderRadius: 4,
    }));

    const { nodes: ln, edges: le } = getLayoutedElements(initialNodes, initialEdges);
    setNodes(ln);
    setEdges(le);
  }, [graphData, setNodes, setEdges]);

  // ── Node click → Zustand ────────────────────────────────────────────────
  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNode({
      id: node.id,
      label: String(node.data.label ?? node.id),
      type: node.data.type ? String(node.data.type) : undefined,
    });
  }, [setSelectedNode]);

  // ── Clicking the background clears selection ────────────────────────────
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
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
