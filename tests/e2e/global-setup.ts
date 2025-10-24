/**
 * E2E 测试全局设置
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 开始 E2E 测试全局设置...');

  // 获取浏览器实例
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 等待应用启动
    console.log('⏳ 等待应用启动...');
    await page.goto(config.webServer?.url || 'http://localhost:3000');

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 30000 });

    // 检查应用健康状态
    const healthCheck = await page.goto('/api/health');
    if (healthCheck?.ok()) {
      console.log('✅ 应用健康检查通过');
    } else {
      console.warn('⚠️ 应用健康检查失败，但继续测试');
    }

    // 设置测试数据（如果需要）
    console.log('🔧 设置测试数据...');
    await setupTestData(page);

    console.log('✅ E2E 测试全局设置完成');
  } catch (error) {
    console.error('❌ E2E 测试全局设置失败:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

// 设置测试数据
async function setupTestData(page: any) {
  try {
    // 创建测试用户（如果应用有用户系统）
    await page.evaluate(() => {
      localStorage.setItem(
        'test-user',
        JSON.stringify({
          id: 'test-user-id',
          name: '测试用户',
          email: 'test@example.com',
        }),
      );
    });

    // 设置其他测试环境配置
    await page.evaluate(() => {
      localStorage.setItem('test-env', 'e2e');
      sessionStorage.setItem('test-session', 'active');
    });
  } catch (error) {
    console.warn('⚠️ 测试数据设置失败:', error);
  }
}

export default globalSetup;
