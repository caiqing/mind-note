/**
 * 搜索工作流端到端测试
 */

import { test, expect } from '@playwright/test';

test.describe('搜索工作流', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('完整的搜索工作流', async ({ page }) => {
    // 准备测试数据
    await setupTestData(page);

    // 1. 基础搜索
    await page.click('[data-testid="search-input"]');
    await page.fill('[data-testid="search-input"]', 'React');
    await page.press('[data-testid="search-input"]', 'Enter');

    await page.waitForSelector('[data-testid="search-results"]');
    await expect(page.locator('[data-testid="search-results"]')).toContainText(
      'React',
    );
    await expect(page.locator('[data-testid="search-stats"]')).toContainText(
      '找到',
    );

    // 2. 搜索结果交互
    await page.click('[data-testid="search-result-0"]');
    await expect(page.locator('[data-testid="note-detail"]')).toBeVisible();

    // 3. 返回搜索结果
    await page.click('[data-testid="back-to-search"]');
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

    // 4. 修改搜索词
    await page.fill('[data-testid="search-input"]', 'JavaScript');
    await page.press('[data-testid="search-input"]', 'Enter');

    await page.waitForSelector('[data-testid="search-results"]');
    await expect(page.locator('[data-testid="search-results"]')).toContainText(
      'JavaScript',
    );

    // 5. 清空搜索
    await page.click('[data-testid="clear-search"]');
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('');
  });

  test('高级搜索工作流', async ({ page }) => {
    // 准备测试数据
    await setupTestData(page);

    // 1. 打开高级搜索
    await page.click('[data-testid="advanced-search-toggle"]');
    await expect(
      page.locator('[data-testid="advanced-search-panel"]'),
    ).toBeVisible();

    // 2. 设置搜索条件
    await page.fill('[data-testid="search-input"]', '前端开发');
    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="category-技术"]');
    await page.click('[data-testid="date-range-filter"]');
    await page.click('[data-testid="last-30-days"]');

    // 3. 添加标签过滤
    await page.click('[data-testid="tag-filter"]');
    await page.fill('[data-testid="tag-input"]', 'React');
    await page.click('[data-testid="add-tag-filter"]');

    // 4. 执行搜索
    await page.click('[data-testid="apply-advanced-search"]');

    // 5. 验证搜索结果
    await page.waitForSelector('[data-testid="search-results"]');
    await expect(page.locator('[data-testid="search-results"]')).toContainText(
      '前端开发',
    );

    // 验证过滤条件显示
    await expect(page.locator('[data-testid="active-filters"]')).toContainText(
      '技术',
    );
    await expect(page.locator("[data-testid='active-filters']")).toContainText(
      'React',
    );

    // 6. 清除过滤条件
    await page.click('[data-testid="clear-filters"]');
    await expect(
      page.locator('[data-testid="active-filters"]'),
    ).not.toBeVisible();
  });

  test('语义搜索工作流', async ({ page }) => {
    // 准备测试数据
    await setupTestData(page);

    // 1. 切换到语义搜索
    await page.click('[data-testid="search-mode-selector"]');
    await page.click('[data-testid="semantic-search"]');

    // 2. 输入自然语言查询
    await page.fill('[data-testid="search-input"]', '如何学习React框架');
    await page.press('[data-testid="search-input"]', 'Enter');

    // 3. 等待语义搜索结果
    await page.waitForSelector('[data-testid="search-results"]', {
      timeout: 15000,
    });

    // 4. 验证语义搜索结果包含相关内容
    await expect(page.locator('[data-testid="search-results"]')).toContainText(
      'React',
    );

    // 5. 查看相似度分数
    await expect(
      page.locator('[data-testid="similarity-score"]'),
    ).toBeVisible();
  });

  test('搜索建议和历史记录', async ({ page }) => {
    // 1. 执行一些搜索以建立历史记录
    const searchTerms = ['React', 'JavaScript', 'CSS'];

    for (const term of searchTerms) {
      await page.click('[data-testid="search-input"]');
      await page.fill('[data-testid="search-input"]', term);
      await page.press('[data-testid="search-input"]', 'Enter');
      await page.waitForSelector('[data-testid="search-results"]');
      await page.click('[data-testid="clear-search"]');
    }

    // 2. 测试搜索建议
    await page.click('[data-testid="search-input"]');
    await page.fill('[data-testid="search-input"]', 'Rea');

    // 3. 验证搜索建议出现
    await expect(
      page.locator('[data-testid="search-suggestions"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="search-suggestions"]'),
    ).toContainText('React');

    // 4. 点击搜索建议
    await page.click('[data-testid="suggestion-React"]');
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue(
      'React',
    );

    // 5. 查看搜索历史
    await page.click('[data-testid="search-history-toggle"]');
    await expect(page.locator('[data-testid="search-history"]')).toBeVisible();

    // 验证历史记录包含之前的搜索
    for (const term of searchTerms) {
      await expect(
        page.locator('[data-testid="search-history"]'),
      ).toContainText(term);
    }

    // 6. 点击历史记录项
    await page.click('[data-testid="history-item-JavaScript"]');
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue(
      'JavaScript',
    );
  });

  test('搜索结果分页和排序', async ({ page }) => {
    // 准备大量测试数据
    await createMultipleNotes(page, 25);

    // 1. 执行搜索
    await page.click('[data-testid="search-input"]');
    await page.fill('[data-testid="search-input"]', '测试');
    await page.press('[data-testid="search-input"]', 'Enter');

    await page.waitForSelector('[data-testid="search-results"]');

    // 2. 验证分页控件
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-page"]')).toContainText(
      '1',
    );

    // 3. 测试下一页
    await page.click('[data-testid="next-page"]');
    await expect(page.locator('[data-testid="current-page"]')).toContainText(
      '2',
    );

    // 4. 测试排序
    await page.click('[data-testid="sort-selector"]');
    await page.click('[data-testid="sort-by-date"]');

    // 验证排序结果
    await page.waitForSelector('[data-testid="search-results"]');
    const firstResult = page.locator(
      '[data-testid="search-result-0"] [data-testid="result-date"]',
    );
    await expect(firstResult).toBeVisible();

    // 5. 测试相关性排序
    await page.click('[data-testid="sort-selector"]');
    await page.click('[data-testid="sort-by-relevance"]');

    // 验证排序更新
    await page.waitForSelector('[data-testid="search-results"]');
    await expect(page.locator('[data-testid="search-result-0"]')).toBeVisible();
  });

  test('搜索结果保存和分享', async ({ page }) => {
    // 准备测试数据
    await setupTestData(page);

    // 1. 执行搜索
    await page.click('[data-testid="search-input"]');
    await page.fill('[data-testid="search-input"]', 'React');
    await page.press('[data-testid="search-input"]', 'Enter');

    await page.waitForSelector('[data-testid="search-results"]');

    // 2. 保存搜索
    await page.click('[data-testid="save-search"]');
    await page.fill('[data-testid="search-name-input"]', 'React学习资料');
    await page.click('[data-testid="confirm-save-search"]');

    // 3. 验证搜索已保存
    await expect(
      page.locator('[data-testid="save-success-message"]'),
    ).toBeVisible();

    // 4. 查看保存的搜索
    await page.click('[data-testid="saved-searches"]');
    await expect(
      page.locator('[data-testid="saved-search-list"]'),
    ).toContainText('React学习资料');

    // 5. 执行保存的搜索
    await page.click('[data-testid="saved-search-React学习资料"]');
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue(
      'React',
    );

    // 6. 分享搜索结果
    await page.click('[data-testid="share-search"]');
    await expect(page.locator('[data-testid="share-dialog"]')).toBeVisible();

    // 复制分享链接
    await page.click('[data-testid="copy-share-link"]');
    await expect(
      page.locator('[data-testid="copy-success-message"]'),
    ).toBeVisible();
  });

  test('搜索性能测试', async ({ page }) => {
    // 准备大量数据
    await createMultipleNotes(page, 100);

    // 1. 测试搜索响应时间
    const startTime = Date.now();

    await page.click('[data-testid="search-input"]');
    await page.fill('[data-testid="search-input"]', '性能测试');
    await page.press('[data-testid="search-input"]', 'Enter');

    await page.waitForSelector('[data-testid="search-results"]');

    const endTime = Date.now();
    const searchTime = endTime - startTime;

    // 验证搜索时间在合理范围内（小于3秒）
    expect(searchTime).toBeLessThan(3000);

    // 2. 测试搜索结果的准确性
    await expect(page.locator('[data-testid="search-results"]')).toContainText(
      '性能测试',
    );

    // 3. 测试大数据量下的性能
    const complexSearchStartTime = Date.now();

    await page.fill('[data-testid="search-input"]', '复杂的搜索查询关键词');
    await page.press('[data-testid="search-input"]', 'Enter');

    await page.waitForSelector('[data-testid="search-results"]');

    const complexSearchEndTime = Date.now();
    const complexSearchTime = complexSearchEndTime - complexSearchStartTime;

    expect(complexSearchTime).toBeLessThan(5000);
  });
});

// 辅助函数：设置测试数据
async function setupTestData(page: any) {
  const notes = [
    {
      title: 'React Hooks详解',
      content:
        'React Hooks是React 16.8版本引入的新特性，它让你在不编写class的情况下使用state以及其他的React特性。',
      category: '技术',
      tags: ['React', 'JavaScript'],
    },
    {
      title: 'JavaScript异步编程',
      content:
        'JavaScript的异步编程是前端开发中的重要概念，包括回调函数、Promise和async/await。',
      category: '技术',
      tags: ['JavaScript', '异步编程'],
    },
    {
      title: '前端开发最佳实践',
      content:
        '前端开发需要遵循的最佳实践，包括代码规范、性能优化、用户体验等方面。',
      category: '技术',
      tags: ['前端开发', '最佳实践'],
    },
    {
      title: '学习笔记整理方法',
      content: '如何有效整理和管理学习笔记，提高学习效率和知识复用。',
      category: '学习',
      tags: ['学习方法', '笔记管理'],
    },
  ];

  for (const note of notes) {
    await createNoteWithDetails(
      page,
      note.title,
      note.content,
      note.category,
      note.tags,
    );
  }
}

// 辅助函数：创建多篇笔记
async function createMultipleNotes(page: any, count: number) {
  for (let i = 1; i <= count; i++) {
    await createNoteWithDetails(
      page,
      `测试笔记${i}`,
      `这是第${i}篇测试笔记的内容，包含一些测试数据。`,
      '测试',
      [`标签${(i % 5) + 1}`],
    );
  }
}

// 辅助函数：创建详细笔记
async function createNoteWithDetails(
  page: any,
  title: string,
  content: string,
  category: string,
  tags: string[],
) {
  await page.click('[data-testid="create-note-button"]');
  await page.waitForSelector('[data-testid="note-editor"]');
  await page.fill('[data-testid="note-title-input"]', title);
  await page.fill('[data-testid="note-content-textarea"]', content);

  // 选择分类
  await page.click('[data-testid="category-select"]');
  await page.click(`[data-testid="category-${category}"]`);

  // 添加标签
  for (const tag of tags) {
    await page.fill('[data-testid="tag-input"]', tag);
    await page.press('[data-testid="tag-input"]', 'Enter');
  }

  await page.click('[data-testid="save-note-button"]');
  await page.waitForSelector('[data-testid="save-success-message"]', {
    state: 'hidden',
  });
}
