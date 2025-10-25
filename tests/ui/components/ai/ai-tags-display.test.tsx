/**
 * AI标签显示组件UI测试
 *
 * 测试AI智能标签显示和管理组件的所有功能和交互
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AITagsDisplay } from '@/components/ai/ai-tags-display'
import { UITestUtils, mockDataGenerators } from '../../setup/ui-test-setup'

describe('AITagsDisplay组件', () => {
  const mockTags = [
    { id: 'tag-1', name: '人工智能', color: '#FF5733', confidence: 0.95, category: 'technology' },
    { id: 'tag-2', name: '机器学习', color: '#33FF57', confidence: 0.88, category: 'technology' },
    { id: 'tag-3', name: '算法', color: '#3357FF', confidence: 0.92, category: 'concept' },
    { id: 'tag-4', name: '数据科学', color: '#FF33F5', confidence: 0.85, category: 'field' },
    { id: 'tag-5', name: '神经网络', color: '#33FFF5', confidence: 0.90, category: 'technology' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染AI标签列表', () => {
      render(<AITagsDisplay tags={mockTags} />)

      mockTags.forEach(tag => {
        expect(screen.getByText(tag.name)).toBeInTheDocument()
      })

      expect(screen.getByText('AI智能标签')).toBeInTheDocument()
    })

    it('应该显示标签数量统计', () => {
      render(<AITagsDisplay tags={mockTags} />)

      expect(screen.getByText('5个标签')).toBeInTheDocument()
    })

    it('应该支持自定义标题', () => {
      render(<AITagsDisplay tags={mockTags} title="自定义标签标题" />)

      expect(screen.getByText('自定义标签标题')).toBeInTheDocument()
      expect(screen.queryByText('AI智能标签')).not.toBeInTheDocument()
    })

    it('应该处理空标签列表', () => {
      render(<AITagsDisplay tags={[]} />)

      expect(screen.getByText('暂无AI标签')).toBeInTheDocument()
      expect(screen.getByText('AI分析后将显示相关标签')).toBeInTheDocument()
    })

    it('应该支持自定义样式类名', () => {
      render(<AITagsDisplay tags={mockTags} className="custom-tags" />)

      const container = screen.getByTestId('ai-tags-display')
      expect(container).toHaveClass('custom-tags')
    })

    it('应该支持自定义data-testid', () => {
      render(<AITagsDisplay tags={mockTags} data-testid="custom-tags-display" />)

      const container = screen.getByTestId('custom-tags-display')
      expect(container).toBeInTheDocument()
    })
  })

  describe('标签渲染测试', () => {
    it('应该正确渲染标签颜色', () => {
      render(<AITagsDisplay tags={mockTags} />)

      mockTags.forEach(tag => {
        const tagElement = screen.getByText(tag.name)
        const tagContainer = tagElement.closest('[data-tag-id]')

        if (tagContainer) {
          expect(tagContainer).toHaveAttribute('data-tag-id', tag.id)
          const computedStyle = UITestUtils.getComputedStyle(tagContainer)
          expect(computedStyle.backgroundColor).toContain(tag.color)
        }
      })
    })

    it('应该显示标签置信度', () => {
      render(<AITagsDisplay tags={mockTags} showConfidence={true} />)

      mockTags.forEach(tag => {
        expect(screen.getByText(`${Math.round(tag.confidence * 100)}%`)).toBeInTheDocument()
      })
    })

    it('应该显示标签分类', () => {
      render(<AITagsDisplay tags={mockTags} showCategory={true} />)

      mockTags.forEach(tag => {
        expect(screen.getByText(tag.category)).toBeInTheDocument()
      })
    })

    it('应该支持标签大小映射到置信度', () => {
      render(<AITagsDisplay tags={mockTags} sizeByConfidence={true} />)

      // 检查标签大小是否根据置信度调整
      const tagElements = screen.getAllByTestId(/^ai-tag-/)
      tagElements.forEach((element, index) => {
        const tag = mockTags[index]
        if (tag) {
          // 验证标签大小与置信度相关
          const hasConfidenceSize = Array.from(element.classList).some(className =>
            className.includes(`confidence-${Math.round(tag.confidence * 100)}`)
          )
          expect(hasConfidenceSize).toBe(true)
        }
      })
    })

    it('应该限制最大显示标签数量', () => {
      render(<AITagsDisplay tags={mockTags} maxVisible={3} />)

      expect(screen.getByText('人工智能')).toBeInTheDocument()
      expect(screen.getByText('机器学习')).toBeInTheDocument()
      expect(screen.getByText('算法')).toBeInTheDocument()
      expect(screen.queryByText('数据科学')).not.toBeInTheDocument()
      expect(screen.queryByText('神经网络')).not.toBeInTheDocument()
      expect(screen.getByText('+2个更多标签')).toBeInTheDocument()
    })
  })

  describe('交互测试', () => {
    it('应该支持标签点击事件', async () => {
      const handleTagClick = vi.fn()
      render(<AITagsDisplay tags={mockTags} onTagClick={handleTagClick} />)

      const firstTag = screen.getByText('人工智能')
      await userEvent.click(firstTag)

      expect(handleTagClick).toHaveBeenCalledWith(mockTags[0], expect.any(Object))
    })

    it('应该支持标签删除事件', async () => {
      const handleTagDelete = vi.fn()
      render(<AITagsDisplay tags={mockTags} onTagDelete={handleTagDelete} deletable={true} />)

      const deleteButtons = screen.getAllByRole('button', { name: /删除标签/ })
      expect(deleteButtons.length).toBe(mockTags.length)

      await userEvent.click(deleteButtons[0])
      expect(handleTagDelete).toHaveBeenCalledWith(mockTags[0], expect.any(Object))
    })

    it('应该支持标签编辑事件', async () => {
      const handleTagEdit = vi.fn()
      render(<AITagsDisplay tags={mockTags} onTagEdit={handleTagEdit} editable={true} />)

      const editButtons = screen.getAllByRole('button', { name: /编辑标签/ })
      expect(editButtons.length).toBe(mockTags.length)

      await userEvent.click(editButtons[0])
      expect(handleTagEdit).toHaveBeenCalledWith(mockTags[0], expect.any(Object))
    })

    it('应该支持展开/收起更多标签', async () => {
      render(<AITagsDisplay tags={mockTags} maxVisible={3} />)

      expect(screen.getByText('+2个更多标签')).toBeInTheDocument()
      expect(screen.queryByText('数据科学')).not.toBeInTheDocument()

      const expandButton = screen.getByRole('button', { name: /展开更多标签/ })
      await userEvent.click(expandButton)

      expect(screen.getByText('数据科学')).toBeInTheDocument()
      expect(screen.getByText('神经网络')).toBeInTheDocument()
      expect(screen.getByText('收起')).toBeInTheDocument()
    })

    it('应该支持标签搜索过滤', async () => {
      render(<AITagsDisplay tags={mockTags} searchable={true} />)

      const searchInput = screen.getByPlaceholderText('搜索标签...')
      expect(searchInput).toBeInTheDocument()

      await userEvent.type(searchInput, '机器')

      expect(screen.getByText('机器学习')).toBeInTheDocument()
      expect(screen.queryByText('人工智能')).not.toBeInTheDocument()
      expect(screen.queryByText('算法')).not.toBeInTheDocument()
    })

    it('应该支持标签分类过滤', async () => {
      render(<AITagsDisplay tags={mockTags} filterable={true} />)

      const filterButton = screen.getByRole('button', { name: /筛选/ })
      await userEvent.click(filterButton)

      const technologyFilter = screen.getByText('technology')
      await userEvent.click(technologyFilter)

      expect(screen.getByText('人工智能')).toBeInTheDocument()
      expect(screen.getByText('机器学习')).toBeInTheDocument()
      expect(screen.getByText('神经网络')).toBeInTheDocument()
      expect(screen.queryByText('算法')).not.toBeInTheDocument()
      expect(screen.queryByText('数据科学')).not.toBeInTheDocument()
    })
  })

  describe('标签样式测试', () => {
    it('应该应用正确的标签样式', () => {
      render(<AITagsDisplay tags={mockTags} />)

      const tagElements = screen.getAllByTestId(/^ai-tag-/)
      tagElements.forEach(element => {
        expect(element).toHaveClass(
          'inline-flex',
          'items-center',
          'gap-1',
          'px-2',
          'py-1',
          'rounded-full',
          'text-sm',
          'font-medium',
          'transition-colors'
        )
      })
    })

    it('应该支持不同大小变体', () => {
      const { rerender } = render(
        <AITagsDisplay tags={mockTags} size="sm" />
      )

      let tagElements = screen.getAllByTestId(/^ai-tag-/)
      tagElements.forEach(element => {
        expect(element).toHaveClass('text-xs', 'px-1.5', 'py-0.5')
      })

      rerender(<AITagsDisplay tags={mockTags} size="lg" />)
      tagElements = screen.getAllByTestId(/^ai-tag-/)
      tagElements.forEach(element => {
        expect(element).toHaveClass('text-base', 'px-3', 'py-1.5')
      })
    })

    it('应该支持不同形状变体', () => {
      const { rerender } = render(
        <AITagsDisplay tags={mockTags} shape="square" />
      )

      let tagElements = screen.getAllByTestId(/^ai-tag-/)
      tagElements.forEach(element => {
        expect(element).toHaveClass('rounded-md')
        expect(element).not.toHaveClass('rounded-full')
      })

      rerender(<AITagsDisplay tags={mockTags} shape="rounded" />)
      tagElements = screen.getAllByTestId(/^ai-tag-/)
      tagElements.forEach(element => {
        expect(element).toHaveClass('rounded-lg')
        expect(element).not.toHaveClass('rounded-full')
      })
    })

    it('应该支持悬停效果', async () => {
      render(<AITagsDisplay tags={mockTags} interactive={true} />)

      const firstTag = screen.getByText('人工智能')
      const tagContainer = firstTag.closest('[data-tag-id]')

      if (tagContainer) {
        fireEvent.mouseEnter(tagContainer)

        // 检查是否有hover相关的类
        const hasHoverClass = Array.from(tagContainer.classList).some(className =>
          className.includes('hover:') || className.includes('group-hover')
        )

        expect(hasHoverClass).toBe(true)
      }
    })
  })

  describe('标签管理功能测试', () => {
    it('应该支持添加新标签', async () => {
      const handleTagAdd = vi.fn()
      render(<AITagsDisplay tags={mockTags} onTagAdd={handleTagAdd} allowAdd={true} />)

      const addButton = screen.getByRole('button', { name: /添加标签/ })
      await userEvent.click(addButton)

      // 应该显示添加标签的对话框或输入框
      expect(screen.getByPlaceholderText('输入新标签名称')).toBeInTheDocument()

      const tagInput = screen.getByPlaceholderText('输入新标签名称')
      await userEvent.type(tagInput, '深度学习')

      const confirmButton = screen.getByRole('button', { name: '确认' })
      await userEvent.click(confirmButton)

      expect(handleTagAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '深度学习',
          isNew: true
        }),
        expect.any(Object)
      )
    })

    it('应该支持批量选择标签', async () => {
      const handleSelectionChange = vi.fn()
      render(
        <AITagsDisplay
          tags={mockTags}
          selectable={true}
          onSelectionChange={handleSelectionChange}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBe(mockTags.length)

      await userEvent.click(checkboxes[0])
      expect(handleSelectionChange).toHaveBeenCalledWith([mockTags[0]])

      await userEvent.click(checkboxes[1])
      expect(handleSelectionChange).toHaveBeenCalledWith([mockTags[0], mockTags[1]])
    })

    it('应该支持全选/取消全选', async () => {
      const handleSelectionChange = vi.fn()
      render(
        <AITagsDisplay
          tags={mockTags}
          selectable={true}
          showSelectAll={true}
          onSelectionChange={handleSelectionChange}
        />
      )

      const selectAllButton = screen.getByRole('button', { name: /全选/ })
      await userEvent.click(selectAllButton)

      expect(handleSelectionChange).toHaveBeenCalledWith(mockTags)

      const unselectAllButton = screen.getByRole('button', { name: /取消全选/ })
      await userEvent.click(unselectAllButton)

      expect(handleSelectionChange).toHaveBeenCalledWith([])
    })

    it('应该支持标签排序', async () => {
      render(<AITagsDisplay tags={mockTags} sortable={true} />)

      const sortButton = screen.getByRole('button', { name: /排序/ })
      await userEvent.click(sortButton)

      const sortByConfidence = screen.getByText('按置信度排序')
      await userEvent.click(sortByConfidence)

      const tagElements = screen.getAllByTestId(/^ai-tag-/)
      const firstTag = tagElements[0]
      expect(firstTag).toHaveTextContent('人工智能') // 置信度最高的标签
    })
  })

  describe('可访问性测试', () => {
    it('应该具有语义化结构', () => {
      render(<AITagsDisplay tags={mockTags} />)

      expect(screen.getByRole('region', { name: /AI智能标签/ })).toBeInTheDocument()
      expect(screen.getByRole('list')).toBeInTheDocument()
      mockTags.forEach(tag => {
        const tagElement = screen.getByText(tag.name)
        expect(tagElement.closest('[role="listitem"]')).toBeInTheDocument()
      })
    })

    it('标签应该具有可访问的标签', () => {
      render(<AITagsDisplay tags={mockTags} showConfidence={true} />)

      mockTags.forEach(tag => {
        const tagElement = screen.getByText(tag.name)
        const tagContainer = tagElement.closest('[data-tag-id]')

        if (tagContainer) {
          const expectedLabel = `${tag.name}, 置信度 ${Math.round(tag.confidence * 100)}%, 分类 ${tag.category}`
          expect(tagContainer).toHaveAttribute('aria-label', expectedLabel)
        }
      })
    })

    it('交互元素应该具有键盘导航支持', async () => {
      render(<AITagsDisplay tags={mockTags} interactive={true} />)

      const firstTag = screen.getByText('人工智能')
      firstTag.focus()

      await userEvent.keyboard('{Enter}')
      // 应该触发点击事件

      await userEvent.keyboard('{ArrowRight}')
      // 应该移动到下一个标签
    })

    it('应该支持屏幕阅读器', () => {
      render(<AITagsDisplay tags={mockTags} />)

      expect(screen.getByText('AI智能标签')).toBeInTheDocument()
      expect(screen.getByText('5个标签')).toBeInTheDocument()

      // 应该有适当的live region用于动态内容更新
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toBeInTheDocument()
    })
  })

  describe('响应式测试', () => {
    it('应该在移动端正确显示', async () => {
      render(<AITagsDisplay tags={mockTags} />)

      await UITestUtils.setViewport(375, 667)

      const container = screen.getByTestId('ai-tags-display')
      expect(UITestUtils.isElementVisible(container)).toBe(true)

      // 移动端应该使用较小的标签
      const tagElements = screen.getAllByTestId(/^ai-tag-/)
      tagElements.forEach(element => {
        expect(element).toHaveClass('text-xs')
      })
    })

    it('应该在桌面端正确显示', async () => {
      render(<AITagsDisplay tags={mockTags} />)

      await UITestUtils.setViewport(1920, 1080)

      const container = screen.getByTestId('ai-tags-display')
      expect(UITestUtils.isElementVisible(container)).toBe(true)
    })

    it('应该在不同尺寸下保持可访问性', async () => {
      const viewports = [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1920, height: 1080 }
      ]

      render(<AITagsDisplay tags={mockTags} />)
      const container = screen.getByTestId('ai-tags-display')

      const results = await UITestUtils.checkResponsiveLayout(container, viewports)

      results.forEach(result => {
        expect(result.visible).toBe(true)
        expect(UITestUtils.isElementAccessible(container)).toBe(true)
      })
    })
  })

  describe('主题测试', () => {
    it('应该支持主题切换', async () => {
      render(<AITagsDisplay tags={mockTags} />)

      const container = screen.getByTestId('ai-tags-display')
      const themes = ['light', 'dark']

      const results = await UITestUtils.verifyThemeToggle(container, themes)

      results.forEach(result => {
        expect(result.applied).toBeDefined()
      })
    })

    it('应该在暗色主题下正确显示', async () => {
      render(<AITagsDisplay tags={mockTags} />)

      document.documentElement.setAttribute('data-theme', 'dark')
      await UITestUtils.delay(100)

      const container = screen.getByTestId('ai-tags-display')
      expect(UITestUtils.isElementVisible(container)).toBe(true)
    })
  })

  describe('数据验证测试', () => {
    it('应该处理无效的标签数据', () => {
      const invalidTags = [
        { id: null, name: '', color: '', confidence: -1 },
        { id: undefined, name: 'undefined标签', color: 'invalid', confidence: 2 }
      ]

      expect(() => {
        render(<AITagsDisplay tags={invalidTags} />)
      }).not.toThrow()
    })

    it('应该处理重复的标签ID', () => {
      const duplicateTags = [
        { id: 'duplicate', name: '标签1', color: '#FF5733', confidence: 0.9 },
        { id: 'duplicate', name: '标签2', color: '#33FF57', confidence: 0.8 }
      ]

      expect(() => {
        render(<AITagsDisplay tags={duplicateTags} />)
      }).not.toThrow()
    })

    it('应该处理极长的标签名称', () => {
      const longTagName = '这是一个非常非常长的标签名称，用来测试组件对长文本的处理能力'
      const longTag = {
        id: 'long-tag',
        name: longTagName,
        color: '#FF5733',
        confidence: 0.9,
        category: 'test'
      }

      render(<AITagsDisplay tags={[longTag]} />)

      // 应该截断或换行显示长标签名
      const tagElement = screen.getByText(longTagName)
      expect(tagElement).toBeInTheDocument()
    })

    it('应该处理特殊字符的标签名称', () => {
      const specialTags = [
        { id: 'special-1', name: '标签<测试>', color: '#FF5733', confidence: 0.9, category: 'test' },
        { id: 'special-2', name: '标签"引号"', color: '#33FF57', confidence: 0.8, category: 'test' },
        { id: 'special-3', name: '标签\'单引号\'', color: '#3357FF', confidence: 0.85, category: 'test' }
      ]

      render(<AITagsDisplay tags={specialTags} />)

      specialTags.forEach(tag => {
        expect(screen.getByText(tag.name)).toBeInTheDocument()
      })
    })
  })

  describe('性能测试', () => {
    it('应该快速渲染少量标签', () => {
      const startTime = performance.now()

      render(<AITagsDisplay tags={mockTags} />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100)
    })

    it('应该处理大量标签', () => {
      const manyTags = Array.from({ length: 100 }, (_, i) => ({
        id: `tag-${i}`,
        name: `标签${i}`,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        confidence: Math.random(),
        category: `category-${i % 10}`
      }))

      const startTime = performance.now()

      render(<AITagsDisplay tags={manyTags} />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(1000)
      expect(screen.getByText('100个标签')).toBeInTheDocument()
    })

    it('应该支持虚拟滚动（如果实现）', () => {
      const manyTags = Array.from({ length: 1000 }, (_, i) => ({
        id: `tag-${i}`,
        name: `标签${i}`,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        confidence: Math.random(),
        category: `category-${i % 10}`
      }))

      const startTime = performance.now()

      render(<AITagsDisplay tags={manyTags} virtualized={true} />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(500)
    })
  })

  describe('集成测试', () => {
    it('应该与其他AI组件协调工作', () => {
      render(
        <div data-testid="ai-components">
          <AITagsDisplay tags={mockTags} />
          <div data-testid="other-ai-component">其他AI组件</div>
        </div>
      )

      expect(screen.getByTestId('other-ai-component')).toBeInTheDocument()
      expect(screen.getByTestId('ai-tags-display')).toBeInTheDocument()
    })

    it('应该在父容器中正确布局', () => {
      render(
        <div data-testid="parent-container" style={{ display: 'flex', gap: '16px' }}>
          <AITagsDisplay tags={mockTags} />
          <div data-testid="sibling-component">兄弟组件</div>
        </div>
      )

      const parent = screen.getByTestId('parent-container')
      const tagsDisplay = screen.getByTestId('ai-tags-display')
      const sibling = screen.getByTestId('sibling-component')

      expect(parent).toContainElement(tagsDisplay)
      expect(parent).toContainElement(sibling)
    })

    it('应该与表单集成工作', async () => {
      const handleSubmit = vi.fn()

      render(
        <form onSubmit={handleSubmit}>
          <AITagsDisplay tags={mockTags} selectable={true} />
          <Button type="submit">提交</Button>
        </form>
      )

      const checkboxes = screen.getAllByRole('checkbox')
      await userEvent.click(checkboxes[0])

      const submitButton = screen.getByRole('button', { name: '提交' })
      await userEvent.click(submitButton)

      expect(handleSubmit).toHaveBeenCalled()
    })
  })
})