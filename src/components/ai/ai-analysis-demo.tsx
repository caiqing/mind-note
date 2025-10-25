/**
 * AI分析演示页面
 *
 * 展示完整的AI分析集成功能
 */

'use client'

import React, { useState, useEffect } from 'react'
import { AIAnalysisIntegratedPanel, type AnalysisResult } from './ai-analysis-integrated-panel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Brain, FileText, Sparkles, Zap, Target, TrendingUp, BarChart3 } from 'lucide-react'

// 示例笔记数据
const sampleNotes = [
  {
    id: 'note-1',
    title: 'React 18 新特性深度解析',
    content: `React 18 引入了一系列激动人心的新特性，包括并发特性、自动批处理、Suspense 改进等。这些新特性将显著提升 React 应用的性能和开发体验。

并发特性是 React 18 最重要的更新之一，它允许 React 在渲染过程中中断和恢复工作，使得应用能够更流畅地处理用户交互。这个特性对于改善大型应用的性能至关重要。

自动批处理机制则优化了状态更新的处理方式，React 会自动将多个状态更新批处理为单个重新渲染，减少了不必要的渲染开销。

另一个重要改进是 Suspense 的增强，它现在支持服务端渲染(SSR)的完整支持，使得开发者能够更轻松地构建服务端渲染的应用。此外，React 18 还引入了新的 Hooks API，如 useId 和 useDeferredValue，为开发者提供了更多的工具来优化应用性能。

这些新特性的引入，标志着 React 进入了一个新的发展阶段，为构建更现代、更高效的 Web 应用提供了强大的基础。`,
    category: '技术文档'
  },
  {
    id: 'note-2',
    title: 'TypeScript 最佳实践指南',
    content: `TypeScript 作为 JavaScript 的超集，为开发者提供了强大的类型系统。在实际项目中，合理使用 TypeScript 可以显著提高代码质量和开发效率。

类型安全是 TypeScript 的核心优势，通过静态类型检查可以在编译阶段发现潜在的错误，减少运行时错误。合理定义接口和类型，可以让代码更加清晰和可维护。

泛型编程是 TypeScript 的高级特性，它允许我们编写可复用的类型安全的代码。通过合理使用泛型，可以减少代码重复，提高代码的可维护性。

类型推断是 TypeScript 的另一个重要特性，它可以在不显式指定类型的情况下推断出变量的类型，让代码更加简洁。但适当地显式声明类型可以提高代码的可读性和可维护性。

在实际项目中，合理配置 TypeScript 编译选项和 ESLint 规则，可以进一步提升开发效率和代码质量。同时，保持类型定义的更新和同步也是项目维护的重要方面。`,
    category: '最佳实践'
  },
  {
    id: 'note-3',
    title: '前端性能优化策略',
    content: `前端性能优化是提升用户体验的关键因素。通过合理的优化策略，可以显著改善网页的加载速度和交互响应性。

代码分割是现代前端应用的必备技术，通过将代码分割成多个小块，可以实现按需加载，减少初始加载时间。结合懒加载技术，可以进一步优化资源的使用。

缓存策略对于提升性能至关重要，合理配置浏览器缓存和 CDN 缓存可以大幅减少重复请求。使用 Service Worker 可以实现离线缓存功能，提升应用的可用性。

图片优化是前端性能优化的重要方面，通过选择合适的图片格式、实现响应式图片和延迟加载，可以显著减少页面加载时间。

使用现代构建工具和优化技术，如 Tree Shaking、代码压缩和资源优化，可以进一步减小打包体积，提升应用性能。

监控和分析是持续优化的重要工具，通过性能监控工具可以识别性能瓶颈，针对性地进行优化。`,
    category: '性能优化'
  }
]

export function AIAnalysisDemo() {
  const [selectedNote, setSelectedNote] = useState(sampleNotes[0])
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | undefined>()
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle')
  const [customContent, setCustomContent] = useState('')

  // 模拟分析结果
  const mockAnalysis = async (noteId: string, content: string): Promise<AnalysisResult> => {
    setAnalysisStatus('processing')

    // 模拟分析过程
    await new Promise(resolve => setTimeout(resolve, 3000))

    setAnalysisStatus('completed')

    return {
      id: `analysis-${noteId}`,
      summary: {
        content: `这是一个基于AI技术生成的${content.length}字文档的综合分析摘要。通过深度分析，我们可以识别出关键信息和核心概念，为读者提供清晰的理解路径。内容涵盖了从基础概念到实际应用的完整知识体系。`,
        style: 'paragraph',
        length: content.length > 500 ? 'long' : content.length > 200 ? 'medium' : 'short',
        qualityScore: 4.5,
        generatedAt: new Date().toISOString(),
        provider: 'AI-Analysis-Engine-v3.0',
        originalLength: content.length,
        keyPoints: [
          '深入探讨了核心概念和原理',
          '提供了实际应用场景和案例',
          '强调了最佳实践和注意事项',
          '涵盖了从基础到高级的完整知识体系'
        ]
      },
      tags: [
        {
          id: 'tag-1',
          name: '技术文档',
          category: 'content',
          color: 'blue',
          relevance: 0.95,
          confidence: 0.88,
          count: 15,
          description: '技术相关文档标签',
          createdAt: new Date().toISOString(),
          isUserGenerated: false,
        },
        {
          id: 'tag-2',
          name: '开发指南',
          category: 'content',
          color: 'green',
          relevance: 0.82,
          confidence: 0.91,
          createdAt: new Date().toISOString(),
          isUserGenerated: false,
        },
        {
          id: 'tag-3',
          name: '实用性强',
          category: 'custom',
          color: 'purple',
          relevance: 0.78,
          confidence: 0.85,
          createdAt: new Date().toISOString(),
          isUserGenerated: true,
        }
      ],
      recommendations: [
        {
          id: 'note-rec-1',
          title: '相关技术深入探讨',
          content: '深入探讨相关技术的更多细节...',
          summary: '提供更深入的技术分析和实践指导',
          tags: ['技术', '深入', '实践'],
          similarity: 0.92,
          relevanceScore: 0.88,
          recommendationReason: {
            primary: '内容高度相关，技术栈相似',
            secondary: ['相同的技术领域', '互补的知识内容'],
            confidence: 0.91,
          },
          metadata: {
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-16T14:20:00Z',
            viewCount: 234,
            likeCount: 45,
            commentCount: 12,
            readingTime: 8,
            author: 'AI推荐',
            category: '技术文档',
          },
          aiInsights: {
            keyTopics: ['技术深入', '实践指导', '最佳实践'],
            sentiment: 'positive',
            complexity: 'moderate',
            actionability: 'high',
          },
        }
      ],
      metadata: {
        analyzedAt: new Date().toISOString(),
        processingTime: 3100,
        confidence: 0.92,
        modelVersion: 'v3.0.0',
        analysisTypes: ['summarization', 'tagging', 'recommendation', 'semantic-analysis']
      }
    }
  }

  // 处理重新分析
  const handleReanalyze = async () => {
    if (!selectedNote) return

    try {
      const content = customContent || selectedNote.content
      const results = await mockAnalysis(selectedNote.id, content)
      setAnalysisResult(results)
      toast.success('分析完成！')
    } catch (error) {
      setAnalysisStatus('error')
      toast.error('分析失败，请重试')
    }
  }

  // 处理保存结果
  const handleSaveResults = (results: AnalysisResult) => {
    console.log('保存分析结果:', results)
    toast.success('分析结果已保存')
  }

  // 处理笔记选择
  const handleNoteSelect = (note: typeof sampleNotes[0]) => {
    setSelectedNote(note)
    setAnalysisResult(undefined)
    setAnalysisStatus('idle')
    setCustomContent('')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面头部 */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              AI 智能分析演示
            </h1>
            <p className="text-gray-600 mt-1">
              体验 T112-AI摘要、T113-智能标签、T114-相关笔记推荐的完整功能
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline" className="px-3 py-1">
            <Sparkles className="w-4 h-4 mr-1" />
            AI 驱动
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Zap className="w-4 h-4 mr-1" />
            实时分析
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Target className="w-4 h-4 mr-1" />
            精准推荐
          </Badge>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">分析能力</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">3种</div>
            <p className="text-xs text-muted-foreground">核心分析功能</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">智能程度</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">95%</div>
            <p className="text-xs text-muted-foreground">AI 准确率</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">处理速度</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">3.1s</div>
            <p className="text-xs text-muted-foreground">平均处理时间</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">用户满意</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">4.5/5</div>
            <p className="text-xs text-muted-foreground">质量评分</p>
          </CardContent>
        </Card>
      </div>

      {/* 笔记选择区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">选择要分析的笔记</CardTitle>
          <CardDescription>
            选择示例笔记或输入自定义内容进行AI分析
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sampleNotes.map(note => (
              <Card
                key={note.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md",
                  selectedNote?.id === note.id ? "ring-2 ring-blue-500 bg-blue-50" : ""
                )}
                onClick={() => handleNoteSelect(note)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{note.title}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {note.category}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {note.content}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {note.content.length} 字符
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 自定义内容输入 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">自定义内容</h4>
              <Badge variant="outline" className="text-xs">
                {customContent.length} 字符
              </Badge>
            </div>
            <Textarea
              placeholder="输入您要分析的内容..."
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              rows={4}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCustomContent('')}
            >
              清空
            </Button>
            <Button onClick={handleReanalyze} disabled={!selectedNote && !customContent}>
              <Brain className="h-4 w-4 mr-2" />
              开始分析
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI分析结果 */}
      <AIAnalysisIntegratedPanel
        noteId={selectedNote?.id || 'custom-note'}
        noteTitle={selectedNote?.title || '自定义内容'}
        noteContent={customContent || selectedNote?.content || ''}
        analysisResult={analysisResult}
        analysisStatus={analysisStatus}
        onReanalyze={handleReanalyze}
        onSaveResults={handleSaveResults}
        collapsible={true}
        defaultExpanded={true}
      />

      {/* 功能说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">功能特性</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  T112 AI摘要分析
                </h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• 智能生成文档摘要</li>
                  <li>• 支持多种摘要风格</li>
                  <li>• 质量评分系统</li>
                  <li>• 关键要点提取</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Tags className="h-4 w-4 text-green-600" />
                  T113 智能标签
                </h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• 自动生成智能标签</li>
                  <li>• 6种分类色彩系统</li>
                  <li>• 标签管理功能</li>
                  <li>• 相关性评分</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-purple-600" />
                  T114 相关推荐
                </h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• 智能推荐算法</li>
                  <li>• 相似度可视化</li>
                  <li>• 推荐理由说明</li>
                  <li>• 多种显示模式</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-600" />
                  集成优势
                </h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• 一站式分析体验</li>
                  <li>• 实时分析处理</li>
                  <li>• 个性化推荐</li>
                  <li>• 用户反馈学习</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AIAnalysisDemo