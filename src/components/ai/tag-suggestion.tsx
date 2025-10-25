/**
 * AI Tag Suggestion Component
 *
 * Displays AI-powered tag suggestions with user interaction
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  HashIcon,
  PlusIcon,
  XIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SparklesIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'

import { generateTags, TagGenerationResult, TagGenerationOptions } from '@/lib/ai/tag-generator'

interface Tag {
  id: string
  name: string
  color?: string
}

interface TagSuggestionProps {
  content: string
  existingTags?: Tag[]
  onTagsUpdate?: (tags: Tag[]) => void
  onProcessingComplete?: (result: TagGenerationResult) => void
  disabled?: boolean
  autoTrigger?: boolean
  maxTags?: number
}

export function TagSuggestion({
  content,
  existingTags = [],
  onTagsUpdate,
  onProcessingComplete,
  disabled = false,
  autoTrigger = true,
  maxTags = 10
}: TagSuggestionProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TagGenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [customTag, setCustomTag] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  const generateTagsFromContent = useCallback(async () => {
    if (!content.trim() || disabled) return

    setLoading(true)
    setError(null)
    setProcessing(true)

    try {
      const tagResult = await generateTags(content, {
        existingTags: existingTags.map(tag => ({ id: tag.id, name: tag.name, color: tag.color })),
        maxTags,
        confidenceThreshold: 0.4,
        includeNouns: true,
        includeVerbs: true,
        includeAdjectives: true,
        includeConcepts: true
      })

      setResult(tagResult)
      onProcessingComplete?.(tagResult)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '标签生成失败，请重试'
      setError(errorMessage)
      console.error('Tag generation error:', error)
    } finally {
      setLoading(false)
      setProcessing(false)
    }
  }, [content, existingTags, disabled, maxTags, onProcessingComplete])

  // Auto-trigger tag generation when content changes
  useEffect(() => {
    if (autoTrigger && content.trim() && !disabled && content.length > 50) {
      const timer = setTimeout(() => {
        generateTagsFromContent()
      }, 3000) // Wait 3 seconds after user stops typing

      return () => clearTimeout(timer)
    }
  }, [content, autoTrigger, disabled, generateTagsFromContent])

  const handleTagToggle = useCallback((tagName: string, color?: string) => {
    const newSelectedTags = new Set(selectedTags)

    if (newSelectedTags.has(tagName)) {
      newSelectedTags.delete(tagName)
    } else {
      newSelectedTags.add(tagName)
    }

    setSelectedTags(newSelectedTags)

    // Convert to Tag array and call update callback
    const updatedTags = Array.from(newSelectedTags).map(name => {
      const existingTag = existingTags.find(tag => tag.name === name)
      const suggestedTag = result?.suggestedTags.find(tag => tag.tagName === name)

      return existingTag || {
        id: suggestedTag?.tagId || `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        color: existingTag?.color || suggestedTag?.color || '#3B82F6'
      }
    })

    onTagsUpdate?.(updatedTags)
  }, [selectedTags, existingTags, result, onTagsUpdate])

  const handleAddCustomTag = useCallback(() => {
    const trimmedTag = customTag.trim()
    if (!trimmedTag) return

    // Check if tag already exists
    const existingTag = existingTags.find(tag => tag.name.toLowerCase() === trimmedTag.toLowerCase())
    if (existingTag) {
      handleTagToggle(existingTag.name, existingTag.color)
      setCustomTag('')
      return
    }

    // Add new tag
    const newTag: Tag = {
      id: `custom-${Date.now()}`,
      name: trimmedTag,
      color: '#' + Math.floor(Math.random()*16777215).toString(16)
    }

    handleTagToggle(newTag.name, newTag.color)
    setCustomTag('')
  }, [customTag, existingTags, handleTagToggle])

  const handleRetry = useCallback(() => {
    generateTagsFromContent()
  }, [generateTagsFromContent])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (confidence >= 0.4) return 'bg-orange-100 text-orange-800 border-orange-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getConfidenceWidth = (confidence: number) => {
    return `${Math.max(confidence * 100, 10)}%`
  }

  if (disabled) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <SparklesIcon className="h-5 w-5 mr-2 text-purple-600" />
            AI 智能标签
          </CardTitle>
          {!autoTrigger && (
            <Button
              variant="outline"
              size="sm"
              onClick={generateTagsFromContent}
              disabled={loading || processing}
            >
              {loading ? (
                <RefreshCwIcon className="h-4 w-4 animate-spin" />
              ) : (
                <SparklesIcon className="h-4 w-4" />
              )}
              <span className="ml-2">
                {loading ? '生成中...' : '生成标签'}
              </span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Processing State */}
        {processing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">AI 正在分析内容并生成标签...</span>
              <RefreshCwIcon className="h-4 w-4 animate-spin text-purple-600" />
            </div>
            <Progress value={66} className="w-full" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={handleRetry}>
                <RefreshCwIcon className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Tag Generation Results */}
        {result && !processing && (
          <div className="space-y-4">
            {/* Suggested Tags */}
            {result.suggestedTags.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">
                  建议标签 ({result.suggestedTags.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.suggestedTags.map((tag, index) => {
                    const isSelected = selectedTags.has(tag.tagName)
                    return (
                      <Badge
                        key={index}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${getConfidenceColor(tag.confidence)} ${
                          isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                        }`}
                        style={{
                          ...(isSelected ? { backgroundColor: tag.color, color: 'white', borderColor: tag.color } : {}),
                          ...(tag.color && !isSelected ? { borderColor: tag.color } : {})
                        }}
                        onClick={() => handleTagToggle(tag.tagName, tag.color)}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{tag.tagName}</span>
                          <span className="text-xs opacity-75">
                            {(tag.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Custom Tag Input */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">添加自定义标签</h4>
              <div className="flex space-x-2">
                <Input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="输入标签名称..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCustomTag()
                    } else if (e.key === 'Escape') {
                      setCustomTag('')
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomTag}
                  disabled={!customTag.trim()}
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selected Tags */}
            {selectedTags.size > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-1 text-green-600" />
                  已选择 ({selectedTags.size})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedTags).map(tagName => {
                    const tag = existingTags.find(t => t.name === tagName) ||
                             result.suggestedTags.find(t => t.tagName === tagName)
                    return (
                      <Badge
                        key={tagName}
                        variant="default"
                        className="cursor-pointer"
                        style={{
                          backgroundColor: tag?.color || '#3B82F6',
                          color: 'white'
                        }}
                      >
                        {tagName}
                        <button
                          className="ml-1 hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                          onClick={() => handleTagToggle(tagName)}
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Reasoning */}
            {result.reasoning && (
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <h5 className="text-sm font-medium text-purple-700 mb-1">生成说明</h5>
                <p className="text-xs text-purple-600">{result.reasoning}</p>
                <div className="mt-2 text-xs text-purple-500">
                  处理时间: {result.processingTime}ms |
                  使用令牌: {result.tokensUsed.input + result.tokensUsed.output}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!result && !processing && !error && content.trim() && (
          <div className="text-center py-6 text-gray-500">
            <SparklesIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">
              输入更多内容后，AI 将自动分析并生成相关标签
            </p>
            <p className="text-xs mt-1">
              至少需要50个字符才能触发AI分析
            </p>
          </div>
        )}

        {content.trim() && content.length <= 50 && !processing && (
          <div className="text-center py-4">
            <Alert>
              <HashIcon className="h-4 w-4" />
              <AlertDescription>
                继续输入内容以启用AI标签生成功能
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TagSuggestion