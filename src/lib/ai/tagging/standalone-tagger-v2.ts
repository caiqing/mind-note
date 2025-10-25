/**
 * 独立标签生成系统 V2
 * 解决并发和边界情况问题的增强版本
 */

import {
  ContentTag,
  TagType,
  TagCategory,
  TagSource,
  TagGenerationRequest,
  TagGenerationResult,
  GeneratedTag,
  TagSuggestion
} from './types';

/**
 * 增强版独立标签生成器
 */
export class StandaloneTaggerV2 {
  private keywordMap: Map<string, { type: TagType; category: TagCategory; weight: number }>;
  private conceptPatterns: RegExp[];
  private sentimentPatterns: Map<RegExp, { sentiment: string; confidence: number }>;
  private instanceId: string;

  constructor() {
    this.instanceId = Math.random().toString(36).substr(2, 9);
    this.initializeKeywordMap();
    this.initializePatterns();
  }

  /**
   * 初始化关键词映射（增强版）
   */
  private initializeKeywordMap(): void {
    this.keywordMap = new Map([
      // 技术相关（扩展）
      ['typescript', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.8 }],
      ['react', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.8 }],
      ['javascript', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.7 }],
      ['web', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],
      ['开发', { type: TagType.ACTIONABLE, category: TagCategory.TECHNOLOGY, weight: 0.7 }],
      ['编程', { type: TagType.ACTIONABLE, category: TagCategory.TECHNOLOGY, weight: 0.7 }],
      ['代码', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],
      ['技术', { type: TagType.CORE, category: TagCategory.TECHNOLOGY, weight: 0.7 }],
      ['前端', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.7 }],
      ['后端', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.7 }],
      ['算法', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],
      ['数据结构', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],

      // 设计相关（扩展）
      ['设计', { type: TagType.ACTIONABLE, category: TagCategory.CREATIVE, weight: 0.7 }],
      ['界面', { type: TagType.RELATED, category: TagCategory.CREATIVE, weight: 0.6 }],
      ['用户体验', { type: TagType.RELATED, category: TagCategory.CREATIVE, weight: 0.8 }],
      ['ui', { type: TagType.RELATED, category: TagCategory.CREATIVE, weight: 0.7 }],
      ['ux', { type: TagType.RELATED, category: TagCategory.CREATIVE, weight: 0.7 }],
      ['视觉', { type: TagType.RELATED, category: TagCategory.CREATIVE, weight: 0.6 }],
      ['交互', { type: TagType.RELATED, category: TagCategory.CREATIVE, weight: 0.6 }],

      // 移动相关（扩展）
      ['移动', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],
      ['应用', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],
      ['app', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],
      ['ios', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],
      ['android', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],

      // 商业相关（扩展）
      ['商业', { type: TagType.CORE, category: TagCategory.BUSINESS, weight: 0.7 }],
      ['市场', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['策略', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.7 }],
      ['分析', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['数据', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['营销', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['销售', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['收入', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.5 }],
      ['成本', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.5 }],

      // 管理相关（扩展）
      ['管理', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.7 }],
      ['团队', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['项目', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['流程', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.5 }],
      ['优化', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['效率', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['协作', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['沟通', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.5 }],

      // 产品相关（扩展）
      ['产品', { type: TagType.CORE, category: TagCategory.BUSINESS, weight: 0.7 }],
      ['创新', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['用户', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.5 }],
      ['研究', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['需求', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['功能', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.5 }],
      ['体验', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.6 }],

      // 学习相关（扩展）
      ['学习', { type: TagType.ACTIONABLE, category: TagCategory.EDUCATION, weight: 0.7 }],
      ['教育', { type: TagType.RELATED, category: TagCategory.EDUCATION, weight: 0.6 }],
      ['培训', { type: TagType.ACTIONABLE, category: TagCategory.EDUCATION, weight: 0.6 }],
      ['课程', { type: TagType.RELATED, category: TagCategory.EDUCATION, weight: 0.5 }],
      ['知识', { type: TagType.RELATED, category: TagCategory.EDUCATION, weight: 0.6 }],
      ['技能', { type: TagType.RELATED, category: TagCategory.EDUCATION, weight: 0.6 }],
      ['成长', { type: TagType.RELATED, category: TagCategory.EDUCATION, weight: 0.5 }],

      // 通用词汇（扩展）
      ['现代', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.3 }],
      ['系统', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.4 }],
      ['平台', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.4 }],
      ['服务', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.4 }],
      ['解决方案', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.4 }],
      ['工具', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.4 }],
      ['方法', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.3 }],
      ['过程', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.3 }],

      // 特殊处理 - 数字和标点符号
      ['1', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.1 }],
      ['2', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.1 }],
      ['3', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.1 }],
      ['0', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.1 }],
      ['，', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.1 }],
      ['。', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.1 }],
      ['！', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.1 }],
      ['？', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.1 }]
    ]);
  }

  /**
   * 初始化模式（增强版）
   */
  private initializePatterns(): void {
    // 情感模式（扩展）
    this.sentimentPatterns = new Map([
      [/好|优秀|成功|喜欢|满意|赞|棒|完美|出色|卓越/g, { sentiment: 'positive', confidence: 0.8 }],
      [/差|失败|讨厌|失望|糟糕|错误|问题|困难|挑战/g, { sentiment: 'negative', confidence: 0.8 }],
      [/新|创新|改进|优化|提升|增强|完善|进步/g, { sentiment: 'neutral', confidence: 0.6 }],
      [/快|高效|迅速|及时|便捷|快速/g, { sentiment: 'positive', confidence: 0.7 }],
      [/慢|延迟|缓慢|滞后|拖延/g, { sentiment: 'negative', confidence: 0.7 }]
    ]);

    // 概念模式（扩展）
    this.conceptPatterns = [
      /TypeScript|JavaScript|React|Vue|Angular|Next\.js/g,
      /用户体验|UI\/UX|界面设计|交互设计/g,
      /项目管理|团队协作|工作流程|敏捷开发/g,
      /商业策略|市场营销|数据分析|商业智能/g,
      /产品创新|用户研究|市场调研|产品管理/g,
      /机器学习|人工智能|深度学习|自然语言处理/g,
      /数据库|后端开发|API设计|微服务/g,
      /移动开发|跨平台|响应式设计|前端开发/g
    ];
  }

  /**
   * 生成标签（增强版，支持并发安全）
   */
  async generateTags(request: TagGenerationRequest): Promise<TagGenerationResult> {
    const startTime = Date.now();
    const { content, userId } = request;

    try {
      // 添加实例标识确保并发安全
      const instanceId = `${this.instanceId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      // 1. 预处理内容
      const processedContent = this.preprocessContent(content);
      if (!processedContent) {
        return this.createEmptyResult(content, userId, startTime, '内容为空或无法处理');
      }

      // 2. 提取关键词标签
      const keywordTags = this.extractKeywordTags(processedContent, userId);

      // 3. 提取概念标签
      const conceptTags = this.extractConceptTags(processedContent, userId);

      // 4. 提取情感标签
      const sentimentTags = this.extractSentimentTags(processedContent, userId);

      // 5. 提取特殊标签（数字、标点等）
      const specialTags = this.extractSpecialTags(content, userId);

      // 6. 合并所有标签
      const allTags = [...keywordTags, ...conceptTags, ...sentimentTags, ...specialTags];

      // 7. 去重和排序
      const uniqueTags = this.deduplicateAndSort(allTags);

      // 8. 生成建议
      const suggestions = this.generateSuggestions(processedContent, uniqueTags);

      const processingTime = Date.now() - startTime;

      return {
        content,
        userId,
        timestamp: new Date(),
        tags: uniqueTags,
        metadata: {
          provider: `standalone-tagger-v2-${instanceId}`,
          algorithm: 'rule-based-enhanced',
          processingTime,
          cost: 0,
          tokens: 0,
          version: '2.0.0',
          confidence: this.calculateOverallConfidence(uniqueTags),
          coverage: this.calculateContentCoverage(content, uniqueTags)
        },
        suggestions
      };

    } catch (error) {
      console.error(`❌ 独立标签生成失败 (实例: ${this.instanceId}):`, error);
      throw error;
    }
  }

  /**
   * 预处理内容
   */
  private preprocessContent(content: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return '';
    }

    // 移除多余的空白字符，但保留基本结构
    return trimmed.replace(/\s+/g, ' ').substring(0, 10000); // 限制长度
  }

  /**
   * 提取特殊标签（处理边界情况）
   */
  private extractSpecialTags(content: string, userId: string): GeneratedTag[] {
    const tags: GeneratedTag[] = [];

    // 检查纯数字内容
    if (/^\d+$/.test(content)) {
      const tag: ContentTag = {
        id: this.generateTagId('number', userId),
        name: '数字内容',
        type: TagType.RELATED,
        category: TagCategory.CONTENT,
        relevanceScore: 0.5,
        weight: 0.5,
        source: TagSource.AI_GENERATED,
        confidence: 0.8,
        count: 0,
        lastUsed: new Date(),
        createdBy: 'ai',
        metadata: {
          color: '#9CA3AF',
          icon: '🔢',
          description: '纯数字内容',
          isActive: true
        }
      };

      tags.push({
        tag,
        score: 0.5,
        reasoning: '检测到纯数字内容',
        position: { start: 0, end: content.length }
      });
    }

    // 检查特殊字符为主的内容
    const specialCharCount = (content.match(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g) || []).length;
    const totalLength = content.length;
    if (totalLength > 0 && specialCharCount / totalLength > 0.3) {
      const tag: ContentTag = {
        id: this.generateTagId('special-chars', userId),
        name: '特殊字符',
        type: TagType.RELATED,
        category: TagCategory.CONTENT,
        relevanceScore: 0.4,
        weight: 0.4,
        source: TagSource.AI_GENERATED,
        confidence: 0.7,
        count: 0,
        lastUsed: new Date(),
        createdBy: 'ai',
        metadata: {
          color: '#F59E0B',
          icon: '✨',
          description: '包含较多特殊字符的内容',
          isActive: true
        }
      };

      tags.push({
        tag,
        score: 0.4,
        reasoning: '检测到特殊字符',
        position: { start: 0, end: content.length }
      });
    }

    // 检查超长内容
    if (content.length > 1000) {
      const tag: ContentTag = {
        id: this.generateTagId('long-content', userId),
        name: '长内容',
        type: TagType.RELATED,
        category: TagCategory.CONTENT,
        relevanceScore: 0.3,
        weight: 0.3,
        source: TagSource.AI_GENERATED,
        confidence: 0.9,
        count: 0,
        lastUsed: new Date(),
        createdBy: 'ai',
        metadata: {
          color: '#EF4444',
          icon: '📄',
          description: `超长内容 (${content.length} 字符)`,
          isActive: true
        }
      };

      tags.push({
        tag,
        score: 0.3,
        reasoning: `超长内容，长度: ${content.length}`,
        position: { start: 0, end: Math.min(100, content.length) }
      });
    }

    return tags;
  }

  /**
   * 提取关键词标签（增强版）
   */
  private extractKeywordTags(content: string, userId: string): GeneratedTag[] {
    const tags: GeneratedTag[] = [];
    const contentLower = content.toLowerCase();

    for (const [keyword, tagInfo] of this.keywordMap) {
      if (contentLower.includes(keyword)) {
        const tag: ContentTag = {
          id: this.generateTagId(keyword, userId),
          name: keyword,
          type: tagInfo.type,
          category: tagInfo.category,
          relevanceScore: tagInfo.weight,
          weight: tagInfo.weight,
          source: TagSource.AI_GENERATED,
          confidence: 0.8,
          count: 0,
          lastUsed: new Date(),
          createdBy: 'ai',
          metadata: {
            color: this.getTagColor(tagInfo.category),
            icon: this.getTagIcon(tagInfo.category),
            description: `通过规则引擎V2识别的${keyword}标签`,
            isActive: true
          }
        };

        tags.push({
          tag,
          score: tagInfo.weight,
          reasoning: `关键词匹配: ${keyword}`,
          position: this.findPosition(content, keyword)
        });
      }
    }

    return tags;
  }

  /**
   * 提取概念标签（增强版）
   */
  private extractConceptTags(content: string, userId: string): GeneratedTag[] {
    const tags: GeneratedTag[] = [];

    for (const pattern of this.conceptPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const tag: ContentTag = {
            id: this.generateTagId(`concept-${match}`, userId),
            name: match,
            type: TagType.RELATED,
            category: TagCategory.DOMAIN,
            relevanceScore: 0.7,
            weight: 0.7,
            source: TagSource.AI_GENERATED,
            confidence: 0.7,
            count: 0,
            lastUsed: new Date(),
            createdBy: 'ai',
            metadata: {
              color: '#8B5CF6',
              icon: '💡',
              description: `概念识别V2: ${match}`,
              isActive: true
            }
          };

          tags.push({
            tag,
            score: 0.7,
            reasoning: `概念模式匹配V2: ${match}`,
            position: this.findPosition(content, match)
          });
        }
      }
    }

    return tags;
  }

  /**
   * 提取情感标签（增强版）
   */
  private extractSentimentTags(content: string, userId: string): GeneratedTag[] {
    const tags: GeneratedTag[] = [];

    for (const [pattern, sentimentInfo] of this.sentimentPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        const tag: ContentTag = {
          id: this.generateTagId(`sentiment-${sentimentInfo.sentiment}-${Date.now()}`, userId),
          name: sentimentInfo.sentiment === 'positive' ? '积极' :
                sentimentInfo.sentiment === 'negative' ? '消极' : '中性',
          type: TagType.EMOTIONAL,
          category: TagCategory.CONTENT,
          relevanceScore: sentimentInfo.confidence,
          weight: sentimentInfo.confidence,
          source: TagSource.AI_GENERATED,
          confidence: sentimentInfo.confidence,
          count: 0,
          lastUsed: new Date(),
          createdBy: 'ai',
          metadata: {
            color: sentimentInfo.sentiment === 'positive' ? '#10B981' :
                   sentimentInfo.sentiment === 'negative' ? '#EF4444' : '#6B7280',
            icon: sentimentInfo.sentiment === 'positive' ? '😊' :
                   sentimentInfo.sentiment === 'negative' ? '😔' : '😐',
            description: `情感分析V2: ${sentimentInfo.sentiment}`,
            isActive: true
          }
        };

        tags.push({
          tag,
          score: sentimentInfo.confidence,
          reasoning: `情感分析V2: ${sentimentInfo.sentiment}`,
          position: this.findPosition(content, matches[0])
        });
        break; // 只添加一个情感标签
      }
    }

    // 如果没有检测到情感，添加默认中性标签
    if (tags.length === 0 && content.length > 0) {
      const tag: ContentTag = {
        id: this.generateTagId('sentiment-neutral', userId),
        name: '中性',
        type: TagType.EMOTIONAL,
        category: TagCategory.CONTENT,
        relevanceScore: 0.3,
        weight: 0.3,
        source: TagSource.AI_GENERATED,
        confidence: 0.5,
        count: 0,
        lastUsed: new Date(),
        createdBy: 'ai',
        metadata: {
          color: '#6B7280',
          icon: '😐',
          description: '默认中性情感',
          isActive: true
        }
      };

      tags.push({
        tag,
        score: 0.3,
        reasoning: '默认情感分析：中性',
        position: { start: 0, end: Math.min(10, content.length) }
      });
    }

    return tags;
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(content: string, userId: string, startTime: number, reason: string): TagGenerationResult {
    return {
      content,
      userId,
      timestamp: new Date(),
      tags: [],
      metadata: {
        provider: `standalone-tagger-v2-${this.instanceId}`,
        algorithm: 'rule-based-enhanced',
        processingTime: Date.now() - startTime,
        cost: 0,
        tokens: 0,
        version: '2.0.0',
        confidence: 0,
        coverage: 0
      },
      suggestions: []
    };
  }

  /**
   * 去重和排序（增强版）
   */
  private deduplicateAndSort(tags: GeneratedTag[]): GeneratedTag[] {
    const uniqueTags = new Map<string, GeneratedTag>();

    for (const tagData of tags) {
      const key = `${tagData.tag.name}-${tagData.tag.type}`;
      if (!uniqueTags.has(key) || tagData.score > uniqueTags.get(key)!.score) {
        uniqueTags.set(key, tagData);
      }
    }

    return Array.from(uniqueTags.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // 增加到最多10个标签
  }

  /**
   * 生成建议（增强版）
   */
  private generateSuggestions(content: string, existingTags: GeneratedTag[]): TagSuggestion[] {
    const suggestions: TagSuggestion[] = [];
    const existingTagNames = new Set(existingTags.map(t => t.tag.name));

    // 根据内容长度提供不同建议
    const contentLength = content.length;
    let baseSuggestions = [];

    if (contentLength > 0 && contentLength < 50) {
      baseSuggestions = [
        { name: '简短内容', reason: '内容较短，适合快速浏览', confidence: 0.6 },
        { name: '要点', reason: '适合记录要点信息', confidence: 0.5 }
      ];
    } else if (contentLength >= 50 && contentLength < 200) {
      baseSuggestions = [
        { name: '中等长度', reason: '内容适中，信息量适中', confidence: 0.6 },
        { name: '详细说明', reason: '包含一定详细信息', confidence: 0.5 }
      ];
    } else if (contentLength >= 200) {
      baseSuggestions = [
        { name: '详细内容', reason: '内容详细，信息丰富', confidence: 0.7 },
        { name: '深度分析', reason: '适合深度分析', confidence: 0.6 }
      ];
    }

    // 通用建议
    const commonSuggestions = [
      { name: '技术', reason: '基于内容分析的相关标签', confidence: 0.4 },
      { name: '学习', reason: '基于内容分析的相关标签', confidence: 0.3 },
      { name: '项目', reason: '基于内容分析的相关标签', confidence: 0.3 },
      { name: '工具', reason: '基于内容分析的相关标签', confidence: 0.3 }
    ];

    const allSuggestions = [...baseSuggestions, ...commonSuggestions];

    for (const suggestion of allSuggestions) {
      if (!existingTagNames.has(suggestion.name)) {
        const tag: ContentTag = {
          id: this.generateTagId(suggestion.name, 'suggestion'),
          name: suggestion.name,
          type: TagType.RELATED,
          category: TagCategory.CONTENT,
          relevanceScore: suggestion.confidence,
          weight: suggestion.confidence,
          source: TagSource.AI_GENERATED,
          confidence: suggestion.confidence,
          count: 0,
          lastUsed: new Date(),
          createdBy: 'ai',
          metadata: {
            color: '#D1D5DB',
            icon: '💡',
            description: suggestion.reason,
            isActive: true
          }
        };

        suggestions.push({
          tag,
          reason: suggestion.reason,
          confidence: suggestion.confidence,
          impact: 'medium'
        });
      }
    }

    return suggestions.slice(0, 5); // 增加建议数量
  }

  /**
   * 计算整体置信度（增强版）
   */
  private calculateOverallConfidence(tags: GeneratedTag[]): number {
    if (tags.length === 0) return 0;
    const totalConfidence = tags.reduce((sum, tag) => sum + tag.tag.confidence, 0);
    return Math.min(totalConfidence / tags.length, 1.0);
  }

  /**
   * 计算内容覆盖率（增强版）
   */
  private calculateContentCoverage(content: string, tags: GeneratedTag[]): number {
    if (tags.length === 0 || content.length === 0) return 0;

    let coveredLength = 0;
    for (const tagData of tags) {
      if (tagData.position) {
        coveredLength += tagData.position.end - tagData.position.start;
      } else {
        coveredLength += tagData.tag.name.length * 2; // 估算覆盖长度
      }
    }

    return Math.min(coveredLength / content.length, 1.0);
  }

  /**
   * 查找位置（增强版）
   */
  private findPosition(content: string, keyword: string): { start: number; end: number } | undefined {
    const index = content.toLowerCase().indexOf(keyword.toLowerCase());
    if (index !== -1) {
      return { start: index, end: index + keyword.length };
    }
    return undefined;
  }

  /**
   * 生成标签ID（增强版，支持并发）
   */
  private generateTagId(name: string, userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 8);
    const hash = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
    return `tag_${userId}_${timestamp}_${hash.toString(36)}_${random}`;
  }

  /**
   * 获取标签颜色
   */
  private getTagColor(category: TagCategory): string {
    const colorMap: Record<TagCategory, string> = {
      [TagCategory.TECHNOLOGY]: '#3B82F6',
      [TagCategory.BUSINESS]: '#10B981',
      [TagCategory.EDUCATION]: '#F59E0B',
      [TagCategory.CREATIVE]: '#8B5CF6',
      [TagCategory.CONTENT]: '#6B7280',
      [TagCategory.DOMAIN]: '#EC4899'
    };
    return colorMap[category] || '#6B7280';
  }

  /**
   * 获取标签图标
   */
  private getTagIcon(category: TagCategory): string {
    const iconMap: Record<TagCategory, string> = {
      [TagCategory.TECHNOLOGY]: '💻',
      [TagCategory.BUSINESS]: '💼',
      [TagCategory.EDUCATION]: '📚',
      [TagCategory.CREATIVE]: '🎨',
      [TagCategory.CONTENT]: '📄',
      [TagCategory.DOMAIN]: '🎯'
    };
    return iconMap[category] || '🏷️';
  }

  /**
   * 获取实例ID
   */
  public getInstanceId(): string {
    return this.instanceId;
  }
}

/**
 * 创建增强版独立标签生成器
 */
export function createStandaloneTaggerV2(): StandaloneTaggerV2 {
  return new StandaloneTaggerV2();
}

/**
 * 测试增强版独立标签生成器
 */
export async function testStandaloneTaggerV2(): Promise<void> {
  console.log('🚀 测试增强版独立标签生成系统V2...');

  const tagger = createStandaloneTaggerV2();
  console.log(`🆔 实例ID: ${tagger.getInstanceId()}`);

  const testCases = [
    {
      content: '学习TypeScript和React开发现代化的Web应用程序',
      userId: 'test-001'
    },
    {
      content: '设计用户体验友好的移动应用界面',
      userId: 'test-002'
    },
    {
      content: '分析市场数据和制定商业策略',
      userId: 'test-003'
    },
    {
      content: '管理项目团队和优化工作流程',
      userId: 'test-004'
    },
    {
      content: '创新产品设计和用户研究',
      userId: 'test-005'
    },
    // 边界情况测试
    {
      content: '',
      userId: 'test-empty'
    },
    {
      content: 'A',
      userId: 'test-single'
    },
    {
      content: '各种标点：，。！？；：""\'\'（）【】《》',
      userId: 'test-punctuation'
    },
    {
      content: '123456789',
      userId: 'test-numbers'
    },
    {
      content: '测试'.repeat(1000),
      userId: 'test-long'
    }
  ];

  let totalTags = 0;
  let totalProcessingTime = 0;
  let successCount = 0;

  for (const testCase of testCases) {
    try {
      console.log(`\n📝 测试内容: ${testCase.content.substring(0, 50)}${testCase.content.length > 50 ? '...' : ''}`);

      const request: TagGenerationRequest = {
        content: testCase.content,
        userId: testCase.userId,
        options: {
          maxTags: 10,
          minRelevance: 0.1
        }
      };

      const result = await tagger.generateTags(request);

      console.log(`✅ 生成成功!`);
      console.log(`   标签数量: ${result.tags.length}`);
      console.log(`   处理时间: ${result.metadata.processingTime}ms`);
      console.log(`   置信度: ${result.metadata.confidence.toFixed(2)}`);
      console.log(`   覆盖率: ${result.metadata.coverage.toFixed(2)}`);

      if (result.tags.length > 0) {
        console.log(`   标签列表:`);
        result.tags.forEach((tag, index) => {
          console.log(`     ${index + 1}. ${tag.tag.name} (${tag.tag.type}) - 权重: ${tag.tag.weight.toFixed(2)} - 置信度: ${tag.tag.confidence.toFixed(2)}`);
          console.log(`        推理: ${tag.reasoning}`);
        });
      }

      if (result.suggestions.length > 0) {
        console.log(`   建议标签:`);
        result.suggestions.forEach((suggestion, index) => {
          console.log(`     ${index + 1}. ${suggestion.tag.name} - ${suggestion.reason}`);
        });
      }

      totalTags += result.tags.length;
      totalProcessingTime += result.metadata.processingTime;
      successCount++;

    } catch (error) {
      console.error(`❌ 测试失败:`, error);
    }
  }

  console.log(`\n📊 测试总结:`);
  console.log(`   成功数量: ${successCount}/${testCases.length}`);
  console.log(`   总标签数: ${totalTags}`);
  console.log(`   平均处理时间: ${(totalProcessingTime / testCases.length).toFixed(2)}ms`);
  console.log(`   成功率: ${((successCount / testCases.length) * 100).toFixed(1)}%`);
}

// 如果直接运行此文件
if (require.main === module) {
  testStandaloneTaggerV2().catch(console.error);
}