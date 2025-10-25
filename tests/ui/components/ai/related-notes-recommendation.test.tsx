/**
 * 相关笔记推荐组件UI测试
 *
 * 测试相关笔记推荐组件的所有功能和交互
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RelatedNotesRecommendation } from '@/components/ai/related-notes-recommendation'
import { UITestUtils, mockDataGenerators } from '../../setup/ui-test-setup'

describe('RelatedNotesRecommendation组件', () => {
  const mockRelatedNotes = [
    {
      id: 'note-1',
      title: '人工智能基础概念',
      content: '人工智能是一门研究如何使计算机模拟人类智能行为的科学...',
      similarity: 0.95,
      tags: ['AI', '机器学习', '基础'],
      updatedAt: '2024-01-15T10:30:00Z',
      readTime: 5,
      reasons: ['相同主题', '相似关键词', '时间相近']
    },
    {
      id: 'note-2',
      title: '机器学习算法详解',
      content: '机器学习是人工智能的一个分支，专注于算法和统计模型...',
      similarity: 0.88,
      tags: ['算法', '机器学习', '深度学习'],
      updatedAt: '2024-01-14T15:45:00Z',
      readTime: 8,
      reasons: ['技术关联', '标签相似']
    },
    {
      id: 'note-3',
      title: '神经网络入门指南',
      content: '神经网络是深度学习的基础，模拟人脑神经元的工作方式...',
      similarity: 0.82,
      tags: ['神经网络', '深度学习', '入门'],
      updatedAt: '2024-01-13T09:20:00Z',
      readTime: 6,
      reasons: ['内容相关', '推荐热度高']
    },
    {
      id: 'note-4',
      title: '数据科学实践',
      content: '数据科学结合统计学、数学和计算机科学来分析数据...',
      similarity: 0.75,
      tags: ['数据科学', '实践', '分析'],
      updatedAt: '2024-01-12T14:15:00Z',
      readTime: 10,
      reasons: ['跨领域关联']
    },
    {
      id: 'note-5',
      title: 'Python编程基础',
      content: 'Python是数据科学和机器学习最常用的编程语言...',
      similarity: 0.68,
      tags: ['Python', '编程', '基础'],
      updatedAt: '2024-01-11T11:00:00Z',
      readTime: 7,
      reasons: ['工具相关', '技能补充']
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染相关笔记推荐列表', () => {
      render(<RelatedNotesRecommendation notes={mockRelatedNotes} />)

      expect(screen.getByText('相关笔记推荐')).toBeInTheDocument()
      expect(screen.getByText('基于当前内容为您推荐相关笔记')).toBeInTheDocument()

      mockRelatedNotes.forEach(note => {
        expect(screen.getByText(note.title)).toBeInTheDocument()
      })

      expect(screen.getByText('5个推荐')).toBeInTheDocument()
    })

    it('应该显示相似度评分', () => {
      render(<RelatedNotesRecommendation notes={mockRelatedNotes} showSimilarity={true} />)

      mockRelatedNotes.forEach(note => {
        expect(screen.getByText(`${Math.round(note.similarity * 100)}%`)).toBeInTheDocument()
      })
    })

    it('应该显示推荐理由', () => {
      render(<RelatedNotesRecommendation notes={mockRelatedNotes} showReasons={true} />)

      mockRelatedNotes.forEach(note => {
        note.reasons.forEach(reason => {
          expect(screen.getByText(reason)).toBeInTheDocument()
        })
      })
    })

    it('应该支持自定义标题', () => {
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          title="为您推荐"
          subtitle="基于智能分析的相关内容"
        />
      )

      expect(screen.getByText('为您推荐')).toBeInTheDocument()
      expect(screen.getByText('基于智能分析的相关内容')).toBeInTheDocument()
      expect(screen.queryByText('相关笔记推荐')).not.toBeInTheDocument()
    })

    it('应该处理空推荐列表', () => {
      render(<RelatedNotesRecommendation notes={[]} />)

      expect(screen.getByText('暂无相关推荐')).toBeInTheDocument()
      expect(screen.getByText('浏览更多笔记后，我们将为您推荐相关内容')).toBeInTheDocument()
    })

    it('应该支持自定义样式类名', () => {
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          className="custom-recommendation"
        />
      )

      const container = screen.getByTestId('related-notes-recommendation')
      expect(container).toHaveClass('custom-recommendation')
    })
  })

  describe('笔记卡片渲染测试', () => {
    it('应该正确渲染笔记标题和内容预览', () => {
      render(<RelatedNotesRecommendation notes={mockRelatedNotes} />)

      mockRelatedNotes.forEach(note => {
        expect(screen.getByText(note.title)).toBeInTheDocument()
        // 内容应该被截断显示
        expect(screen.getByText(/内容预览/)).toBeInTheDocument()
      })
    })

    it('应该显示笔记元信息', () => {
      render(<RelatedNotesRecommendation notes={mockRelatedNotes} showMetadata={true} />)

      mockRelatedNotes.forEach(note => {
        expect(screen.getByText(`${note.readTime}分钟阅读`)).toBeInTheDocument()

        // 显示更新时间
        const updateDate = new Date(note.updatedAt).toLocaleDateString()
        expect(screen.getByText(updateDate)).toBeInTheDocument()
      })
    })

    it('应该显示笔记标签', () => {
      render(<RelatedNotesRecommendation notes={mockRelatedNotes} showTags={true} />)

      mockRelatedNotes.forEach(note => {
        note.tags.forEach(tag => {
          expect(screen.getByText(tag)).toBeInTheDocument()
        })
      })
    })

    it('应该支持不同的卡片布局', () => {
      const { rerender } = render(
        <RelatedNotesRecommendation notes={mockRelatedNotes} layout="grid" />
      )

      expect(screen.getByTestId('recommendation-grid')).toBeInTheDocument()

      rerender(<RelatedNotesRecommendation notes={mockRelatedNotes} layout="list" />)
      expect(screen.getByTestId('recommendation-list')).toBeInTheDocument()

      rerender(<RelatedNotesRecommendation notes={mockRelatedNotes} layout="compact" />)
      expect(screen.getByTestId('recommendation-compact')).toBeInTheDocument()
    })

    it('应该限制最大推荐数量', () => {
      render(<RelatedNotesRecommendation notes={mockRelatedNotes} maxRecommendations={3} />)

      expect(screen.getByText('3个推荐')).toBeInTheDocument()
      expect(screen.getByText('人工智能基础概念')).toBeInTheDocument()
      expect(screen.getByText('机器学习算法详解')).toBeInTheDocument()
      expect(screen.getByText('神经网络入门指南')).toBeInTheDocument()
      expect(screen.queryByText('数据科学实践')).not.toBeInTheDocument()
      expect(screen.queryByText('Python编程基础')).not.toBeInTheDocument()
    })
  })

  describe('交互测试', () => {
    it('应该支持笔记点击事件', async () => {
      const handleNoteClick = vi.fn()
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          onNoteClick={handleNoteClick}
        />
      )

      const firstNote = screen.getByText('人工智能基础概念')
      await userEvent.click(firstNote)

      expect(handleNoteClick).toHaveBeenCalledWith(mockRelatedNotes[0], expect.any(Object))
    })

    it('应该支持标签点击事件', async () => {
      const handleTagClick = vi.fn()
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          showTags={true}
          onTagClick={handleTagClick}
        />
      )

      const firstTag = screen.getByText('AI')
      await userEvent.click(firstTag)

      expect(handleTagClick).toHaveBeenCalledWith('AI', expect.any(Object))
    })

    it('应该支持收藏功能', async () => {
      const handleFavorite = vi.fn()
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          onFavorite={handleFavorite}
          showFavorite={true}
        />
      )

      const favoriteButtons = screen.getAllByRole('button', { name: /收藏/ })
      expect(favoriteButtons.length).toBe(mockRelatedNotes.length)

      await userEvent.click(favoriteButtons[0])
      expect(handleFavorite).toHaveBeenCalledWith(mockRelatedNotes[0], true)
    })

    it('应该支持分享功能', async () => {
      const handleShare = vi.fn()
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          onShare={handleShare}
          showShare={true}
        />
      )

      const shareButtons = screen.getAllByRole('button', { name: /分享/ })
      expect(shareButtons.length).toBe(mockRelatedNotes.length)

      await userEvent.click(shareButtons[0])
      expect(handleShare).toHaveBeenCalledWith(mockRelatedNotes[0])
    })

    it('应该支持刷新推荐', async () => {
      const handleRefresh = vi.fn()
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          onRefresh={handleRefresh}
          showRefresh={true}
        />
      )

      const refreshButton = screen.getByRole('button', { name: /刷新推荐/ })
      await userEvent.click(refreshButton)

      expect(handleRefresh).toHaveBeenCalled()
    })

    it('应该支持排序功能', async () => {
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          showSort={true}
        />
      )

      const sortButton = screen.getByRole('button', { name: /排序/ })
      await userEvent.click(sortButton)

      const sortBySimilarity = screen.getByText('按相似度排序')
      await userEvent.click(sortBySimilarity)

      // 验证排序是否生效
      const noteCards = screen.getAllByTestId(/^note-card-/)
      expect(noteCards[0]).toHaveTextContent('人工智能基础概念') // 相似度最高
    })
  })

  describe('相似度可视化测试', () => {
    it('应该显示相似度进度条', () => {
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          showSimilarity={true}
          similarityType="progress"
        />
      )

      mockRelatedNotes.forEach(note => {
        const progressBar = screen.getByTestId(`similarity-progress-${note.id}`)
        expect(progressBar).toBeInTheDocument()

        const progressFill = progressBar.querySelector('[role="progressbar"]')
        expect(progressFill).toHaveAttribute('aria-valuenow', String(Math.round(note.similarity * 100)))
      })
    })

    it('应该显示相似度星级评分', () => {
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          showSimilarity={true}
          similarityType="stars"
        />
      )

      mockRelatedNotes.forEach(note => {
        const expectedStars = Math.ceil(note.similarity * 5)
        const filledStars = screen.getAllByTestId(`star-filled-${note.id}`)
        expect(filledStars.length).toBe(expectedStars)
      })
    })

    it('应该支持自定义相似度阈值', () => {
      const filteredNotes = mockRelatedNotes.filter(note => note.similarity >= 0.8)
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          similarityThreshold={0.8}
        />
      )

      expect(screen.getByText(`${filteredNotes.length}个推荐`)).toBeInTheDocument()
      expect(screen.getByText('人工智能基础概念')).toBeInTheDocument()
      expect(screen.getByText('机器学习算法详解')).toBeInTheDocument()
      expect(screen.getByText('神经网络入门指南')).toBeInTheDocument()
      expect(screen.queryByText('数据科学实践')).not.toBeInTheDocument()
    })
  })

  describe('过滤和搜索测试', () => {
    it('应该支持按标签过滤', async () => {
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          showFilter={true}
        />
      )

      const filterButton = screen.getByRole('button', { name: /筛选/ })
      await userEvent.click(filterButton)

      const machineLearningTag = screen.getByText('机器学习')
      await userEvent.click(machineLearningTag)

      expect(screen.getByText('人工智能基础概念')).toBeInTheDocument()
      expect(screen.getByText('机器学习算法详解')).toBeInTheDocument()
      expect(screen.queryByText('神经网络入门指南')).not.toBeInTheDocument()
    })

    it('应该支持搜索功能', async () => {
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          showSearch={true}
        />
      )

      const searchInput = screen.getByPlaceholderText('搜索推荐笔记...')
      await userEvent.type(searchInput, '神经网络')

      expect(screen.getByText('神经网络入门指南')).toBeInTheDocument()
      expect(screen.queryByText('人工智能基础概念')).not.toBeInTheDocument()
      expect(screen.queryByText('机器学习算法详解')).not.toBeInTheDocument()
    })

    it('应该支持按时间范围过滤', async () => {
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          showFilter={true}
        />
      )

      const filterButton = screen.getByRole('button', { name: /筛选/ })
      await userEvent.click(filterButton)

      const recentFilter = screen.getByText('最近3天')
      await userEvent.click(recentFilter)

      // 应该只显示最近3天的笔记
      expect(screen.getByText('人工智能基础概念')).toBeInTheDocument()
      expect(screen.queryByText('Python编程基础')).not.toBeInTheDocument()
    })
  })

  describe('可访问性测试', () => {
    it('应该具有语义化结构', () => {
      render(<RelatedNotesRecommendation notes={mockRelatedNotes} />)

      expect(screen.getByRole('region', { name: /相关笔记推荐/ })).toBeInTheDocument()
      expect(screen.getByRole('list')).toBeInTheDocument()

      mockRelatedNotes.forEach(note => {
        const noteCard = screen.getByTestId(`note-card-${note.id}`)
        expect(noteCard).toHaveAttribute('role', 'listitem')
      })
    })

    it('笔记卡片应该具有可访问的标签', () => {
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          showSimilarity={true}
        />
      )

      mockRelatedNotes.forEach(note => {
        const noteCard = screen.getByTestId(`note-card-${note.id}`)
        const expectedLabel = `${note.title}, 相似度 ${Math.round(note.similarity * 100)}%, ${note.readTime}分钟阅读`
        expect(noteCard).toHaveAttribute('aria-label', expectedLabel)
      })
    })

    it('应该支持键盘导航', async () => {
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          showKeyboardNav={true}
        />
      )

      const firstNote = screen.getByText('人工智能基础概念')
      firstNote.focus()

      await userEvent.keyboard('{ArrowDown}')
      // 应该移动到下一个笔记

      await userEvent.keyboard('{Enter}')
      // 应该触发点击事件
    })

    it('相似度可视化应该具有可访问性', () => {
      render(
        <RelatedNotesRecommendation
          notes={mockRelatedNotes}
          showSimilarity={true}
          similarityType="progress"
        />
      )

      mockRelatedNotes.forEach(note => {
        const progressBar = screen.getByTestId(`similarity-progress-${note.id}`)
        expect(progressBar).toHaveAttribute('role', 'progressbar')
        expect(progressBar).toHaveAttribute('aria-label', `相似度 ${Math.round(note.similarity * 100)}%`)
      })
    })
  })

  describe('响应式测试', () => {
    it('应该在移动端正确显示', async () => {
      render(<RelatedNotesRecommendation notes={mockRelatedNotes} />)

      await UITestUtils.setViewport(375, 667)

      const container = screen.getByTestId('related-notes-recommendation')
      expect(UITestUtils.isElementVisible(container)).toBe(true)

      // 移动端应该使用紧凑布局
      const noteCards = screen.getAllByTestId(/^note-card-/)
      noteCards.forEach(card => {
        expect(card).toHaveClass('mobile-compact')
      })
    })

    it('应该在平板端正确显示', async () => {
      render(<RelatedNotesRecommendation notes={mockRelatedNotes} />)

      await UITestUtils.setViewport(768, 1024)

      const container = screen.getByTestId('related-notes-recommendation')
      expect(UITestUtils.isElementVisible(container)).toBe(true)

      // 平板端应该使用中等布局
      const noteCards = screen.getAllByTestId(/^note-card-/)
      noteCards.forEach(card => {
        expect(card).toHaveClass('tablet-medium')
      })
    })

    it('应该在桌面端正确显示', async () => {
      render(<RelatedNotesRecommendation notes={mockRelatedNotes} />)

      await UITestUtils.setViewport(1920, 1080)

      const container = screen.getByTestId('related-notes-recommendation')
      expect(UITestUtils.isElementVisible(container)).toBe(true)

      // 桌面端应该使用完整布局
      const noteCards = screen.getAllByTestId(/^note-card-/)
      noteCards.forEach(card => {
        expect(card).toHaveClass('desktop-full')
      })
    })

    it('应该在不同尺寸下保持可访问性', async () => {
      const viewports = [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1920, height: 1080 }
      ]

      render(<RelatedNotesRecommendation notes={mockRelatedNotes} />)
      const container = screen.getByTestId('related-notes-recommendation')

      const results = await UITestUtils.checkResponsiveLayout(container, viewports)

      results.forEach(result => {
        expect(result.visible).toBe(true)
        expect(UITestUtils.isElementAccessible(container)).toBe(true)
      })
    })
  })

  describe('主题测试', () => {
    it('应该支持主题切换', async () => {
      render(<RelatedNotesRecommendation notes={mockRelatedNotes} />)

      const container = screen.getByTestId('related-notes-recommendation')
      const themes = ['light', 'dark']

      const results = await UITestUtils.verifyThemeToggle(container, themes)

      results.forEach(result => {
        expect(result.applied).toBeDefined()
      })
    })

    it('应该在暗色主题下正确显示', async () => {
      render(<RelatedNotesRecommendation notes={mockRelatedNotes} />)

      document.documentElement.setAttribute('data-theme', 'dark')
      await UITestUtils.delay(100)

      const container = screen.getByTestId('related-notes-recommendation')
      expect(UITestUtils.isElementVisible(container)).toBe(true)
    })
  })

  describe('数据验证测试', () => {
    it('应该处理无效的笔记数据', () => {
      const invalidNotes = [
        { id: null, title: '', content: '', similarity: -1 },
        { id: undefined, title: 'undefined标题', content: 'undefined内容', similarity: 2 }
      ]

      expect(() => {
        render(<RelatedNotesRecommendation notes={invalidNotes} />)
      }).not.toThrow()
    })

    it('应该处理重复的笔记ID', () => {
      const duplicateNotes = [
        { id: 'duplicate', title: '笔记1', content: '内容1', similarity: 0.9 },
        { id: 'duplicate', title: '笔记2', content: '内容2', similarity: 0.8 }
      ]

      expect(() => {
        render(<RelatedNotesRecommendation notes={duplicateNotes} />)
      }).not.toThrow()
    })

    it('应该处理极长的笔记标题', () => {
      const longTitle = '这是一个非常非常长的笔记标题，用来测试组件对长文本的处理能力和显示效果'
      const longNote = {
        id: 'long-note',
        title: longTitle,
        content: '正常内容',
        similarity: 0.9
      }

      render(<RelatedNotesRecommendation notes={[longNote]} />)

      // 应该截断或换行显示长标题
      const titleElement = screen.getByText(longTitle)
      expect(titleElement).toBeInTheDocument()
    })

    it('应该处理特殊字符的笔记内容', () => {
      const specialNotes = [
        {
          id: 'special-1',
          title: '特殊字符测试',
          content: '包含<标签>和"引号"的内容',
          similarity: 0.9
        },
        {
          id: 'special-2',
          title: 'JavaScript代码',
          content: 'console.log("Hello World");',
          similarity: 0.8
        }
      ]

      render(<RelatedNotesRecommendation notes={specialNotes} />)

      specialNotes.forEach(note => {
        expect(screen.getByText(note.title)).toBeInTheDocument()
      })
    })
  })

  describe('性能测试', () => {
    it('应该快速渲染少量推荐', () => {
      const startTime = performance.now()

      render(<RelatedNotesRecommendation notes={mockRelatedNotes} />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100)
    })

    it('应该处理大量推荐', () => {
      const manyNotes = Array.from({ length: 50 }, (_, i) => ({
        id: `note-${i}`,
        title: `推荐笔记${i}`,
        content: `这是第${i}个推荐笔记的内容`,
        similarity: Math.random(),
        tags: [`标签${i % 10}`],
        updatedAt: new Date().toISOString(),
        readTime: Math.floor(Math.random() * 15) + 1,
        reasons: ['相关推荐']
      }))

      const startTime = performance.now()

      render(<RelatedNotesRecommendation notes={manyNotes} />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(1000)
      expect(screen.getByText('50个推荐')).toBeInTheDocument()
    })

    it('应该支持虚拟滚动（如果实现）', () => {
      const manyNotes = Array.from({ length: 100 }, (_, i) => ({
        id: `note-${i}`,
        title: `推荐笔记${i}`,
        content: `这是第${i}个推荐笔记的内容`,
        similarity: Math.random(),
        tags: [`标签${i % 10}`],
        updatedAt: new Date().toISOString(),
        readTime: Math.floor(Math.random() * 15) + 1,
        reasons: ['相关推荐']
      }))

      const startTime = performance.now()

      render(
        <RelatedNotesRecommendation
          notes={manyNotes}
          virtualized={true}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(500)
    })
  })

  describe('集成测试', () => {
    it('应该与其他AI组件协调工作', () => {
      render(
        <div data-testid="ai-components">
          <RelatedNotesRecommendation notes={mockRelatedNotes} />
          <div data-testid="other-ai-component">其他AI组件</div>
        </div>
      )

      expect(screen.getByTestId('other-ai-component')).toBeInTheDocument()
      expect(screen.getByTestId('related-notes-recommendation')).toBeInTheDocument()
    })

    it('应该在父容器中正确布局', () => {
      render(
        <div data-testid="parent-container" style={{ display: 'flex', gap: '16px' }}>
          <RelatedNotesRecommendation notes={mockRelatedNotes} />
          <div data-testid="sibling-component">兄弟组件</div>
        </div>
      )

      const parent = screen.getByTestId('parent-container')
      const recommendation = screen.getByTestId('related-notes-recommendation')
      const sibling = screen.getByTestId('sibling-component')

      expect(parent).toContainElement(recommendation)
      expect(parent).toContainElement(sibling)
    })

    it('应该与笔记详情页面集成', async () => {
      const handleNoteSelect = vi.fn()

      render(
        <div>
          <div data-testid="current-note">当前笔记：深度学习基础</div>
          <RelatedNotesRecommendation
            notes={mockRelatedNotes}
            onNoteClick={handleNoteSelect}
          />
        </div>
      )

      const relatedNote = screen.getByText('人工智能基础概念')
      await userEvent.click(relatedNote)

      expect(handleNoteSelect).toHaveBeenCalledWith(mockRelatedNotes[0], expect.any(Object))
    })
  })
})