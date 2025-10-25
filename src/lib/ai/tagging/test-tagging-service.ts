/**
 * 智能标签生成服务集成测试 - T105
 * 全面测试标签生成功能和API接口
 */

import { TaggingService, createTaggingService } from './tagging-service';
import { TagAPI, createTagAPI } from './tag-api';
import { TagHierarchyManager } from './hierarchical-tags';
import { TagLibraryManager } from './tag-library-manager';
import {
  TagType,
  TagCategory,
  TagSource,
  TagGenerationRequest,
  TagGenerationOptions,
  ContentTag,
  DEFAULT_TAG_LIBRARY
} from './types';

/**
 * 测试结果类型
 */
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  message?: string;
  details?: any;
}

/**
 * 测试套件
 */
class TaggingServiceTestSuite {
  private taggingService: TaggingService;
  private tagAPI: TagAPI;
  private hierarchyManager: TagHierarchyManager;
  private libraryManager: TagLibraryManager;
  private results: TestResult[] = [];

  constructor() {
    this.taggingService = createTaggingService({
      algorithm: 'hybrid',
      maxTags: 8,
      minRelevance: 0.2,
      enableHierarchical: true,
      enableWeightOptimization: true,
      enableUserLearning: true,
      cacheEnabled: true,
      logLevel: 'info'
    });

    this.tagAPI = createTagAPI(this.taggingService);
    this.hierarchyManager = new TagHierarchyManager();
    this.libraryManager = this.taggingService.getLibraryManager();
  }

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 开始智能标签生成服务测试...\n');

    // 基础功能测试
    await this.testBasicTagGeneration();
    await this.testTagGenerationOptions();
    await this.testBatchTagGeneration();
    await this.testCacheFunctionality();

    // 标签管理测试
    await this.testTagSearch();
    await this.testPopularAndTrendingTags();
    await this.testTagLibraryManagement();

    // 层级结构测试
    await this.testHierarchicalTags();
    await this.testTagInheritance();
    await this.testHierarchyValidation();

    // API接口测试
    await this.testTagAPIEndpoints();
    await this.testAPIErrorHandling();
    await this.testAPIRateLimit();

    // 性能和压力测试
    await this.testPerformance();
    await this.testConcurrentRequests();

    // 边界情况测试
    await this.testEdgeCases();
    await this.testLargeContent();
    await this.testSpecialCharacters();

    // 输出测试结果
    this.printResults();
  }

  /**
   * 基础标签生成测试
   */
  private async testBasicTagGeneration(): Promise<void> {
    const testName = '基础标签生成功能';
    const startTime = Date.now();

    try {
      const request: TagGenerationRequest = {
        content: '人工智能和机器学习正在改变世界。React是一个流行的前端框架，创业公司需要关注市场营销和用户体验。',
        userId: 'test-user-001'
      };

      const result = await this.taggingService.generateTags(request);

      const passed = result.tags.length > 0 &&
                     result.tags.length <= 8 &&
                     result.metadata.processingTime > 0 &&
                     result.metadata.confidence > 0;

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? `成功生成${result.tags.length}个标签` : '标签生成失败',
        details: {
          tagsCount: result.tags.length,
          processingTime: result.metadata.processingTime,
          confidence: result.metadata.confidence,
          tags: result.tags.map(t => ({
            name: t.tag.name,
            type: t.tag.type,
            score: t.score,
            reasoning: t.reasoning
          }))
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 标签生成选项测试
   */
  private async testTagGenerationOptions(): Promise<void> {
    const testName = '标签生成选项配置';
    const startTime = Date.now();

    try {
      const baseRequest: TagGenerationRequest = {
        content: '这是一个关于Python编程和深度学习的技术文章，包含了算法实现和代码示例。',
        userId: 'test-user-002'
      };

      // 测试最大标签数量限制
      const limitedRequest = {
        ...baseRequest,
        options: { maxTags: 3 } as TagGenerationOptions
      };

      const limitedResult = await this.taggingService.generateTags(limitedRequest);
      const maxTagsRespected = limitedResult.tags.length <= 3;

      // 测试最小相关性过滤
      const relevanceRequest = {
        ...baseRequest,
        options: { minRelevance: 0.8 } as TagGenerationOptions
      };

      const relevanceResult = await this.taggingService.generateTags(relevanceRequest);
      const minRelevanceRespected = relevanceResult.tags.every(t => t.score >= 0.8);

      // 测试类型过滤
      const typeRequest = {
        ...baseRequest,
        options: { includeTypes: [TagType.CORE, TagType.RELATED] } as TagGenerationOptions
      };

      const typeResult = await this.taggingService.generateTags(typeRequest);
      const typeFilterRespected = typeResult.tags.every(t =>
        t.tag.type === TagType.CORE || t.tag.type === TagType.RELATED
      );

      const passed = maxTagsRespected && minRelevanceRespected && typeFilterRespected;

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? '所有选项配置正常工作' : '选项配置存在问题',
        details: {
          maxTagsTest: { passed: maxTagsRespected, actual: limitedResult.tags.length },
          minRelevanceTest: { passed: minRelevanceRespected, scores: relevanceResult.tags.map(t => t.score) },
          typeFilterTest: { passed: typeFilterRespected, types: typeResult.tags.map(t => t.tag.type) }
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 批量标签生成测试
   */
  private async testBatchTagGeneration(): Promise<void> {
    const testName = '批量标签生成功能';
    const startTime = Date.now();

    try {
      const requests = [
        { content: '第一篇关于JavaScript编程的文章', userId: 'test-user-003' },
        { content: '第二篇讨论产品管理和用户体验', userId: 'test-user-003' },
        { content: '第三篇介绍数据库设计和性能优化', userId: 'test-user-003' }
      ];

      const results = await this.taggingService.generateBatchTags(requests);

      const passed = results.length === requests.length &&
                     results.every(r => r.tags.length > 0) &&
                     results.every(r => r.userId === 'test-user-003');

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? `成功批量生成${results.length}组标签` : '批量生成失败',
        details: {
          requestCount: requests.length,
          resultCount: results.length,
          totalTagsGenerated: results.reduce((sum, r) => sum + r.tags.length, 0),
          averageProcessingTime: results.reduce((sum, r) => sum + r.metadata.processingTime, 0) / results.length
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 缓存功能测试
   */
  private async testCacheFunctionality(): Promise<void> {
    const testName = '缓存功能测试';
    const startTime = Date.now();

    try {
      const request: TagGenerationRequest = {
        content: '缓存测试内容：这是一个关于AI和机器学习的文章。',
        userId: 'test-user-cache'
      };

      // 第一次生成（应该较慢）
      const start1 = Date.now();
      const result1 = await this.taggingService.generateTags(request);
      const time1 = Date.now() - start1;

      // 第二次生成（应该使用缓存，更快）
      const start2 = Date.now();
      const result2 = await this.taggingService.generateTags(request);
      const time2 = Date.now() - start2;

      const cacheWorking = time2 < time1;
      const resultsConsistent = JSON.stringify(result1.tags) === JSON.stringify(result2.tags);

      const passed = cacheWorking && resultsConsistent;

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? '缓存功能正常' : '缓存功能异常',
        details: {
          firstTime: time1,
          secondTime: time2,
          speedImprovement: ((time1 - time2) / time1 * 100).toFixed(1) + '%',
          resultsConsistent
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 标签搜索测试
   */
  private async testTagSearch(): Promise<void> {
    const testName = '标签搜索功能';
    const startTime = Date.now();

    try {
      // 添加一些测试标签到库中
      const testTags: ContentTag[] = [
        {
          id: 'test-react',
          name: 'React',
          type: TagType.RELATED,
          category: TagCategory.DOMAIN,
          relevanceScore: 0.9,
          weight: 0.8,
          source: TagSource.USER_DEFINED,
          confidence: 0.95,
          count: 5,
          lastUsed: new Date(),
          createdBy: 'user',
          metadata: { color: '#61DAFB', icon: '⚛️', description: 'React前端框架', isActive: true }
        },
        {
          id: 'test-nodejs',
          name: 'Node.js',
          type: TagType.RELATED,
          category: TagCategory.TOOL,
          relevanceScore: 0.85,
          weight: 0.75,
          source: TagSource.USER_DEFINED,
          confidence: 0.9,
          count: 3,
          lastUsed: new Date(),
          createdBy: 'user',
          metadata: { color: '#339933', icon: '🟢', description: 'Node.js运行时', isActive: true }
        }
      ];

      for (const tag of testTags) {
        await this.libraryManager.addTagToLibrary('default', tag);
      }

      // 测试搜索功能
      const searchResults1 = this.taggingService.searchTags('React');
      const searchResults2 = this.taggingService.searchTags('node', { limit: 5 });
      const searchResults3 = this.taggingService.searchTags('', { type: TagType.RELATED });

      const passed = searchResults1.length > 0 &&
                     searchResults2.length > 0 &&
                     searchResults3.length > 0 &&
                     searchResults1.some(t => t.name === 'React');

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? '搜索功能正常' : '搜索功能异常',
        details: {
          reactSearch: { count: searchResults1.length, found: searchResults1.some(t => t.name === 'React') },
          nodeSearch: { count: searchResults2.length },
          typeSearch: { count: searchResults3.length, type: TagType.RELATED }
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 热门和趋势标签测试
   */
  private async testPopularAndTrendingTags(): Promise<void> {
    const testName = '热门和趋势标签';
    const startTime = Date.now();

    try {
      const popularTags = this.taggingService.getPopularTags(10);
      const trendingTags = this.taggingService.getTrendingTags(5);

      const passed = Array.isArray(popularTags) &&
                     Array.isArray(trendingTags) &&
                     popularTags.length <= 10 &&
                     trendingTags.length <= 5;

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? `获取到${popularTags.length}个热门标签和${trendingTags.length}个趋势标签` : '获取热门/趋势标签失败',
        details: {
          popularTagsCount: popularTags.length,
          trendingTagsCount: trendingTags.length,
          topPopularTag: popularTags[0]?.tagName || 'N/A',
          topTrendingTag: trendingTags[0]?.tagName || 'N/A'
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 标签库管理测试
   */
  private async testTagLibraryManagement(): Promise<void> {
    const testName = '标签库管理功能';
    const startTime = Date.now();

    try {
      // 创建自定义标签库
      const customLibrary = await this.libraryManager.createLibrary({
        name: '测试标签库',
        description: '用于测试的自定义标签库',
        tags: [
          {
            id: 'custom-test-1',
            name: '测试标签1',
            type: TagType.CUSTOM,
            category: TagCategory.CONTENT,
            relevanceScore: 0.8,
            weight: 0.7,
            source: TagSource.USER_DEFINED,
            confidence: 0.9,
            count: 0,
            lastUsed: new Date(),
            createdBy: 'user',
            metadata: { isActive: true }
          }
        ],
        isDefault: false,
        isPublic: false,
        createdBy: 'test-user'
      });

      // 测试获取库列表
      const libraries = this.libraryManager.getAllLibraries();
      const foundLibrary = libraries.find(lib => lib.id === customLibrary.id);

      // 测试添加标签到库
      await this.libraryManager.addTagToLibrary(customLibrary.id, {
        id: 'custom-test-2',
        name: '测试标签2',
        type: TagType.CUSTOM,
        category: TagCategory.CONTENT,
        relevanceScore: 0.75,
        weight: 0.65,
        source: TagSource.USER_DEFINED,
        confidence: 0.85,
        count: 0,
        lastUsed: new Date(),
        createdBy: 'user',
        metadata: { isActive: true }
      });

      // 验证标签已添加
      const updatedLibrary = this.libraryManager.getLibrary(customLibrary.id);
      const tagAdded = updatedLibrary?.tags.length === 2;

      const passed = foundLibrary !== undefined && tagAdded;

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? '标签库管理功能正常' : '标签库管理功能异常',
        details: {
          libraryCreated: foundLibrary !== undefined,
          libraryId: customLibrary.id,
          tagsInLibrary: updatedLibrary?.tags.length || 0,
          tagAdded
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 层级标签测试
   */
  private async testHierarchicalTags(): Promise<void> {
    const testName = '层级标签结构';
    const startTime = Date.now();

    try {
      // 测试添加层级关系
      const added1 = this.hierarchyManager.addChildTag('technology', ['web-dev', 'mobile-dev']);
      const added2 = this.hierarchyManager.addChildTag('web-dev', ['frontend', 'backend']);

      // 测试获取子节点
      const techChildren = this.hierarchyManager.getChildren('technology');
      const webChildren = this.hierarchyManager.getChildren('web-dev');

      // 测试获取父节点
      const frontendParent = this.hierarchyManager.getParent('frontend');
      const techParent = this.hierarchyManager.getParent('technology');

      // 测试获取路径
      const frontendPath = this.hierarchyManager.getPath('frontend');

      const passed = added1 && added2 &&
                     techChildren.length >= 2 &&
                     webChildren.length >= 2 &&
                     frontendParent === 'web-dev' &&
                     techParent === undefined &&
                     frontendPath.includes('technology') &&
                     frontendPath.includes('web-dev');

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? '层级标签功能正常' : '层级标签功能异常',
        details: {
          techChildren: techChildren,
          webChildren: webChildren,
          frontendParent,
          techParent,
          frontendPath
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 标签继承测试
   */
  private async testTagInheritance(): Promise<void> {
    const testName = '标签继承功能';
    const startTime = Date.now();

    try {
      // 创建测试标签数据
      const testTags = [
        {
          tag: {
            id: 'child-tag',
            name: '子标签',
            type: TagType.RELATED,
            category: TagCategory.DOMAIN,
            relevanceScore: 0.6,
            weight: 0.5,
            source: TagSource.AI_GENERATED,
            confidence: 0.7,
            count: 0,
            lastUsed: new Date(),
            createdBy: 'ai',
            parentId: 'technology',
            metadata: { isActive: true }
          },
          score: 0.6,
          reasoning: '测试继承'
        }
      ];

      // 应用继承
      const inheritedTags = this.hierarchyManager.applyInheritance(testTags);

      const passed = inheritedTags.length > 0 &&
                     inheritedTags[0].tag.weight > 0.5; // 继承后权重应该增加

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? '标签继承功能正常' : '标签继承功能异常',
        details: {
          originalWeight: 0.5,
          inheritedWeight: inheritedTags[0]?.tag.weight,
          reasoningIncludesInheritance: inheritedTags[0]?.reasoning.includes('继承自')
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 层级验证测试
   */
  private async testHierarchyValidation(): Promise<void> {
    const testName = '层级验证功能';
    const startTime = Date.now();

    try {
      // 添加一些层级关系
      this.hierarchyManager.addChildTag('test-root', ['test-child1', 'test-child2']);
      this.hierarchyManager.addChildTag('test-child1', ['test-grandchild']);

      // 执行验证
      const validationResult = this.hierarchyManager.validateHierarchy();

      const passed = validationResult !== undefined &&
                     typeof validationResult.isValid === 'boolean' &&
                     Array.isArray(validationResult.issues) &&
                     validationResult.totalNodes > 0;

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? `验证完成，${validationResult.isValid ? '无' : '有'}问题` : '层级验证失败',
        details: {
          isValid: validationResult?.isValid,
          totalNodes: validationResult?.totalNodes,
          maxDepth: validationResult?.maxDepth,
          issuesCount: validationResult?.issues.length,
          issues: validationResult?.issues.slice(0, 3) // 显示前3个问题
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * API接口测试
   */
  private async testTagAPIEndpoints(): Promise<void> {
    const testName = 'API接口测试';
    const startTime = Date.now();

    try {
      // 测试生成标签API
      const generateResponse = await this.tagAPI.generateTags({
        content: 'API测试内容：这是一个关于软件开发和项目管理的技术文章。',
        userId: 'api-test-user'
      });

      // 测试搜索标签API
      const searchResponse = await this.tagAPI.searchTags({
        query: '技术',
        limit: 5
      });

      // 测试获取热门标签API
      const popularResponse = await this.tagAPI.getPopularTags(5);

      // 测试健康检查API
      const healthResponse = await this.tagAPI.healthCheck();

      const passed = generateResponse.success &&
                     searchResponse.success &&
                     popularResponse.success &&
                     healthResponse.success &&
                     generateResponse.data !== undefined &&
                     searchResponse.data !== undefined &&
                     popularResponse.data !== undefined;

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? '所有API接口正常' : '部分API接口异常',
        details: {
          generateAPI: { success: generateResponse.success, tagsCount: generateResponse.data?.tags.length || 0 },
          searchAPI: { success: searchResponse.success, resultsCount: searchResponse.data?.tags.length || 0 },
          popularAPI: { success: popularResponse.success, tagsCount: popularResponse.data?.length || 0 },
          healthAPI: { success: healthResponse.success, status: healthResponse.data?.status }
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * API错误处理测试
   */
  private async testAPIErrorHandling(): Promise<void> {
    const testName = 'API错误处理';
    const startTime = Date.now();

    try {
      // 测试空内容错误
      const emptyResponse = await this.tagAPI.generateTags({
        content: '',
        userId: 'error-test-user'
      });

      // 测试不存在的标签
      const notFoundResponse = await this.tagAPI.getTag('non-existent-tag-id');

      // 测试无效参数
      const invalidSearchResponse = await this.tagAPI.searchTags({
        limit: -1 // 无效的limit值
      });

      const passed = !emptyResponse.success &&
                     !notFoundResponse.success &&
                     !invalidSearchResponse.success &&
                     emptyResponse.error !== undefined &&
                     notFoundResponse.error !== undefined &&
                     invalidSearchResponse.error !== undefined;

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? '错误处理正常' : '错误处理存在问题',
        details: {
          emptyContentError: emptyResponse.error?.code,
          notFoundError: notFoundResponse.error?.code,
          invalidParamError: invalidSearchResponse.error?.code
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * API速率限制测试
   */
  private async testAPIRateLimit(): Promise<void> {
    const testName = 'API速率限制';
    const startTime = Date.now();

    try {
      const userId = 'rate-limit-test';
      const promises = [];

      // 快速发送多个请求
      for (let i = 0; i < 15; i++) {
        promises.push(
          this.tagAPI.generateTags({
            content: `速率限制测试内容 ${i}`,
            userId
          })
        );
      }

      const results = await Promise.all(promises);
      const rejectedCount = results.filter(r => !r.success && r.error?.code === 'RATE_LIMIT_EXCEEDED').length;
      const successCount = results.filter(r => r.success).length;

      const passed = rejectedCount > 0 && successCount > 0;

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? `速率限制正常，成功${successCount}个，拒绝${rejectedCount}个` : '速率限制功能异常',
        details: {
          totalRequests: results.length,
          successCount,
          rejectedCount,
          rateLimitWorking: rejectedCount > 0
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 性能测试
   */
  private async testPerformance(): Promise<void> {
    const testName = '性能测试';
    const startTime = Date.now();

    try {
      const testContent = `
        人工智能（AI）和机器学习（ML）正在彻底改变我们的生活方式。深度学习作为机器学习的一个重要分支，
        在计算机视觉、自然语言处理和语音识别等领域取得了突破性进展。神经网络，特别是卷积神经网络（CNN）
        和循环神经网络（RNN），已经成为现代AI系统的核心组件。在Web开发领域，React、Vue和Angular等前端框架
        极大地提高了开发效率。Node.js使得JavaScript可以用于服务器端开发，实现了全栈JavaScript的可能性。
        创业公司需要关注产品设计、用户体验、市场营销和融资策略等多个方面，才能在激烈的竞争中获得成功。
      `;

      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await this.taggingService.generateTags({
          content: testContent,
          userId: `perf-test-${i}`
        });
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      const passed = avgTime < 3000; // 平均响应时间小于3秒

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? `性能达标，平均响应时间${avgTime.toFixed(0)}ms` : `性能不达标，平均响应时间${avgTime.toFixed(0)}ms`,
        details: {
          iterations,
          avgTime: avgTime.toFixed(2) + 'ms',
          maxTime: maxTime + 'ms',
          minTime: minTime + 'ms',
          contentLength: testContent.length
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 并发请求测试
   */
  private async testConcurrentRequests(): Promise<void> {
    const testName = '并发请求测试';
    const startTime = Date.now();

    try {
      const concurrentRequests = 20;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          this.taggingService.generateTags({
            content: `并发测试内容 ${i}：这是关于${['AI', '编程', '设计', '营销', '管理'][i % 5]}的文章。`,
            userId: `concurrent-user-${i % 5}`
          })
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.tags.length > 0).length;

      const passed = successCount === concurrentRequests;

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? `并发测试通过，成功处理${concurrentRequests}个请求` : `并发测试失败，只有${successCount}/${concurrentRequests}个请求成功`,
        details: {
          concurrentRequests,
          successCount,
          successRate: (successCount / concurrentRequests * 100).toFixed(1) + '%',
          totalProcessingTime: Date.now() - startTime
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 边界情况测试
   */
  private async testEdgeCases(): Promise<void> {
    const testName = '边界情况测试';
    const startTime = Date.now();

    try {
      // 测试极短内容
      const shortResult = await this.taggingService.generateTags({
        content: '短',
        userId: 'edge-test-user'
      });

      // 测试极长内容
      const longContent = '测试'.repeat(1000);
      const longResult = await this.taggingService.generateTags({
        content: longContent,
        userId: 'edge-test-user'
      });

      // 测试特殊字符内容
      const specialContent = '特殊字符测试：🚀🔥💡 #技术 @开发者 http://example.com';
      const specialResult = await this.taggingService.generateTags({
        content: specialContent,
        userId: 'edge-test-user'
      });

      // 测试混合语言内容
      const mixedContent = 'Mixed language test: 人工智能和Machine Learning的结合应用越来越广泛。';
      const mixedResult = await this.taggingService.generateTags({
        content: mixedContent,
        userId: 'edge-test-user'
      });

      const passed = shortResult.tags.length >= 0 &&
                     longResult.tags.length >= 0 &&
                     specialResult.tags.length >= 0 &&
                     mixedResult.tags.length >= 0;

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? '边界情况处理正常' : '边界情况处理异常',
        details: {
          shortContent: { length: 1, tagsCount: shortResult.tags.length },
          longContent: { length: longContent.length, tagsCount: longResult.tags.length },
          specialContent: { hasSpecialChars: true, tagsCount: specialResult.tags.length },
          mixedContent: { hasMixedLanguages: true, tagsCount: mixedResult.tags.length }
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 大内容测试
   */
  private async testLargeContent(): Promise<void> {
    const testName = '大内容处理测试';
    const startTime = Date.now();

    try {
      // 生成大内容（约5000字符）
      const largeContent = `
        # 人工智能技术发展趋势报告

        ## 第一章：深度学习的最新进展

        深度学习作为人工智能领域的核心技术，近年来取得了令人瞩目的成就。卷积神经网络（CNN）在图像识别方面已经超越了人类的表现水平，
        而循环神经网络（RNN）和Transformer模型在自然语言处理领域也展现出了强大的能力。GPT系列模型的出现标志着大规模语言模型时代的到来。

        ## 第二章：计算机视觉的应用

        计算机视觉技术在自动驾驶、医疗影像分析、安防监控等领域得到了广泛应用。目标检测、图像分割、人脸识别等技术日趋成熟，
        为各行各业带来了革命性的变化。特别是在工业制造领域，机器视觉技术的应用大大提高了生产效率和产品质量。

        ## 第三章：自然语言处理的突破

        自然语言处理技术的发展使得机器能够理解和生成人类语言成为了可能。从机器翻译到情感分析，从文本摘要到对话系统，
        NLP技术的应用场景不断扩展。预训练语言模型的出现，如BERT、GPT等，进一步推动了NLP技术的快速发展。

        ## 第四章：强化学习的实际应用

        强化学习在游戏AI、机器人控制、推荐系统等领域取得了重要突破。AlphaGo的战胜世界围棋冠军，
        标志着强化学习技术达到了新的高度。在实际应用中，强化学习被广泛应用于优化调度、资源分配等复杂决策问题。

        ## 第五章：AI伦理和可解释性

        随着AI技术的广泛应用，伦理问题和可解释性变得越来越重要。如何确保AI系统的公平性、透明性和可解释性，
        成为学术界和工业界共同关注的焦点。可解释AI（XAI）技术的发展，有助于我们理解AI模型的决策过程。

        ## 第六章：未来展望

        未来的人工智能发展将更加注重通用人工智能（AGI）的研究。多模态学习、联邦学习、元学习等新兴技术方向，
        将为AI技术的发展开辟新的道路。同时，AI与其他学科的交叉融合，将产生更多创新性的应用。
      `;

      const result = await this.taggingService.generateTags({
        content: largeContent,
        userId: 'large-content-test'
      });

      const passed = result.tags.length > 0 &&
                     result.metadata.processingTime < 10000; // 10秒内完成

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? `大内容处理成功，生成${result.tags.length}个标签，耗时${result.metadata.processingTime}ms` : '大内容处理失败',
        details: {
          contentLength: largeContent.length,
          tagsGenerated: result.tags.length,
          processingTime: result.metadata.processingTime,
          averageConfidence: result.metadata.confidence
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 特殊字符测试
   */
  private async testSpecialCharacters(): Promise<void> {
    const testName = '特殊字符处理测试';
    const startTime = Date.now();

    try {
      const testCases = [
        { name: 'Emoji测试', content: '今天心情很好！🎉🚀💡 学习了新技能 ✨📚' },
        { name: '代码片段测试', content: 'JavaScript代码：const arr = [1, 2, 3]; arr.map(x => x * 2);' },
        { name: '数学公式测试', content: '数学公式：E = mc²，勾股定理：a² + b² = c²' },
        { name: 'URL测试', content: '参考链接：https://example.com/path?param=value#section' },
        { name: '标点符号测试', content: '各种标点：，。！？；：""\'\'（）【】《》' }
      ];

      const results = [];

      for (const testCase of testCases) {
        const result = await this.taggingService.generateTags({
          content: testCase.content,
          userId: 'special-char-test'
        });

        results.push({
          name: testCase.name,
          success: result.tags.length >= 0,
          tagsCount: result.tags.length,
          processingTime: result.metadata.processingTime
        });
      }

      const allSuccessful = results.every(r => r.success);
      const totalTags = results.reduce((sum, r) => sum + r.tagsCount, 0);

      const passed = allSuccessful;

      this.addResult({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        message: passed ? `特殊字符处理正常，共生成${totalTags}个标签` : '特殊字符处理异常',
        details: {
          testCases: results,
          totalTags,
          averageProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
        }
      });

    } catch (error) {
      this.addResult({
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      });
    }
  }

  /**
   * 添加测试结果
   */
  private addResult(result: TestResult): void {
    this.results.push(result);
  }

  /**
   * 打印测试结果
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('🏆 智能标签生成服务测试结果汇总');
    console.log('='.repeat(80));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => r.passed === false).length;
    const total = this.results.length;

    console.log(`\n📊 测试统计: ${passed}/${total} 通过 (${(passed/total*100).toFixed(1)}%)`);
    console.log(`✅ 通过: ${passed} | ❌ 失败: ${failed} | 📈 总计: ${total}`);
    console.log(`⏱️  总耗时: ${this.results.reduce((sum, r) => sum + r.duration, 0)}ms\n`);

    // 详细结果
    this.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${index + 1}. ${result.name} (${duration})`);

      if (!result.passed && result.message) {
        console.log(`   💬 ${result.message}`);
      }

      if (result.details && Object.keys(result.details).length > 0) {
        const detailStr = JSON.stringify(result.details, null, 2);
        if (detailStr.length < 200) {
          console.log(`   📋 ${detailStr}`);
        } else {
          console.log(`   📋 [详细数据已省略，长度${detailStr.length}字符]`);
        }
      }
    });

    // 性能统计
    const avgProcessingTime = this.results
      .filter(r => r.details?.averageProcessingTime)
      .reduce((sum, r) => sum + (r.details.averageProcessingTime as number), 0) /
      this.results.filter(r => r.details?.averageProcessingTime).length;

    if (avgProcessingTime > 0) {
      console.log(`\n⚡ 性能指标:`);
      console.log(`   - 平均处理时间: ${avgProcessingTime.toFixed(2)}ms`);
      console.log(`   - 最慢测试: ${Math.max(...this.results.map(r => r.duration))}ms`);
      console.log(`   - 最快测试: ${Math.min(...this.results.map(r => r.duration))}ms`);
    }

    // 总结
    if (failed === 0) {
      console.log(`\n🎉 恭喜！所有测试都通过了！智能标签生成服务已准备就绪。`);
    } else {
      console.log(`\n⚠️  有${failed}个测试失败，需要检查和修复相关问题。`);
    }

    console.log('\n' + '='.repeat(80));
  }
}

/**
 * 运行测试的主函数
 */
export async function runTaggingServiceTests(): Promise<void> {
  const testSuite = new TaggingServiceTestSuite();
  await testSuite.runAllTests();
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  runTaggingServiceTests().catch(console.error);
}