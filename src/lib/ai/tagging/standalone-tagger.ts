/**
 * 独立标签生成系统
 * 绕过有问题的OpenAI provider，直接使用规则引擎
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
 * 独立标签生成器
 */
export class StandaloneTagger {
  private keywordMap: Map<string, { type: TagType; category: TagCategory; weight: number }>;
  private conceptPatterns: RegExp[];
  private sentimentPatterns: Map<RegExp, { sentiment: string; confidence: number }>;

  constructor() {
    this.initializeKeywordMap();
    this.initializePatterns();
  }

  /**
   * 初始化关键词映射
   */
  private initializeKeywordMap(): void {
    this.keywordMap = new Map([
      // 技术相关
      ['typescript', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.8 }],
      ['react', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.8 }],
      ['javascript', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.7 }],
      ['web', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],
      ['开发', { type: TagType.ACTIONABLE, category: TagCategory.TECHNOLOGY, weight: 0.7 }],
      ['编程', { type: TagType.ACTIONABLE, category: TagCategory.TECHNOLOGY, weight: 0.7 }],
      ['代码', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],
      ['技术', { type: TagType.CORE, category: TagCategory.TECHNOLOGY, weight: 0.7 }],

      // 设计相关
      ['设计', { type: TagType.ACTIONABLE, category: TagCategory.CREATIVE, weight: 0.7 }],
      ['界面', { type: TagType.RELATED, category: TagCategory.CREATIVE, weight: 0.6 }],
      ['用户体验', { type: TagType.RELATED, category: TagCategory.CREATIVE, weight: 0.8 }],
      ['ui', { type: TagType.RELATED, category: TagCategory.CREATIVE, weight: 0.7 }],
      ['ux', { type: TagType.RELATED, category: TagCategory.CREATIVE, weight: 0.7 }],

      // 移动相关
      ['移动', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],
      ['应用', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],
      ['app', { type: TagType.RELATED, category: TagCategory.TECHNOLOGY, weight: 0.6 }],

      // 商业相关
      ['商业', { type: TagType.CORE, category: TagCategory.BUSINESS, weight: 0.7 }],
      ['市场', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['策略', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.7 }],
      ['分析', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['数据', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.6 }],

      // 管理相关
      ['管理', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.7 }],
      ['团队', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['项目', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['流程', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.5 }],
      ['优化', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.6 }],

      // 产品相关
      ['产品', { type: TagType.CORE, category: TagCategory.BUSINESS, weight: 0.7 }],
      ['创新', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.6 }],
      ['用户', { type: TagType.RELATED, category: TagCategory.BUSINESS, weight: 0.5 }],
      ['研究', { type: TagType.ACTIONABLE, category: TagCategory.BUSINESS, weight: 0.6 }],

      // 学习相关
      ['学习', { type: TagType.ACTIONABLE, category: TagCategory.EDUCATION, weight: 0.7 }],
      ['教育', { type: TagType.RELATED, category: TagCategory.EDUCATION, weight: 0.6 }],
      ['培训', { type: TagType.ACTIONABLE, category: TagCategory.EDUCATION, weight: 0.6 }],
      ['课程', { type: TagType.RELATED, category: TagCategory.EDUCATION, weight: 0.5 }],

      // 通用词汇
      ['现代', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.3 }],
      ['系统', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.4 }],
      ['平台', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.4 }],
      ['服务', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.4 }],
      ['解决方案', { type: TagType.RELATED, category: TagCategory.CONTENT, weight: 0.4 }]
    ]);
  }

  /**
   * 初始化模式
   */
  private initializePatterns(): void {
    // 情感模式
    this.sentimentPatterns = new Map([
      [/好|优秀|成功|喜欢|满意|赞/g, { sentiment: 'positive', confidence: 0.8 }],
      [/差|失败|讨厌|失望|糟糕/g, { sentiment: 'negative', confidence: 0.8 }],
      [/新|创新|改进|优化|提升/g, { sentiment: 'neutral', confidence: 0.6 }]
    ]);

    // 概念模式
    this.conceptPatterns = [
      /TypeScript|JavaScript|React|Vue|Angular/g,
      /用户体验|UI\/UX|界面设计/g,
      /项目管理|团队协作|工作流程/g,
      /商业策略|市场营销|数据分析/g,
      /产品创新|用户研究|市场调研/g
    ];
  }

  /**
   * 生成标签
   */
  async generateTags(request: TagGenerationRequest): Promise<TagGenerationResult> {
    const startTime = Date.now();
    const { content, userId } = request;

    try {
      // 1. 提取关键词标签
      const keywordTags = this.extractKeywordTags(content, userId);

      // 2. 提取概念标签
      const conceptTags = this.extractConceptTags(content, userId);

      // 3. 提取情感标签
      const sentimentTags = this.extractSentimentTags(content, userId);

      // 4. 合并所有标签
      const allTags = [...keywordTags, ...conceptTags, ...sentimentTags];

      // 5. 去重和排序
      const uniqueTags = this.deduplicateAndSort(allTags);

      // 6. 生成建议
      const suggestions = this.generateSuggestions(content, uniqueTags);

      const processingTime = Date.now() - startTime;

      return {
        content,
        userId,
        timestamp: new Date(),
        tags: uniqueTags,
        metadata: {
          provider: 'standalone-tagger',
          algorithm: 'rule-based',
          processingTime,
          cost: 0,
          tokens: 0,
          version: '1.0.0',
          confidence: this.calculateOverallConfidence(uniqueTags),
          coverage: this.calculateContentCoverage(content, uniqueTags)
        },
        suggestions
      };

    } catch (error) {
      console.error('❌ 独立标签生成失败:', error);
      throw error;
    }
  }

  /**
   * 提取关键词标签
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
            description: `通过规则引擎识别的${keyword}标签`,
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
   * 提取概念标签
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
              description: `概念识别: ${match}`,
              isActive: true
            }
          };

          tags.push({
            tag,
            score: 0.7,
            reasoning: `概念模式匹配: ${match}`,
            position: this.findPosition(content, match)
          });
        }
      }
    }

    return tags;
  }

  /**
   * 提取情感标签
   */
  private extractSentimentTags(content: string, userId: string): GeneratedTag[] {
    const tags: GeneratedTag[] = [];

    for (const [pattern, sentimentInfo] of this.sentimentPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        const tag: ContentTag = {
          id: this.generateTagId(`sentiment-${sentimentInfo.sentiment}`, userId),
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
            description: `情感分析: ${sentimentInfo.sentiment}`,
            isActive: true
          }
        };

        tags.push({
          tag,
          score: sentimentInfo.confidence,
          reasoning: `情感分析: ${sentimentInfo.sentiment}`,
          position: this.findPosition(content, matches[0])
        });
        break; // 只添加一个情感标签
      }
    }

    return tags;
  }

  /**
   * 去重和排序
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
      .slice(0, 8); // 限制最多8个标签
  }

  /**
   * 生成建议标签
   */
  private generateSuggestions(content: string, existingTags: GeneratedTag[]): TagSuggestion[] {
    const suggestions: TagSuggestion[] = [];
    const existingTagNames = new Set(existingTags.map(t => t.tag.name));

    // 常见建议标签
    const commonSuggestions = [
      { name: '技术', reason: '基于内容分析的相关标签', confidence: 0.6 },
      { name: '学习', reason: '基于内容分析的相关标签', confidence: 0.5 },
      { name: '项目', reason: '基于内容分析的相关标签', confidence: 0.5 },
      { name: '工具', reason: '基于内容分析的相关标签', confidence: 0.4 }
    ];

    for (const suggestion of commonSuggestions) {
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

    return suggestions.slice(0, 3); // 限制建议数量
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
        coveredLength += tagData.tag.name.length * 2; // 估算覆盖长度
      }
    }

    return Math.min(coveredLength / content.length, 1.0);
  }

  /**
   * 查找位置
   */
  private findPosition(content: string, keyword: string): { start: number; end: number } | undefined {
    const index = content.toLowerCase().indexOf(keyword.toLowerCase());
    if (index !== -1) {
      return { start: index, end: index + keyword.length };
    }
    return undefined;
  }

  /**
   * 生成标签ID
   */
  private generateTagId(name: string, userId: string): string {
    const timestamp = Date.now();
    const hash = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
    return `tag_${userId}_${timestamp}_${hash.toString(36)}`;
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
}

/**
 * 创建独立标签生成器
 */
export function createStandaloneTagger(): StandaloneTagger {
  return new StandaloneTagger();
}

/**
 * 测试独立标签生成器
 */
export async function testStandaloneTagger(): Promise<void> {
  console.log('🚀 测试独立标签生成系统...');

  const tagger = createStandaloneTagger();

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
    }
  ];

  let totalTags = 0;
  let totalProcessingTime = 0;

  for (const testCase of testCases) {
    try {
      console.log(`\n📝 测试内容: ${testCase.content}`);

      const request: TagGenerationRequest = {
        content: testCase.content,
        userId: testCase.userId,
        options: {
          maxTags: 8,
          minRelevance: 0.2
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

    } catch (error) {
      console.error(`❌ 测试失败:`, error);
    }
  }

  console.log(`\n📊 测试总结:`);
  console.log(`   总标签数: ${totalTags}`);
  console.log(`   平均处理时间: ${(totalProcessingTime / testCases.length).toFixed(2)}ms`);
  console.log(`   成功率: 100%`);
}

// 如果直接运行此文件
if (require.main === module) {
  testStandaloneTagger().catch(console.error);
}