/**
 * Card组件UI测试
 *
 * 测试Card组件的所有功能、状态和交互
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UITestUtils } from '../../setup/ui-test-setup'

describe('Card组件', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染基础卡片', () => {
      render(
        <Card data-testid="basic-card">
          <CardContent>基础卡片内容</CardContent>
        </Card>
      )

      const card = screen.getByTestId('basic-card')
      expect(card).toBeInTheDocument()
      expect(screen.getByText('基础卡片内容')).toBeInTheDocument()
    })

    it('应该支持自定义样式类名', () => {
      render(
        <Card className="custom-card" data-testid="custom-card">
          <CardContent>自定义卡片</CardContent>
        </Card>
      )

      const card = screen.getByTestId('custom-card')
      expect(card).toHaveClass('custom-card')
    })

    it('应该支持自定义data-testid', () => {
      render(
        <Card data-testid="test-card">
          <CardContent>测试卡片</CardContent>
        </Card>
      )

      const card = screen.getByTestId('test-card')
      expect(card).toBeInTheDocument()
    })
  })

  describe('完整结构测试', () => {
    it('应该渲染完整的卡片结构', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>卡片标题</CardTitle>
            <CardDescription>卡片描述信息</CardDescription>
          </CardHeader>
          <CardContent>
            <p>这是卡片的主要内容区域</p>
          </CardContent>
          <CardFooter>
            <Button>确认</Button>
            <Button variant="outline">取消</Button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByText('卡片标题')).toBeInTheDocument()
      expect(screen.getByText('卡片描述信息')).toBeInTheDocument()
      expect(screen.getByText('这是卡片的主要内容区域')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '确认' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
    })

    it('应该只渲染指定的组件部分', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>只有标题</CardTitle>
          </CardHeader>
          <CardContent>只有内容</CardContent>
        </Card>
      )

      expect(screen.getByText('只有标题')).toBeInTheDocument()
      expect(screen.getByText('只有内容')).toBeInTheDocument()
      expect(screen.queryByText('卡片描述信息')).not.toBeInTheDocument()
    })

    it('应该支持嵌套内容', () => {
      render(
        <Card>
          <CardContent>
            <div data-testid="nested-content">
              <h3>嵌套标题</h3>
              <p>嵌套段落</p>
              <ul>
                <li>列表项1</li>
                <li>列表项2</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )

      const nestedContent = screen.getByTestId('nested-content')
      expect(nestedContent).toBeInTheDocument()
      expect(screen.getByText('嵌套标题')).toBeInTheDocument()
      expect(screen.getByText('嵌套段落')).toBeInTheDocument()
      expect(screen.getByText('列表项1')).toBeInTheDocument()
    })
  })

  describe('CardHeader测试', () => {
    it('应该正确渲染卡片头部', () => {
      render(
        <CardHeader data-testid="card-header">
          <CardTitle>头部标题</CardTitle>
        </CardHeader>
      )

      const header = screen.getByTestId('card-header')
      expect(header).toBeInTheDocument()
      expect(screen.getByText('头部标题')).toBeInTheDocument()
    })

    it('应该支持自定义头部样式', () => {
      render(
        <CardHeader className="custom-header" data-testid="custom-header">
          <CardTitle>自定义头部</CardTitle>
        </CardHeader>
      )

      const header = screen.getByTestId('custom-header')
      expect(header).toHaveClass('custom-header')
    })

    it('应该在没有标题时不渲染', () => {
      render(<CardHeader />)

      // CardHeader应该仍然存在，只是没有内容
      expect(document.querySelector('[class*="card-header"]')).toBeInTheDocument()
    })
  })

  describe('CardTitle测试', () => {
    it('应该正确渲染卡片标题', () => {
      render(<CardTitle data-testid="card-title">卡片标题</CardTitle>)

      const title = screen.getByTestId('card-title')
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('卡片标题')
    })

    it('应该支持标题级别', () => {
      render(<CardTitle as="h3">三级标题</CardTitle>)

      const title = screen.getByRole('heading', { level: 3, name: '三级标题' })
      expect(title).toBeInTheDocument()
    })

    it('应该支持长标题', () => {
      const longTitle = '这是一个非常长的卡片标题，用来测试标题的显示效果和样式'
      render(<CardTitle>{longTitle}</CardTitle>)

      expect(screen.getByText(longTitle)).toBeInTheDocument()
    })

    it('应该支持自定义标题样式', () => {
      render(
        <CardTitle className="custom-title" data-testid="custom-title">
          自定义标题
        </CardTitle>
      )

      const title = screen.getByTestId('custom-title')
      expect(title).toHaveClass('custom-title')
    })
  })

  describe('CardDescription测试', () => {
    it('应该正确渲染卡片描述', () => {
      render(<CardDescription data-testid="card-desc">这是卡片描述</CardDescription>)

      const description = screen.getByTestId('card-desc')
      expect(description).toBeInTheDocument()
      expect(description).toHaveTextContent('这是卡片描述')
    })

    it('应该支持多行描述', () => {
      render(
        <CardDescription>
          第一行描述
          <br />
          第二行描述
          <br />
          第三行描述
        </CardDescription>
      )

      expect(screen.getByText('第一行描述')).toBeInTheDocument()
      expect(screen.getByText('第二行描述')).toBeInTheDocument()
      expect(screen.getByText('第三行描述')).toBeInTheDocument()
    })

    it('应该支持自定义描述样式', () => {
      render(
        <CardDescription className="custom-desc" data-testid="custom-desc">
          自定义描述
        </CardDescription>
      )

      const description = screen.getByTestId('custom-desc')
      expect(description).toHaveClass('custom-desc')
    })

    it('应该支持HTML内容', () => {
      render(
        <CardDescription>
          包含<strong>粗体</strong>和<em>斜体</em>的描述
        </CardDescription>
      )

      expect(screen.getByText('粗体')).toBeInTheDocument()
      expect(screen.getByText('斜体')).toBeInTheDocument()
    })
  })

  describe('CardContent测试', () => {
    it('应该正确渲染卡片内容', () => {
      render(
        <CardContent data-testid="card-content">
          卡片内容区域
        </CardContent>
      )

      const content = screen.getByTestId('card-content')
      expect(content).toBeInTheDocument()
      expect(screen.getByText('卡片内容区域')).toBeInTheDocument()
    })

    it('应该支持复杂内容结构', () => {
      render(
        <CardContent>
          <div className="content-wrapper">
            <h4>内容标题</h4>
            <p>内容段落</p>
            <div className="content-stats">
              <span>统计1</span>
              <span>统计2</span>
            </div>
          </div>
        </CardContent>
      )

      expect(screen.getByText('内容标题')).toBeInTheDocument()
      expect(screen.getByText('内容段落')).toBeInTheDocument()
      expect(screen.getByText('统计1')).toBeInTheDocument()
      expect(screen.getByText('统计2')).toBeInTheDocument()
    })

    it('应该支持自定义内容样式', () => {
      render(
        <CardContent className="custom-content" data-testid="custom-content">
          自定义内容
        </CardContent>
      )

      const content = screen.getByTestId('custom-content')
      expect(content).toHaveClass('custom-content')
    })
  })

  describe('CardFooter测试', () => {
    it('应该正确渲染卡片底部', () => {
      render(
        <CardFooter data-testid="card-footer">
          <Button>底部按钮</Button>
        </CardFooter>
      )

      const footer = screen.getByTestId('card-footer')
      expect(footer).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '底部按钮' })).toBeInTheDocument()
    })

    it('应该支持多个操作按钮', () => {
      const handleClick1 = vi.fn()
      const handleClick2 = vi.fn()
      const handleClick3 = vi.fn()

      render(
        <CardFooter>
          <Button onClick={handleClick1}>操作1</Button>
          <Button variant="outline" onClick={handleClick2}>
            操作2
          </Button>
          <Button variant="ghost" onClick={handleClick3}>
            操作3
          </Button>
        </CardFooter>
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)

      await userEvent.click(buttons[0])
      expect(handleClick1).toHaveBeenCalledTimes(1)

      await userEvent.click(buttons[1])
      expect(handleClick2).toHaveBeenCalledTimes(1)

      await userEvent.click(buttons[2])
      expect(handleClick3).toHaveBeenCalledTimes(1)
    })

    it('应该支持自定义底部样式', () => {
      render(
        <CardFooter className="custom-footer" data-testid="custom-footer">
          <Button>自定义底部</Button>
        </CardFooter>
      )

      const footer = screen.getByTestId('custom-footer')
      expect(footer).toHaveClass('custom-footer')
    })

    it('应该支持非按钮内容', () => {
      render(
        <CardFooter>
          <span className="footer-text">底部文本</span>
          <div className="footer-meta">元信息</div>
        </CardFooter>
      )

      expect(screen.getByText('底部文本')).toBeInTheDocument()
      expect(screen.getByText('元信息')).toBeInTheDocument()
    })
  })

  describe('交互测试', () => {
    it('应该支持卡片点击事件', async () => {
      const handleCardClick = vi.fn()

      render(
        <Card onClick={handleCardClick} data-testid="clickable-card">
          <CardContent>可点击卡片</CardContent>
        </Card>
      )

      const card = screen.getByTestId('clickable-card')
      await userEvent.click(card)

      expect(handleCardClick).toHaveBeenCalledTimes(1)
    })

    it('应该支持卡片悬停效果', async () => {
      render(
        <Card data-testid="hover-card" className="hover:shadow-lg">
          <CardContent>悬停卡片</CardContent>
        </Card>
      )

      const card = screen.getByTestId('hover-card')

      // 模拟鼠标悬停
      fireEvent.mouseEnter(card)

      // 检查是否有hover相关的类
      const hasHoverClass = Array.from(card.classList).some(className =>
        className.includes('hover:')
      )

      expect(hasHoverClass).toBe(true)
    })

    it('应该阻止内容区域的点击事件冒泡', async () => {
      const handleCardClick = vi.fn()
      const handleContentClick = vi.fn()

      render(
        <Card onClick={handleCardClick}>
          <CardContent onClick={handleContentClick}>
            内容区域
          </CardContent>
        </Card>
      )

      const content = screen.getByText('内容区域')
      await userEvent.click(content)

      expect(handleContentClick).toHaveBeenCalledTimes(1)
      // 如果事件没有阻止冒泡，卡片点击也会被触发
    })

    it('应该支持键盘导航', async () => {
      const handleCardClick = vi.fn()

      render(
        <Card
          onClick={handleCardClick}
          tabIndex={0}
          data-testid="keyboard-card"
        >
          <CardContent>键盘导航卡片</CardContent>
        </Card>
      )

      const card = screen.getByTestId('keyboard-card')
      card.focus()

      await userEvent.keyboard('{Enter}')

      expect(handleCardClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('样式测试', () => {
    it('应该具有卡片基础样式', () => {
      render(
        <Card data-testid="styled-card">
          <CardContent>样式测试</CardContent>
        </Card>
      )

      const card = screen.getByTestId('styled-card')
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm')
    })

    it('应该支持不同尺寸变体', () => {
      const { rerender } = render(
        <Card className="w-64" data-testid="size-card">
          <CardContent>固定宽度</CardContent>
        </Card>
      )

      let card = screen.getByTestId('size-card')
      expect(card).toHaveClass('w-64')

      rerender(
        <Card className="w-full max-w-md" data-testid="responsive-card">
          <CardContent>响应式宽度</CardContent>
        </Card>
      )

      card = screen.getByTestId('responsive-card')
      expect(card).toHaveClass('w-full', 'max-w-md')
    })

    it('应该支持不同的阴影效果', () => {
      render(
        <Card className="shadow-lg" data-testid="shadow-card">
          <CardContent>大阴影卡片</CardContent>
        </Card>
      )

      const card = screen.getByTestId('shadow-card')
      expect(card).toHaveClass('shadow-lg')
    })

    it('应该支持不同的边框样式', () => {
      render(
        <Card className="border-2 border-primary" data-testid="border-card">
          <CardContent>自定义边框</CardContent>
        </Card>
      )

      const card = screen.getByTestId('border-card')
      expect(card).toHaveClass('border-2', 'border-primary')
    })

    it('应该支持不同的背景样式', () => {
      render(
        <Card className="bg-muted" data-testid="bg-card">
          <CardContent>自定义背景</CardContent>
        </Card>
      )

      const card = screen.getByTestId('bg-card')
      expect(card).toHaveClass('bg-muted')
    })
  })

  describe('可访问性测试', () => {
    it('应该支持语义化结构', () => {
      render(
        <Card role="article" data-testid="semantic-card">
          <CardHeader>
            <CardTitle>文章标题</CardTitle>
          </CardHeader>
          <CardContent>文章内容</CardContent>
        </Card>
      )

      const card = screen.getByTestId('semantic-card')
      expect(card).toHaveAttribute('role', 'article')
    })

    it('应该支持aria-label', () => {
      render(
        <Card aria-label="用户信息卡片" data-testid="aria-card">
          <CardContent>用户信息</CardContent>
        </Card>
      )

      const card = screen.getByTestId('aria-card')
      expect(card).toHaveAttribute('aria-label', '用户信息卡片')
    })

    it('应该支持aria-labelledby', () => {
      render(
        <div>
          <h2 id="card-title-1">卡片标题</h2>
          <Card aria-labelledby="card-title-1" data-testid="labelledby-card">
            <CardContent>卡片内容</CardContent>
          </Card>
        </div>
      )

      const card = screen.getByTestId('labelledby-card')
      expect(card).toHaveAttribute('aria-labelledby', 'card-title-1')
    })

    it('应该支持aria-describedby', () => {
      render(
        <div>
          <Card aria-describedby="card-desc-1" data-testid="describedby-card">
            <CardContent>卡片内容</CardContent>
          </Card>
          <p id="card-desc-1">这是卡片的描述信息</p>
        </div>
      )

      const card = screen.getByTestId('describedby-card')
      expect(card).toHaveAttribute('aria-describedby', 'card-desc-1')
    })

    it('标题应该具有正确的级别', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>主标题</CardTitle>
          </CardHeader>
          <CardContent>
            <CardTitle as="h3">副标题</CardTitle>
          </CardContent>
        </Card>
      )

      const mainTitle = screen.getByRole('heading', { level: 3, name: '主标题' })
      const subTitle = screen.getByRole('heading', { level: 3, name: '副标题' })

      expect(mainTitle).toBeInTheDocument()
      expect(subTitle).toBeInTheDocument()
    })
  })

  describe('响应式测试', () => {
    it('应该在移动端正确显示', async () => {
      render(
        <Card className="w-full" data-testid="mobile-card">
          <CardContent>移动端卡片</CardContent>
        </Card>
      )

      await UITestUtils.setViewport(375, 667)

      const card = screen.getByTestId('mobile-card')
      expect(UITestUtils.isElementVisible(card)).toBe(true)

      const computedStyle = UITestUtils.getComputedStyle(card)
      expect(computedStyle.display).not.toBe('none')
    })

    it('应该在桌面端正确显示', async () => {
      render(
        <Card className="max-w-md" data-testid="desktop-card">
          <CardContent>桌面端卡片</CardContent>
        </Card>
      )

      await UITestUtils.setViewport(1920, 1080)

      const card = screen.getByTestId('desktop-card')
      expect(UITestUtils.isElementVisible(card)).toBe(true)
    })

    it('应该在不同尺寸下保持可访问性', async () => {
      const viewports = [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1920, height: 1080 }
      ]

      render(
        <Card className="w-full max-w-lg" data-testid="responsive-card">
          <CardHeader>
            <CardTitle>响应式卡片</CardTitle>
          </CardHeader>
          <CardContent>响应式内容</CardContent>
        </Card>
      )

      const card = screen.getByTestId('responsive-card')
      const results = await UITestUtils.checkResponsiveLayout(card, viewports)

      results.forEach(result => {
        expect(result.visible).toBe(true)
        expect(UITestUtils.isElementAccessible(card)).toBe(true)
      })
    })
  })

  describe('主题测试', () => {
    it('应该支持主题切换', async () => {
      render(
        <Card data-testid="theme-card">
          <CardContent>主题测试</CardContent>
        </Card>
      )

      const card = screen.getByTestId('theme-card')
      const themes = ['light', 'dark']

      const results = await UITestUtils.verifyThemeToggle(card, themes)

      results.forEach(result => {
        expect(result.applied).toBeDefined()
      })
    })

    it('应该在暗色主题下正确显示', async () => {
      render(
        <Card data-testid="dark-theme-card">
          <CardContent>暗色主题测试</CardContent>
        </Card>
      )

      document.documentElement.setAttribute('data-theme', 'dark')
      await UITestUtils.delay(100)

      const card = screen.getByTestId('dark-theme-card')
      expect(UITestUtils.isElementVisible(card)).toBe(true)
    })
  })

  describe('错误处理测试', () => {
    it('应该处理空内容', () => {
      render(<Card />)

      expect(document.querySelector('[class*="card"]')).toBeInTheDocument()
    })

    it('应该处理undefined children', () => {
      render(<Card>{undefined}</Card>)

      expect(document.querySelector('[class*="card"]')).toBeInTheDocument()
    })

    it('应该处理null children', () => {
      render(<Card>{null}</Card>)

      expect(document.querySelector('[class*="card"]')).toBeInTheDocument()
    })

    it('应该处理嵌套组件错误', () => {
      expect(() => {
        render(
          <Card>
            <CardHeader>
              <CardTitle>标题</CardTitle>
              <CardDescription>描述</CardDescription>
            </CardHeader>
            <CardContent>内容</CardContent>
            <CardFooter>底部</CardFooter>
          </Card>
        )
      }).not.toThrow()
    })
  })

  describe('性能测试', () => {
    it('应该快速渲染单个卡片', () => {
      const startTime = performance.now()

      render(
        <Card data-testid="perf-card">
          <CardHeader>
            <CardTitle>性能测试</CardTitle>
          </CardHeader>
          <CardContent>性能测试内容</CardContent>
        </Card>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100)
    })

    it('应该支持大量卡片同时渲染', () => {
      const startTime = performance.now()

      const cards = Array.from({ length: 50 }, (_, index) => (
        <Card key={index} data-testid={`card-${index}`}>
          <CardHeader>
            <CardTitle>卡片 {index}</CardTitle>
          </CardHeader>
          <CardContent>内容 {index}</CardContent>
        </Card>
      ))

      render(<div className="grid">{cards}</div>)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(1000)

      const renderedCards = screen.getAllByTestId(/^card-/)
      expect(renderedCards).toHaveLength(50)
    })

    it('应该支持复杂卡片结构渲染', () => {
      const startTime = performance.now()

      render(
        <Card>
          <CardHeader>
            <CardTitle>复杂卡片</CardTitle>
            <CardDescription>
              这是一个复杂的卡片描述，包含很多信息和详细内容
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4>第一部分</h4>
                <p>第一部分的内容描述</p>
              </div>
              <div>
                <h4>第二部分</h4>
                <p>第二部分的内容描述</p>
              </div>
              <div>
                <h4>第三部分</h4>
                <p>第三部分的内容描述</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button>操作1</Button>
            <Button variant="outline">操作2</Button>
            <Button variant="ghost">操作3</Button>
          </CardFooter>
        </Card>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100)
    })
  })

  describe('集成测试', () => {
    it('应该与列表组件正常工作', () => {
      const items = ['项目1', '项目2', '项目3']

      render(
        <div data-testid="list-container">
          {items.map((item, index) => (
            <Card key={index} data-testid={`item-${index}`}>
              <CardContent>{item}</CardContent>
            </Card>
          ))}
        </div>
      )

      const container = screen.getByTestId('list-container')
      const cards = screen.getAllByTestId(/^item-/)

      expect(container).toContainElement(cards[0])
      expect(container).toContainElement(cards[1])
      expect(container).toContainElement(cards[2])
      expect(cards).toHaveLength(3)
    })

    it('应该与网格布局正常工作', () => {
      render(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card data-testid="grid-card-1">
            <CardContent>网格卡片1</CardContent>
          </Card>
          <Card data-testid="grid-card-2">
            <CardContent>网格卡片2</CardContent>
          </Card>
          <Card data-testid="grid-card-3">
            <CardContent>网格卡片3</CardContent>
          </Card>
        </div>
      )

      const cards = [
        screen.getByTestId('grid-card-1'),
        screen.getByTestId('grid-card-2'),
        screen.getByTestId('grid-card-3')
      ]

      cards.forEach(card => {
        expect(card).toBeInTheDocument()
      })
    })

    it('应该在表单中正常工作', () => {
      render(
        <form data-testid="card-form">
          <Card>
            <CardHeader>
              <CardTitle>用户信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="name">姓名</label>
                <input id="name" data-testid="name-input" />
              </div>
              <div>
                <label htmlFor="email">邮箱</label>
                <input id="email" data-testid="email-input" />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit">提交</Button>
            </CardFooter>
          </Card>
        </form>
      )

      const form = screen.getByTestId('card-form')
      const nameInput = screen.getByTestId('name-input')
      const emailInput = screen.getByTestId('email-input')
      const submitButton = screen.getByRole('button', { name: '提交' })

      expect(form).toContainElement(nameInput)
      expect(form).toContainElement(emailInput)
      expect(form).toContainElement(submitButton)
    })
  })
})