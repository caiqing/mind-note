/**
 * 笔记管理端到端测试
 */

import { test, expect } from '@playwright/test';

test.describe('笔记管理功能', () => {
  test.beforeEach(async ({ page }) => {
    // 访问应用主页
    await page.goto('/');

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
  });

  test('用户可以创建新笔记', async ({ page }) => {
    // 点击创建笔记按钮
    await page.click('[data-testid="create-note-button"]');

    // 等待编辑器加载
    await page.waitForSelector('[data-testid="note-editor"]');

    // 填写笔记标题
    await page.fill('[data-testid="note-title-input"]', '我的第一篇笔记');

    // 填写笔记内容
    await page.fill(
      '[data-testid="note-content-textarea"]',
      '这是我的第一篇笔记内容，包含一些重要的想法和思考。',
    );

    // 选择分类
    await page.click('[data-testid="category-select"]');
    await page.click('[data-testid="category-技术"]');

    // 添加标签
    await page.fill('[data-testid="tag-input"]', '学习');
    await page.press('[data-testid="tag-input"]', 'Enter');

    // 保存笔记
    await page.click('[data-testid="save-note-button"]');

    // 验证保存成功提示
    await expect(
      page.locator('[data-testid="save-success-message"]'),
    ).toBeVisible();

    // 验证笔记出现在列表中
    await expect(page.locator('[data-testid="note-list"]')).toContainText(
      '我的第一篇笔记',
    );
  });

  test('用户可以编辑现有笔记', async ({ page }) => {
    // 先创建一篇笔记
    await createNote(page, '原始笔记标题', '原始笔记内容');

    // 点击编辑按钮
    await page.click('[data-testid="edit-note-button"]');

    // 等待编辑器加载
    await page.waitForSelector('[data-testid="note-editor"]');

    // 修改标题
    await page.fill('[data-testid="note-title-input"]', '修改后的笔记标题');

    // 修改内容
    await page.fill(
      '[data-testid="note-content-textarea"]',
      '这是修改后的笔记内容。',
    );

    // 保存修改
    await page.click('[data-testid="save-note-button"]');

    // 验证保存成功
    await expect(
      page.locator('[data-testid="save-success-message"]'),
    ).toBeVisible();

    // 验证修改后的内容显示
    await expect(page.locator('[data-testid="note-list"]')).toContainText(
      '修改后的笔记标题',
    );
  });

  test('用户可以使用AI分析功能', async ({ page }) => {
    // 创建一篇笔记
    await createNote(
      page,
      'React学习笔记',
      'React是Facebook开发的JavaScript库，用于构建用户界面。它采用组件化架构，支持虚拟DOM，具有高性能的特点。',
    );

    // 点击AI分析按钮
    await page.click('[data-testid="ai-analysis-button"]');

    // 等待AI分析完成
    await page.waitForSelector('[data-testid="ai-analysis-results"]', {
      timeout: 10000,
    });

    // 验证AI分析结果
    await expect(
      page.locator('[data-testid="ai-suggested-category"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="ai-suggested-tags"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="ai-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-keywords"]')).toBeVisible();

    // 应用AI建议
    await page.click('[data-testid="apply-ai-suggestions"]');

    // 验证建议已应用
    await expect(page.locator('[data-testid="note-category"]')).toContainText(
      '技术',
    );
    await expect(page.locator('[data-testid="note-tags"]')).toContainText(
      'React',
    );
  });

  test('用户可以删除笔记', async ({ page }) => {
    // 创建一篇笔记
    await createNote(page, '待删除的笔记', '这篇笔记将被删除');

    // 点击删除按钮
    await page.click('[data-testid="delete-note-button"]');

    // 确认删除
    await page.click('[data-testid="confirm-delete-button"]');

    // 验证删除成功提示
    await expect(
      page.locator('[data-testid="delete-success-message"]'),
    ).toBeVisible();

    // 验证笔记从列表中消失
    await expect(page.locator('[data-testid="note-list"]')).not.toContainText(
      '待删除的笔记',
    );
  });

  test('用户可以搜索笔记', async ({ page }) => {
    // 创建多篇笔记
    await createNote(
      page,
      'React Hooks学习',
      'React Hooks是React 16.8的新特性',
    );
    await createNote(page, 'Vue.js教程', 'Vue.js是渐进式JavaScript框架');
    await createNote(page, 'JavaScript基础', 'JavaScript是Web开发的基础语言');

    // 点击搜索框
    await page.click('[data-testid="search-input"]');

    // 输入搜索关键词
    await page.fill('[data-testid="search-input"]', 'React');

    // 等待搜索结果
    await page.waitForSelector('[data-testid="search-results"]');

    // 验证搜索结果
    await expect(page.locator('[data-testid="search-results"]')).toContainText(
      'React Hooks学习',
    );
    await expect(
      page.locator('[data-testid="search-results"]'),
    ).not.toContainText('Vue.js教程');
    await expect(
      page.locator('[data-testid="search-results"]'),
    ).not.toContainText('JavaScript基础');
  });

  test('用户可以使用高级搜索功能', async ({ page }) => {
    // 创建不同分类的笔记
    await createNoteWithCategory(
      page,
      '技术笔记',
      '这是一篇技术相关的笔记',
      '技术',
    );
    await createNoteWithCategory(
      page,
      '生活随笔',
      '这是一篇生活相关的笔记',
      '生活',
    );

    // 点击高级搜索
    await page.click('[data-testid="advanced-search-toggle"]');

    // 选择分类过滤
    await page.click('[data-testid="filter-category"]');
    await page.click('[data-testid="category-技术"]');

    // 执行搜索
    await page.click('[data-testid="apply-filters"]');

    // 验证过滤结果
    await expect(page.locator('[data-testid="search-results"]')).toContainText(
      '技术笔记',
    );
    await expect(
      page.locator('[data-testid="search-results"]'),
    ).not.toContainText('生活随笔');
  });

  test('用户可以查看数据分析', async ({ page }) => {
    // 创建一些笔记数据
    await createNote(page, '笔记1', '内容1');
    await createNote(page, '笔记2', '内容2');

    // 导航到数据分析页面
    await page.click('[data-testid="analytics-nav"]');

    // 等待数据分析页面加载
    await page.waitForSelector('[data-testid="analytics-dashboard"]');

    // 验证数据概览
    await expect(page.locator('[data-testid="total-notes"]')).toBeVisible();
    await expect(page.locator('[data-testid="published-notes"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-views"]')).toBeVisible();

    // 验证图表
    await expect(
      page.locator('[data-testid="time-series-chart"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="category-distribution-chart"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="tag-analysis-chart"]'),
    ).toBeVisible();
  });

  test('用户可以设置和管理标签', async ({ page }) => {
    // 创建笔记
    await createNote(page, '标签管理测试', '测试标签管理功能');

    // 点击编辑模式
    await page.click('[data-testid="edit-note-button"]');

    // 添加新标签
    await page.fill('[data-testid="tag-input"]', '测试标签');
    await page.press('[data-testid="tag-input"]', 'Enter');

    // 验证标签已添加
    await expect(page.locator('[data-testid="note-tags"]')).toContainText(
      '测试标签',
    );

    // 删除标签
    await page.click('[data-testid="remove-tag-测试标签"]');

    // 验证标签已删除
    await expect(page.locator('[data-testid="note-tags"]')).not.toContainText(
      '测试标签',
    );
  });

  test('用户可以切换视图模式', async ({ page }) => {
    // 创建多篇笔记
    await createNote(page, '笔记1', '内容1');
    await createNote(page, '笔记2', '内容2');

    // 切换到网格视图
    await page.click('[data-testid="view-grid"]');

    // 验证网格视图
    await expect(page.locator('[data-testid="note-grid"]')).toBeVisible();

    // 切换到列表视图
    await page.click('[data-testid="view-list"]');

    // 验证列表视图
    await expect(page.locator('[data-testid="note-list"]')).toBeVisible();
  });

  test('用户可以批量操作笔记', async ({ page }) => {
    // 创建多篇笔记
    await createNote(page, '批量操作测试1', '内容1');
    await createNote(page, '批量操作测试2', '内容2');

    // 选择多篇笔记
    await page.click('[data-testid="select-note-批量操作测试1"]');
    await page.click('[data-testid="select-note-批量操作测试2"]');

    // 批量添加标签
    await page.click('[data-testid="bulk-actions"]');
    await page.click('[data-testid="bulk-add-tags"]');
    await page.fill('[data-testid="bulk-tag-input"]', '批量标签');
    await page.click('[data-testid="apply-bulk-tags"]');

    // 验证标签已添加到所有选中的笔记
    await expect(
      page.locator(
        '[data-testid="note-批量操作测试1"] [data-testid="note-tags"]',
      ),
    ).toContainText('批量标签');
    await expect(
      page.locator(
        '[data-testid="note-批量操作测试2"] [data-testid="note-tags"]',
      ),
    ).toContainText('批量标签');
  });
});

// 辅助函数：创建笔记
async function createNote(page: any, title: string, content: string) {
  await page.click('[data-testid="create-note-button"]');
  await page.waitForSelector('[data-testid="note-editor"]');
  await page.fill('[data-testid="note-title-input"]', title);
  await page.fill('[data-testid="note-content-textarea"]', content);
  await page.click('[data-testid="save-note-button"]');
  await page.waitForSelector('[data-testid="save-success-message"]', {
    state: 'hidden',
  });
}

// 辅助函数：创建带分类的笔记
async function createNoteWithCategory(
  page: any,
  title: string,
  content: string,
  category: string,
) {
  await page.click('[data-testid="create-note-button"]');
  await page.waitForSelector('[data-testid="note-editor"]');
  await page.fill('[data-testid="note-title-input"]', title);
  await page.fill('[data-testid="note-content-textarea"]', content);
  await page.click('[data-testid="category-select"]');
  await page.click(`[data-testid="category-${category}"]`);
  await page.click('[data-testid="save-note-button"]');
  await page.waitForSelector('[data-testid="save-success-message"]', {
    state: 'hidden',
  });
}
