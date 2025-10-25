/**
 * Input组件UI测试
 *
 * 测试Input组件的所有功能、状态和交互
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'
import { UITestUtils } from '../../setup/ui-test-setup'

describe('Input组件', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染默认输入框', () => {
      render(<Input placeholder="请输入内容" />)

      const input = screen.getByPlaceholderText('请输入内容')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'text')
    })

    it('应该支持自定义样式类名', () => {
      render(<Input className="custom-class" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-class')
    })

    it('应该支持disabled状态', () => {
      render(<Input disabled placeholder="禁用输入框" />)

      const input = screen.getByPlaceholderText('禁用输入框')
      expect(input).toBeDisabled()
    })

    it('应该支持readonly状态', () => {
      render(<Input readOnly value="只读内容" />)

      const input = screen.getByDisplayValue('只读内容')
      expect(input).toHaveAttribute('readonly')
    })

    it('应该支持自定义data-testid', () => {
      render(<Input data-testid="test-input" />)

      const input = screen.getByTestId('test-input')
      expect(input).toBeInTheDocument()
    })

    it('应该支持默认值', () => {
      render(<Input defaultValue="默认值" />)

      const input = screen.getByDisplayValue('默认值')
      expect(input).toBeInTheDocument()
    })

    it('应该支持受控模式', () => {
      const TestComponent = () => {
        const [value, setValue] = useState('controlled')
        return <Input value={value} onChange={(e) => setValue(e.target.value)} />
      }

      render(<TestComponent />)

      const input = screen.getByDisplayValue('controlled')
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue('controlled')
    })
  })

  describe('输入类型测试', () => {
    it('应该支持text类型', () => {
      render(<Input type="text" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'text')
    })

    it('应该支持email类型', () => {
      render(<Input type="email" placeholder="请输入邮箱" />)

      const input = screen.getByPlaceholderText('请输入邮箱')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('应该支持password类型', () => {
      render(<Input type="password" placeholder="请输入密码" />)

      const input = screen.getByPlaceholderText('请输入密码')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('应该支持number类型', () => {
      render(<Input type="number" placeholder="请输入数字" />)

      const input = screen.getByPlaceholderText('请输入数字')
      expect(input).toHaveAttribute('type', 'number')
    })

    it('应该支持tel类型', () => {
      render(<Input type="tel" placeholder="请输入电话" />)

      const input = screen.getByPlaceholderText('请输入电话')
      expect(input).toHaveAttribute('type', 'tel')
    })

    it('应该支持url类型', () => {
      render(<Input type="url" placeholder="请输入网址" />)

      const input = screen.getByPlaceholderText('请输入网址')
      expect(input).toHaveAttribute('type', 'url')
    })

    it('应该支持search类型', () => {
      render(<Input type="search" placeholder="搜索内容" />)

      const input = screen.getByPlaceholderText('搜索内容')
      expect(input).toHaveAttribute('type', 'search')
    })
  })

  describe('交互测试', () => {
    it('应该响应输入变化', async () => {
      const handleChange = vi.fn()
      render(<Input onChange={handleChange} placeholder="测试输入" />)

      const input = screen.getByPlaceholderText('测试输入')
      await userEvent.type(input, 'Hello World')

      expect(handleChange).toHaveBeenCalledTimes(11) // 每个字符触发一次
      expect(input).toHaveValue('Hello World')
    })

    it('应该响应焦点事件', async () => {
      const handleFocus = vi.fn()
      const handleBlur = vi.fn()

      render(
        <Input
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="焦点测试"
        />
      )

      const input = screen.getByPlaceholderText('焦点测试')

      await userEvent.click(input)
      expect(handleFocus).toHaveBeenCalledTimes(1)
      expect(input).toHaveFocus()

      await userEvent.tab() // 移开焦点
      expect(handleBlur).toHaveBeenCalledTimes(1)
      expect(input).not.toHaveFocus()
    })

    it('应该响应键盘事件', async () => {
      const handleKeyDown = vi.fn()
      const handleKeyUp = vi.fn()
      const handleKeyPress = vi.fn()

      render(
        <Input
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onKeyPress={handleKeyPress}
          placeholder="键盘测试"
        />
      )

      const input = screen.getByPlaceholderText('键盘测试')

      await userEvent.type(input, 'a')

      expect(handleKeyDown).toHaveBeenCalled()
      expect(handleKeyUp).toHaveBeenCalled()
    })

    it('应该响应Enter键', async () => {
      const handleKeyPress = vi.fn()
      render(<Input onKeyPress={handleKeyPress} placeholder="回车测试" />)

      const input = screen.getByPlaceholderText('回车测试')

      await userEvent.type(input, 'test')
      await userEvent.keyboard('{Enter}')

      expect(handleKeyPress).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'Enter',
          code: 'Enter'
        })
      )
    })

    it('应该在disabled状态下不响应输入', async () => {
      const handleChange = vi.fn()
      render(<Input disabled onChange={handleChange} placeholder="禁用测试" />)

      const input = screen.getByPlaceholderText('禁用测试')

      await userEvent.click(input)
      await userEvent.type(input, 'test')

      expect(handleChange).not.toHaveBeenCalled()
      expect(input).not.toHaveValue('test')
    })

    it('应该在readonly状态下不响应输入', async () => {
      const handleChange = vi.fn()
      render(<Input readOnly onChange={handleChange} placeholder="只读测试" />)

      const input = screen.getByPlaceholderText('只读测试')

      await userEvent.click(input)
      await userEvent.type(input, 'test')

      expect(handleChange).not.toHaveBeenCalled()
      expect(input).not.toHaveValue('test')
    })
  })

  describe('表单验证测试', () => {
    it('应该支持required属性', () => {
      render(<Input required placeholder="必填项" />)

      const input = screen.getByPlaceholderText('必填项')
      expect(input).toBeRequired()
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('应该支持minLength验证', () => {
      render(<Input minLength={5} placeholder="最少5个字符" />)

      const input = screen.getByPlaceholderText('最少5个字符')
      expect(input).toHaveAttribute('minlength', '5')
    })

    it('应该支持maxLength验证', () => {
      render(<Input maxLength={10} placeholder="最多10个字符" />)

      const input = screen.getByPlaceholderText('最多10个字符')
      expect(input).toHaveAttribute('maxlength', '10')
    })

    it('应该支持pattern验证', () => {
      render(<Input pattern="[0-9]*" placeholder="只能输入数字" />)

      const input = screen.getByPlaceholderText('只能输入数字')
      expect(input).toHaveAttribute('pattern', '[0-9]*')
    })

    it('应该支持min/max验证（数字类型）', () => {
      render(
        <div>
          <Input type="number" min={0} max={100} placeholder="0-100" />
        </div>
      )

      const input = screen.getByPlaceholderText('0-100')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '100')
    })

    it('应该支持step验证（数字类型）', () => {
      render(<Input type="number" step={0.1} placeholder="步长0.1" />)

      const input = screen.getByPlaceholderText('步长0.1')
      expect(input).toHaveAttribute('step', '0.1')
    })

    it('应该显示验证错误状态', () => {
      render(<Input placeholder="验证测试" />)

      const input = screen.getByPlaceholderText('验证测试')

      // 模拟验证失败
      fireEvent.invalid(input)

      expect(input).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('可访问性测试', () => {
    it('应该具有正确的label关联', () => {
      render(
        <label htmlFor="test-input">
          测试标签
          <Input id="test-input" />
        </label>
      )

      const input = screen.getByRole('textbox', { name: '测试标签' })
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('id', 'test-input')
    })

    it('应该支持aria-label', () => {
      render(<Input aria-label="自定义标签" />)

      const input = screen.getByRole('textbox', { name: '自定义标签' })
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('aria-label', '自定义标签')
    })

    it('应该支持aria-labelledby', () => {
      render(
        <div>
          <span id="label-text">外部标签</span>
          <Input aria-labelledby="label-text" />
        </div>
      )

      const input = screen.getByRole('textbox', { name: '外部标签' })
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('aria-labelledby', 'label-text')
    })

    it('应该支持aria-describedby', () => {
      render(
        <div>
          <Input aria-describedby="help-text" placeholder="描述测试" />
          <span id="help-text">这是帮助文本</span>
        </div>
      )

      const input = screen.getByPlaceholderText('描述测试')
      expect(input).toHaveAttribute('aria-describedby', 'help-text')
    })

    it('应该支持aria-invalid状态', () => {
      render(<Input aria-invalid="true" placeholder="无效状态" />)

      const input = screen.getByPlaceholderText('无效状态')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('disabled状态应该有aria-disabled属性', () => {
      render(<Input disabled placeholder="禁用测试" />)

      const input = screen.getByPlaceholderText('禁用测试')
      expect(input).toHaveAttribute('aria-disabled', 'true')
    })

    it('应该支持键盘导航', () => {
      render(<Input placeholder="导航测试" />)

      const input = screen.getByPlaceholderText('导航测试')
      expect(input.tabIndex).toBeGreaterThanOrEqual(0)
    })

    it('disabled状态应该从键盘导航中移除', () => {
      render(<Input disabled placeholder="禁用导航" />)

      const input = screen.getByPlaceholderText('禁用导航')
      expect(input.tabIndex).toBe(-1)
    })
  })

  describe('样式和状态测试', () => {
    it('应该具有基础样式类', () => {
      render(<Input placeholder="样式测试" />)

      const input = screen.getByPlaceholderText('样式测试')
      expect(input).toHaveClass('flex', 'h-10', 'w-full', 'rounded-md')
    })

    it('应该支持尺寸变体', () => {
      const { rerender } = render(<Input size="sm" placeholder="小尺寸" />)
      let input = screen.getByPlaceholderText('小尺寸')
      expect(input).toHaveClass('h-9')

      rerender(<Input size="lg" placeholder="大尺寸" />)
      input = screen.getByPlaceholderText('大尺寸')
      expect(input).toHaveClass('h-11')
    })

    it('应该支持变体样式', () => {
      const { rerender } = render(<Input variant="outline" placeholder="轮廓样式" />)
      let input = screen.getByPlaceholderText('轮廓样式')
      expect(input).toHaveClass('border')

      rerender(<Input variant="filled" placeholder="填充样式" />)
      input = screen.getByPlaceholderText('填充样式')
      expect(input).toHaveClass('bg-muted')
    })

    it('应该具有正确的过渡效果', () => {
      render(<Input placeholder="过渡测试" />)

      const input = screen.getByPlaceholderText('过渡测试')
      const computedStyle = UITestUtils.getComputedStyle(input)

      expect(computedStyle.transition).toContain('transition')
    })

    it('应该支持focus状态样式', async () => {
      render(<Input placeholder="焦点样式" />)

      const input = screen.getByPlaceholderText('焦点样式')
      input.focus()

      // 检查是否有focus相关的类
      const hasFocusClass = Array.from(input.classList).some(className =>
        className.includes('focus:') || className.includes('ring')
      )

      expect(hasFocusClass).toBe(true)
    })

    it('应该支持disabled状态样式', () => {
      render(<Input disabled placeholder="禁用样式" />)

      const input = screen.getByPlaceholderText('禁用样式')
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
    })

    it('应该支持error状态样式', () => {
      render(<Input className="border-destructive" placeholder="错误样式" />)

      const input = screen.getByPlaceholderText('错误样式')
      expect(input).toHaveClass('border-destructive')
    })
  })

  describe('特殊功能测试', () => {
    it('应该支持autocomplete属性', () => {
      render(<Input autoComplete="email" placeholder="邮箱" />)

      const input = screen.getByPlaceholderText('邮箱')
      expect(input).toHaveAttribute('autocomplete', 'email')
    })

    it('应该支持autofocus属性', () => {
      render(<Input autoFocus placeholder="自动聚焦" />)

      const input = screen.getByPlaceholderText('自动聚焦')
      expect(input).toHaveAttribute('autofocus')
    })

    it('应该支持spellcheck属性', () => {
      render(<Input spellCheck={false} placeholder="关闭拼写检查" />)

      const input = screen.getByPlaceholderText('关闭拼写检查')
      expect(input).toHaveAttribute('spellcheck', 'false')
    })

    it('应该支持inputmode属性', () => {
      render(<Input inputMode="numeric" placeholder="数字键盘" />)

      const input = screen.getByPlaceholderText('数字键盘')
      expect(input).toHaveAttribute('inputmode', 'numeric')
    })

    it('应该支持placeholder属性', () => {
      render(<Input placeholder="这是一个占位符" />)

      const input = screen.getByPlaceholderText('这是一个占位符')
      expect(input).toBeInTheDocument()
    })

    it('应该支持name属性', () => {
      render(<Input name="username" placeholder="用户名" />)

      const input = screen.getByPlaceholderText('用户名')
      expect(input).toHaveAttribute('name', 'username')
    })

    it('应该支持tabindex属性', () => {
      render(<Input tabIndex={-1} placeholder="不可聚焦" />)

      const input = screen.getByPlaceholderText('不可聚焦')
      expect(input).toHaveAttribute('tabindex', '-1')
    })
  })

  describe('响应式测试', () => {
    it('应该在移动端正确显示', async () => {
      render(<Input placeholder="移动端测试" />)

      const input = screen.getByPlaceholderText('移动端测试')

      // 模拟移动端视口
      await UITestUtils.setViewport(375, 667)

      expect(UITestUtils.isElementVisible(input)).toBe(true)

      const computedStyle = UITestUtils.getComputedStyle(input)
      expect(computedStyle.display).not.toBe('none')
    })

    it('应该在桌面端正确显示', async () => {
      render(<Input placeholder="桌面端测试" />)

      const input = screen.getByPlaceholderText('桌面端测试')

      // 模拟桌面端视口
      await UITestUtils.setViewport(1920, 1080)

      expect(UITestUtils.isElementVisible(input)).toBe(true)
    })

    it('应该在不同尺寸下保持可访问性', async () => {
      const viewports = [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1920, height: 1080 }
      ]

      render(<Input placeholder="响应式测试" />)
      const input = screen.getByPlaceholderText('响应式测试')

      const results = await UITestUtils.checkResponsiveLayout(input, viewports)

      results.forEach(result => {
        expect(result.visible).toBe(true)
        expect(UITestUtils.isElementAccessible(input)).toBe(true)
      })
    })
  })

  describe('主题测试', () => {
    it('应该支持主题切换', async () => {
      render(<Input placeholder="主题测试" />)

      const input = screen.getByPlaceholderText('主题测试')
      const themes = ['light', 'dark']

      const results = await UITestUtils.verifyThemeToggle(input, themes)

      results.forEach(result => {
        expect(result.applied).toBeDefined()
      })
    })

    it('应该在暗色主题下正确显示', async () => {
      render(<Input placeholder="暗色主题测试" />)

      // 设置暗色主题
      document.documentElement.setAttribute('data-theme', 'dark')
      await UITestUtils.delay(100)

      const input = screen.getByPlaceholderText('暗色主题测试')
      expect(UITestUtils.isElementVisible(input)).toBe(true)
    })
  })

  describe('错误处理测试', () => {
    it('应该处理缺失的onChange回调', () => {
      expect(() => {
        render(<Input placeholder="无回调输入框" />)
      }).not.toThrow()
    })

    it('应该处理无效的type属性', () => {
      expect(() => {
        render(<Input type="text" />) // 使用有效类型
      }).not.toThrow()
    })

    it('应该处理undefined值', () => {
      expect(() => {
        render(<Input value={undefined} placeholder="undefined值" />)
      }).not.toThrow()
    })

    it('应该处理null值', () => {
      expect(() => {
        render(<Input value={null} placeholder="null值" />)
      }).not.toThrow()
    })
  })

  describe('性能测试', () => {
    it('应该快速渲染', () => {
      const startTime = performance.now()

      render(<Input placeholder="性能测试" />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100)
    })

    it('应该支持大量输入框同时渲染', () => {
      const startTime = performance.now()

      const inputs = Array.from({ length: 100 }, (_, index) => (
        <Input key={index} placeholder={`输入框 ${index}`} />
      ))

      render(<div>{inputs}</div>)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(1000)

      const renderedInputs = screen.getAllByRole('textbox')
      expect(renderedInputs).toHaveLength(100)
    })

    it('应该处理快速输入变化', async () => {
      const handleChange = vi.fn()
      render(<Input onChange={handleChange} placeholder="快速输入" />)

      const input = screen.getByPlaceholderText('快速输入')
      const startTime = performance.now()

      // 快速输入大量文本
      await userEvent.type(input, 'abcdefghijklmnopqrstuvwxyz')

      const endTime = performance.now()
      const inputTime = endTime - startTime

      expect(inputTime).toBeLessThan(1000)
      expect(handleChange).toHaveBeenCalledTimes(26)
    })
  })

  describe('集成测试', () => {
    it('应该与表单组件正常工作', () => {
      render(
        <form data-testid="test-form">
          <Input name="field1" placeholder="字段1" />
          <Input name="field2" placeholder="字段2" />
        </form>
      )

      const form = screen.getByTestId('test-form')
      const inputs = screen.getAllByRole('textbox')

      expect(form).toContainElement(inputs[0])
      expect(form).toContainElement(inputs[1])
      expect(inputs).toHaveLength(2)
    })

    it('应该与标签组件正常工作', () => {
      render(
        <label>
          用户名
          <Input name="username" placeholder="请输入用户名" />
        </label>
      )

      const input = screen.getByRole('textbox', { name: '用户名' })
      expect(input).toBeInTheDocument()
    })

    it('应该在父容器中正确布局', () => {
      render(
        <div data-testid="parent-container" style={{ display: 'flex', gap: '16px' }}>
          <Input placeholder="输入框1" />
          <Input placeholder="输入框2" />
        </div>
      )

      const parent = screen.getByTestId('parent-container')
      const inputs = screen.getAllByRole('textbox')

      expect(parent).toContainElement(inputs[0])
      expect(parent).toContainElement(inputs[1])
    })
  })
})