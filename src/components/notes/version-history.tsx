/**
 * VersionHistory Component
 *
 * Shows the version history of a note with restore functionality
 */

'use client'

import { useState } from 'react'
import {
  HistoryIcon,
  ClockIcon,
  RotateCcwIcon,
  EyeIcon,
  ChevronDownIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface NoteVersion {
  id: string
  versionNumber: number
  title: string
  content: string
  changeSummary: string
  changeType: 'create' | 'edit' | 'restore'
  changedFields: string[]
  createdAt: string
  author: string
}

interface VersionHistoryProps {
  noteId: string
  currentVersion: number
}

export function VersionHistory({ noteId, currentVersion }: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Mock version history data (will be replaced with real API call)
  const [versions] = useState<NoteVersion[]>([
    {
      id: `${noteId}-v1`,
      versionNumber: 1,
      title: '示例笔记标题',
      content: '<h2>这是一个示例笔记</h2><p>这里是一些示例内容，支持<strong>富文本</strong>格式化。</p>',
      changeSummary: '创建笔记',
      changeType: 'create',
      changedFields: ['title', 'content'],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      author: '用户'
    },
  ])

  const handleRestore = async (version: NoteVersion) => {
    if (version.versionNumber === currentVersion) {
      return // Already current version
    }

    setLoading(true)
    try {
      // Mock restore operation
      console.log('Restoring to version:', version.versionNumber)

      // In real implementation, this would call the API to restore the note
      // const response = await fetch(`/api/notes/${noteId}/versions/${version.id}/restore`, {
      //   method: 'POST'
      // })

      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      alert(`已恢复到版本 ${version.versionNumber}`)

      // In real implementation, you would update the note content and refresh the page

    } catch (error) {
      console.error('Failed to restore version:', error)
      alert('恢复失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return '🆕'
      case 'edit':
        return '✏️'
      case 'restore':
        return '↩️'
      default:
        return '📝'
    }
  }

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'edit':
        return 'bg-blue-100 text-blue-800'
      case 'restore':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HistoryIcon className="h-4 w-4" />
                <CardTitle className="text-lg">版本历史</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {versions.length} 个版本
                </Badge>
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-gray-500">加载中...</div>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div key={version.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge
                              variant="secondary"
                              className={getChangeTypeColor(version.changeType)}
                            >
                              <span className="mr-1">
                                {getChangeTypeIcon(version.changeType)}
                              </span>
                              版本 {version.versionNumber}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(version.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                            {version.title}
                          </h4>
                        </div>
                        {version.versionNumber !== currentVersion && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(version)}
                            disabled={loading}
                            className="text-xs"
                          >
                            <RotateCcwIcon className="h-3 w-3 mr-1" />
                            恢复
                          </Button>
                        )}
                        {version.versionNumber === currentVersion && (
                          <Badge variant="default" className="text-xs">
                            <EyeIcon className="h-3 w-3 mr-1" />
                            当前
                          </Badge>
                        )}
                      </div>

                      {version.changeSummary && (
                        <div className="text-sm text-gray-600 mb-2">
                          {version.changeSummary}
                        </div>
                      )}

                      {version.changedFields.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {version.changedFields.map((field) => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        作者: {version.author}
                      </div>

                      <Separator className="my-3" />

                      <div className="text-sm text-gray-700 line-clamp-3">
                        {version.content.replace(/<[^>]*>/g, '').substring(0, 200)}
                        {version.content.length > 200 && '...'}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}