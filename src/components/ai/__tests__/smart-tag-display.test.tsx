/**
 * 智能标签显示组件测试
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SmartTagDisplay, type SmartTag } from '../smart-tag-display'

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockTags: SmartTag[] = [
  {
    id: '1',
    name: '技术文档',
    category: 'content',
    color: 'blue',
    relevance: 0.95,
    confidence: 0.88,
    count: 15,
    description: '技术相关文档标签',
    createdAt: '2024-01-01T00:00:00Z',
    isUserGenerated: false,
  },
  {
    id: '2',
    name: '积极情感',
    category: 'emotion',
    color: 'pink',
    relevance: 0.82,
    confidence: 0.91,
    count: 8,
    createdAt: '2024-01-02T00:00:00Z',
    isUserGenerated: false,
  },
  {
    id: '3',
    name: 'AI技术',
    category: 'topic',
    color: 'green',
    relevance: 0.78,
    confidence: 0.85,
    createdAt: '2024-01-03T00:00:00Z',
    isUserGenerated: true,
  },
  {
    id: '4',
    name: '高优先级',
    category: 'priority',
    color: 'red',
    relevance: 0.90,
    confidence: 0.95,
    createdAt: '2024-01-04T00:00:00Z',
    isUserGenerated: false,
  },
  {
    id: '5',
    name: '自定义标签',
    category: 'custom',
    color: 'purple',
    relevance: 0.65,
    confidence: 0.70,
    createdAt: '2024-01-05T00:00:00Z',
    isUserGenerated: true,
  },
]

describe('SmartTagDisplay', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render tags in compact mode', () => {
    render(<SmartTagDisplay tags={mockTags} mode="compact" />)

    expect(screen.getByText('技术文档')).toBeInTheDocument()
    expect(screen.getByText('积极情感')).toBeInTheDocument()
    expect(screen.getByText('AI技术')).toBeInTheDocument()
  })

  it('should render tags in categorized mode', () => {
    render(<SmartTagDisplay tags={mockTags} mode="categorized" showCategories />)

    expect(screen.getByText('内容标签')).toBeInTheDocument()
    expect(screen.getByText('情感标签')).toBeInTheDocument()
    expect(screen.getByText('主题标签')).toBeInTheDocument()
    expect(screen.getByText('优先级标签')).toBeInTheDocument()
    expect(screen.getByText('自定义标签')).toBeInTheDocument()
  })

  it('should render tags in detailed mode', () => {
    render(
      <SmartTagDisplay
        tags={mockTags}
        mode="detailed"
        showRelevance
        showConfidence
      />
    )

    expect(screen.getByText('相关性: 95%')).toBeInTheDocument()
    expect(screen.getByText('置信度: 88%')).toBeInTheDocument()
    expect(screen.getByText('使用: 15次')).toBeInTheDocument()
  })

  it('should handle tag click events', async () => {
    const onTagClick = jest.fn()
    render(<SmartTagDisplay tags={mockTags} onTagClick={onTagClick} />)

    await user.click(screen.getByText('技术文档'))
    expect(onTagClick).toHaveBeenCalledWith(mockTags[0])
  })

  it('should handle tag editing in editable mode', async () => {
    render(<SmartTagDisplay tags={mockTags} mode="editable" editable />)

    const tag = screen.getByText('技术文档')
    await user.click(tag)

    // Tag should be selected
    expect(tag.closest('.bg-blue-100')).toHaveClass('ring-2')
  })

  it('should show limited number of tags with maxVisible prop', () => {
    render(<SmartTagDisplay tags={mockTags} maxVisible={2} />)

    expect(screen.getByText('技术文档')).toBeInTheDocument()
    expect(screen.getByText('积极情感')).toBeInTheDocument()
    expect(screen.getByText('+3 个标签')).toBeInTheDocument()
  })

  it('should handle adding new tags', async () => {
    const onTagAdd = jest.fn().mockResolvedValue({
      id: '6',
      name: '新标签',
      category: 'content',
      color: 'blue',
      relevance: 0.8,
      confidence: 0.9,
      createdAt: new Date().toISOString(),
    })

    render(<SmartTagDisplay tags={mockTags} allowAdd onTagAdd={onTagAdd} />)

    const addButton = screen.getByText('添加标签')
    await user.click(addButton)

    const input = screen.getByPlaceholderText('输入标签名称')
    await user.type(input, '新标签')

    const submitButton = screen.getByText('添加')
    await user.click(submitButton)

    await waitFor(() => {
      expect(onTagAdd).toHaveBeenCalledWith('新标签', 'content')
    })
  })

  it('should handle tag deletion', async () => {
    const onTagDelete = jest.fn()
    render(
      <SmartTagDisplay
        tags={mockTags}
        deletable
        onTagDelete={onTagDelete}
      />
    )

    const deleteButtons = screen.getAllByRole('button').filter(
      button => button.querySelector('svg')
    )

    await user.click(deleteButtons[0])

    const confirmButton = screen.getByText('删除')
    await user.click(confirmButton)

    expect(onTagDelete).toHaveBeenCalledWith('1')
  })

  it('should handle batch operations', async () => {
    const onBatchAction = jest.fn()
    render(
      <SmartTagDisplay
        tags={mockTags}
        mode="editable"
        editable
        onBatchAction={onBatchAction}
      />
    )

    // Select two tags
    await user.click(screen.getByText('技术文档'))
    await user.click(screen.getByText('积极情感'))

    // Open batch operations menu
    const batchButton = screen.getByText(/批量操作/)
    await user.click(batchButton)

    // Select delete action
    const deleteAction = screen.getByText('删除选中标签')
    await user.click(deleteAction)

    expect(onBatchAction).toHaveBeenCalledWith('delete', ['1', '2'])
  })

  it('should show empty state when no tags', () => {
    render(<SmartTagDisplay tags={[]} allowAdd />)

    expect(screen.getByText('暂无标签')).toBeInTheDocument()
    expect(screen.getByText('点击上方按钮添加第一个标签')).toBeInTheDocument()
  })

  it('should respect showRelevance and showConfidence props', () => {
    render(
      <SmartTagDisplay
        tags={mockTags.slice(0, 1)}
        showRelevance={false}
        showConfidence={true}
      />
    )

    // Should not show relevance indicator
    expect(screen.queryByText(/相关性:/)).not.toBeInTheDocument()
    // Should show confidence
    expect(screen.getByText('88%')).toBeInTheDocument()
  })

  it('should apply correct color classes based on category', () => {
    render(<SmartTagDisplay tags={mockTags} />)

    const contentTag = screen.getByText('技术文档')
    const emotionTag = screen.getByText('积极情感')

    expect(contentTag.closest('.bg-blue-100')).toBeInTheDocument()
    expect(emotionTag.closest('.bg-pink-100')).toBeInTheDocument()
  })
})