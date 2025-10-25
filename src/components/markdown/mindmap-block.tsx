/**
 * Mind Map Block Component
 *
 * Renders mind map data as an interactive component within Markdown
 */

'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BrainIcon,
  Edit3Icon,
  EyeIcon,
  DownloadIcon,
  Maximize2Icon,
  Minimize2Icon,
  ShareIcon,
  PlusIcon
} from 'lucide-react'
import MindMapEditor from '@/components/mindmap/mindmap-editor'
import { useToast } from '@/hooks/use-toast'

interface MindMapBlockProps {
  data?: any
  readOnly?: boolean
  className?: string
}

interface MindMapNode {
  id: string
  label: string
  color: string
  fontSize: number
  fontWeight: string
  type: 'default' | 'input' | 'output' | 'decision'
  position: { x: number; y: number }
}

interface MindMapData {
  nodes: MindMapNode[]
  edges: Array<{ id: string; source: string; target: string }>
  viewport?: {
    x: number
    y: number
    zoom: number
  }
}

export function MindMapBlock({ data, readOnly = false, className = '' }: MindMapBlockProps) {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [currentData, setCurrentData] = useState<MindMapData>(data || {
    nodes: [],
    edges: []
  })

  // Parse JSON string if provided
  const parsedData = useCallback(() => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch (error) {
        console.error('Failed to parse mind map data:', error)
        return { nodes: [], edges: [] }
      }
    }
    return data
  }, [data])

  const handleSave = useCallback((newData: MindMapData) => {
    setCurrentData(newData)
    setIsEditing(false)
    toast({
      title: '思维导图已更新',
      description: '思维导图内容已保存'
    })
  }, [toast])

  const handleExport = useCallback((exportData: MindMapData) => {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
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
  }, [toast])

  const handleShare = useCallback(() => {
    // In a real implementation, this would create a shareable link
    const shareData = JSON.stringify(currentData, null, 2)
    navigator.clipboard.writeText(shareData).then(() => {
      toast({
        title: '复制成功',
        description: '思维导图数据已复制到剪贴板'
      })
    })
  }, [currentData, toast])

  // If data is provided as string, parse it
  if (typeof data === 'string' && currentData.nodes.length === 0) {
    const parsed = parsedData()
    if (parsed.nodes.length > 0) {
      setCurrentData(parsed)
    }
  }

  return (
    <div className={`mindmap-block my-6 ${className}`}>
      {isEditing ? (
        // Editing mode
        <MindMapEditor
          initialData={currentData}
          onSave={handleSave}
          readOnly={readOnly}
          className="border rounded-lg"
        />
      ) : (
        // Preview mode
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <BrainIcon className="h-5 w-5 mr-2 text-purple-600" />
                <span>思维导图</span>
                {currentData.nodes.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {currentData.nodes.length} 节点
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {!readOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3Icon className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(currentData)}
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  导出
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                >
                  <ShareIcon className="h-4 w-4 mr-2" />
                  复制
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? (
                    <EyeIcon className="h-4 w-4" />
                  ) : (
                    <Edit3Icon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentData.nodes.length > 0 ? (
              <div className="h-96 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4">
                <div className="text-center text-gray-500 mb-4">
                  <BrainIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>思维导图预览（{currentData.nodes.length} 个节点，{currentData.edges.length} 个连接）</p>
                </div>
                <div className="text-xs text-gray-400 bg-white bg-opacity-80 rounded p-2">
                  <pre>{JSON.stringify(currentData, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BrainIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    思维导图
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    点击编辑按钮创建思维导图
                  </p>
                  {!readOnly && (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      创建思维导图
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MindMapBlock