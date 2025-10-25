/**
 * Performance Optimized Mind Map Component
 *
 * Handles large mind maps with virtualization and lazy loading
 */

'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ViewportPortal,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { debounce } from 'lodash-es'

interface MindMapNode extends Node {
  data: {
    label: string
    color: string
    fontSize: number
    fontWeight: string
    bgColor: string
  }
}

interface MindMapData {
  nodes: MindMapNode[]
  edges: Edge[]
  viewport?: {
    x: number
    y: number
    zoom: number
  }
}

interface PerformanceOptimizedMindMapProps {
  data: MindMapData
  onNodesChange?: (nodes: MindMapNode[]) => void
  onEdgesChange?: (edges: Edge[]) => void
  onNodeClick?: (node: MindMapNode) => void
  maxNodes?: number
  enableVirtualization?: boolean
  className?: string
}

const PERFORMANCE_CONFIG = {
  // Threshold for enabling virtualization
  VIRTUALIZATION_THRESHOLD: 50,

  // Debounce delay for performance updates
  DEBOUNCE_DELAY: 300,

  // Viewport margin for rendering nodes outside view
  VIEWPORT_MARGIN: 200,

  // Maximum zoom level
  MAX_ZOOM: 2,

  // Minimum zoom level
  MIN_ZOOM: 0.1,
}

export function PerformanceOptimizedMindMap({
  data,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  maxNodes = 1000,
  enableVirtualization = true,
  className = ''
}: PerformanceOptimizedMindMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(data.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(data.edges)
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 })
  const [isVirtualized, setIsVirtualized] = useState(false)

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  // Determine if virtualization should be enabled
  useEffect(() => {
    const shouldVirtualize = enableVirtualization && nodes.length > PERFORMANCE_CONFIG.VIRTUALIZATION_THRESHOLD
    setIsVirtualized(shouldVirtualize)
  }, [nodes.length, enableVirtualization])

  // Memoized visible nodes calculation for virtualization
  const visibleNodes = useMemo(() => {
    if (!isVirtualized) return nodes

    const { x: vpX, y: vpY, zoom } = viewport
    const margin = PERFORMANCE_CONFIG.VIEWPORT_MARGIN / zoom

    // Calculate viewport bounds
    const viewportBounds = {
      left: -vpX / zoom - margin,
      right: -vpX / zoom + window.innerWidth / zoom + margin,
      top: -vpY / zoom - margin,
      bottom: -vpY / zoom + window.innerHeight / zoom + margin
    }

    // Filter nodes within viewport bounds
    return nodes.filter(node => {
      const { x, y } = node.position
      const nodeSize = 100 // Approximate node size

      return (
        x + nodeSize >= viewportBounds.left &&
        x - nodeSize <= viewportBounds.right &&
        y + nodeSize >= viewportBounds.top &&
        y - nodeSize <= viewportBounds.bottom
      )
    })
  }, [nodes, viewport, isVirtualized])

  // Debounced viewport update
  const debouncedViewportUpdate = useCallback(
    debounce((newViewport: typeof viewport) => {
      setViewport(newViewport)
    }, PERFORMANCE_CONFIG.DEBOUNCE_DELAY),
    []
  )

  // Handle viewport changes
  const onViewportChange = useCallback((newViewport: any) => {
    debouncedViewportUpdate(newViewport)
  }, [debouncedViewportChange])

  // Debounced nodes change handler
  const debouncedNodesChange = useCallback(
    debounce((newNodes: MindMapNode[]) => {
      if (onNodesChange) {
        onNodesChange(newNodes)
      }
    }, PERFORMANCE_CONFIG.DEBOUNCE_DELAY),
    [onNodesChange]
  )

  // Debounced edges change handler
  const debouncedEdgesChange = useCallback(
    debounce((newEdges: Edge[]) => {
      if (onEdgesChange) {
        onEdgesChange(newEdges)
      }
    }, PERFORMANCE_CONFIG.DEBOUNCE_DELAY),
    [onEdgesChange]
  )

  // Performance-optimized node click handler
  const handleNodeClick = useCallback((event: React.MouseEvent, node: MindMapNode) => {
    event.stopPropagation()

    // Use requestAnimationFrame for non-blocking execution
    requestAnimationFrame(() => {
      if (onNodeClick) {
        onNodeClick(node)
      }
    })
  }, [onNodeClick])

  // Optimized node component
  const OptimizedNodeComponent = useCallback(({ data, selected }: { data: any; selected: boolean }) => {
    return (
      <div
        className={`px-3 py-2 rounded-lg border-2 cursor-move transition-all duration-200 ${
          selected ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
        }`}
        style={{
          backgroundColor: data.bgColor,
          borderColor: selected ? '#3b82f6' : data.color,
          minWidth: '80px',
          maxWidth: '200px',
          textAlign: 'center',
          fontSize: `${Math.min(data.fontSize, 14)}px`, // Cap font size for performance
        }}
      >
        <div
          style={{
            color: data.color === '#1f2937' ? '#f9fafb' : data.color,
            fontWeight: data.fontWeight,
            wordBreak: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {data.label}
        </div>
      </div>
    )
  }, [])

  // Get nodes to render (virtualized or all)
  const nodesToRender = isVirtualized ? visibleNodes : nodes

  return (
    <div className={`performance-optimized-mindmap ${className}`} ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodesToRender}
        edges={edges}
        onNodesChange={debouncedNodesChange}
        onEdgesChange={debouncedEdgesChange}
        onNodeClick={handleNodeClick}
        onViewportChange={onViewportChange}
        nodeTypes={{
          default: OptimizedNodeComponent,
          input: OptimizedNodeComponent,
          output: OptimizedNodeComponent,
          decision: OptimizedNodeComponent,
        }}
        defaultViewport={data.viewport}
        minZoom={PERFORMANCE_CONFIG.MIN_ZOOM}
        maxZoom={PERFORMANCE_CONFIG.MAX_ZOOM}
        fitView
        attributionPosition="bottom-left"
        selectNodesOnDrag={false} // Performance optimization for large graphs
      >
        <Background color="#f8fafc" gap={16} />
        <Controls />

        {/* Performance indicator */}
        <Panel position="top-left" className="bg-white/90 backdrop-blur-sm rounded-lg p-2 text-xs">
          <div className="flex flex-col space-y-1">
            <div>
              节点: {nodesToRender.length} / {nodes.length}
            </div>
            <div>
              {isVirtualized && <span className="text-blue-600">虚拟化已启用</span>}
            </div>
            <div>
              缩放: {(viewport.zoom * 100).toFixed(0)}%
            </div>
          </div>
        </Panel>

        {/* MiniMap for large graphs */}
        {nodes.length > 20 && (
          <MiniMap
            nodeStrokeColor="#94a3b8"
            maskColor="rgba(255, 255, 255, 0.8)"
            position="top-right"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          />
        )}

        {/* Performance warning for very large graphs */}
        {nodes.length > 200 && (
          <Panel position="bottom-center" className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
            <div className="text-xs text-yellow-800">
              大型思维导图已启用性能优化模式
            </div>
          </Panel>
        )}
      </ReactFlow>

      <style jsx>{`
        .performance-optimized-mindmap {
          width: 100%;
          height: 100%;
        }

        .react-flow__node {
          transition: none; /* Disable transitions for better performance */
        }

        .react-flow__edge-path {
          transition: none;
        }

        .react-flow__background {
          transition: none;
        }
      `}</style>
    </div>
  )
}

export default PerformanceOptimizedMindMap