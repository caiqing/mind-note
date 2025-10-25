/**
 * AI摘要卡片组件测试
 *
 * 测试AI摘要卡片组件的渲染、交互和可访问性
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AISummaryCard } from '@/components/ai/ai-summary-card'
import { UITestUtils, mockDataGenerators } from '../../setup/ui-test-setup'

describe('AISummaryCard组件', () => {
  const mockAIAnalysis = mockDataGenerators.generateAIAnalysis({
    summary: '这是一段关于人工智能技术的详细摘要。AI技术正在快速发展，涵盖了机器学习、深度学习、自然语言处理等多个领域。',
    keywords: ['人工智能', '机器学习', '深度学习', '自然语言处理'],
    sentiment: {
      polarity: 0.7,
      confidence: 0.85,
      label: 'positive'
    },
    score: 4.5
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染AI摘要卡片', () => {
      render(<AISummaryCard analysis={mockAIAnalysis} />)

      expect(screen.getByText('AI分析摘要')).toBeInTheDocument()
      expect(screen.getByText(mockAIAnalysis.summary)).toBeInTheDocument()
    })

    it('应该显示质量评分', () => {
      render(<AISummaryCard analysis={mockAIAnalysis} />)

      expect(screen.getByText('4.5')).toBeInTheDocument()
      expect(screen.getByText(/质量评分/)).toBeInTheDocument()
    })

    it('应该显示关键词', () => {
      render(<AISummaryCard analysis={mockAIAnalysis} />)

      mockAIAnalysis.keywords.forEach(keyword => {
        expect(screen.getByText(keyword)).toBeInTheDocument()
      })
    })

    it('应该显示情感分析结果', () => {
      render(<AISummaryCard analysis={mockAIAnalysis} />)

      expect(screen.getByText('positive')).toBeInTheDocument()
      expect(screen.getByText(/积极/)).toBeInTheDocument()
      expect(screen.getByText('85%')).toBeInTheDocument()
    })

    it('应该支持自定义标题', () => {
      render(
        <AISummaryCard analysis={mockAIAnalysis} title="自定义标题" />
      )

      expect(screen.getByText('自定义标题')).toBeInTheDocument()
      expect(screen.queryByText('AI分析摘要')).not.toBeInTheDocument()
    })
  })

  describe('交互测试', () => {
    it('应该支持展开/收起摘要', async () => {
      const shortSummary = '简短摘要'
      const fullSummary = mockAIAnalysis.summary

      render(
        <AISummaryCard
          analysis={{
            ...mockAIAnalysis,
            summary: fullSummary
          }}
          maxLength={20}
        />
      )

      // 初始状态应该显示截断的摘要
      expect(screen.getByText(shortSummary.substring(0, 17) + '...')).toBeInTheDocument()

      const expandButton = screen.getByRole('button', { name: /展开/ })
      await userEvent.click(expandButton)

      // 展开后应该显示完整摘要
      expect(screen.getByText(fullSummary)).toBeInTheDocument()
    })

    it('应该支持复制摘要功能', async () => {
      const mockCopy = vi.fn()
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      })

      render(<AISummaryCard analysis={mockAIAnalysis} />)

      const copyButton = screen.getByRole('button', { name: /复制/ })
      await userEvent.click(copyButton)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockAIAnalysis.summary)
    })

    it('应该支持重新分析功能', async () => {
      const mockOnReanalyze = vi.fn()
      render(
        <AISummaryCard
          analysis={mockAIAnalysis}
          onReanalyze={mockOnReanalyze}
        />
      )

      const reanalyzeButton = screen.getByRole('button', { name: /重新分析/ })
      await userEvent.click(reanalyzeButton)

      expect(mockOnReanalyze).toHaveBeenCalled()
    })

    it('应该支持编辑功能', async () => {
      const mockOnEdit = vi.fn()
      render(
        <AISummaryCard
          analysis={mockAIAnalysis}
          onEdit={mockOnEdit}
        />
      )

      const editButton = screen.getByRole('button', { name: /编辑/ })
      await userEvent.click(editButton)

      expect(mockOnEdit).toHaveBeenCalledWith(mockAIAnalysis)
    })

    it('应该支持反馈功能', async () => {
      const mockOnFeedback = vi.fn()
      render(
        <AISummaryCard
          analysis={mockAIAnalysis}
          onFeedback={mockOnFeedback}
        />
      )

      const feedbackButton = screen.getByRole('button', { name: /反馈/ })
      await userEvent.click(feedbackButton)

      expect(mockOnFeedback).toHaveBeenCalled()
    })
  })

  describe('可访问性测试', () => {
    it('应该具有语义化的结构', () => {
      render(<AISummaryCard analysis={mockAIAnalysis} />)

      // 检查是否有适当的标题
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()

      // 检查摘要内容
      expect(screen.getByText(mockAIAnalysis.summary)).toBeInTheDocument()
    })

    it('关键词应该具有可访问的标签', () => {
      render(<AISummaryCard analysis={mockAIAnalysis} />)

      mockAIAnalysis.keywords.forEach(keyword => {
        const keywordElement = screen.getByText(keyword)
        expect(keywordElement.closest('[role="listitem"]')).toBeInTheDocument()
      })
    })

    it('质量评分应该具有描述性的标签', () => {
      render(<AISummaryCard analysis={mockAIAnalysis} />)

      const scoreElement = screen.getByText('4.5')
      expect(scoreElement.closest('[aria-label*="质量评分"]')).toBeInTheDocument()
    })

    it('情感分析应该具有描述性的标签', () => {
      render(<AISummaryCard analysis={mockAIAnalysis} />)

      const sentimentElement = screen.getByText('positive')
      expect(sentimentElement.closest('[aria-label*="情感分析"]')).toBeInTheDocument()
    })

    it('所有交互按钮应该具有aria-label', () => {
      render(
        <AISummaryCard
          analysis={mockAIAnalysis}
          onReanalyze={vi.fn()}
          onEdit={vi.fn()}
        />
      )

      const reanalyzeButton = screen.getByRole('button', { name: /重新分析/ })
      const editButton = screen.getByRole('button', { name: /编辑/ })

      expect(reanalyzeButton).toHaveAttribute('aria-label')
      expect(editButton).toHaveAttribute('aria-label')
    })

    it('应该支持键盘导航', async () => {
      render(
        <AISummaryCard
          analysis={mockAIAnalysis}
          onReanalyze={vi.fn()}
        />
      )

      const reanalyzeButton = screen.getByRole('button', { name: /重新分析/ })
      reanalyzeButton.focus()

      await userEvent.tab()
      await userEvent.tab()

      // 检查焦点是否在正确的元素上
      expect(document.activeElement).toBe(document.body)
    })
  })

  describe('状态管理测试', () => {
    it('应该显示加载状态', () => {
      render(<AISummaryCard analysis={mockAIAnalysis} loading />)

      expect(screen.getByText('分析中...')).toBeInTheDocument()
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('应该显示错误状态', () => {
      const mockError = { message: '分析失败', code: 'ANALYSIS_ERROR' }

      render(<AISummaryCard analysis={mockAIAnalysis} error={mockError} />)

      expect(screen.getByText('分析失败')).toBeInTheDocument()
      expect(screen.getByText(mockError.message)).toBeInTheDocument()
    })

    it('应该显示空状态', () => {
      render(<AISummaryCard analysis={null} />)

      expect(screen.getByText('暂无分析结果')).toBeInTheDocument()
      expect(screen.getByText('请先选择笔记进行AI分析')).toBeInTheDocument()
    })

    it('应该显示重新分析中状态', () => {
      render(<AISummaryCard analysis={mockAIAnalysis} reanalyzing />)

      expect(screen.getByText('重新分析中...')).toBeInTheDocument()
    })
  })

  describe('样式测试', () => {
    it('应该具有卡片样式', () => {
      render(<AISummaryCard analysis={mockAIAnalysis} />)

      const card = screen.getByTestId('ai-summary-card')
      expect(card).toHaveClass('rounded-lg', 'shadow-md', 'p-6')
    })

    it('应该具有正确的颜色对比度', () => {
      render(<AISummaryCard analysis={mockAIAnalysis} />)

      const card = screen.getByTestId('ai-summary-card')
      const computedStyle = UITestUtils.getComputedStyle(card)

      // 检查背景色和文字颜色
      const backgroundColor = computedStyle.backgroundColor
      const textColor = computedStyle.color

      // 转换为hex格式进行对比度检查
      const bgHex = UITestUtils.rgbToHex(backgroundColor)
      const textHex = UITestUtils.rgbToHex(textColor)

      const contrast = UITestUtils.checkColorContrast(bgHex, textHex)
      expect(contrast.passes.aa).toBe(true)
    })

    it('应该具有响应式设计', async () => {
      render(<AISummaryCard analysis={mockAIAnalysis} />)

      const card = screen.getByTestId('ai-summary-card')
      const viewports = [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1920, height: 1080 }
      ]

      const results = await UITestUtils.checkResponsiveLayout(card, viewports)

      results.forEach(result => {
        expect(result.visible).toBe(true)
      })
    })
  })

  describe('数据验证测试', () => {
    it('应该验证空摘要的显示', () => {
      const emptyAnalysis = mockDataGenerators.generateAIAnalysis({
        summary: '',
        keywords: [],
        sentiment: { polarity: 0, confidence: 0, label: 'neutral' },
        score: 0
      })

      render(<AISummaryCard analysis={emptyAnalysis} />)

      expect(screen.getByText('暂无摘要')).toBeInTheDocument()
      expect(screen.queryByText(emptyAnalysis.summary)).not.toBeInTheDocument()
    })

    it('应该验证空关键词列表的显示', () => {
      const emptyAnalysis = mockDataGenerators.generateAIAnalysis({
        summary: '测试摘要',
        keywords: [],
        sentiment: { polarity: 0.5, confidence: 0.8, label: 'positive' },
        score: 4.0
      })

      render(<AisSummaryCard analysis={emptyAnalysis} />)

      expect(screen.getByText('暂无关键词')).toBeInTheDocument()
    })

    it('应该验证极低质量评分的显示', () => {
      const lowScoreAnalysis = mockDataGenerators.generateAIAnalysis({
        summary: '质量很低的摘要',
        keywords: ['测试'],
        sentiment: { polarity: -0.2, confidence: 0.5, label: 'negative' },
        score: 1.5
      })

      render(<AisSummaryCard analysis={lowScoreAnalysis} />)

      expect(screen.getByText('1.5')).toBeInTheDocument()
      expect(screen.getByText(/低质量/)).toBeInTheDocument()
    })

    it('应该验证极高评分的显示', () => {
      const highScoreAnalysis = mockDataGenerators.generateAIAnalysis({
        summary: '质量极高的摘要',
        keywords: ['测试', '高质量'],
        sentiment: { polarity: 0.9, confidence: 0.95, label: 'positive' },
        score: 4.9
      })

      render(<AisSummaryCard analysis={highScoreAnalysis} />)

      expect(screen.getByText('4.9')).toBeInTheDocument()
      expect(screen.getByText(/高质量/)).toBeInTheDocument()
    })

    it('应该验证消极情感的显示', () => {
      const negativeAnalysis = mockDataGenerators.generateAIAnalysis({
        summary: '消极的摘要内容',
        keywords: ['负面', '问题'],
        sentiment: { polarity: -0.6, confidence: 0.7, label: 'negative' },
        score: 2.8
      })

      render(<AisSummaryCard analysis={negativeAnalysis} />)

      expect(screen.getByText('negative')).toBeInTheDocument()
      expect(screen.getByText(/消极/)).toBeInTheDocument()
      expect(screen.getByText(/60%置信度/)).toBeInTheDocument()
    })
  })

  describe('边界情况测试', () => {
    it('应该处理超长摘要', () => {
      const longSummary = '这是一个非常长的摘要内容。'.repeat(50)
      const longAnalysis = mockDataGenerators.generateAIAnalysis({
        summary: longSummary,
        keywords: ['长内容'],
        sentiment: { polarity: 0.5, confidence: 0.8, label: 'positive' },
        score: 4.2
      })

      render(<AisSummaryCard analysis={longAnalysis} />)

      expect(screen.getByText('测试内容...')).toBeInTheDocument()
    })

    it('应该处理特殊字符', () => {
      const specialAnalysis = mockDataGenerators.generateAIAnalysis({
        summary: '包含特殊字符：!@#$%^&*()',
        keywords: ['特殊', '字符'],
        sentiment: { polarity: 0.3, confidence: 0.6, label: 'neutral' },
        score: 3.5
      })

      render(<AisSummaryCard analysis={specialAnalysis} />)

      expect(screen.getByText('!@#$%^&*()')).toBeInTheDocument()
    })

    it('应该处理HTML字符', () => {
      const htmlAnalysis = mockDataGenerators.generateAIAnalysis({
        summary: '包含HTML字符：<div>内容</div>',
        keywords: ['HTML', '内容'],
        sentiment: { polarity: 0.4, confidence: 0.7, label: 'neutral' },
        score: 3.8
      })

      render(<AisSummaryCard analysis={htmlAnalysis} />)

      // HTML字符应该被转义或安全显示
      expect(screen.getByText('<div>内容</div>')).toBeInTheDocument()
    })

    it('应该处理undefined分析', () => {
      expect(() => {
        render(<AisSummaryCard analysis={undefined} />)
      }).not.toThrow()

      expect(screen.getByText('暂无分析结果')).toBeInTheDocument()
    })

    it('应该处理null分析', () => {
      expect(() => {
        render(<AisSummaryCard analysis={null} />)
      }).not.toThrow()

      expect(screen.getByText('暂无分析结果')).toBeInTheDocument()
    })
  })

  describe('性能测试', () => {
    it('应该快速渲染组件', () => {
      const startTime = performance.now()

      render(<AisSummaryCard analysis={mockAIAnalysis} />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100)
    })

    it('应该处理大量关键词', () => {
      const manyKeywordsAnalysis = mockDataGenerators.generateAIAnalysis({
        summary: '多关键词摘要',
        keywords: Array.from({ length: 50 }, (_, i) => `关键词${i + 1}`),
        sentiment: { polarity: 0.5, confidence: 0.8, label: 'positive' },
        score: 4.2
      })

      const startTime = performance.now()

      render(<AisSummaryCard analysis={manyKeywordsAnalysis} />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(200)
    })

    it('应该支持组件复用', () => {
      const analyses = Array.from({ length: 10 }, (_, i) =>
        mockDataGenerators.generateAIAnalysis({
          summary: `摘要${i + 1}`,
          keywords: [`关键词${i + 1}`],
          score: 4.0 + (i * 0.1)
        })
      )

      const startTime = performance.now()

      const cards = analyses.map((analysis, index) => (
        <AisSummaryCard key={index} analysis={analysis} />
      ))

      render(<div>{cards}</div>)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(500)
    })
  })

  describe('集成测试', () => {
    it('应该与其他AI组件协调工作', () => {
      render(
        <div>
          <AisSummaryCard analysis={mockAIAnalysis} />
          <div data-testid="other-component">其他组件</div>
        </div>
      )

      expect(screen.getByTestId('other-component')).toBeInTheDocument()
    })

    it('应该在父容器中正确布局', () => {
      render(
        <div data-testid="parent-container" style={{ display: 'flex', gap: '16px' }}>
          <AisSummaryCard analysis={mockAIAnalysis} />
          <div data-testid="sibling-component">兄弟组件</div>
        </div>
      )

      const parent = screen.getByTestId('parent-container')
      const card = screen.getByTestId('ai-summary-card')
      const sibling = screen.getByTestId('sibling-component')

      expect(parent).toContainElement(card)
      expect(parent).toContainElement(sibling)
    })
  })
})