/**
 * 智能标签生成服务 - T105
 * 实现完整的标签生成功能，集成提取算法和库管理
 */

import {
  ContentTag,
  TagType,
  TagCategory,
  TagSource,
  TagGenerationRequest,
  TagGenerationOptions,
  TagGenerationResult,
  TagGenerationMetadata,
  GeneratedTag,
  TagSuggestion,
  TagLibrary,
  TagAnalytics,
  TaggingConfig,
  TaggingError,
  DEFAULT_TAG_LIBRARY
} from './types';
import { TagExtractionAlgorithms } from './tag-extraction-algorithms';
import { TagLibraryManager } from './tag-library-manager';

/**
 * 默认标签生成配置
 */
const DEFAULT_TAGGING_CONFIG: TaggingConfig = {
  algorithm: 'hybrid',
  maxTags: 5,
  minRelevance: 0.3,
  enableHierarchical: true,
  enableWeightOptimization: true,
  enableUserLearning: true,
  cacheEnabled: true,
  logLevel: 'info',
  customLibraries: [],
  validationRules: []
};

/**
 * 智能标签生成服务类
 */
export class TaggingService {
  private config: TaggingConfig;
  private extractionAlgorithms: TagExtractionAlgorithms;
  private libraryManager: TagLibraryManager;
  private cache: Map<string, TagGenerationResult> = new Map();
  private userSessionTags: Map<string, Set<string>> = new Map();

  constructor(config: Partial<TaggingConfig> = {}) {
    this.config = { ...DEFAULT_TAGGING_CONFIG, ...config };
    this.extractionAlgorithms = new TagExtractionAlgorithms();
    this.libraryManager = new TagLibraryManager();

    // 初始化用户会话标签
    this.initializeUserSessions();
  }

  /**
   * 主要标签生成方法
   */
  async generateTags(request: TagGenerationRequest): Promise<TagGenerationResult> {
    const startTime = Date.now();

    try {
      this.log('info', '开始生成标签', { userId: request.userId, contentLength: request.content.length });

      // 检查缓存
      if (this.config.cacheEnabled) {
        const cacheKey = this.generateCacheKey(request);
        const cached = this.cache.get(cacheKey);
        if (cached && this.isCacheValid(cached)) {
          this.log('info', '使用缓存结果', { userId: request.userId });
          return cached;
        }
      }

      // 执行标签生成
      const result = await this.performTagGeneration(request, startTime);

      // 缓存结果
      if (this.config.cacheEnabled) {
        const cacheKey = this.generateCacheKey(request);
        this.cache.set(cacheKey, result);
      }

      // 更新用户会话标签
      this.updateUserSessionTags(request.userId, result.tags);

      this.log('info', '标签生成完成', {
        userId: request.userId,
        tagsCount: result.tags.length,
        processingTime: result.metadata.processingTime
      });

      return result;

    } catch (error) {
      this.log('error', '标签生成失败', { userId: request.userId, error });
      throw new TaggingError(
        `标签生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'TAG_GENERATION_FAILED',
        'tagging-service',
        error
      );
    }
  }

  /**
   * 执行标签生成
   */
  private async performTagGeneration(request: TagGenerationRequest, startTime: number): Promise<TagGenerationResult> {
    // 1. 预处理请求
    const processedRequest = await this.preprocessRequest(request);

    // 2. 提取基础标签
    const extractedTags = await this.extractionAlgorithms.extractTags(processedRequest);

    // 3. 应用层级结构
    if (this.config.enableHierarchical) {
      await this.applyHierarchicalStructure(extractedTags, processedRequest);
    }

    // 4. 优化标签权重
    if (this.config.enableWeightOptimization) {
      await this.optimizeTagWeights(extractedTags, processedRequest);
    }

    // 5. 用户学习优化
    if (this.config.enableUserLearning) {
      await this.applyUserLearning(extractedTags, processedRequest);
    }

    // 6. 生成建议标签
    const suggestions = await this.generateSuggestions(extractedTags, processedRequest);

    // 7. 构建结果
    const result: TagGenerationResult = {
      content: request.content,
      userId: request.userId,
      timestamp: new Date(),
      tags: extractedTags,
      metadata: {
        provider: 'tagging-service',
        algorithm: this.config.algorithm,
        processingTime: Date.now() - startTime,
        cost: this.estimateCost(request, extractedTags),
        tokens: this.estimateTokens(request, extractedTags),
        version: '1.0.0',
        confidence: this.calculateOverallConfidence(extractedTags),
        coverage: this.calculateContentCoverage(request.content, extractedTags)
      },
      suggestions
    };

    // 8. 更新统计
    this.updateStatistics(extractedTags, request.userId);

    return result;
  }

  /**
   * 预处理请求
   */
  private async preprocessRequest(request: TagGenerationRequest): Promise<TagGenerationRequest> {
    // 扩展自定义标签库
    if (request.options?.customTagLibrary) {
      const customTags = request.options.customTagLibrary.map(name => this.createCustomTag(name));
      this.extractionAlgorithms.addCustomTags(customTags);
    }

    // 设置用户偏好
    const userPref = this.libraryManager.getUserPreferences(request.userId);
    if (userPref) {
      this.extractionAlgorithms.setUserPreferences(request.userId, userPref);
    }

    return request;
  }

  /**
   * 应用层级结构
   */
  private async applyHierarchicalStructure(tags: GeneratedTag[], request: TagGenerationRequest): Promise<void> {
    for (const tagData of tags) {
      // 查找父标签
      const parentTag = this.findParentTag(tagData.tag, request);
      if (parentTag) {
        tagData.tag.parentId = parentTag.id;
        if (!parentTag.children) {
          parentTag.children = [];
        }
        parentTag.children.push(tagData.tag.id);
      }

      // 查找子标签
      const childTags = this.findChildTags(tagData.tag, request);
      if (childTags.length > 0) {
        tagData.tag.children = childTags.map(child => child.id);
      }
    }
  }

  /**
   * 优化标签权重
   */
  private async optimizeTagWeights(tags: GeneratedTag[], request: TagGenerationRequest): Promise<void> {
    // 获取权重优化建议
    const optimizations = await this.libraryManager.analyzeWeightOptimization();

    for (const tagData of tags) {
      const optimization = optimizations.find(opt => opt.tagId === tagData.tag.id);
      if (optimization && optimization.confidence > 0.7) {
        // 应用优化建议
        tagData.tag.weight = optimization.suggestedWeight;
        tagData.score = optimization.suggestedWeight;
        tagData.reasoning += ` [权重优化: ${optimization.reason}]`;
      }
    }
  }

  /**
   * 应用用户学习
   */
  private async applyUserLearning(tags: GeneratedTag[], request: TagGenerationRequest): Promise<void> {
    const sessionTags = this.userSessionTags.get(request.userId);
    if (!sessionTags || sessionTags.size === 0) return;

    // 基于用户会话历史调整标签权重
    for (const tagData of tags) {
      if (sessionTags.has(tagData.tag.id)) {
        // 用户在当前会话中使用过类似标签，提高权重
        tagData.tag.weight *= 1.2;
        tagData.score *= 1.2;
        tagData.reasoning += ' [用户会话优化]';
      }
    }
  }

  /**
   * 生成建议标签
   */
  private async generateSuggestions(extractedTags: GeneratedTag[], request: TagGenerationRequest): Promise<TagSuggestion[]> {
    const suggestions: TagSuggestion[] = [];

    // 基于分类结果生成建议
    if (request.context?.domain) {
      const domainTags = await this.getDomainTags(request.context.domain);
      for (const domainTag of domainTags) {
        if (!extractedTags.some(t => t.tag.id === domainTag.id)) {
          suggestions.push({
            tag: domainTag,
            reason: `基于领域${request.context.domain}的相关标签`,
            confidence: 0.6,
            impact: 'medium'
          });
        }
      }
    }

    // 基于用户历史生成建议
    const userStats = this.libraryManager.getAllTagStats()
      .filter(stats => this.isUserTag(stats.tagId, request.userId))
      .slice(0, 5);

    for (const stat of userStats) {
      const tag = this.findTagById(stat.tagId);
      if (tag && !extractedTags.some(t => t.tag.id === tag.id)) {
        suggestions.push({
          tag,
          reason: `基于用户历史偏好 (使用${stat.usageCount}次)`,
          confidence: 0.7,
          impact: 'medium'
        });
      }
    }

    return suggestions.slice(0, 3); // 限制建议数量
  }

  /**
   * 创建自定义标签
   */
  private createCustomTag(name: string): ContentTag {
    return {
      id: `custom-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name,
      type: TagType.CUSTOM,
      category: TagCategory.CONTENT,
      relevanceScore: 0.7,
      weight: 0.6,
      source: TagSource.USER_DEFINED,
      confidence: 0.8,
      count: 0,
      lastUsed: new Date(),
      createdBy: 'user',
      metadata: {
        color: '#6B7280',
        icon: '🏷️',
        description: `用户自定义标签: ${name}`,
        isActive: true
      }
    };
  }

  /**
   * 查找父标签
   */
  private findParentTag(tag: ContentTag, request: TagGenerationRequest): ContentTag | undefined {
    // 简化的父标签查找逻辑
    const parentMap: Record<string, string> = {
      'web-dev': 'technology',
      'ai-ml': 'technology',
      'mobile-dev': 'technology',
      'startup': 'business',
      'marketing': 'business',
      'programming': 'education',
      'language': 'education'
    };

    const parentId = parentMap[tag.id];
    if (parentId) {
      return this.findTagById(parentId);
    }

    return undefined;
  }

  /**
   * 查找子标签
   */
  private findChildTags(tag: ContentTag, request: TagGenerationRequest): ContentTag[] {
    const childMap: Record<string, string[]> = {
      'technology': ['web-dev', 'ai-ml', 'mobile-dev'],
      'business': ['startup', 'marketing'],
      'education': ['programming', 'language']
    };

    const childIds = childMap[tag.id] || [];
    return childIds.map(id => this.findTagById(id)).filter(Boolean) as ContentTag[];
  }

  /**
   * 获取领域标签
   */
  private async getDomainTags(domain: string): Promise<ContentTag[]> {
    // 简化的领域标签映射
    const domainTagMap: Record<string, string[]> = {
      'technology': ['AI', '编程', '软件开发', '算法'],
      'business': ['创业', '营销', '管理', '金融'],
      'education': ['学习', '教学', '知识', '技能'],
      'health': ['健康', '医疗', '运动', '营养']
    };

    const tagNames = domainTagMap[domain] || [];
    return tagNames.map(name => this.createCustomTag(name));
  }

  /**
   * 判断是否为用户标签
   */
  private isUserTag(tagId: string, userId: string): boolean {
    // 简化的用户标签判断
    return Math.random() > 0.7; // 模拟判断逻辑
  }

  /**
   * 根据ID查找标签
   */
  private findTagById(tagId: string): ContentTag | undefined {
    // 在所有标签库中查找
    for (const library of this.libraryManager.getAllLibraries()) {
      const tag = library.tags.find(t => t.id === tagId);
      if (tag) return tag;
    }
    return undefined;
  }

  /**
   * 计算整体置信度
   */
  private calculateOverallConfidence(tags: GeneratedTag[]): number {
    if (tags.length === 0) return 0;

    const totalConfidence = tags.reduce((sum, tag) => sum + tag.tag.confidence, 0);
    return totalConfidence / tags.length;
  }

  /**
   * 计算内容覆盖率
   */
  private calculateContentCoverage(content: string, tags: GeneratedTag[]): number {
    if (tags.length === 0) return 0;

    let coveredLength = 0;
    for (const tagData of tags) {
      if (tagData.position) {
        coveredLength += tagData.position.end - tagData.position.start;
      } else {
        // 对于没有位置的标签，估算覆盖长度
        coveredLength += tagData.tag.name.length * 2;
      }
    }

    return Math.min(coveredLength / content.length, 1.0);
  }

  /**
   * 估算成本
   */
  private estimateCost(request: TagGenerationRequest, tags: GeneratedTag[]): number {
    // 简化的成本估算
    const baseCost = 0.001;
    const tokenCost = (request.content.length / 4) * 0.00001;
    const tagCost = tags.length * 0.0001;
    return baseCost + tokenCost + tagCost;
  }

  /**
   * 估算Token使用量
   */
  private estimateTokens(request: TagGenerationRequest, tags: GeneratedTag[]): { input: number; output: number; total: number } {
    const input = Math.ceil(request.content.length / 4);
    const output = Math.ceil(tags.reduce((sum, tag) => sum + tag.tag.name.length + tag.reasoning.length, 0) / 4);
    return { input, output, total: input + output };
  }

  /**
   * 更新统计
   */
  private updateStatistics(tags: GeneratedTag[], userId: string): void {
    for (const tagData of tags) {
      this.libraryManager.updateTagStats(tagData.tag.id, {
        relevanceScore: tagData.tag.relevanceScore,
        weight: tagData.tag.weight,
        userId
      });
    }
  }

  /**
   * 初始化用户会话
   */
  private initializeUserSessions(): void {
    // 这里可以从持久化存储加载用户会话数据
  }

  /**
   * 更新用户会话标签
   */
  private updateUserSessionTags(userId: string, tags: GeneratedTag[]): void {
    if (!this.userSessionTags.has(userId)) {
      this.userSessionTags.set(userId, new Set());
    }

    const sessionTags = this.userSessionTags.get(userId)!;
    for (const tagData of tags) {
      sessionTags.add(tagData.tag.id);
    }

    // 限制会话标签数量
    if (sessionTags.size > 50) {
      const tagsArray = Array.from(sessionTags);
      sessionTags.clear();
      tagsArray.slice(-30).forEach(tag => sessionTags.add(tag));
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(request: TagGenerationRequest): string {
    const contentHash = this.simpleHash(request.content);
    const optionsHash = this.simpleHash(JSON.stringify(request.options || {}));
    return `${request.userId}_${contentHash}_${optionsHash}`;
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 检查缓存有效性
   */
  private isCacheValid(cached: TagGenerationResult): boolean {
    const cacheAge = Date.now() - cached.timestamp.getTime();
    return cacheAge < 3600000; // 1小时缓存
  }

  /**
   * 日志记录
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [TaggingService:${level.toUpperCase()}] ${message}`, data || '');
    }
  }

  /**
   * 检查是否应该记录日志
   */
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }

  /**
   * 获取标签库管理器
   */
  getLibraryManager(): TagLibraryManager {
    return this.libraryManager;
  }

  /**
   * 获取所有标签库
   */
  getLibraries(): TagLibrary[] {
    return this.libraryManager.getAllLibraries();
  }

  /**
   * 搜索标签
   */
  searchTags(query: string, options?: {
    type?: TagType;
    category?: TagCategory;
    limit?: number;
  }): ContentTag[] {
    return this.libraryManager.searchTags(query, options);
  }

  /**
   * 获取热门标签
   */
  getPopularTags(limit: number = 20) {
    return this.libraryManager.getPopularTags(limit);
  }

  /**
   * 获取趋势标签
   */
  getTrendingTags(limit: number = 10) {
    return this.libraryManager.getTrendingTags(limit);
  }

  /**
   * 生成分析报告
   */
  getAnalytics(): TagAnalytics {
    return this.libraryManager.generateAnalytics();
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.log('info', '标签生成缓存已清理');
  }

  /**
   * 清理会话数据
   */
  clearUserSession(userId?: string): void {
    if (userId) {
      this.userSessionTags.delete(userId);
    } else {
      this.userSessionTags.clear();
    }
  }

  /**
   * 批量生成标签
   */
  async generateBatchTags(requests: TagGenerationRequest[]): Promise<TagGenerationResult[]> {
    const results: TagGenerationResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.generateTags(request);
        results.push(result);
      } catch (error) {
        this.log('error', '批量标签生成失败', { userId: request.userId, error });
        // 可以选择跳过失败项或创建错误结果
      }
    }

    return results;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string; details?: any }> {
    try {
      // 测试标签生成
      const testResult = await this.generateTags({
        content: '测试标签生成功能的健康检查',
        userId: 'health-check'
      });

      // 检查组件状态
      const libraryCount = this.libraryManager.getAllLibraries().length;
      const cacheSize = this.cache.size;

      return {
        status: 'healthy',
        message: `标签生成服务正常，生成${testResult.tags.length}个标签`,
        details: {
          libraryCount,
          cacheSize,
          averageConfidence: testResult.metadata.confidence
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `标签生成服务异常: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { error }
      };
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<TaggingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('info', '标签生成服务配置已更新', newConfig);
  }

  /**
   * 获取配置
   */
  getConfig(): TaggingConfig {
    return { ...this.config };
  }
}

/**
 * 创建标签生成服务实例
 */
export function createTaggingService(config?: Partial<TaggingConfig>): TaggingService {
  return new TaggingService(config);
}

/**
 * 默认标签生成服务实例
 */
export const defaultTaggingService = createTaggingService();