/**
 * 分类服务测试用例 - T104
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ClassificationService,
  createClassificationService,
  DEFAULT_CATEGORIES,
  ContentCategory
} from '../classification-service';
import { ClassificationRequest, ClassificationOptions } from '../types';

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock AI Service Manager
vi.mock('../../services/ai-service-manager', () => ({
  createAIServiceManager: vi.fn(() => ({
    performUnifiedAnalysis: vi.fn().mockResolvedValue({
      keywords: {
        keywords: [
          { keyword: '人工智能', score: 0.9 },
          { keyword: '机器学习', score: 0.8 },
          { keyword: '编程', score: 0.7 }
        ]
      },
      concepts: {
        concepts: [
          { concept: '深度学习', relevance: 0.85 },
          { concept: '算法', relevance: 0.8 }
        ]
      }
    })
  }))
}));

describe('ClassificationService', () => {
  let service: ClassificationService;

  beforeEach(() => {
    service = createClassificationService({
      algorithm: 'keyword-based',
      confidenceThreshold: 0.5,
      maxCategories: 3,
      enableSubcategories: true,
      cacheEnabled: false // 禁用缓存以简化测试
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该使用默认配置初始化', () => {
      const defaultService = createClassificationService();
      expect(defaultService).toBeDefined();
    });

    it('应该接受自定义配置', () => {
      const customService = createClassificationService({
        algorithm: 'ml-based',
        confidenceThreshold: 0.8,
        maxCategories: 5
      });
      expect(customService).toBeDefined();
    });

    it('应该初始化默认分类', () => {
      const categories = service.getCategories();
      expect(categories.length).toBeGreaterThan(20);
      expect(categories.some(c => c.id === 'technology')).toBe(true);
      expect(categories.some(c => c.id === 'business')).toBe(true);
    });
  });

  describe('基础分类功能', () => {
    const createRequest = (content: string, options?: ClassificationOptions): ClassificationRequest => ({
      content,
      userId: 'test-user',
      options
    });

    it('应该正确分类科技内容', async () => {
      const request = createRequest('人工智能技术在现代软件开发中发挥着重要作用，特别是深度学习和机器学习算法。');
      const result = await service.classify(request);

      expect(result.categories).toBeDefined();
      expect(result.categories.length).toBeGreaterThan(0);

      const techCategory = result.categories.find(c => c.category.id === 'technology');
      expect(techCategory).toBeDefined();
      expect(techCategory!.confidence).toBeGreaterThan(0.5);
      expect(techCategory!.matchedKeywords).toContain('人工智能');
    });

    it('应该正确分类商业内容', async () => {
      const request = createRequest('创业公司需要关注市场需求和商业模式，同时要进行有效的营销推广。');
      const result = await service.classify(request);

      const businessCategory = result.categories.find(c => c.category.id === 'business');
      expect(businessCategory).toBeDefined();
      expect(businessCategory!.confidence).toBeGreaterThan(0.5);
    });

    it('应该正确分类教育内容', async () => {
      const request = createRequest('学习编程需要掌握数据结构和算法，这是计算机科学的基础知识。');
      const result = await service.classify(request);

      const educationCategory = result.categories.find(c => c.category.id === 'education');
      expect(educationCategory).toBeDefined();
      expect(educationCategory!.confidence).toBeGreaterThan(0.5);
    });

    it('应该正确分类健康内容', async () => {
      const request = createRequest('保持健康的身体需要定期运动和均衡营养，同时要注意心理健康。');
      const result = await service.classify(request);

      const healthCategory = result.categories.find(c => c.category.id === 'health');
      expect(healthCategory).toBeDefined();
      expect(healthCategory!.confidence).toBeGreaterThan(0.5);
    });

    it('应该处理多分类内容', async () => {
      const request = createRequest('人工智能技术在医疗健康领域的应用，为创业公司提供了新的商机。');
      const result = await service.classify(request);

      expect(result.categories.length).toBeGreaterThan(1);

      const techCategory = result.categories.find(c => c.category.id === 'technology');
      const healthCategory = result.categories.find(c => c.category.id === 'health');
      const businessCategory = result.categories.find(c => c.category.id === 'business');

      expect(techCategory || healthCategory || businessCategory).toBeDefined();
    });

    it('应该返回正确的元数据', async () => {
      const request = createRequest('测试内容分类功能。');
      const result = await service.classify(request);

      expect(result.content).toBe(request.content);
      expect(result.userId).toBe(request.userId);
      expect(result.timestamp).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.provider).toBe('keyword-based');
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });
  });

  describe('分类选项', () => {
    it('应该限制最大分类数量', async () => {
      const request = {
        content: '人工智能、商业、教育、健康等多个领域的内容。',
        userId: 'test-user',
        options: { maxCategories: 2 } as ClassificationOptions
      };

      const result = await service.classify(request);
      expect(result.categories.length).toBeLessThanOrEqual(2);
    });

    it('应该应用最小置信度阈值', async () => {
      const service = createClassificationService({
        confidenceThreshold: 0.8
      });

      const request = createRequest('轻微相关的内容');
      const result = await service.classify(request);

      result.categories.forEach(category => {
        expect(category.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('应该支持禁用子分类', async () => {
      const request = {
        content: 'Web开发技术包括前端和后端开发',
        userId: 'test-user',
        options: { includeSubcategories: false } as ClassificationOptions
      };

      const result = await service.classify(request);
      result.categories.forEach(category => {
        expect(category.subcategories).toBeUndefined();
      });
    });
  });

  describe('自定义分类管理', () => {
    it('应该添加自定义分类', async () => {
      const customCategory: ContentCategory = {
        id: 'custom-test',
        name: '测试分类',
        description: '用于测试的自定义分类',
        level: 1,
        keywords: ['测试', 'test', '验证'],
        confidence: 0.9
      };

      await service.addCustomCategory(customCategory);

      const categories = service.getCategories();
      const found = categories.find(c => c.id === 'custom-test');
      expect(found).toBeDefined();
      expect(found!.name).toBe('测试分类');
    });

    it('应该拒绝重复的分类ID', async () => {
      const customCategory: ContentCategory = {
        id: 'technology', // 已存在的ID
        name: '重复分类',
        description: '测试重复ID',
        level: 1,
        keywords: ['重复'],
        confidence: 0.9
      };

      await expect(service.addCustomCategory(customCategory))
        .rejects.toThrow('分类ID已存在');
    });

    it('应该更新现有分类', async () => {
      const updates = {
        name: '更新后的分类名',
        description: '更新后的描述'
      };

      await service.updateCategory('technology', updates);

      const categories = service.getCategories();
      const updated = categories.find(c => c.id === 'technology');
      expect(updated!.name).toBe('更新后的分类名');
      expect(updated!.description).toBe('更新后的描述');
    });

    it('应该拒绝更新不存在的分类', async () => {
      await expect(service.updateCategory('non-existent', { name: '测试' }))
        .rejects.toThrow('分类不存在');
    });

    it('应该删除分类', async () => {
      // 先添加一个自定义分类
      const customCategory: ContentCategory = {
        id: 'to-delete',
        name: '待删除分类',
        description: '用于测试删除功能',
        level: 1,
        keywords: ['删除'],
        confidence: 0.9
      };

      await service.addCustomCategory(customCategory);

      // 验证分类已添加
      let categories = service.getCategories();
      expect(categories.some(c => c.id === 'to-delete')).toBe(true);

      // 删除分类
      await service.deleteCategory('to-delete');

      // 验证分类已删除
      categories = service.getCategories();
      expect(categories.some(c => c.id === 'to-delete')).toBe(false);
    });

    it('应该拒绝删除有子分类的分类', async () => {
      await expect(service.deleteCategory('technology'))
        .rejects.toThrow('无法删除有子分类的分类');
    });
  });

  describe('分类算法', () => {
    it('应该支持关键词分类算法', async () => {
      const service = createClassificationService({
        algorithm: 'keyword-based',
        cacheEnabled: false
      });

      const request = {
        content: '人工智能和机器学习是重要的技术领域',
        userId: 'test-user'
      };

      const result = await service.classify(request);
      expect(result.categories).toBeDefined();
      expect(result.metadata.algorithm).toBe('keyword-based');
    });

    it('应该支持ML分类算法', async () => {
      const service = createClassificationService({
        algorithm: 'ml-based',
        cacheEnabled: false
      });

      const request = {
        content: '人工智能和机器学习是重要的技术领域',
        userId: 'test-user'
      };

      const result = await service.classify(request);
      expect(result.categories).toBeDefined();
      expect(result.metadata.algorithm).toBe('ml-based');
    });

    it('应该支持混合分类算法', async () => {
      const service = createClassificationService({
        algorithm: 'hybrid',
        cacheEnabled: false
      });

      const request = {
        content: '人工智能和机器学习是重要的技术领域',
        userId: 'test-user'
      };

      const result = await service.classify(request);
      expect(result.categories).toBeDefined();
      expect(result.metadata.algorithm).toBe('hybrid');
    });
  });

  describe('子分类功能', () => {
    it('应该识别子分类', async () => {
      const request = {
        content: 'React和Vue是现代Web开发的重要框架，属于前端技术',
        userId: 'test-user',
        options: { includeSubcategories: true } as ClassificationOptions
      };

      const result = await service.classify(request);

      const techCategory = result.categories.find(c => c.category.id === 'technology');
      if (techCategory && techCategory.subcategories) {
        expect(techCategory.subcategories.length).toBeGreaterThan(0);

        const webDevSubcategory = techCategory.subcategories.find(
          c => c.category.id === 'web-dev'
        );
        expect(webDevSubcategory).toBeDefined();
      }
    });

    it('应该正确计算子分类置信度', async () => {
      const request = {
        content: '使用JavaScript进行Web开发，包括React和Node.js',
        userId: 'test-user'
      };

      const result = await service.classify(request);

      result.categories.forEach(category => {
        if (category.subcategories) {
          category.subcategories.forEach(sub => {
            expect(sub.confidence).toBeGreaterThan(0);
            expect(sub.confidence).toBeLessThanOrEqual(1);
          });
        }
      });
    });
  });

  describe('统计和分析', () => {
    it('应该跟踪分类统计', async () => {
      const request = {
        content: '人工智能技术在科技领域的重要性',
        userId: 'test-user'
      };

      await service.classify(request);
      await service.classify(request);
      await service.classify(request);

      const stats = service.getCategoryStats();
      const techStats = stats.find(s => s.categoryId === 'technology');

      expect(techStats).toBeDefined();
      expect(techStats!.usageCount).toBe(3);
      expect(techStats!.averageConfidence).toBeGreaterThan(0);
    });

    it('应该生成分析报告', () => {
      const analytics = service.getAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.totalClassifications).toBeGreaterThanOrEqual(0);
      expect(analytics.categoryDistribution).toBeDefined();
      expect(analytics.accuracyMetrics).toBeDefined();
      expect(analytics.usageTrends).toBeDefined();
    });

    it('应该按使用频率排序分类统计', async () => {
      // 执行多次分类
      const requests = [
        { content: '科技内容1', userId: 'test-user' },
        { content: '科技内容2', userId: 'test-user' },
        { content: '科技内容3', userId: 'test-user' },
        { content: '商业内容', userId: 'test-user' }
      ];

      for (const req of requests) {
        await service.classify(req);
      }

      const stats = service.getCategoryStats();
      const techStats = stats.find(s => s.categoryId === 'technology');
      const businessStats = stats.find(s => s.categoryId === 'business');

      expect(techStats!.usageCount).toBeGreaterThan(businessStats!.usageCount);
      expect(stats[0].categoryId).toBe('technology'); // 应该是使用最多的
    });
  });

  describe('缓存功能', () => {
    it('应该缓存分类结果', async () => {
      const service = createClassificationService({
        cacheEnabled: true
      });

      const request = {
        content: '测试缓存功能的科技内容',
        userId: 'test-user'
      };

      // 第一次分类
      const startTime1 = Date.now();
      const result1 = await service.classify(request);
      const time1 = Date.now() - startTime1;

      // 第二次分类（应该使用缓存）
      const startTime2 = Date.now();
      const result2 = await service.classify(request);
      const time2 = Date.now() - startTime2;

      expect(result2.categories).toEqual(result1.categories);
      expect(time2).toBeLessThan(time1); // 缓存应该更快
    });

    it('应该清理缓存', async () => {
      const service = createClassificationService({
        cacheEnabled: true
      });

      const request = {
        content: '测试缓存清理',
        userId: 'test-user'
      };

      await service.classify(request);
      service.clearCache();

      // 清理后再次分类应该重新计算
      const result = await service.classify(request);
      expect(result.categories).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该处理空内容', async () => {
      const request = {
        content: '',
        userId: 'test-user'
      };

      const result = await service.classify(request);
      expect(result.categories).toBeDefined();
      expect(result.categories.length).toBe(0);
    });

    it('应该处理无效的选项', async () => {
      const request = {
        content: '测试内容',
        userId: 'test-user',
        options: {
          maxCategories: -1, // 无效值
          minConfidence: 2 // 无效值
        } as ClassificationOptions
      };

      // 应该不会崩溃，而是使用默认值
      const result = await service.classify(request);
      expect(result.categories).toBeDefined();
    });

    it('应该处理AI服务失败', async () => {
      const service = createClassificationService({
        algorithm: 'ml-based',
        cacheEnabled: false
      });

      // Mock AI服务失败
      const { createAIServiceManager } = await import('../../services/ai-service-manager');
      (createAIServiceManager as any).mockReturnValue({
        performUnifiedAnalysis: vi.fn().mockRejectedValue(new Error('AI服务失败'))
      });

      const request = {
        content: '测试AI服务失败处理',
        userId: 'test-user'
      };

      // 应该回退到关键词分类
      const result = await service.classify(request);
      expect(result.categories).toBeDefined();
      expect(result.metadata.algorithm).toBe('keyword-based');
    });
  });

  describe('健康检查', () => {
    it('应该通过健康检查', async () => {
      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.message).toBeDefined();
    });
  });

  describe('训练数据管理', () => {
    it('应该添加训练数据', async () => {
      const trainingData = {
        id: 'test-1',
        content: '人工智能技术',
        categories: ['technology', 'ai-ml'],
        userId: 'test-user',
        timestamp: new Date(),
        isValidated: false
      };

      await service.addTrainingData(trainingData);

      // 验证数据已添加（通过内部方法或统计）
      const analytics = service.getAnalytics();
      expect(analytics).toBeDefined();
    });
  });
});