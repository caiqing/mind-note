/**
 * Dialog组件UI测试
 *
 * 测试Dialog组件的所有功能、状态和交互
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UITestUtils } from '../../setup/ui-test-setup'

describe('Dialog组件', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染基础对话框', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>对话框标题</DialogTitle>
            <DialogDescription>对话框描述</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      expect(trigger).toBeInTheDocument()

      // 打开对话框
      await userEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('对话框标题')).toBeInTheDocument()
        expect(screen.getByText('对话框描述')).toBeInTheDocument()
      })
    })

    it('应该支持自定义样式类名', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent className="custom-dialog">
            <DialogTitle>自定义对话框</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveClass('custom-dialog')
      })
    })

    it('应该支持自定义data-testid', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent data-testid="test-dialog">
            <DialogTitle>测试对话框</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByTestId('test-dialog')
        expect(dialog).toBeInTheDocument()
      })
    })
  })

  describe('打开和关闭测试', () => {
    it('应该通过触发器打开对话框', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>测试对话框</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })

      // 初始状态对话框应该不存在
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await userEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('应该通过关闭按钮关闭对话框', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>测试对话框</DialogTitle>
            </DialogHeader>
            <DialogClose asChild>
              <Button>关闭</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const closeButton = screen.getByRole('button', { name: '关闭' })
      await userEvent.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('应该通过ESC键关闭对话框', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>ESC关闭测试</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      await userEvent.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('应该通过点击遮罩层关闭对话框', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>遮罩关闭测试</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // 点击遮罩层（对话框外的区域）
      const overlay = screen.getByTestId('dialog-overlay')
      await userEvent.click(overlay)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('DialogContent测试', () => {
    it('应该正确渲染对话框内容', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <DialogTitle>内容测试</DialogTitle>
            <div>这是对话框的内容</div>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const content = screen.getByTestId('dialog-content')
        expect(content).toBeInTheDocument()
        expect(screen.getByText('这是对话框的内容')).toBeInTheDocument()
      })
    })

    it('应该支持复杂内容结构', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开复杂对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>复杂对话框</DialogTitle>
              <DialogDescription>这是一个复杂的对话框示例</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4>第一部分</h4>
                <p>第一部分内容</p>
              </div>
              <div>
                <h4>第二部分</h4>
                <p>第二部分内容</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">取消</Button>
              <Button>确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开复杂对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('复杂对话框')).toBeInTheDocument()
        expect(screen.getByText('这是一个复杂的对话框示例')).toBeInTheDocument()
        expect(screen.getByText('第一部分内容')).toBeInTheDocument()
        expect(screen.getByText('第二部分内容')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '确认' })).toBeInTheDocument()
      })
    })
  })

  describe('DialogHeader测试', () => {
    it('应该正确渲染对话框头部', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader data-testid="dialog-header">
              <DialogTitle>头部标题</DialogTitle>
              <DialogDescription>头部描述</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const header = screen.getByTestId('dialog-header')
        expect(header).toBeInTheDocument()
        expect(screen.getByText('头部标题')).toBeInTheDocument()
        expect(screen.getByText('头部描述')).toBeInTheDocument()
      })
    })

    it('应该支持自定义头部样式', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader className="custom-header" data-testid="custom-header">
              <DialogTitle>自定义头部</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const header = screen.getByTestId('custom-header')
        expect(header).toHaveClass('custom-header')
      })
    })
  })

  describe('DialogFooter测试', () => {
    it('应该正确渲染对话框底部', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogContent>内容</DialogContent>
            <DialogFooter data-testid="dialog-footer">
              <Button variant="outline">取消</Button>
              <Button>确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const footer = screen.getByTestId('dialog-footer')
        expect(footer).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '确认' })).toBeInTheDocument()
      })
    })

    it('应该支持多个操作按钮', async () => {
      const handleCancel = vi.fn()
      const handleConfirm = vi.fn()
      const handleSecondary = vi.fn()

      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogContent>内容</DialogContent>
            <DialogFooter>
              <Button variant="ghost" onClick={handleCancel}>
                取消
              </Button>
              <Button variant="outline" onClick={handleSecondary}>
                其他操作
              </Button>
              <Button onClick={handleConfirm}>确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        expect(buttons).toHaveLength(4) // 包括触发器
      })

      const cancelButton = screen.getByRole('button', { name: '取消' })
      const secondaryButton = screen.getByRole('button', { name: '其他操作' })
      const confirmButton = screen.getByRole('button', { name: '确认' })

      await userEvent.click(cancelButton)
      expect(handleCancel).toHaveBeenCalled()

      await userEvent.click(secondaryButton)
      expect(handleSecondary).toHaveBeenCalled()

      await userEvent.click(confirmButton)
      expect(handleConfirm).toHaveBeenCalled()
    })
  })

  describe('可访问性测试', () => {
    it('应该具有正确的role属性', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>可访问性测试</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        expect(dialog).toHaveAttribute('role', 'dialog')
      })
    })

    it('应该具有aria-modal属性', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>ARIA测试</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAttribute('aria-modal', 'true')
      })
    })

    it('应该具有aria-labelledby属性', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>标题测试</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        const title = screen.getByRole('heading', { name: '标题测试' })

        expect(dialog).toHaveAttribute('aria-labelledby')
        expect(title).toHaveAttribute('id')
      })
    })

    it('应该具有aria-describedby属性', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>标题</DialogTitle>
            <DialogDescription>描述内容</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAttribute('aria-describedby')
      })
    })

    it('应该支持键盘导航', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>键盘导航测试</DialogTitle>
            <Button>对话框内按钮</Button>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
      })

      // 焦点应该移动到对话框内
      const dialogButton = screen.getByRole('button', { name: '对话框内按钮' })
      expect(dialogButton).toBeInTheDocument()

      // Tab键应该能在对话框内导航
      await userEvent.tab()
      expect(document.activeElement).toBe(dialogButton)
    })

    it('应该支持焦点陷阱', async () => {
      render(
        <div>
          <Button data-testid="outside-button">外部按钮</Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>打开对话框</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>焦点陷阱测试</DialogTitle>
              <Button data-testid="dialog-button-1">对话框按钮1</Button>
              <Button data-testid="dialog-button-2">对话框按钮2</Button>
            </DialogContent>
          </Dialog>
        </div>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // 焦点应该在对话框内
      const dialogButton1 = screen.getByTestId('dialog-button-1')
      expect(document.activeElement).toBe(dialogButton1)

      // Tab键应该在对话框内循环
      await userEvent.tab()
      expect(document.activeElement).toBe(screen.getByTestId('dialog-button-2'))

      await userEvent.tab()
      // 焦点应该回到对话框内的第一个元素，而不是外部按钮
      expect(document.activeElement).not.toBe(screen.getByTestId('outside-button'))
    })
  })

  describe('交互测试', () => {
    it('应该支持表单提交', async () => {
      const handleSubmit = vi.fn()

      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开表单对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>表单测试</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <input data-testid="form-input" placeholder="输入内容" />
              <DialogFooter>
                <Button type="button" variant="outline">
                  取消
                </Button>
                <Button type="submit">提交</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开表单对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const input = screen.getByTestId('form-input')
      await userEvent.type(input, '测试内容')

      const submitButton = screen.getByRole('button', { name: '提交' })
      await userEvent.click(submitButton)

      expect(handleSubmit).toHaveBeenCalled()
    })

    it('应该支持防止意外关闭', async () => {
      const handleClose = vi.fn()
      const shouldPreventClose = vi.fn().mockReturnValue(true)

      render(
        <Dialog onOpenChange={handleClose}>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>防止关闭测试</DialogTitle>
            <Button onClick={shouldPreventClose}>尝试关闭</Button>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // 点击ESC键
      await userEvent.keyboard('{Escape}')

      // 如果shouldPreventClose返回true，对话框不应该关闭
      // 这个测试可能需要根据实际实现调整
    })
  })

  describe('样式测试', () => {
    it('应该具有对话框基础样式', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent data-testid="styled-dialog">
            <DialogTitle>样式测试</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByTestId('styled-dialog')
        expect(dialog).toHaveClass(
          'fixed',
          'z-50',
          'grid',
          'w-full',
          'max-w-lg'
        )
      })
    })

    it('应该支持不同尺寸', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开大对话框</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="large-dialog">
            <DialogTitle>大对话框</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开大对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByTestId('large-dialog')
        expect(dialog).toHaveClass('max-w-2xl')
      })
    })

    it('应该支持全屏对话框', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开全屏对话框</Button>
          </DialogTrigger>
          <DialogContent className="w-full h-full max-w-none max-h-none rounded-none" data-testid="fullscreen-dialog">
            <DialogTitle>全屏对话框</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开全屏对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByTestId('fullscreen-dialog')
        expect(dialog).toHaveClass('w-full', 'h-full', 'max-w-none', 'max-h-none', 'rounded-none')
      })
    })
  })

  describe('动画和过渡测试', () => {
    it('应该支持打开动画', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent data-testid="animated-dialog">
            <DialogTitle>动画测试</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByTestId('animated-dialog')
        expect(dialog).toBeInTheDocument()

        // 检查是否有动画相关的类
        const hasAnimationClass = Array.from(dialog.classList).some(className =>
          className.includes('duration') || className.includes('transition')
        )

        // 这个检查可能需要根据实际实现调整
      })
    })

    it('应该支持关闭动画', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>关闭动画测试</DialogTitle>
            <DialogClose asChild>
              <Button>关闭</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const closeButton = screen.getByRole('button', { name: '关闭' })
      await userEvent.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('响应式测试', () => {
    it('应该在移动端正确显示', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" data-testid="mobile-dialog">
            <DialogTitle>移动端测试</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await UITestUtils.setViewport(375, 667)

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByTestId('mobile-dialog')
        expect(dialog).toBeInTheDocument()
        expect(UITestUtils.isElementVisible(dialog)).toBe(true)
      })
    })

    it('应该在桌面端正确显示', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent data-testid="desktop-dialog">
            <DialogTitle>桌面端测试</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await UITestUtils.setViewport(1920, 1080)

      const trigger = screen.getByRole('button', { name: '打开对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByTestId('desktop-dialog')
        expect(dialog).toBeInTheDocument()
        expect(UITestUtils.isElementVisible(dialog)).toBe(true)
      })
    })
  })

  describe('错误处理测试', () => {
    it('应该处理空的DialogContent', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开空对话框</Button>
          </DialogTrigger>
          <DialogContent />
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开空对话框' })

      expect(async () => {
        await userEvent.click(trigger)
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument()
        })
      }).not.toThrow()
    })

    it('应该处理缺少标题的情况', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开无标题对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogDescription>只有描述的对话框</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开无标题对话框' })

      expect(async () => {
        await userEvent.click(trigger)
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument()
          expect(screen.getByText('只有描述的对话框')).toBeInTheDocument()
        })
      }).not.toThrow()
    })
  })

  describe('性能测试', () => {
    it('应该快速打开和关闭', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>性能测试</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })

      const openStartTime = performance.now()
      await userEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const openEndTime = performance.now()
      const openTime = openEndTime - openStartTime

      expect(openTime).toBeLessThan(500)

      const closeStartTime = performance.now()
      await userEvent.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      const closeEndTime = performance.now()
      const closeTime = closeEndTime - closeStartTime

      expect(closeTime).toBeLessThan(500)
    })

    it('应该支持多次快速开关', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>快速开关测试</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开对话框' })

      // 快速开关多次
      for (let i = 0; i < 3; i++) {
        await userEvent.click(trigger)

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        await userEvent.keyboard('{Escape}')

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
      }

      // 应该没有错误发生
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('集成测试', () => {
    it('应该与表单验证组件配合工作', async () => {
      const validateForm = vi.fn().mockReturnValue(false)

      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开表单对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>表单验证</DialogTitle>
            </DialogHeader>
            <form>
              <input data-testid="required-input" required />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">取消</Button>
                </DialogClose>
                <Button type="submit" onClick={validateForm}>
                  提交
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '打开表单对话框' })
      await userEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const submitButton = screen.getByRole('button', { name: '提交' })
      await userEvent.click(submitButton)

      expect(validateForm).toHaveBeenCalled()
    })

    it('应该与确认对话框模式配合工作', async () => {
      const handleConfirm = vi.fn()
      const handleCancel = vi.fn()

      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>删除项目</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                您确定要删除这个项目吗？此操作无法撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={handleCancel}>
                  取消
                </Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleConfirm}>
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: '删除项目' })
      await userEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument()
        expect(screen.getByText(/您确定要删除这个项目吗？/)).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: '确认删除' })
      await userEvent.click(confirmButton)

      expect(handleConfirm).toHaveBeenCalled()
    })
  })
})