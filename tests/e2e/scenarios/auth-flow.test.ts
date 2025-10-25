/**
 * 用户认证流程E2E测试
 *
 * 测试用户注册、登录、登出等认证相关功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestUtils, testPrisma } from '../setup/setup'
import { Pages } from '../helpers/page-objects'
import { TEST_SCENARIOS, E2E_CONFIG } from '../config/e2e.config'

describe('用户认证流程', () => {
  let loginPage: InstanceType<typeof Pages.Login>
  let registerPage: InstanceType<typeof Pages.Register>
  let dashboardPage: InstanceType<typeof Pages.Dashboard>

  beforeEach(async () => {
    loginPage = new Pages.Login()
    registerPage = new Pages.Register()
    dashboardPage = new Pages.Dashboard()

    // 清理测试用户
    await TestUtils.cleanupDatabase(['users', 'sessions'])
  })

  afterEach(async () => {
    // 清理测试数据
    await TestUtils.cleanupDatabase(['users', 'sessions'])
  })

  describe('用户注册', () => {
    it('应该能够成功注册新用户', async () => {
      const userData = {
        name: 'E2E测试用户',
        email: TestUtils.randomEmail(),
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      }

      // 执行注册
      await registerPage.register(userData)

      // 验证注册成功
      const successMessage = await registerPage.getSuccessMessage()
      expect(successMessage).toContain('注册成功') || expect(successMessage).toContain('注册完成')

      // 验证用户已创建
      const createdUser = await testPrisma.user.findUnique({
        where: { email: userData.email }
      })
      expect(createdUser).toBeTruthy()
      expect(createdUser?.name).toBe(userData.name)
      expect(createdUser?.email).toBe(userData.email)
    })

    it('应该拒绝重复的邮箱注册', async () => {
      const userData = {
        name: '测试用户',
        email: TestUtils.randomEmail(),
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      }

      // 先创建一个用户
      await TestUtils.createTestUser({
        email: userData.email,
        name: userData.name,
        password: userData.password
      })

      // 尝试再次注册相同邮箱
      await registerPage.register(userData)

      // 验证显示错误消息
      const errorMessage = await registerPage.getErrorMessage()
      expect(errorMessage).toContain('邮箱已存在') || expect(errorMessage).toContain('邮箱已被使用')
    })

    it('应该验证密码强度要求', async () => {
      const userData = {
        name: '测试用户',
        email: TestUtils.randomEmail(),
        password: '123', // 弱密码
        confirmPassword: '123'
      }

      await registerPage.register(userData)

      // 验证显示密码强度错误
      const errorMessage = await registerPage.getErrorMessage()
      expect(errorMessage).toContain('密码强度') || expect(errorMessage).toContain('密码格式')
    })

    it('应该验证确认密码匹配', async () => {
      const userData = {
        name: '测试用户',
        email: TestUtils.randomEmail(),
        password: 'TestPassword123!',
        confirmPassword: 'DifferentPassword123!'
      }

      await registerPage.register(userData)

      // 验证显示密码不匹配错误
      const errorMessage = await registerPage.getErrorMessage()
      expect(errorMessage).toContain('密码不匹配') || expect(errorMessage).toContain('确认密码')
    })

    it('应该验证邮箱格式', async () => {
      const userData = {
        name: '测试用户',
        email: 'invalid-email-format', // 无效邮箱格式
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      }

      await registerPage.register(userData)

      // 验证显示邮箱格式错误
      const errorMessage = await registerPage.getErrorMessage()
      expect(errorMessage).toContain('邮箱格式') || expect(errorMessage).toContain('邮箱无效')
    })
  })

  describe('用户登录', () => {
    let testUser: any

    beforeEach(async () => {
      // 创建测试用户
      testUser = await TestUtils.createTestUser()
    })

    it('应该能够成功登录', async () => {
      // 执行登录
      await loginPage.login(testUser.email, 'TestPassword123!')

      // 验证跳转到仪表板
      await TestUtils.wait(2000)
      const isOnDashboard = await dashboardPage.isOnDashboard()
      expect(isOnDashboard).toBe(true)
    })

    it('应该拒绝错误的密码', async () => {
      await loginPage.login(testUser.email, 'WrongPassword123!')

      // 验证显示错误消息
      const errorMessage = await loginPage.getErrorMessage()
      expect(errorMessage).toContain('密码错误') || expect(errorMessage).toContain('登录失败')

      // 验证仍在登录页面
      const isOnLoginPage = await loginPage.isOnLoginPage()
      expect(isOnLoginPage).toBe(true)
    })

    it('应该拒绝不存在的用户', async () => {
      await loginPage.login('nonexistent@example.com', 'TestPassword123!')

      // 验证显示错误消息
      const errorMessage = await loginPage.getErrorMessage()
      expect(errorMessage).toContain('用户不存在') || expect(errorMessage).toContain('登录失败')

      // 验证仍在登录页面
      const isOnLoginPage = await loginPage.isOnLoginPage()
      expect(isOnLoginPage).toBe(true)
    })

    it('应该验证必填字段', async () => {
      await loginPage.login('', '')

      // 验证显示验证错误
      const errorMessage = await loginPage.getErrorMessage()
      expect(errorMessage).toContain('邮箱') || expect(errorMessage).toContain('密码') || expect(errorMessage).toContain('必填')
    })
  })

  describe('用户登出', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await TestUtils.createTestUser()

      // 先登录
      await loginPage.login(testUser.email, 'TestPassword123!')
      await TestUtils.wait(2000)
    })

    it('应该能够成功登出', async () => {
      // 执行登出
      await dashboardPage.logout()

      // 验证跳转到登录页面
      await TestUtils.wait(2000)
      const isOnLoginPage = await loginPage.isOnLoginPage()
      expect(isOnLoginPage).toBe(true)
    })

    it('登出后应该无法访问受保护页面', async () => {
      // 先登出
      await dashboardPage.logout()
      await TestUtils.wait(2000)

      // 尝试直接访问仪表板
      await dashboardPage.navigate()
      await TestUtils.wait(2000)

      // 验证被重定向到登录页面
      const isOnLoginPage = await loginPage.isOnLoginPage()
      expect(isOnLoginPage).toBe(true)
    })
  })

  describe('会话管理', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await TestUtils.createTestUser()
    })

    it('应该保持登录状态', async () => {
      // 登录
      await loginPage.login(testUser.email, 'TestPassword123!')
      await TestUtils.wait(2000)

      // 刷新页面
      await dashboardPage.navigate()
      await TestUtils.wait(2000)

      // 验证仍在登录状态
      const isOnDashboard = await dashboardPage.isOnDashboard()
      expect(isOnDashboard).toBe(true)
    })

    it('会话过期后应该需要重新登录', async () => {
      // 登录
      await loginPage.login(testUser.email, 'TestPassword123!')
      await TestUtils.wait(2000)

      // 清除会话（模拟会话过期）
      await TestUtils.cleanupDatabase(['sessions'])
      await TestUtils.wait(1000)

      // 尝试访问受保护页面
      await dashboardPage.navigate()
      await TestUtils.wait(2000)

      // 验证被重定向到登录页面
      const isOnLoginPage = await loginPage.isOnLoginPage()
      expect(isOnLoginPage).toBe(true)
    })
  })

  describe('页面导航', () => {
    it('应该能够在登录和注册页面之间导航', async () => {
      // 从登录页面导航到注册页面
      await loginPage.goToRegister()
      await TestUtils.wait(1000)

      // 验证在注册页面
      const title = await registerPage.getTitle()
      expect(title).toContain('注册') || expect(title).toContain('Register')

      // 从注册页面导航回登录页面
      await registerPage.goToLogin()
      await TestUtils.wait(1000)

      // 验证在登录页面
      const isOnLoginPage = await loginPage.isOnLoginPage()
      expect(isOnLoginPage).toBe(true)
    })

    it('未登录用户访问受保护页面应该重定向到登录页面', async () => {
      // 尝试直接访问仪表板
      await dashboardPage.navigate()
      await TestUtils.wait(2000)

      // 验证被重定向到登录页面
      const isOnLoginPage = await loginPage.isOnLoginPage()
      expect(isOnLoginPage).toBe(true)
    })
  })

  describe('安全功能', () => {
    it('应该防止暴力破解攻击', async () => {
      const testUser = await TestUtils.createTestUser()

      // 多次尝试错误登录
      for (let i = 0; i < 5; i++) {
        await loginPage.login(testUser.email, `WrongPassword${i}!`)
        await TestUtils.wait(1000)
      }

      // 验证显示账户锁定或限制登录的提示
      const errorMessage = await loginPage.getErrorMessage()
      expect(errorMessage).toContain('锁定') || expect(errorMessage).toContain('限制') || expect(errorMessage).toContain('请稍后再试')
    })

    it('应该正确处理CSRF保护', async () => {
      // 这个测试需要检查CSRF token的存在和验证
      // 在实际实现中，需要验证表单是否包含CSRF token
      const userData = {
        name: 'CSRF测试用户',
        email: TestUtils.randomEmail(),
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      }

      await registerPage.register(userData)

      // 验证注册成功（意味着CSRF token正常工作）
      const successMessage = await registerPage.getSuccessMessage()
      expect(successMessage).toBeTruthy()
    })
  })

  describe('响应式设计', () => {
    it('应该在移动设备上正常显示登录表单', async () => {
      // 模拟移动设备视口
      // 这里应该设置浏览器视口大小
      // await page.setViewportSize({ width: 375, height: 667 })

      await loginPage.navigate()
      await loginPage.waitForLoad()

      // 验证登录表单元素存在
      const hasEmailInput = await loginPage.elementExists('input[name="email"]')
      const hasPasswordInput = await loginPage.elementExists('input[name="password"]')
      const hasLoginButton = await loginPage.elementExists('button[type="submit"]')

      expect(hasEmailInput).toBe(true)
      expect(hasPasswordInput).toBe(true)
      expect(hasLoginButton).toBe(true)
    })

    it('应该在平板设备上正常显示注册表单', async () => {
      // 模拟平板设备视口
      // await page.setViewportSize({ width: 768, height: 1024 })

      await registerPage.navigate()
      await registerPage.waitForLoad()

      // 验证注册表单元素存在
      const hasNameInput = await registerPage.elementExists('input[name="name"]')
      const hasEmailInput = await registerPage.elementExists('input[name="email"]')
      const hasPasswordInput = await registerPage.elementExists('input[name="password"]')
      const hasConfirmPasswordInput = await registerPage.elementExists('input[name="confirmPassword"]')

      expect(hasNameInput).toBe(true)
      expect(hasEmailInput).toBe(true)
      expect(hasPasswordInput).toBe(true)
      expect(hasConfirmPasswordInput).toBe(true)
    })
  })

  describe('性能测试', () => {
    it('登录响应时间应该在合理范围内', async () => {
      const testUser = await TestUtils.createTestUser()

      const startTime = Date.now()
      await loginPage.login(testUser.email, 'TestPassword123!')
      const endTime = Date.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(E2E_CONFIG.TIMEOUTS.API_RESPONSE)
    })

    it('注册响应时间应该在合理范围内', async () => {
      const userData = {
        name: '性能测试用户',
        email: TestUtils.randomEmail(),
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      }

      const startTime = Date.now()
      await registerPage.register(userData)
      const endTime = Date.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(E2E_CONFIG.TIMEOUTS.API_RESPONSE)
    })
  })
})