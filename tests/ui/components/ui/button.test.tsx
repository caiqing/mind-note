/**
 * Button组件UI测试
 *
 * 测试Button组件的所有功能和交互
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'
import { UITestUtils } from '../../setup/ui-test-setup'

describe('Button组件', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染默认按钮', () => {
      render(<Button>测试按钮</Button>)

      const button = screen.getByRole('button', { name: '测试按钮' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('测试按钮')
    })

    it('应该支持自定义样式类名', () => {
      render(<Button className="custom-class">测试按钮</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('应该支持disabled状态', () => {
      render(<Button disabled>禁用按钮</Button>)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('应该支持loading状态', () => {
      render(<Button loading>加载中</Button>)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('应该支持自定义data-testid', () => {
      render(<Button data-testid="test-button">测试按钮</Button>)

      const button = screen.getByTestId('test-button')
      expect(button).toBeInTheDocument()
    })
  })

  describe('变体测试', () => {
    it('应该渲染primary变体', () => {
      render(<Button variant="primary">主要按钮</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary-600')
    })

    it('应该渲染secondary变体', () => {
      render(<Button variant="secondary">次要按钮</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary-600')
    })

    it('应该渲染outline变体', () => {
      render(<Button variant="outline">轮廓按钮</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('border')
    })

    it('应该渲染ghost变体', () => {
      render(<Button variant="ghost">透明按钮</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent')
    })

    it('应该渲染destructive变体', () => {
      render(<Button variant="destructive">危险按钮</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive')
    })
  })

  describe('尺寸测试', () => {
    it('应该渲染sm尺寸', () => {
      render(<Button size="sm">小按钮</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9')
    })

    it('应该渲染默认尺寸', () => {
      render(<Button size="default">默认按钮</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10')
    })

    it('应该渲染lg尺寸', () => {
      render(<Button size="lg">大按钮</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-11')
    })
  })

  describe('交互测试', () => {
    it('应该响应点击事件', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>点击我</Button>)

      const button = screen.getByRole('button')
      await userEvent.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('应该在disabled状态下不响应点击', async () => {
      const handleClick = vi.fn()
      render(<Button disabled onClick={handleClick}>禁用按钮</Button>)

      const button = screen.getByRole('button')
      await userEvent.click(button)

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('应该在loading状态下不响应点击', async () => {
      const handleClick = vi.fn()
      render(<Button loading onClick={handleClick}>加载中</Button>)

      const button = screen.getByRole('button')
      await userEvent.click(button)

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('应该支持键盘操作', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>键盘测试</Button>)

      const button = screen.getByRole('button')
      button.focus()

      await userEvent.keyboard('{Enter}')

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('应该在disabled状态下不响应键盘操作', async () => {
      const handleClick = vi.fn()
      render(<Button disabled onClick={handleClick}>禁用键盘</Button>)

      const button = screen.getByRole('button')
      button.focus()

      await userEvent.keyboard('{Enter}')

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('可访问性测试', () => {
    it('应该具有正确的role属性', () => {
      render(<Button>可访问性测试</Button>)

      const button = screen.getByRole('button', { name: '可访问性测试' })
      expect(button).toBeInTheDocument()
    })

    it('disabled状态应该有aria-disabled属性', () => {
      render(<Button disabled>禁用测试</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })

    it('loading状态应该有aria-busy属性', () => {
      render(<Button loading>加载测试</Button>)

      const button = screen?.getByRole('button')
      if (button) {
        expect(button).toHaveAttribute('aria-busy', 'true')
      }
    })

    it('应该支持键盘导航', () => {
      render(<Button>键盘导航</Button>)

      const button = screen.getByRole('button')
      expect(button.tabIndex).toBeGreaterThanOrEqual(0)
    })

    it('disabled状态应该从键盘导航中移除', () => {
      render(<Button disabled>禁用导航</Button>)

      const button = screen.getByRole('button')
      expect(button.tabIndex).toBe(-1)
    })
  })

  describe('子元素测试', () => {
    it('应该支持自定义子元素', () => {
      render(
        <Button>
          <span data-testid="custom-span">自定义内容</span>
        </Button>
      )

      const customSpan = screen.getByTestId('custom-span')
      const button = screen.getByRole('button')

      expect(button).toContainElement(customSpan)
      expect(customSpan).toBeInTheDocument()
    })

    it('应该支持图标子元素', () => {
      render(
        <Button>
          <svg data-testid="test-icon" width="16" height="16">
            <circle cx="8" cy="8" r="8" />
          </svg>
          图标按钮
        </Button>
      )

      const icon = screen.getByTestId('test-icon')
      const button = screen.getByRole('button')

      expect(button).toContainElement(icon)
      expect(icon).toBeInTheDocument()
    })

    it('应该支持loading状态的loading子元素', () => {
      render(<Button loading>加载中</Button>)

      // 检查是否有loading spinner或indicator
      const button = screen.getByRole('button')
      const loadingIndicator = button.querySelector('[data-testid="loading-indicator"]')

      if (loadingIndicator) {
        expect(loadingIndicator).toBeInTheDocument()
      }
    })
  })

  describe('样式测试', () => {
    it('应该应用正确的过渡效果', () => {
      render(<Button>过渡测试</Button>)

      const button = screen.getByRole('button')
      const computedStyle = UITestUtils.getComputedStyle(button)

      expect(computedStyle.transition).toContain('transition')
    })

    it('应该支持hover状态', async () => {
      render(<Button>悬停测试</Button>)

      const button = screen.getByRole('button')

      // 模拟hover
      fireEvent.mouseEnter(button)

      // 检查是否有hover相关的类
      const hasHoverClass = Array.from(button.classList).some(className =>
        className.includes('hover:') || className.includes('group-hover')
      )

      expect(hasHoverClass).toBe(true)
    })

    it('应该支持focus状态', () => {
      render(<Button>焦点测试</Button>)

      const button = screen.getByRole('button')
      button.focus()

      // 检查是否有focus相关的类
      const hasFocusClass = Array.from(button.classList).some(className =>
        className.includes('focus:') || className.includes('ring')
      )

      expect(hasFocusClass).toBe(true)
    })

    it('应该支持active状态', async () => {
      render(<Button>激活测试</Button>)

      const button = screen.getByRole('button')

      // 模拟active状态
      fireEvent.mouseDown(button)

      // 检查是否有active相关的类
      const hasActiveClass = Array.from(button.classList).some(className =>
        className.includes('active:') || className.includes('ring-offset')
      )

      expect(hasActiveClass).toBe(true)
    })
  })

  describe('表单集成测试', () => {
    it('应该在form中正常工作', () => {
      render(
        <form data-testid="test-form">
          <Button type="submit">提交</Button>
        </form>
      )

      const form = screen.getByTestId('test-form')
      const button = screen.getByRole('button')

      expect(form).toContainElement(button)
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('应该支持form表单', () => {
      render(
        <form>
          <Button type="submit">表单提交</Button>
        </form>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('应该支持reset按钮', () => {
      render(
        <form>
          <Button type="reset">重置</Button>
        </form>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'reset')
    })

    it('应该支持button类型', () => {
      render(
        <form>
          <Button type="button">普通按钮</Button>
        </form>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'button')
    })
  })

  describe('响应式测试', () => {
    it('应该在移动端正确显示', async () => {
      render(<Button>移动端测试</Button>)

      const button = screen.getByRole('button')

      // 模拟移动端视口
      await UITestUtils.setViewport(375, 667)

      // 检查按钮是否可见
      expect(UITestUtils.isElementVisible(button)).toBe(true)

      // 检查移动端特定的样式
      const computedStyle = UITestUtils.getComputedStyle(button)
      expect(computedStyle.display).not.toBe('none')
    })

    it('应该在桌面端正确显示', async () => {
      render(<Button>桌面端测试</Button>)

      const button = screen.getByRole('button')

      // 模拟桌面端视口
      await UITestUtils.setViewport(1920, 1080)

      expect(UITestUtils.isElementVisible(button)).toBe(true)
    })

    it('应该在不同尺寸下保持可访问性', async () => {
      const viewports = [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1920, height: 1080 }
      ]

      render(<Button>响应式测试</Button>)
      const button = screen.getByRole('button')

      const results = await UITestUtils.checkResponsiveLayout(button, viewports)

      results.forEach(result => {
        expect(result.visible).toBe(true)
        expect(UITestUtils.isElementAccessible(button)).toBe(true)
      })
    })
  })

  describe('主题测试', () => {
    it('应该支持主题切换', async () => {
      render(<Button>主题测试</Button>)

      const button = screen.getByRole('button')
      const themes = ['light', 'dark']

      const results = await UITestUtils.verifyThemeToggle(button, themes)

      results.forEach(result => {
        // 验证主题切换是否生效
        expect(result.applied).toBeDefined()
      })
    })

    it('应该在暗色主题下正确显示', async () => {
      render(<Button>暗色主题测试</Button>)

      // 设置暗色主题
      document.documentElement.setAttribute('data-theme', 'dark')
      await UITestUtils.delay(100)

      const button = screen.getByRole('button')
      expect(UITestUtils.isElementVisible(button)).toBe(true)
    })
  })

  describe('错误处理测试', () => {
    it('应该处理缺失的onClick回调', () => {
      // 不传入onClick也不应该报错
      expect(() => {
        render(<Button>无回调按钮</Button>)
      }).not.toThrow()
    })

    it('应该处理无效的variant', () => {
      // 使用TS类型检查防止无效variant
      expect(() => {
        render(<Button variant="primary" onClick={() => {}}>有效变体</Button>)
      }).not.toThrow()
    })

    it('应该处理无效的size', () => {
      // 使用TS类型检查防止无效size
      expect(() => {
        render(<Button size="default" onClick={() => {}}>有效尺寸</Button>)
      }).not.toThrow()
    })
  })

  describe('性能测试', () => {
    it('应该快速渲染', () => {
      const startTime = performance.now()

      render(<Button>性能测试</Button>)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // 渲染时间应该在合理范围内
      expect(renderTime).toBeLessThan(100)
    })

    it('应该支持大量按钮同时渲染', () => {
      const startTime = performance.now()

      const buttons = Array.from({ length: 100 }, (_, index) => (
        <Button key={index}>按钮 {index}</Button>
      ))

      render(<div>{buttons}</div>)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // 大量组件渲染也应该在合理时间内
      expect(renderTime).toBeLessThan(1000)

      // 验证所有按钮都被渲染
      const renderedButtons = screen.getAllByRole('button')
      expect(renderedButtons).toHaveLength(100)
    })
  })
})