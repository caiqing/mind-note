/**
 * AI Category Suggestion Component
 *
 * Displays AI-powered category suggestions with user interaction
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { BrainIcon, CheckIcon, XIcon, RefreshCwIcon, AlertCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

import { classifyContent, ClassificationResult, ClassificationOptions } from '@/lib/ai/classifier'

interface Category {
  id: string
  name: string
  color?: string
}

interface CategorySuggestionProps {
  content: string
  existingCategories?: Category[]
  onCategorySelect?: (categoryId: string, categoryName: string) => void
  onProcessingComplete?: (result: ClassificationResult) => void
  disabled?: boolean
  autoTrigger?: boolean
}

export function CategorySuggestion({
  content,
  existingCategories = [],
  onCategorySelect,
  onProcessingComplete,
  disabled = false,
  autoTrigger = true
}: CategorySuggestionProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const classifyContent = useCallback(async () => {
    if (!content.trim() || disabled) return

    setLoading(true)
    setError(null)
    setProcessing(true)

    try {
      const classificationResult = await classifyContent(content, {
        existingCategories: existingCategories.map(cat => ({ id: cat.id, name: cat.name })),
        confidenceThreshold: 0.5,
        maxSuggestions: 4
      })

      setResult(classificationResult)
      onProcessingComplete?.(classificationResult)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '分类失败，请重试'
      setError(errorMessage)
      console.error('Classification error:', error)
    } finally {
      setLoading(false)
      setProcessing(false)
    }
  }, [content, existingCategories, disabled, onProcessingComplete])

  // Auto-trigger classification when content changes
  useEffect(() => {
    if (autoTrigger && content.trim() && !disabled) {
      const timer = setTimeout(() => {
        classifyContent()
      }, 2000) // Wait 2 seconds after user stops typing

      return () => clearTimeout(timer)
    }
  }, [content, autoTrigger, disabled, classifyContent])

  const handleCategorySelect = useCallback((categoryId: string, categoryName: string) => {
    onCategorySelect?.(categoryId, categoryName)

    // Update result to reflect user selection
    if (result) {
      const updatedResult = {
        ...result,
        primaryCategory: {
          categoryId,
          categoryName,
          confidence: 1.0,
          reason: '用户手动选择'
        },
        uncategorized: false,
        reasoning: `已选择分类：${categoryName}`
      }
      setResult(updatedResult)
    }
  }, [result, onCategorySelect])

  const handleRetry = useCallback(() => {
    classifyContent()
  }, [classifyContent])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getConfidenceWidth = (confidence: number) => {
    return `${confidence * 100}%`
  }

  if (disabled) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <BrainIcon className="h-5 w-5 mr-2 text-blue-600" />
            AI 智能分类
          </CardTitle>
          {!autoTrigger && (
            <Button
              variant="outline"
              size="sm"
              onClick={classifyContent}
              disabled={loading || processing}
            >
              {loading ? (
                <RefreshCwIcon className="h-4 w-4 animate-spin" />
              ) : (
                <BrainIcon className="h-4 w-4" />
              )}
              <span className="ml-2">
                {loading ? '分析中...' : '开始分析'}
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
              <span className="text-gray-600">AI 正在分析内容...</span>
              <RefreshCwIcon className="h-4 w-4 animate-spin text-blue-600" />
            </div>
            <Progress value={33} className="w-full" />
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

        {/* Classification Results */}
        {result && !processing && (
          <div className="space-y-4">
            {/* Primary Category */}
            {result.primaryCategory ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">推荐分类</h4>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: existingCategories.find(
                          cat => cat.id === result.primaryCategory?.categoryId
                        )?.color || '#3B82F6'
                      }}
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {result.primaryCategory.categoryName}
                      </div>
                      <div className="text-xs text-gray-500">
                        置信度: {(result.primaryCategory.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: getConfidenceWidth(result.primaryCategory.confidence) }}
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCategorySelect(
                        result.primaryCategory!.categoryId,
                        result.primaryCategory!.categoryName
                      )}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : result.uncategorized ? (
              <Alert>
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription>
                  {result.reasoning}
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Alternative Categories */}
            {result.alternativeCategories.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">其他可能的分类</h4>
                <div className="space-y-2">
                  {result.alternativeCategories.map((category, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: existingCategories.find(
                              cat => cat.id === category.categoryId
                            )?.color || '#9CA3AF'
                          }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {category.categoryName}
                          </div>
                          <div className="text-xs text-gray-500">
                            置信度: {(category.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="secondary"
                          className={getConfidenceColor(category.confidence)}
                        >
                          {(category.confidence * 100).toFixed(0)}%
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCategorySelect(
                            category.categoryId,
                            category.categoryName
                          )}
                        >
                          <CheckIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning */}
            {result.reasoning && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium text-gray-700 mb-1">分析说明</h5>
                <p className="text-xs text-gray-600">{result.reasoning}</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!result && !processing && !error && content.trim() && (
          <div className="text-center py-6 text-gray-500">
            <BrainIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">
              输入内容后，AI 将自动分析并推荐合适的分类
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CategorySuggestion