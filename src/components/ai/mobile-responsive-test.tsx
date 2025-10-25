/**
 * 移动端响应式测试组件
 *
 * 用于测试和展示AI组件在不同屏幕尺寸下的响应式表现
 */

'use client'

import React, { useState } from 'react'
import { AIAnalysisIntegratedPanel, type AnalysisResult } from './ai-analysis-integrated-panel'
import { AIAnalysisMobileDemo } from './ai-analysis-mobile-demo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  RotateCw,
  Maximize2,
  Minimize2,
  Grid3X3,
  Rows,
  Columns
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// 测试用的分析结果数据
const testAnalysisResult: AnalysisResult = {
  id: 'test-responsive-analysis',
  summary: {
    content: '这是一个用于测试移动端响应式设计的AI分析摘要。内容涵盖了响应式设计的核心概念、最佳实践和实现技巧。通过深入分析，我们可以识别出关键技术要点和实践建议。',
    style: 'paragraph',
    length: 'medium',
    qualityScore: 4.5,
    generatedAt: new Date().toISOString(),
    provider: 'Responsive-Test-Engine-v1.0',
    originalLength: 256,
    keyPoints: [
      '响应式设计是现代Web开发的必备技能',
      '移动优先的设计理念越来越重要',
      '灵活的布局和适配是核心挑战',
      '用户体验在不同设备上的一致性是目标'
    ]
  },
  tags: [
    {
      id: 'test-tag-1',
      name: '响应式设计',
      category: 'content',
      color: 'blue',
      relevance: 0.95,
      confidence: 0.92,
      count: 12,
      description: '响应式设计相关标签',
      createdAt: new Date().toISOString(),
      isUserGenerated: false,
    },
    {
      id: 'test-tag-2',
      name: '移动优化',
      category: 'content',
      color: 'green',
      relevance: 0.88,
      confidence: 0.89,
      createdAt: new Date().toISOString(),
      isUserGenerated: false,
    },
    {
      id: 'test-tag-3',
      name: '用户体验',
      category: 'emotion',
      color: 'purple',
      relevance: 0.85,
      confidence: 0.87,
      createdAt: new Date().toISOString(),
      isUserGenerated: true,
    },
    {
      id: 'test-tag-4',
      name: '测试用例',
      category: 'system',
      color: 'gray',
      relevance: 0.90,
      confidence: 0.91,
      createdAt: new Date().toISOString(),
      isUserGenerated: false,
    }
  ],
  recommendations: [
    {
      id: 'test-rec-1',
      title: 'CSS Grid vs Flexbox 完整对比',
      content: '深入对比CSS Grid和Flexbox的使用场景和最佳实践...',
      summary: '两种布局系统的详细对比分析',
      tags: ['CSS', 'Grid', 'Flexbox', '布局'],
      similarity: 0.92,
      relevanceScore: 0.88,
      recommendationReason: {
        primary: '内容高度相关，都是布局技术',
        secondary: ['相似的技术领域', '互补的知识内容'],
        confidence: 0.93,
      },
      metadata: {
        createdAt: '2024-01-25T10:00:00Z',
        updatedAt: '2024-01-25T15:30:00Z',
        viewCount: 1234,
        likeCount: 234,
        commentCount: 45,
        readingTime: 7,
        author: '响应式设计专家',
        category: '技术文档',
      },
      aiInsights: {
        keyTopics: ['CSS Grid', 'Flexbox', '响应式布局', '最佳实践'],
        sentiment: 'positive',
        complexity: 'intermediate',
        actionability: 'high',
      },
    },
    {
      id: 'test-rec-2',
      title: '移动端性能优化技巧',
      content: '针对移动设备的性能优化策略和实施方法...',
      summary: '提升移动端应用性能的完整指南',
      tags: ['性能优化', '移动端', '用户体验'],
      similarity: 0.87,
      relevanceScore: 0.82,
      recommendationReason: {
        primary: '相关的移动优化技术',
        secondary: ['相同的目标受众', '互补的技术栈'],
        confidence: 0.89,
      },
      metadata: {
        createdAt: '2024-01-24T14:20:00Z',
        updatedAt: '2024-01-25T09:15:00Z',
        viewCount: 892,
        likeCount: 156,
        commentCount: 32,
        readingTime: 5,
        author: '性能优化专家',
        category: '技术文档',
      },
      aiInsights: {
        keyTopics: ['性能优化', '移动端', '用户体验', '最佳实践'],
        sentiment: 'positive',
        complexity: 'moderate',
        actionability: 'high',
      },
    }
  ],
  metadata: {
    analyzedAt: new Date().toISOString(),
    processingTime: 1800,
    confidence: 0.91,
    modelVersion: 'responsive-test-v1.0.0',
    analysisTypes: ['summarization', 'tagging', 'recommendation', 'responsive-testing']
  }
}

// 设备预设配置
const devicePresets = [
  {
    name: '手机竖屏',
    icon: Smartphone,
    width: '375px',
    height: '812px',
    maxWidth: '375px',
    description: 'iPhone X 尺寸'
  },
  {
    name: '手机横屏',
    icon: Smartphone,
    width: '812px',
    height: '375px',
    maxWidth: '100%',
    description: 'iPhone X 横屏'
  },
  {
    name: '平板竖屏',
    icon: Tablet,
    width: '768px',
    height: '1024px',
    maxWidth: '768px',
    description: 'iPad 尺寸'
  },
  {
    name: '平板横屏',
    icon: Tablet,
    width: '1024px',
    height: '768px',
    maxWidth: '100%',
    description: 'iPad 横屏'
  },
  {
    name: '笔记本',
    icon: Laptop,
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    description: '桌面端'
  }
]

type ViewMode = 'integrated' | 'mobile' | 'comparison'
type LayoutMode = 'horizontal' | 'vertical'

export function MobileResponsiveTest() {
  const [selectedPreset, setSelectedPreset] = useState(devicePresets[0])
  const [customWidth, setCustomWidth] = useState('375')
  const [customHeight, setCustomHeight] = useState('812')
  const [useCustomSize, setUseCustomSize] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('integrated')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('horizontal')
  const [showGrid, setShowGrid] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('completed')

  // 获取当前容器的样式
  const getContainerStyle = () => {
    const preset = useCustomSize ? {
      width: `${customWidth}px`,
      height: `${customHeight}px`,
      maxWidth: '100%'
    } : selectedPreset

    return {
      width: preset.width,
      height: preset.height,
      maxWidth: preset.maxWidth,
      border: showGrid ? '2px dashed #3b82f6' : '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative' as const,
      backgroundColor: '#ffffff'
    }
  }

  // 处理重新分析
  const handleReanalyze = async () => {
    setAnalysisStatus('processing')
    setTimeout(() => {
      setAnalysisStatus('completed')
    }, 2000)
  }

  // 处理保存结果
  const handleSaveResults = (results: AnalysisResult) => {
    console.log('保存测试结果:', results)
  }

  // 渲染设备选择器
  const renderDeviceSelector = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          设备模拟器
        </CardTitle>
        <CardDescription>
          选择设备预设或自定义尺寸来测试响应式效果
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 预设设备选择 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {devicePresets.map((preset) => {
            const Icon = preset.icon
            return (
              <Button
                key={preset.name}
                variant={selectedPreset.name === preset.name && !useCustomSize ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedPreset(preset)
                  setUseCustomSize(false)
                }}
                className="flex flex-col items-center gap-1 h-auto py-3"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{preset.name}</span>
              </Button>
            )
          })}
        </div>

        {/* 自定义尺寸 */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="custom-size"
              checked={useCustomSize}
              onCheckedChange={setUseCustomSize}
            />
            <Label htmlFor="custom-size" className="text-sm font-medium">
              自定义尺寸
            </Label>
          </div>

          {useCustomSize && (
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-1">
                <Label htmlFor="width" className="text-xs">宽度</Label>
                <input
                  id="width"
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  className="w-20 px-2 py-1 border rounded text-sm"
                />
                <span className="text-xs text-gray-500">px</span>
              </div>
              <div className="flex items-center gap-1">
                <Label htmlFor="height" className="text-xs">高度</Label>
                <input
                  id="height"
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  className="w-20 px-2 py-1 border rounded text-sm"
                />
                <span className="text-xs text-gray-500">px</span>
              </div>
            </div>
          )}
        </div>

        {/* 显示选项 */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-grid"
              checked={showGrid}
              onCheckedChange={setShowGrid}
            />
            <Label htmlFor="show-grid" className="text-sm">显示网格</Label>
          </div>
        </div>

        {/* 当前尺寸信息 */}
        <div className="text-xs text-gray-600 space-y-1">
          <div>当前尺寸: {useCustomSize ? `${customWidth} × ${customHeight}` : `${selectedPreset.description}`}</div>
          <div>预览模式: {viewMode === 'integrated' ? '集成面板' : viewMode === 'mobile' ? '移动端专用' : '对比模式'}</div>
        </div>
      </CardContent>
    </Card>
  )

  // 渲染视图模式选择器
  const renderViewModeSelector = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">视图模式</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={viewMode === 'integrated' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('integrated')}
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            集成面板
          </Button>
          <Button
            variant={viewMode === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone className="h-4 w-4 mr-1" />
            移动端专用
          </Button>
          <Button
            variant={viewMode === 'comparison' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('comparison')}
          >
            <Columns className="h-4 w-4 mr-1" />
            对比模式
          </Button>
        </div>

        {viewMode === 'comparison' && (
          <div className="mt-3">
            <div className="flex gap-2">
              <Button
                variant={layoutMode === 'horizontal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLayoutMode('horizontal')}
              >
                <Rows className="h-4 w-4 mr-1" />
                水平对比
              </Button>
              <Button
                variant={layoutMode === 'vertical' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLayoutMode('vertical')}
              >
                <Columns className="h-4 w-4 mr-1" />
                垂直对比
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // 渲染预览内容
  const renderPreview = () => {
    const commonProps = {
      noteId: 'test-responsive-note',
      noteTitle: '响应式设计测试笔记',
      noteContent: '这是一个用于测试响应式设计的测试笔记内容。包含了各种长度的文本和不同类型的AI分析结果，用于验证在不同屏幕尺寸下的显示效果。',
      analysisResult: testAnalysisResult,
      analysisStatus,
      onReanalyze: handleReanalyze,
      onSaveResults: handleSaveResults,
      collapsible: true,
      defaultExpanded: true
    }

    switch (viewMode) {
      case 'integrated':
        return (
          <div style={getContainerStyle()}>
            <AIAnalysisIntegratedPanel {...commonProps} />
          </div>
        )

      case 'mobile':
        return (
          <div style={getContainerStyle()}>
            <AIAnalysisMobileDemo />
          </div>
        )

      case 'comparison':
        return (
          <div className={cn(
            'w-full gap-4',
            layoutMode === 'horizontal' ? 'flex flex-col lg:flex-row' : 'flex flex-col'
          )}>
            <div className="flex-1">
              <h3 className="text-sm font-medium mb-2">集成面板</h3>
              <div style={getContainerStyle()}>
                <AIAnalysisIntegratedPanel {...commonProps} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium mb-2">移动端专用</h3>
              <div style={getContainerStyle()}>
                <AIAnalysisMobileDemo />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            AI组件移动端响应式测试
          </h1>
          <p className="text-gray-600">
            测试AI分析组件在不同设备尺寸下的响应式表现
          </p>
        </div>

        {/* 控制面板 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderDeviceSelector()}
          {renderViewModeSelector()}
        </div>

        {/* 响应式测试指标 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">响应式测试要点</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>触控区域大小</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>文本可读性</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>布局适配</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>交互体验</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 预览区域 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">预览区域</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {useCustomSize ? `${customWidth}×${customHeight}` : selectedPreset.description}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                >
                  {showGrid ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center min-h-[600px] bg-gray-100 rounded-lg p-4">
              {renderPreview()}
            </div>
          </CardContent>
        </Card>

        {/* 测试说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">测试指南</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">1. 触控优化测试</h4>
              <p>验证按钮、标签等交互元素是否有足够的触控区域（建议最小44px）</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">2. 布局适配测试</h4>
              <p>检查内容在不同屏幕尺寸下是否合理布局，避免横向滚动</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">3. 文本可读性测试</h4>
              <p>确保字体大小在小屏幕上仍然可读，行距和段落间距合适</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">4. 性能测试</h4>
              <p>测试在移动设备上的加载速度和交互响应性</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MobileResponsiveTest