/**
 * E2E 测试全局清理
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始 E2E 测试全局清理...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 访问应用
    await page.goto(config.webServer?.url || 'http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 清理测试数据
    console.log('🗑️ 清理测试数据...');
    await cleanupTestData(page);

    // 清理存储
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    console.log('✅ E2E 测试全局清理完成');
  } catch (error) {
    console.warn('⚠️ E2E 测试清理过程中出现警告:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

// 清理测试数据
async function cleanupTestData(page: any) {
  try {
    // 调用清理 API（如果存在）
    const cleanupResponse = await page.request.post('/api/test/cleanup', {
      data: { confirm: true },
    });

    if (cleanupResponse.ok()) {
      console.log('✅ 测试数据清理成功');
    } else {
      console.warn('⚠️ 测试数据清理 API 调用失败');
    }
  } catch (error) {
    console.warn('⚠️ 测试数据清理失败:', error);
  }
}

export default globalTeardown;
