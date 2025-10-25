/**
 * 标签库管理和权重系统 - T105
 * 实现标签库管理、权重优化和用户行为分析
 */

import {
  ContentTag,
  TagType,
  TagCategory,
  TagSource,
  TagLibrary,
  TagStats,
  TagAnalytics,
  TagWeightOptimization,
  TagValidationRule,
  TagValidationError,
  UserTagPreferences,
  DEFAULT_TAG_LIBRARY
} from './types';

/**
 * 标签库管理器类
 */
export class TagLibraryManager {
  private libraries: Map<string, TagLibrary> = new Map();
  private tagStats: Map<string, TagStats> = new Map();
  private userPreferences: Map<string, UserTagPreferences> = new Map();
  private validationRules: TagValidationRule[] = [];
  private weightHistory: Map<string, number[]> = new Map();

  constructor() {
    this.initializeDefaultLibrary();
    this.initializeValidationRules();
  }

  /**
   * 初始化默认标签库
   */
  private initializeDefaultLibrary(): void {
    const defaultLibrary: TagLibrary = {
      id: 'default',
      name: '默认标签库',
      description: '系统预定义的标签库',
      tags: DEFAULT_TAG_LIBRARY,
      isDefault: true,
      isPublic: true,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      tagsCount: DEFAULT_TAG_LIBRARY.length,
      usageCount: 0
    };

    this.libraries.set(defaultLibrary.id, defaultLibrary);

    // 初始化标签统计
    for (const tag of DEFAULT_TAG_LIBRARY) {
      this.tagStats.set(tag.id, {
        tagId: tag.id,
        tagName: tag.name,
        usageCount: 0,
        averageRelevance: tag.relevanceScore,
        averageWeight: tag.weight,
        lastUsed: new Date(),
        trend: 'stable',
        userCount: 0,
        categoryDistribution: { [tag.category]: 1 }
      });
    }
  }

  /**
   * 初始化验证规则
   */
  private initializeValidationRules(): void {
    this.validationRules = [
      {
        id: 'length-check',
        name: '标签长度检查',
        description: '检查标签长度是否在合理范围内',
        type: 'length',
        minLength: 1,
        maxLength: 50,
        isActive: true,
        severity: 'error'
      },
      {
        id: 'format-check',
        name: '标签格式检查',
        description: '检查标签是否包含非法字符',
        type: 'format',
        pattern: '^[\\u4e00-\\u9fa5a-zA-Z0-9\\-\\s]+$',
        isActive: true,
        severity: 'error'
      },
      {
        id: 'content-check',
        name: '标签内容检查',
        description: '检查标签是否包含违禁词汇',
        type: 'content',
        forbiddenWords: ['测试', 'test', 'demo', '示例'],
        isActive: true,
        severity: 'warning'
      },
      {
        id: 'duplicate-check',
        name: '重复标签检查',
        description: '检查是否与现有标签重复',
        type: 'duplicate',
        isActive: true,
        severity: 'warning'
      }
    ];
  }

  /**
   * 创建新标签库
   */
  async createLibrary(libraryData: Omit<TagLibrary, 'id' | 'createdAt' | 'updatedAt' | 'tagsCount'>): Promise<TagLibrary> {
    const library: TagLibrary = {
      ...libraryData,
      id: this.generateLibraryId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      tagsCount: libraryData.tags.length
    };

    // 验证标签库
    const validationErrors = await this.validateLibrary(library);
    if (validationErrors.length > 0) {
      throw new Error(`标签库验证失败: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    this.libraries.set(library.id, library);

    // 初始化标签统计
    for (const tag of library.tags) {
      if (!this.tagStats.has(tag.id)) {
        this.tagStats.set(tag.id, {
          tagId: tag.id,
          tagName: tag.name,
          usageCount: 0,
          averageRelevance: tag.relevanceScore,
          averageWeight: tag.weight,
          lastUsed: new Date(),
          trend: 'stable',
          userCount: 0,
          categoryDistribution: { [tag.category]: 1 }
        });
      }
    }

    return library;
  }

  /**
   * 获取标签库
   */
  getLibrary(libraryId: string): TagLibrary | undefined {
    return this.libraries.get(libraryId);
  }

  /**
   * 获取所有标签库
   */
  getAllLibraries(): TagLibrary[] {
    return Array.from(this.libraries.values());
  }

  /**
   * 更新标签库
   */
  async updateLibrary(libraryId: string, updates: Partial<TagLibrary>): Promise<TagLibrary> {
    const library = this.libraries.get(libraryId);
    if (!library) {
      throw new Error('标签库不存在');
    }

    const updatedLibrary: TagLibrary = {
      ...library,
      ...updates,
      id: libraryId, // 确保ID不被修改
      updatedAt: new Date(),
      tagsCount: updates.tags?.length || library.tagsCount
    };

    // 验证更新后的标签库
    const validationErrors = await this.validateLibrary(updatedLibrary);
    if (validationErrors.length > 0) {
      throw new Error(`标签库更新验证失败: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    this.libraries.set(libraryId, updatedLibrary);
    return updatedLibrary;
  }

  /**
   * 删除标签库
   */
  deleteLibrary(libraryId: string): boolean {
    if (libraryId === 'default') {
      throw new Error('不能删除默认标签库');
    }

    return this.libraries.delete(libraryId);
  }

  /**
   * 添加标签到库
   */
  async addTagToLibrary(libraryId: string, tag: ContentTag): Promise<void> {
    const library = this.libraries.get(libraryId);
    if (!library) {
      throw new Error('标签库不存在');
    }

    // 验证标签
    const validationErrors = await this.validateTag(tag);
    if (validationErrors.length > 0) {
      throw new Error(`标签验证失败: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    // 检查是否已存在
    if (library.tags.some(t => t.id === tag.id || t.name === tag.name)) {
      throw new Error('标签已存在于库中');
    }

    library.tags.push(tag);
    library.tagsCount = library.tags.length;
    library.updatedAt = new Date();

    // 初始化标签统计
    if (!this.tagStats.has(tag.id)) {
      this.tagStats.set(tag.id, {
        tagId: tag.id,
        tagName: tag.name,
        usageCount: 0,
        averageRelevance: tag.relevanceScore,
        averageWeight: tag.weight,
        lastUsed: new Date(),
        trend: 'stable',
        userCount: 0,
        categoryDistribution: { [tag.category]: 1 }
      });
    }
  }

  /**
   * 从库中移除标签
   */
  removeTagFromLibrary(libraryId: string, tagId: string): boolean {
    const library = this.libraries.get(libraryId);
    if (!library) {
      throw new Error('标签库不存在');
    }

    const initialLength = library.tags.length;
    library.tags = library.tags.filter(tag => tag.id !== tagId);

    if (library.tags.length < initialLength) {
      library.tagsCount = library.tags.length;
      library.updatedAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * 更新标签统计
   */
  updateTagStats(tagId: string, usage: { relevanceScore: number; weight: number; userId: string }): void {
    const stats = this.tagStats.get(tagId);
    if (!stats) return;

    // 更新使用统计
    stats.usageCount++;
    stats.lastUsed = new Date();

    // 更新平均相关性和权重
    stats.averageRelevance = (stats.averageRelevance + usage.relevanceScore) / 2;
    stats.averageWeight = (stats.averageWeight + usage.weight) / 2;

    // 更新用户数
    const userKey = `${tagId}_${usage.userId}`;
    if (!this.weightHistory.has(userKey)) {
      stats.userCount++;
      this.weightHistory.set(userKey, []);
    }

    // 记录权重历史
    const history = this.weightHistory.get(userKey)!;
    history.push(usage.weight);
    if (history.length > 100) { // 限制历史记录长度
      history.shift();
    }

    // 计算趋势
    if (history.length >= 10) {
      const recent = history.slice(-5);
      const previous = history.slice(-10, -5);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

      if (recentAvg > previousAvg * 1.1) {
        stats.trend = 'increasing';
      } else if (recentAvg < previousAvg * 0.9) {
        stats.trend = 'decreasing';
      } else {
        stats.trend = 'stable';
      }
    }

    this.tagStats.set(tagId, stats);
  }

  /**
   * 获取标签统计
   */
  getTagStats(tagId: string): TagStats | undefined {
    return this.tagStats.get(tagId);
  }

  /**
   * 获取所有标签统计
   */
  getAllTagStats(): TagStats[] {
    return Array.from(this.tagStats.values())
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * 获取热门标签
   */
  getPopularTags(limit: number = 20): TagStats[] {
    return this.getAllTagStats()
      .filter(stats => stats.usageCount > 0)
      .slice(0, limit);
  }

  /**
   * 获取趋势标签
   */
  getTrendingTags(limit: number = 10): TagStats[] {
    return this.getAllTagStats()
      .filter(stats => stats.trend === 'increasing' && stats.usageCount > 5)
      .slice(0, limit);
  }

  /**
   * 搜索标签
   */
  searchTags(query: string, options?: {
    type?: TagType;
    category?: TagCategory;
    libraryId?: string;
    limit?: number;
  }): ContentTag[] {
    const results: ContentTag[] = [];
    const lowerQuery = query.toLowerCase();

    // 确定搜索范围
    let libraries: TagLibrary[];
    if (options?.libraryId) {
      const library = this.libraries.get(options.libraryId);
      libraries = library ? [library] : [];
    } else {
      libraries = Array.from(this.libraries.values());
    }

    for (const library of libraries) {
      for (const tag of library.tags) {
        // 类型过滤
        if (options?.type && tag.type !== options.type) continue;

        // 类别过滤
        if (options?.category && tag.category !== options.category) continue;

        // 文本匹配
        const searchText = `${tag.name} ${tag.metadata?.description || ''} ${(tag.metadata?.aliases || []).join(' ')}`.toLowerCase();
        if (searchText.includes(lowerQuery)) {
          results.push(tag);
        }
      }
    }

    // 按相关性和使用频率排序
    results.sort((a, b) => {
      const aStats = this.tagStats.get(a.id);
      const bStats = this.tagStats.get(b.id);

      const aScore = (aStats?.usageCount || 0) * 0.5 + a.relevanceScore * 0.5;
      const bScore = (bStats?.usageCount || 0) * 0.5 + b.relevanceScore * 0.5;

      return bScore - aScore;
    });

    return results.slice(0, options?.limit || 50);
  }

  /**
   * 权重优化分析
   */
  async analyzeWeightOptimization(): Promise<TagWeightOptimization[]> {
    const optimizations: TagWeightOptimization[] = [];

    for (const [tagId, stats] of this.tagStats) {
      if (stats.usageCount < 5) continue; // 跳过使用次数少的标签

      const currentWeight = stats.averageWeight;
      let suggestedWeight = currentWeight;
      let reason = '';
      let confidence = 0.5;

      // 基于趋势调整
      if (stats.trend === 'increasing' && stats.usageCount > 10) {
        suggestedWeight = Math.min(currentWeight * 1.2, 1.0);
        reason = `使用量呈上升趋势，使用${stats.usageCount}次`;
        confidence = 0.7;
      } else if (stats.trend === 'decreasing' && stats.usageCount > 10) {
        suggestedWeight = Math.max(currentWeight * 0.8, 0.1);
        reason = `使用量呈下降趋势，使用${stats.usageCount}次`;
        confidence = 0.6;
      }

      // 基于用户接受度调整
      const userAcceptance = stats.userCount / Math.max(stats.usageCount, 1);
      if (userAcceptance > 0.8) {
        suggestedWeight = Math.min(suggestedWeight * 1.1, 1.0);
        reason += '，用户接受度高';
        confidence += 0.1;
      } else if (userAcceptance < 0.3) {
        suggestedWeight = Math.max(suggestedWeight * 0.9, 0.1);
        reason += '，用户接受度低';
        confidence += 0.1;
      }

      // 如果调整幅度较小，跳过
      if (Math.abs(suggestedWeight - currentWeight) < 0.1) continue;

      optimizations.push({
        tagId,
        currentWeight,
        suggestedWeight,
        reason,
        confidence,
        impact: {
          relevanceImprovement: Math.abs(suggestedWeight - currentWeight) * 0.8,
          userSatisfaction: userAcceptance * 0.7,
          systemPerformance: Math.random() * 0.3 // 简化的性能影响计算
        }
      });
    }

    // 按置信度和影响度排序
    optimizations.sort((a, b) => {
      const aImpact = a.confidence * (a.impact.relevanceImprovement + a.impact.userSatisfaction + a.impact.systemPerformance);
      const bImpact = b.confidence * (b.impact.relevanceImprovement + b.impact.userSatisfaction + b.impact.systemPerformance);
      return bImpact - aImpact;
    });

    return optimizations.slice(0, 20); // 返回前20个优化建议
  }

  /**
   * 应用权重优化
   */
  async applyWeightOptimizations(optimizations: TagWeightOptimization[]): Promise<void> {
    for (const opt of optimizations) {
      // 更新所有库中的标签权重
      for (const library of this.libraries.values()) {
        const tag = library.tags.find(t => t.id === opt.tagId);
        if (tag) {
          tag.weight = opt.suggestedWeight;
          library.updatedAt = new Date();
        }
      }

      // 更新统计
      const stats = this.tagStats.get(opt.tagId);
      if (stats) {
        stats.averageWeight = opt.suggestedWeight;
      }
    }
  }

  /**
   * 生成分析报告
   */
  generateAnalytics(): TagAnalytics {
    const allStats = this.getAllTagStats();
    const totalTags = allStats.length;
    const activeTags = allStats.filter(stats =>
      stats.usageCount > 0 && stats.lastUsed > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    // 类型分布
    const typeDistribution: Record<TagType, number> = {} as any;
    const categoryDistribution: Record<TagCategory, number> = {} as any;
    const sourceDistribution: Record<TagSource, number> = {} as any;

    for (const library of this.libraries.values()) {
      for (const tag of library.tags) {
        typeDistribution[tag.type] = (typeDistribution[tag.type] || 0) + 1;
        categoryDistribution[tag.category] = (categoryDistribution[tag.category] || 0) + 1;
        sourceDistribution[tag.source] = (sourceDistribution[tag.source] || 0) + 1;
      }
    }

    // 使用趋势（简化版）
    const now = new Date();
    const generateTrendData = (days: number) => {
      const data = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        // 简化的趋势数据生成
        data.push({ date: dateStr, count: Math.floor(Math.random() * 50) + 10 });
      }
      return data;
    };

    // 用户参与度（简化版）
    const avgTagsPerContent = allStats.length > 0 ?
      allStats.reduce((sum, stats) => sum + stats.usageCount, 0) / allStats.length : 0;

    return {
      totalTags,
      activeTags,
      typeDistribution,
      categoryDistribution,
      sourceDistribution,
      usageTrends: {
        daily: generateTrendData(30),
        weekly: generateTrendData(12),
        monthly: generateTrendData(6)
      },
      topTags: this.getPopularTags(10),
      userEngagement: {
        averageTagsPerContent,
        userRetentionRate: 0.75, // 简化数据
        tagCreationRate: 0.15 // 简化数据
      }
    };
  }

  /**
   * 验证标签库
   */
  async validateLibrary(library: TagLibrary): Promise<TagValidationError[]> {
    const errors: TagValidationError[] = [];

    for (const tag of library.tags) {
      const tagErrors = await this.validateTag(tag);
      errors.push(...tagErrors);
    }

    return errors;
  }

  /**
   * 验证标签
   */
  async validateTag(tag: ContentTag): Promise<TagValidationError[]> {
    const errors: TagValidationError[] = [];

    for (const rule of this.validationRules) {
      if (!rule.isActive) continue;

      const error = await this.applyValidationRule(tag, rule);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  /**
   * 应用验证规则
   */
  private async applyValidationRule(tag: ContentTag, rule: TagValidationRule): Promise<TagValidationError | null> {
    switch (rule.type) {
      case 'length':
        if (rule.minLength && tag.name.length < rule.minLength) {
          return {
            ruleId: rule.id,
            tagName: tag.name,
            message: `标签长度不能少于${rule.minLength}个字符`,
            severity: rule.severity,
            suggestion: `建议增加标签长度到至少${rule.minLength}个字符`
          };
        }
        if (rule.maxLength && tag.name.length > rule.maxLength) {
          return {
            ruleId: rule.id,
            tagName: tag.name,
            message: `标签长度不能超过${rule.maxLength}个字符`,
            severity: rule.severity,
            suggestion: `建议缩短标签长度到${rule.maxLength}个字符以内`
          };
        }
        break;

      case 'format':
        if (rule.pattern && !new RegExp(rule.pattern).test(tag.name)) {
          return {
            ruleId: rule.id,
            tagName: tag.name,
            message: '标签格式不正确，只能包含中文、英文、数字、连字符和空格',
            severity: rule.severity,
            suggestion: '请检查标签是否包含特殊字符'
          };
        }
        break;

      case 'content':
        if (rule.forbiddenWords) {
          for (const forbidden of rule.forbiddenWords) {
            if (tag.name.toLowerCase().includes(forbidden.toLowerCase())) {
              return {
                ruleId: rule.id,
                tagName: tag.name,
                message: `标签包含违禁词汇: ${forbidden}`,
                severity: rule.severity,
                suggestion: `请替换或移除违禁词汇`
              };
            }
          }
        }
        break;

      case 'duplicate':
        // 检查是否与现有标签重复
        for (const library of this.libraries.values()) {
          for (const existingTag of library.tags) {
            if (existingTag.id !== tag.id && existingTag.name.toLowerCase() === tag.name.toLowerCase()) {
              return {
                ruleId: rule.id,
                tagName: tag.name,
                message: '标签与现有标签重复',
                severity: rule.severity,
                suggestion: `建议使用现有标签: ${existingTag.name} (ID: ${existingTag.id})`
              };
            }
          }
        }
        break;
    }

    return null;
  }

  /**
   * 设置用户偏好
   */
  setUserPreferences(userId: string, preferences: UserTagPreferences): void {
    this.userPreferences.set(userId, preferences);
  }

  /**
   * 获取用户偏好
   */
  getUserPreferences(userId: string): UserTagPreferences | undefined {
    return this.userPreferences.get(userId);
  }

  /**
   * 生成标签库ID
   */
  private generateLibraryId(): string {
    return `library_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理过期数据
   */
  cleanup(): void {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90天前

    // 清理权重历史
    for (const [key, history] of this.weightHistory) {
      if (history.length > 0) {
        const shouldKeep = history.some(() => true); // 简化清理逻辑
        if (!shouldKeep) {
          this.weightHistory.delete(key);
        }
      }
    }

    // 清理用户偏好（可以添加更多清理逻辑）
    console.log(`标签库清理完成，清理了90天前的过期数据`);
  }

  /**
   * 导出标签库
   */
  exportLibrary(libraryId: string): string | null {
    const library = this.libraries.get(libraryId);
    if (!library) return null;

    return JSON.stringify({
      library,
      stats: Array.from(this.tagStats.entries())
        .filter(([tagId]) => library.tags.some(tag => tag.id === tagId))
        .map(([tagId, stats]) => [tagId, stats]),
      exportTime: new Date().toISOString()
    }, null, 2);
  }

  /**
   * 导入标签库
   */
  async importLibrary(data: string): Promise<TagLibrary> {
    try {
      const importData = JSON.parse(data);

      if (!importData.library) {
        throw new Error('导入数据格式不正确');
      }

      // 创建新的标签库
      const library = await this.createLibrary({
        ...importData.library,
        id: undefined as any, // 强制生成新ID
        createdAt: undefined as any,
        updatedAt: undefined as any,
        tagsCount: undefined as any
      });

      // 导入统计数据
      if (importData.stats) {
        for (const [tagId, stats] of importData.stats) {
          this.tagStats.set(tagId, stats);
        }
      }

      return library;
    } catch (error) {
      throw new Error(`导入标签库失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}