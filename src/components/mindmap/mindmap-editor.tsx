/**
 * Mind Map Editor Component
 *
 * Interactive mind map editor with drag-and-drop support
 */

'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  PlusIcon,
  TrashIcon,
  SaveIcon,
  DownloadIcon,
  UploadIcon,
  ZoomInIcon,
  ZoomOutIcon,
  Maximize2Icon,
  Minimize2Icon,
  TypeIcon,
  PaletteIcon,
  GitBranchIcon,
  CircleIcon,
  SquareIcon,
  DiamondIcon,
  TriangleIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

interface MindMapNode extends Node {
  label: string
  color: string
  fontSize: number
  fontWeight: string
  type: 'default' | 'input' | 'output' | 'decision'
}

interface MindMapData {
  nodes: MindMapNode[]
  edges: Edge[]
  viewport: {
    x: number
    y: number
    zoom: number
  }
}

interface MindMapEditorProps {
  initialData?: MindMapData
  onSave?: (data: MindMapData) => void
  onExport?: (data: MindMapData) => void
  readOnly?: boolean
  className?: string
}

const nodeTypes = [
  { type: 'default', label: '默认', icon: CircleIcon },
  { type: 'input', label: '输入', icon: SquareIcon },
  { type: 'output', label: '输出', icon: GitBranchIcon },
  { type: 'decision', label: '决策', icon: DiamondIcon },
]

const colorPresets = [
  { name: '蓝色', color: '#3b82f6', bg: '#dbeafe' },
  { name: '绿色', color: '#10b981', bg: '#d1fae5' },
  { name: '紫色', color: '#8b5cf6', bg: '#ede9fe' },
  { name: '红色', color: '#ef4444', bg: '#fee2e2' },
  { name: '黄色', color: '#f59e0b', bg: '#fef3c7' },
  { name: '粉色', color: '#ec4899', bg: '#fce7f3' },
  { name: '灰色', color: '#6b7280', bg: '#f3f4f6' },
  { name: '黑色', color: '#1f2937', bg: '#f9fafb' },
]

const defaultMindMapData: MindMapData = {
  nodes: [
    {
      id: '1',
      type: 'default',
      position: { x: 250, y: 100 },
      data: {
        label: '中心主题',
        color: '#3b82f6',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    {
      id: '2',
      type: 'default',
      position: { x: 100, y: 200 },
      data: {
        label: '分支 1',
        color: '#10b981',
        fontSize: 14,
        fontWeight: 'normal'
      }
    },
    {
      id: '3',
      type: 'default',
      position: { x: 400, y: 200 },
      data: {
        label: '分支 2',
        color: '#f59e0b',
        fontSize: 14,
        fontWeight: 'normal'
      }
    },
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e1-3', source: '1', target: '3' },
  ],
  viewport: { x: 0, y: 0, zoom: 1 }
}

export function MindMapEditor({
  initialData = defaultMindMapData,
  onSave,
  onExport,
  readOnly = false,
  className = ''
}: MindMapEditorProps) {
  const { toast } = useToast()

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges)
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [nodeLabel, setNodeLabel] = useState('')
  const [nodeColor, setNodeColor] = useState('#3b82f6')
  const [nodeFontSize, setNodeFontSize] = useState(14)
  const [nodeFontWeight, setNodeFontWeight] = useState('normal')

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(ConnectionMode.Loose)

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: MindMapNode) => {
    if (!readOnly) {
      setSelectedNode(node)
      setNodeLabel(node.data.label)
      setNodeColor(node.data.color)
      setNodeFontSize(node.data.fontSize)
      setNodeFontWeight(node.data.fontWeight)
      setIsPanelOpen(true)
    }
  }, [readOnly])

  // Handle edge creation
  const onConnect = useCallback((params: any) => {
    const newEdge = {
      ...params,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      animated: true,
    }
    setEdges((eds) => addEdge(newEdge, eds))
  }, [setEdges])

  // Add new node
  const addNode = useCallback((type: string = 'default') => {
    const newNode: MindMapNode = {
      id: `node_${Date.now()}`,
      type: type as any,
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100
      },
      data: {
        label: '新节点',
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: 'normal'
      }
    }
    setNodes((nds) => [...nds, newNode])
  }, [setNodes])

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
      setEdges((eds) => eds.filter((e) =>
        e.source !== selectedNode.id && e.target !== selectedNode.id
      ))
      setSelectedNode(null)
      setIsPanelOpen(false)
      toast({
        title: '节点已删除',
        description: '节点及其连接已从思维导图中删除'
      })
    }
  }, [selectedNode, setNodes, setEdges, toast])

  // Update selected node
  const updateSelectedNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  label: nodeLabel,
                  color: nodeColor,
                  fontSize: nodeFontSize,
                  fontWeight: nodeFontWeight
                }
              }
            : node
        )
      )
      setSelectedNode(null)
      setIsPanelOpen(false)
      toast({
        title: '节点已更新',
        description: '节点属性已更新'
      })
    }
  }, [selectedNode, nodeLabel, nodeColor, nodeFontSize, nodeFontWeight, setNodes])

  // Export mind map
  const exportMindMap = useCallback(() => {
    const data: MindMapData = {
      nodes,
      edges,
      viewport: {
        x: 0,
        y: 0,
        zoom: 1
      }
    }

    if (onExport) {
      onExport(data)
    }

    // Also download as JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mindmap-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: '导出成功',
      description: '思维导图已导出为JSON文件'
    })
  }, [nodes, edges, onExport])

  // Save mind map
  const saveMindMap = useCallback(() => {
    const data: MindMapData = {
      nodes,
      edges,
      viewport: {
        x: 0,
        y: 0,
        zoom: 1
      }
    }

    if (onSave) {
      onSave(data)
    }

    toast({
      title: '保存成功',
      description: '思维导图已保存'
    })
  }, [nodes, edges, onSave, toast])

  // Clear mind map
  const clearMindMap = useCallback(() => {
    if (window.confirm('确定要清空整个思维导图吗？')) {
      setNodes(defaultMindMapData.nodes)
      setEdges(defaultMindMapData.edges)
      setSelectedNode(null)
      setIsPanelOpen(false)
      toast({
        title: '已清空',
        description: '思维导图已重置'
      })
    }
  }, [setNodes, setEdges, toast])

  // Node component
  const MindMapNodeComponent = ({ data, selected }: { data: any; selected: boolean }) => {
    return (
      <div
        className={`px-4 py-2 rounded-lg border-2 cursor-move ${
          selected ? 'border-blue-500 shadow-lg' : 'border-gray-200'
        }`}
        style={{
          backgroundColor: data.bgColor,
          borderColor: data.color,
          minWidth: '100px',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            color: data.color === '#1f2937' ? '#f9fafb' : data.color,
            fontSize: `${data.fontSize}px`,
            fontWeight: data.fontWeight
          }}
        >
          {data.label}
        </div>
      </div>
    )
  }

  return (
    <div className={`mindmap-editor ${className}`}>
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNode()}
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={connectionMode === ConnectionMode.Loose ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setConnectionMode(
                    connectionMode === ConnectionMode.Loose
                      ? ConnectionMode.Strict
                      : ConnectionMode.Loose
                  )}
                >
                  <GitBranchIcon className="h-4 w-4" />
                </Button>
              </>
            )}
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="outline"
              size="sm"
              onClick={exportMindMap}
            >
              <DownloadIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={saveMindMap}
            >
              <SaveIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearMindMap}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Badge variant="outline">{nodes.length} 节点</Badge>
            <Badge variant="outline">{edges.length} 连接</Badge>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="h-[600px] relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              bgColor: colorPresets.find(p => p.color === node.data.color)?.bg || '#ffffff'
            }
          }))}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onConnect={onConnect}
          nodeTypes={['default', 'input', 'output', 'decision']}
          nodeComponent={MindMapNodeComponent}
          connectionMode={connectionMode}
          fitView
          attributionPosition="bottom-left"
          readOnly={readOnly}
        >
          <Background color="#f8fafc" />
          <Controls />
          <MiniMap
            nodeStrokeColor="#94a3b8"
            maskColor="rgba(255, 255, 255, 0.8)"
            position="top-right"
          />
        </ReactFlow>
      </div>

      {/* Properties Panel */}
      {isPanelOpen && selectedNode && (
        <div className="absolute top-4 right-4 w-80 bg-white border rounded-lg shadow-xl z-10">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">节点属性</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="node-label">标签</Label>
                <Input
                  id="node-label"
                  value={nodeLabel}
                  onChange={(e) => setNodeLabel(e.target.value)}
                  placeholder="输入节点标签"
                />
              </div>

              <div>
                <Label htmlFor="node-type">节点类型</Label>
                <select
                  id="node-type"
                  value={selectedNode.type}
                  onChange={(e) => {
                    setNodes((nds) =>
                      nds.map((node) =>
                        node.id === selectedNode.id
                          ? { ...node, type: e.target.value as any }
                          : node
                      )
                    )
                  }}
                  className="w-full p-2 border rounded"
                >
                  {nodeTypes.map((type) => (
                    <option key={type.type} value={type.type}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>颜色</Label>
                <div className="grid grid-cols-4 gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.color}
                      onClick={() => setNodeColor(preset.color)}
                      className={`w-8 h-8 rounded border-2 ${
                        nodeColor === preset.color ? 'ring-2 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: preset.bg, borderColor: preset.color }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="font-size">字体大小</Label>
                <Input
                  id="font-size"
                  type="number"
                  value={nodeFontSize}
                  onChange={(e) => setNodeFontSize(Number(e.target.value))}
                  min={12}
                  max={24}
                />
              </div>

              <div>
                <Label htmlFor="font-weight">字体粗细</Label>
                <select
                  id="font-weight"
                  value={nodeFontWeight}
                  onChange={(e) => setNodeFontWeight(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="normal">正常</option>
                  <option value="bold">粗体</option>
                  <option value="light">细体</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button onClick={updateSelectedNode} size="sm">
                  <SaveIcon className="h-4 w-4 mr-2" />
                  更新
                </Button>
                <Button
                  variant="outline"
                  onClick={deleteSelectedNode}
                  size="sm"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  删除
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsPanelOpen(false)}
                  size="sm"
                >
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default MindMapEditor