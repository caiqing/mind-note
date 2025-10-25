/**
 * UI测试环境设置
 *
 * 配置UI测试的基础环境、全局测试工具和测试数据
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { configure } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'
import { UI_TEST_CONFIG } from '../config/ui-test.config'

// 配置Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: UI_TEST_CONFIG.TESTING_LIBRARY_TIMEOUT
})

// 创建用户事件实例
export const user = userEvent.setup({
  advanceTimers: jest.advanceTimersByTime,
  skipAutoCleanup: false
})

// 测试工具类
export class UITestUtils {
  /**
   * 等待元素出现
   */
  static async waitForElement(selector: string, timeout = 5000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      const checkElement = () => {
        const element = document.querySelector(selector)
        if (element) {
          resolve(element)
          return
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${selector} not found within ${timeout}ms`))
          return
        }

        setTimeout(checkElement, 100)
      }

      checkElement()
    })
  }

  /**
   * 等待元素消失
   */
  static async waitForElementToDisappear(selector: string, timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      const checkElement = () => {
        const element = document.querySelector(selector)
        if (!element) {
          resolve()
          return
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${selector} still present after ${timeout}ms`))
          return
        }

        setTimeout(checkElement, 100)
      }

      checkElement()
    })
  }

  /**
   * 检查元素是否可见
   */
  static isElementVisible(element: Element): boolean {
    const style = window.getComputedStyle(element)
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0' &&
           element.offsetWidth > 0 &&
           element.offsetHeight > 0
  }

  /**
   * 检查元素是否可访问
   */
  static isElementAccessible(element: Element): boolean {
    // 检查基本的可访问性属性
    if (element instanceof HTMLElement) {
      // 检查tabindex
      if (element.tabIndex < 0 && element.tagName !== 'DIV' && element.tagName !== 'SPAN') {
        return false
      }

      // 检查aria-hidden
      if (element.getAttribute('aria-hidden') === 'true') {
        return false
      }

      // 检查disabled状态
      if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
        if (element.disabled) {
          return false
        }
      }
    }

    return true
  }

  /**
   * 获取元素的计算样式
   */
  static getComputedStyle(element: Element): CSSStyleDeclaration {
    return window.getComputedStyle(element)
  }

  /**
   * 检查元素是否具有特定的CSS类
   */
  static hasClass(element: Element, className: string): boolean {
    return element.classList.contains(className)
  }

  /**
   * 获取元素的文本内容
   */
  static getTextContent(element: Element): string {
    return element.textContent || ''
  }

  /**
   * 模拟键盘导航
   */
  static async navigateWithKeyboard(
    startElement: Element,
    keys: string[],
    interval = 50
  ): Promise<void> {
    let currentElement = startElement

    for (const key of keys) {
      await user.keyboard(key)
      await this.wait(interval)

      // 更新当前焦点元素
      const focusedElement = document.activeElement
      if (focusedElement && focusedElement !== currentElement) {
        currentElement = focusedElement
      }
    }
  }

  /**
   * 检查颜色对比度
   */
  static checkColorContrast(
    backgroundColor: string,
    textColor: string
  ): { ratio: number; passes: { aa: boolean; aaa: boolean } } {
    // 简化的对比度计算
    const getLuminance = (color: string): number => {
      const hex = color.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16) / 255
      const g = parseInt(hex.substr(2, 2), 16) / 255
      const b = parseInt(hex.substr(4, 2), 16) / 255

      const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
      const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
      const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)

      return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB
    }

    const bgLum = getLuminance(backgroundColor)
    const textLum = getLuminance(textColor)

    const ratio = (Math.max(bgLum, textLum) + 0.05) / (Math.min(bgLum, textLum) + 0.05)

    return {
      ratio,
      passes: {
        aa: ratio >= 4.5,
        aaa: ratio >= 7
      }
    }
  }

  /**
   * 模拟不同的视口大小
   */
  static async setViewport(width: number, height: number): Promise<void> {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width
    })

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height
    })

    // 触发resize事件
    window.dispatchEvent(new Event('resize'))
  }

  /**
   * 创建测试数据
   */
  static createTestData() {
    return {
      user: {
        id: 'test-user-id',
        name: '测试用户',
        email: 'test@example.com',
        avatar: '/test-avatar.jpg'
      },
      note: {
        id: 'test-note-id',
        title: '测试笔记标题',
        content: '这是测试笔记的内容，用于验证组件功能。',
        tags: ['测试', '自动化'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      aiAnalysis: {
        summary: '这是AI生成的摘要',
        keywords: ['关键词1', '关键词2', '关键词3'],
        sentiment: {
          polarity: 0.5,
          confidence: 0.8,
          label: 'positive'
        },
        score: 4.2
      }
    }
  }

  /**
   * 创建组件测试数据
   */
  static createComponentTestData() {
    return {
      button: {
        text: '测试按钮',
        onClick: jest.fn(),
        disabled: false,
        loading: false,
        variant: 'primary'
      },
      input: {
        value: '',
        placeholder: '请输入内容',
        onChange: jest.fn(),
        onBlur: jest.fn(),
        disabled: false,
        error: ''
      },
      card: {
        title: '测试卡片',
        description: '这是测试卡片的描述内容',
        footer: '卡片底部内容',
        actions: ['操作1', '操作2']
      }
    }
  }

  /**
   * 模拟网络延迟
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 创建mock函数
   */
  static createMockFunction<T extends (...args: any[]) => any>(
    implementation?: (...args: Parameters<T>) => ReturnType<T>
  ): jest.Mock<ReturnType<T>, Parameters<T>> {
    return jest.fn().mockImplementation(implementation)
  }

  /**
   * 验证可访问性属性
   */
  static verifyAccessibility(element: Element): {
    hasAriaLabel: boolean
    hasAriaDescribedBy: boolean
    hasRole: boolean
    hasTabIndex: boolean
    isKeyboardNavigable: boolean
  } {
    const hasAriaLabel = !!element.getAttribute('aria-label') || !!element.getAttribute('aria-labelledby')
    const hasAriaDescribedBy = !!element.getAttribute('aria-describedby')
    const hasRole = !!element.getAttribute('role')
    const hasTabIndex = element.hasAttribute('tabindex')
    const isKeyboardNavigable = element instanceof HTMLElement &&
      (element.tabIndex >= 0 || ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(element.tagName))

    return {
      hasAriaLabel,
      hasAriaDescribedBy,
      hasRole,
      hasTabIndex,
      isKeyboardNavigable
    }
  }

  /**
   * 检查响应式布局
   */
  static async checkResponsiveLayout(
    element: Element,
    viewports: Array<{ name: string; width: number; height: number }>
  ): Promise<Array<{ name: string; visible: boolean; width: number; height: number }>> {
    const results = []

    for (const viewport of viewports) {
      await this.setViewport(viewport.width, viewport.height)
      await this.delay(100) // 等待布局调整

      const isVisible = this.isElementVisible(element)
      results.push({
        name: viewport.name,
        visible: isVisible,
        width: viewport.width,
        height: viewport.height
      })
    }

    return results
  }

  /**
   * 验证主题切换
   */
  static async verifyThemeToggle(
    element: Element,
    themes: string[]
  ): Promise<Array<{ theme: string; applied: boolean }>> {
    const results = []

    for (const theme of themes) {
      // 模拟主题切换
      document.documentElement.setAttribute('data-theme', theme)
      await this.delay(100)

      const hasThemeClass = this.hasClass(element, `theme-${theme}`)
      results.push({
        theme,
        applied: hasThemeClass
      })
    }

    return results
  }

  /**
   * 安全地创建DOM元素
   */
  static createElement(tag: string, attributes: Record<string, string> = {}, textContent = ''): Element {
    const element = document.createElement(tag)

    // 设置属性
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value)
    })

    // 设置文本内容
    if (textContent) {
      element.textContent = textContent
    }

    return element
  }

  /**
   * 安全地清空DOM容器
   */
  static clearContainer(container: Element = document.body): void {
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }
  }
}

// 全局测试设置
beforeAll(async () => {
  console.log('🎨 开始UI测试环境初始化...')

  // 启动Mock Service Worker
  server.listen({
    onUnhandledRequest: 'warn'
  })

  // 设置全局错误处理
  window.addEventListener('error', (event) => {
    console.warn('测试中的错误:', event.error)
  })

  // 设置全局控制台捕获
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    // 在测试中捕获console.error但不输出
    originalConsoleError('[TEST]', ...args)
  }

  console.log('✅ UI测试环境初始化完成')
})

afterAll(async () => {
  console.log('🧹 开始清理UI测试环境...')

  // 停止Mock Service Worker
  server.close()

  // 恢复原始console.error
  // (在实际测试中应该保存并恢复原始函数)

  console.log('✅ UI测试环境清理完成')
})

// 每个测试前的设置
beforeEach(() => {
  // 安全地清理DOM
  UITestUtils.clearContainer()
})

// 每个测试后的清理
afterEach(() => {
  // 清理Testing Library
  cleanup()
})

// 导出测试工具
export { beforeAll, afterAll, beforeEach, afterEach }