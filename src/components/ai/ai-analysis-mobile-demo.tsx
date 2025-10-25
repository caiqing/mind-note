/**
 * AI分析移动端演示页面
 *
 * 展示移动端优化的AI分析功能
 */

'use client'

import React, { useState, useEffect } from 'react'
import { AIAnalysisMobile, type AnalysisResult } from './ai-analysis-mobile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Brain, FileText, Smartphone, ArrowLeft, Menu, Home, Settings, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// 移动端样例笔记数据
const mobileSampleNotes = [
  {
    id: 'mobile-note-1',
    title: 'React Native 移动开发入门',
    content: `React Native 是一个由Facebook开发的开源框架，允许开发者使用React和JavaScript来构建原生移动应用。它通过桥接原生组件的方式，实现了"一次编写，多处运行"的目标。

React Native 的核心优势在于能够同时为iOS和Android平台开发应用，大大提高了开发效率。开发者可以使用熟悉的React语法，同时获得接近原生应用的性能和用户体验。

该框架支持热重载功能，使得开发过程中可以实时看到代码修改的效果，极大提升了开发体验。同时，React Native拥有庞大的社区支持和丰富的第三方库资源。

在实际开发中，React Native适用于大多数移动应用场景，特别是内容展示型应用和社交类应用。但对于需要大量原生功能或高性能计算的应用，可能需要考虑原生开发。`,
    category: '移动开发'
  },
  {
    id: 'mobile-note-2',
    title: '移动端UI/UX设计原则',
    content: `移动端UI/UX设计需要考虑设备的特性和用户的使用习惯。由于屏幕尺寸限制，移动端设计更加注重信息的层次结构和交互的简洁性。

响应式设计是移动端设计的基础，设计师需要确保应用在不同尺寸的设备上都能提供良好的用户体验。这包括灵活的布局、可缩放的图片和适中的字体大小。

触摸交互是移动端的核心交互方式，按钮和可交互元素需要有足够大的触摸目标（建议至少44px），同时要考虑到手势操作的自然性和一致性。

性能优化对移动端尤为重要，因为移动设备的处理能力和网络条件相对有限。设计师需要与开发者密切合作，优化图片资源、减少不必要的动画效果、采用懒加载等技术。

最后，移动端设计还需要考虑不同平台的设计规范和用户习惯，iOS和Android有着各自的设计语言和交互模式，需要在保持一致性的同时兼顾平台特色。`,
    category: '设计指南'
  },
  {
    id: 'mobile-note-3',
    title: 'PWA渐进式Web应用实践',
    content: `渐进式Web应用（Progressive Web App, PWA）是一种结合了Web和原生应用优势的新型应用形态。PWA通过现代Web技术，提供类似原生应用的用户体验。

PWA的核心特性包括离线可用、可安装到主屏幕、推送通知和后台同步等。这些特性使得Web应用能够突破传统浏览器的限制，为用户提供更加便捷的使用体验。

Service Worker是PWA的技术基础，它作为浏览器和网络之间的代理，可以拦截网络请求、管理缓存和实现离线功能。通过合理配置Service Worker，应用可以在网络条件不佳时仍能正常工作。

Web App Manifest文件定义了应用的基本信息，包括名称、图标、主题色等。这使得用户可以将Web应用"安装"到设备主屏幕，获得类似原生应用的启动体验。

PWA的开发相比原生应用有着更低的开发成本和维护成本，同时具备跨平台的优势。虽然在某些高级功能上仍不如原生应用，但对于大多数应用场景，PWA已经能够满足需求。`,
    category: 'Web技术'
  }
]

// 移动端分析结果模拟
const mockMobileAnalysis = async (noteId: string, content: string): Promise<AnalysisResult> => {
  // 模拟移动端分析过程（略短于桌面端）
  await new Promise(resolve => setTimeout(resolve, 1500))

  return {
    id: `mobile-analysis-${noteId}`,
    summary: {
      content: `这是一个关于${content.includes('React') ? 'React Native移动开发' : content.includes('设计') ? '移动端设计' : 'PWA技术'}的${content.length}字文档分析。内容涵盖了核心概念、实践指南和最佳实践，为移动开发者提供了宝贵的参考信息。通过深入分析，我们识别出了关键技术要点和实践建议。`,
      style: 'paragraph',
      length: content.length > 300 ? 'medium' : 'short',
      qualityScore: 4.3,
      generatedAt: new Date().toISOString(),
      provider: 'Mobile-AI-Engine-v2.0',
      originalLength: content.length,
      keyPoints: [
        '提供了详细的技术介绍和实践指南',
        '强调了移动开发的特殊考虑因素',
        '包含了丰富的最佳实践建议',
        '适合初学者和进阶开发者参考'
      ]
    },
    tags: [
      {
        id: 'mobile-tag-1',
        name: '移动开发',
        category: 'content',
        color: 'blue',
        relevance: 0.92,
        confidence: 0.89,
        count: 8,
        description: '移动端相关技术标签',
        createdAt: new Date().toISOString(),
        isUserGenerated: false,
      },
      {
        id: 'mobile-tag-2',
        name: '实用指南',
        category: 'content',
        color: 'green',
        relevance: 0.88,
        confidence: 0.91,
        createdAt: new Date().toISOString(),
        isUserGenerated: false,
      },
      {
        id: 'mobile-tag-3',
        name: '入门友好',
        category: 'emotion',
        color: 'purple',
        relevance: 0.85,
        confidence: 0.87,
        createdAt: new Date().toISOString(),
        isUserGenerated: true,
      },
      {
        id: 'mobile-tag-4',
        name: '高优先级',
        category: 'priority',
        color: 'orange',
        relevance: 0.90,
        confidence: 0.88,
        createdAt: new Date().toISOString(),
        isUserGenerated: false,
      }
    ],
    recommendations: [
      {
        id: 'mobile-rec-1',
        title: 'Flutter跨平台开发指南',
        content: '深入探索Flutter框架的跨平台移动开发能力...',
        summary: 'Flutter开发完整指南，从入门到进阶',
        tags: ['Flutter', '跨平台', '移动开发'],
        similarity: 0.89,
        relevanceScore: 0.85,
        recommendationReason: {
          primary: '内容高度相关，都是移动开发技术',
          secondary: ['相似的技术栈', '相同的目标受众'],
          confidence: 0.92,
        },
        metadata: {
          createdAt: '2024-01-20T09:15:00Z',
          updatedAt: '2024-01-21T16:30:00Z',
          viewCount: 456,
          likeCount: 78,
          commentCount: 23,
          readingTime: 6,
          author: '移动开发专家',
          category: '技术文档',
        },
        aiInsights: {
          keyTopics: ['Flutter', '跨平台', 'Dart语言', '性能优化'],
          sentiment: 'positive',
          complexity: 'moderate',
          actionability: 'high',
        },
      },
      {
        id: 'mobile-rec-2',
        title: 'iOS原生开发Swift教程',
        content: '完整的Swift语言学习和iOS应用开发教程...',
        summary: 'Swift语言从基础到精通的完整学习路径',
        tags: ['Swift', 'iOS', '原生开发'],
        similarity: 0.82,
        relevanceScore: 0.79,
        recommendationReason: {
          primary: '相关的移动开发技术，补充原生知识',
          secondary: ['相同的技术领域', '互补的技术栈'],
          confidence: 0.87,
        },
        metadata: {
          createdAt: '2024-01-18T14:20:00Z',
          updatedAt: '2024-01-19T11:45:00Z',
          viewCount: 342,
          likeCount: 65,
          commentCount: 18,
          readingTime: 8,
          author: 'iOS开发者',
          category: '技术文档',
        },
        aiInsights: {
          keyTopics: ['Swift', 'iOS开发', 'UIKit', 'SwiftUI'],
          sentiment: 'positive',
          complexity: 'intermediate',
          actionability: 'high',
        },
      }
    ],
    metadata: {
      analyzedAt: new Date().toISOString(),
      processingTime: 1500,
      confidence: 0.90,
      modelVersion: 'mobile-v2.0.0',
      analysisTypes: ['summarization', 'tagging', 'recommendation', 'mobile-optimization']
    }
  }
}

export function AIAnalysisMobileDemo() {
  const [selectedNote, setSelectedNote] = useState(mobileSampleNotes[0])
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | undefined>()
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle')
  const [customContent, setCustomContent] = useState('')
  const [isMobileView, setIsMobileView] = useState(true)

  // 检测设备类型
  useEffect(() => {
    const checkDevice = () => {
      setIsMobileView(window.innerWidth < 768)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  // 处理重新分析
  const handleReanalyze = async () => {
    if (!selectedNote && !customContent) return

    try {
      setAnalysisStatus('processing')
      const content = customContent || selectedNote.content
      const noteId = customContent ? 'custom-mobile' : selectedNote.id
      const results = await mockMobileAnalysis(noteId, content)
      setAnalysisResult(results)
      setAnalysisStatus('completed')
      toast.success('移动端分析完成！')
    } catch (error) {
      setAnalysisStatus('error')
      toast.error('分析失败，请重试')
    }
  }

  // 处理保存结果
  const handleSaveResults = (results: AnalysisResult) => {
    console.log('保存移动端分析结果:', results)
    toast.success('分析结果已保存到本地')
  }

  // 处理笔记选择
  const handleNoteSelect = (note: typeof mobileSampleNotes[0]) => {
    setSelectedNote(note)
    setAnalysisResult(undefined)
    setAnalysisStatus('idle')
    setCustomContent('')
  }

  // 移动端导航栏
  const renderMobileNavigation = () => (
    <div className="sticky top-0 z-30 bg-white border-b">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-lg">AI 分析演示</h1>
            <p className="text-sm text-gray-600">移动端优化版本</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-2 py-1">
            <Smartphone className="w-3 h-3 mr-1" />
            移动端
          </Badge>
          <Button variant="ghost" size="sm">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )

  // 笔记选择区域
  const renderNoteSelection = () => (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h3 className="font-semibold text-lg mb-2">选择分析内容</h3>
        <p className="text-sm text-gray-600 mb-4">
          选择示例笔记或输入自定义内容进行移动端AI分析
        </p>
      </div>

      {/* 示例笔记卡片 */}
      <div className="space-y-3">
        {mobileSampleNotes.map(note => (
          <Card
            key={note.id}
            className={cn(
              "cursor-pointer transition-all duration-200",
              selectedNote?.id === note.id
                ? "ring-2 ring-blue-500 bg-blue-50"
                : "hover:shadow-md"
            )}
            onClick={() => handleNoteSelect(note)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{note.title}</CardTitle>
                <Badge variant="outline" className="text-xs ml-2">
                  {note.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                {note.content}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{note.content.length} 字符</span>
                <span>移动端优化</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 自定义内容输入 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">自定义内容</h4>
          {customContent && (
            <Badge variant="outline" className="text-xs">
              {customContent.length} 字符
            </Badge>
          )}
        </div>
        <Textarea
          placeholder="输入您要分析的内容..."
          value={customContent}
          onChange={(e) => setCustomContent(e.target.value)}
          rows={4}
          className="w-full resize-none"
        />
      </div>

      {/* 分析按钮 */}
      <Button
        onClick={handleReanalyze}
        disabled={!selectedNote && !customContent}
        className="w-full bg-blue-600"
        size="lg"
      >
        <Brain className="h-5 w-5 mr-2" />
        开始移动端分析
      </Button>
    </div>
  )

  // 移动端特性说明
  const renderMobileFeatures = () => (
    <div className="px-4 py-4">
      <h3 className="font-semibold text-lg mb-4">移动端优化特性</h3>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Smartphone className="h-5 w-5 text-blue-600" />
              </div>
              <h4 className="font-medium">触控优化</h4>
            </div>
            <p className="text-sm text-gray-600">
              所有交互元素都针对触控操作优化，包含适当的点击区域和触控反馈
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <h4 className="font-medium">紧凑布局</h4>
            </div>
            <p className="text-sm text-gray-600">
              针对小屏幕设计的紧凑布局，最大化内容显示效率
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
              <h4 className="font-medium">性能优化</h4>
            </div>
            <p className="text-sm text-gray-600">
              针对移动设备的性能特点进行优化，提供流畅的用户体验
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <div className={cn(
      "min-h-screen bg-gray-50",
      isMobileView ? "max-w-md mx-auto" : "w-full"
    )}>
      {/* 移动端导航 */}
      {isMobileView && renderMobileNavigation()}

      {/* 桌面端标题 */}
      {!isMobileView && (
        <div className="bg-white border-b px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  AI 分析移动端演示
                </h1>
                <p className="text-gray-600">
                  体验专为移动设备优化的AI分析功能
                </p>
              </div>
              <div className="ml-auto">
                <Badge variant="outline" className="px-3 py-1">
                  <Smartphone className="w-4 h-4 mr-1" />
                  移动端优化
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主要内容 */}
      {!currentResults ? (
        <div className="space-y-6">
          {renderNoteSelection()}
          {renderMobileFeatures()}
        </div>
      ) : (
        <AIAnalysisMobile
          noteId={selectedNote?.id || 'custom-mobile'}
          noteTitle={selectedNote?.title || '自定义内容'}
          noteContent={customContent || selectedNote?.content || ''}
          analysisResult={analysisResult}
          analysisStatus={analysisStatus}
          onReanalyze={handleReanalyze}
          onSaveResults={handleSaveResults}
        />
      )}

      {/* 底部导航（移动端） */}
      {isMobileView && !currentResults && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
          <div className="flex justify-around py-2">
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 py-2">
              <Home className="h-5 w-5" />
              <span className="text-xs">首页</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 py-2">
              <Brain className="h-5 w-5" />
              <span className="text-xs">分析</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 py-2">
              <FileText className="h-5 w-5" />
              <span className="text-xs">笔记</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 py-2">
              <User className="h-5 w-5" />
              <span className="text-xs">我的</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIAnalysisMobileDemo