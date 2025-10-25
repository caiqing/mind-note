// 摘要服务测试

import { SummaryService } from '../summary-service'
import { openaiProvider } from '@/lib/ai/providers/openai-provider'
import { claudeProvider } from '@/lib/ai/providers/claude-provider'

// Mock providers
jest.mock('@/lib/ai/providers/openai-provider')
jest.mock('@/lib/ai/providers/claude-provider')
jest.mock('@/lib/ai/config', () => ({
  aiConfig: {
    providers: {
      openai: {
        name: 'openai',
        type: 'openai' as const
      },
      anthropic: {
        name: 'anthropic',
        type: 'anthropic' as const
      }
    },
    settings: {
      analysisTimeout: 30000,
      defaultProvider: 'openai'
    }
  }
}))

const mockOpenaiProvider = openaiProvider as jest.Mocked<typeof openaiProvider>
const mockClaudeProvider = claudeProvider as jest.Mocked<typeof claudeProvider>

describe('SummaryService', () => {
  let summaryService: SummaryService

  beforeEach(() => {
    summaryService = new SummaryService()
    jest.clearAllMocks()
  })

  describe('generateSummary', () => {
    const mockNoteId = 'note-123'
    const mockTitle = '测试笔记标题'
    const mockContent = '这是一个测试笔记的内容。它包含了一些重要的信息和数据。我们需要对这些信息进行整理和分析。'

    it('应该成功生成基础摘要', async () => {
      // Arrange
      mockOpenaiProvider.generateText.mockResolvedValue({
        text: JSON.stringify({
          summary: '这是一个包含重要信息的测试笔记，需要进行整理和分析。',
          keyPoints: ['重要信息', '数据整理', '分析需求']
        }),
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 }
      })

      // Act
      const result = await summaryService.generateSummary(
        mockNoteId,
        mockTitle,
        mockContent
      )

      // Assert
      expect(result).toBeDefined()
      expect(result.text).toBe('这是一个包含重要信息的测试笔记，需要进行整理和分析。')
      expect(result.keyPoints).toEqual(['重要信息', '数据整理', '分析需求'])
      expect(result.provider).toBe('openai')
      expect(result.quality).toBeDefined()
      expect(result.metadata).toBeDefined()
    })

    it('应该处理短内容错误', async () => {
      // Arrange
      const shortContent = '短内容'

      // Act & Assert
      await expect(
        summaryService.generateSummary(mockNoteId, mockTitle, shortContent)
      ).rejects.toThrow('内容过短，无法生成有意义的摘要')
    })

    it('应该根据内容长度选择合适的提供商', async () => {
      // Arrange
      const longContent = 'A'.repeat(1000)
      mockClaudeProvider.generateText.mockResolvedValue({
        text: JSON.stringify({
          summary: '这是一个长内容的摘要',
          keyPoints: []
        }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      // Act
      const result = await summaryService.generateSummary(
        mockNoteId,
        mockTitle,
        longContent,
        { maxLength: 600 }
      )

      // Assert
      expect(mockClaudeProvider.generateText).toHaveBeenCalled()
      expect(result.provider).toBe('anthropic')
    })

    it('应该处理不同的摘要风格', async () => {
      // Arrange
      mockOpenaiProvider.generateText.mockResolvedValue({
        text: JSON.stringify({
          summary: '• 要点1\n• 要点2\n• 要点3',
          keyPoints: ['关键点1', '关键点2']
        }),
        usage: { promptTokens: 60, completionTokens: 40, totalTokens: 100 }
      })

      // Act
      const result = await summaryService.generateSummary(
        mockNoteId,
        mockTitle,
        mockContent,
        { style: 'bullet' }
      )

      // Assert
      expect(result.text).toBe('• 要点1\n• 要点2\n• 要点3')
      expect(result.metadata.options?.style).toBe('bullet')
    })

    it('应该处理预算不足的情况', async () => {
      // Arrange - 模拟预算检查失败
      const checkBudgetSpy = jest.spyOn(summaryService as any, 'checkBudget')
      checkBudgetSpy.mockResolvedValue(false)

      // Act & Assert
      await expect(
        summaryService.generateSummary(mockNoteId, mockTitle, mockContent)
      ).rejects.toThrow('预算不足，无法生成摘要')

      checkBudgetSpy.mockRestore()
    })
  })

  describe('generateBatchSummaries', () => {
    const mockNotes = [
      {
        id: 'note-1',
        title: '笔记1',
        content: '这是第一个笔记的内容'
      },
      {
        id: 'note-2',
        title: '笔记2',
        content: '这是第二个笔记的内容'
      },
      {
        id: 'note-3',
        title: '笔记3',
        content: '这是第三个笔记的内容'
      }
    ]

    it('应该成功处理批量摘要生成', async () => {
      // Arrange
      mockOpenaiProvider.generateText.mockResolvedValue({
        text: JSON.stringify({
          summary: '摘要内容',
          keyPoints: ['要点']
        }),
        usage: { promptTokens: 30, completionTokens: 20, totalTokens: 50 }
      })

      // Act
      const results = await summaryService.generateBatchSummaries(mockNotes)

      // Assert
      expect(results).toHaveLength(3)
      expect(results[0].summary).toBeDefined()
      expect(results[0].noteId).toBe('note-1')
      expect(results[1].summary).toBeDefined()
      expect(results[1].noteId).toBe('note-2')
      expect(results[2].summary).toBeDefined()
      expect(results[2].noteId).toBe('note-3')
    })

    it('应该处理部分失败的批量操作', async () => {
      // Arrange
      mockOpenaiProvider.generateText
        .mockResolvedValueOnce({
          text: JSON.stringify({
            summary: '成功摘要',
            keyPoints: []
          }),
          usage: { promptTokens: 30, completionTokens: 20, totalTokens: 50 }
        })
        .mockRejectedValueOnce(new Error('API错误'))
        .mockResolvedValueOnce({
          text: JSON.stringify({
            summary: '另一个成功摘要',
            keyPoints: []
          }),
          usage: { promptTokens: 30, completionTokens: 20, totalTokens: 50 }
        })

      // Act
      const results = await summaryService.generateBatchSummaries(mockNotes)

      // Assert
      expect(results).toHaveLength(3)
      expect(results[0].summary).toBeDefined()
      expect(results[0].error).toBeUndefined()
      expect(results[1].error).toBe('API错误')
      expect(results[1].summary).toBeUndefined()
      expect(results[2].summary).toBeDefined()
      expect(results[2].error).toBeUndefined()
    })
  })

  describe('generateComparativeSummaries', () => {
    const mockTitle = '对比测试标题'
    const mockContent = '这是用于对比测试的内容。包含了一些需要摘要的信息。'

    it('应该生成多个提供商的摘要对比', async () => {
      // Arrange
      mockOpenaiProvider.generateText.mockResolvedValue({
        text: JSON.stringify({
          summary: 'OpenAI生成的摘要',
          keyPoints: ['要点1', '要点2']
        }),
        usage: { promptTokens: 40, completionTokens: 30, totalTokens: 70 }
      })

      mockClaudeProvider.generateText.mockResolvedValue({
        text: JSON.stringify({
          summary: 'Claude生成的摘要',
          keyPoints: ['要点A', '要点B']
        }),
        usage: { promptTokens: 40, completionTokens: 30, totalTokens: 70 }
      })

      // Act
      const results = await summaryService.generateComparativeSummaries(
        mockTitle,
        mockContent,
        ['openai', 'anthropic']
      )

      // Assert
      expect(results).toHaveLength(2)
      expect(results[0].provider).toBe('openai')
      expect(results[0].summary.text).toBe('OpenAI生成的摘要')
      expect(results[1].provider).toBe('anthropic')
      expect(results[1].summary.text).toBe('Claude生成的摘要')
    })

    it('应该按质量排序结果', async () => {
      // Arrange
      mockOpenaiProvider.generateText.mockResolvedValue({
        text: JSON.stringify({
          summary: '质量较低的摘要',
          keyPoints: ['要点']
        }),
        usage: { promptTokens: 30, completionTokens: 20, totalTokens: 50 }
      })

      mockClaudeProvider.generateText.mockResolvedValue({
        text: JSON.stringify({
          summary: '这是一个质量很高的摘要，包含了所有重要信息。',
          keyPoints: ['重要要点1', '重要要点2', '重要要点3']
        }),
        usage: { promptTokens: 50, completionTokens: 40, totalTokens: 90 }
      })

      // Act
      const results = await summaryService.generateComparativeSummaries(
        mockTitle,
        mockContent,
        ['openai', 'anthropic']
      )

      // Assert
      expect(results[0].summary.quality.overall).toBeGreaterThanOrEqual(
        results[1].summary.quality.overall
      )
    })

    it('应该处理不存在的提供商', async () => {
      // Act
      const results = await summaryService.generateComparativeSummaries(
        mockTitle,
        mockContent,
        ['nonexistent']
      )

      // Assert
      expect(results).toHaveLength(0)
    })
  })

  describe('content preprocessing', () => {
    it('应该正确处理Markdown内容', () => {
      const markdownContent = `
# 标题

这是一个包含 **粗体** 和 *斜体* 的段落。

## 子标题

这里有一个 \`代码片段\` 和一个 [链接](https://example.com)。

\`\`\`javascript
console.log('代码块');
\`\`\`

![图片](image.jpg)
      `

      const processed = (summaryService as any).preprocessContent(markdownContent)

      expect(processed).not.toContain('#')
      expect(processed).not.toContain('**')
      expect(processed).not.toContain('*')
      expect(processed).not.toContain('`')
      expect(processed).not.toContain('[')
      expect(processed).not.toContain('![')
      expect(processed).toContain('标题')
      expect(processed).toContain('粗体')
      expect(processed).toContain('斜体')
    })

    it('应该移除多余空白字符', () => {
      const messyContent = '  多个   空格\n\n\n换行符  \t\t制表符  '

      const processed = (summaryService as any).preprocessContent(messyContent)

      expect(processed).toBe('多个 空格 换行符 制表符')
    })
  })

  describe('quality evaluation', () => {
    it('应该正确计算摘要质量指标', async () => {
      const original = '这是一个包含多个重要概念的原始文本内容，需要进行准确的摘要。'
      const summary = '这是包含重要概念的原始文本摘要。'

      const quality = await (summaryService as any).evaluateSummaryQuality(
        original,
        summary,
        {}
      )

      expect(quality).toBeDefined()
      expect(quality.clarity).toBeGreaterThanOrEqual(0)
      expect(quality.clarity).toBeLessThanOrEqual(1)
      expect(quality.completeness).toBeGreaterThanOrEqual(0)
      expect(quality.completeness).toBeLessThanOrEqual(1)
      expect(quality.conciseness).toBeGreaterThanOrEqual(0)
      expect(quality.conciseness).toBeLessThanOrEqual(1)
      expect(quality.relevance).toBeGreaterThanOrEqual(0)
      expect(quality.relevance).toBeLessThanOrEqual(1)
      expect(quality.overall).toBeGreaterThanOrEqual(0)
      expect(quality.overall).toBeLessThanOrEqual(1)
    })
  })

  describe('error handling', () => {
    it('应该处理OpenAI API错误', async () => {
      mockOpenaiProvider.generateText.mockRejectedValue(new Error('OpenAI API错误'))

      await expect(
        summaryService.generateSummary('note-1', '标题', '内容', { maxLength: 100 })
      ).rejects.toThrow('OpenAI摘要生成失败: OpenAI API错误')
    })

    it('应该处理Claude API错误', async () => {
      const longContent = 'A'.repeat(1000)
      mockClaudeProvider.generateText.mockRejectedValue(new Error('Claude API错误'))

      await expect(
        summaryService.generateSummary('note-1', '标题', longContent, { maxLength: 600 })
      ).rejects.toThrow('Claude摘要生成失败: Claude API错误')
    })

    it('应该处理JSON解析错误', async () => {
      mockOpenaiProvider.generateText.mockResolvedValue({
        text: '这不是有效的JSON格式',
        usage: { promptTokens: 30, completionTokens: 20, totalTokens: 50 }
      })

      const result = await summaryService.generateSummary('note-1', '标题', '内容')

      expect(result.text).toBe('这不是有效的JSON格式')
      expect(result.keyPoints).toEqual([])
    })
  })
})