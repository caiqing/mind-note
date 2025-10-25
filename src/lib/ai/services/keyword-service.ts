/**
 * 关键词提取服务 - T103.4
 * 统一的关键词提取服务，支持多AI提供商和智能算法
 */

import { AnalysisProvider } from '@/types/ai-analysis';
import { createOpenAIProviderV2 } from '../providers/openai-provider-v2';
import { createClaudeProvider } from '../providers/claude-provider';
import { aiConfig } from '../ai-config';

export interface KeywordRequest {
  content: string;
  maxKeywords?: number;
  minKeywordLength?: number;
  maxKeywordLength?: number;
  language?: 'zh' | 'en';
  categories?: string[];
  preferSingleWords?: boolean;
  includePhrases?: boolean;
  priority: 'relevance' | 'frequency' | 'importance';
  preferredProvider?: string;
  userId: string;
}

export interface ExtractedKeyword {
  keyword: string;
  score: number; // 0-1
  frequency: number;
  category?: string;
  type: 'single' | 'phrase' | 'compound';
  relevance: number;
  positions?: number[]; // 在原文中的位置
}

export interface KeywordResult {
  keywords: ExtractedKeyword[];
  provider: string;
  model: string;
  processingTime: number;
  cost: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  statistics: {
    totalKeywords: number;
    avgScore: number;
    avgLength: number;
    categories: string[];
    types: {
      single: number;
      phrase: number;
      compound: number;
    };
  };
  metadata: {
    requestId: string;
    processedAt: Date;
    version: string;
    algorithm: string;
  };
}

export class KeywordService {
  private providers: Map<string, AnalysisProvider> = new Map();
  private fallbackOrder: string[];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // 初始化可用的提供商
    try {
      const openaiProvider = createOpenAIProviderV2();
      this.providers.set('openai', openaiProvider);
      console.log('✅ OpenAI provider initialized for keyword extraction');
    } catch (error) {
      console.warn('⚠️ OpenAI provider not available for keyword extraction:', error);
    }

    try {
      const claudeProvider = createClaudeProvider();
      this.providers.set('anthropic', claudeProvider);
      console.log('✅ Claude provider initialized for keyword extraction');
    } catch (error) {
      console.warn('⚠️ Claude provider not available for keyword extraction:', error);
    }

    // 设置fallback顺序
    this.fallbackOrder = aiConfig.getFallbackOrder().filter(provider =>
      this.providers.has(provider)
    );

    if (this.fallbackOrder.length === 0) {
      throw new Error('No AI providers available for keyword extraction');
    }

    console.log(`📋 Available providers for keyword extraction: ${this.fallbackOrder.join(', ')}`);
  }

  async extractKeywords(request: KeywordRequest): Promise<KeywordResult> {
    const requestId = `keyword_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`🔑 Extracting keywords (Request: ${requestId})`);
    console.log(`Content length: ${request.content.length} characters`);
    console.log(`Max keywords: ${request.maxKeywords || 8}`);
    console.log(`Priority: ${request.priority}`);

    let lastError: Error | null = null;

    // 尝试按优先级顺序使用提供商
    const providersToTry = request.preferredProvider && this.providers.has(request.preferredProvider)
      ? [request.preferredProvider, ...this.fallbackOrder.filter(p => p !== request.preferredProvider)]
      : this.fallbackOrder;

    for (const providerName of providersToTry) {
      try {
        console.log(`🔄 Trying keyword extraction with provider: ${providerName}`);

        const provider = this.providers.get(providerName)!;
        const result = await this.extractKeywordsWithProvider(provider, request, requestId);

        console.log(`✅ Keywords extracted successfully with ${providerName}`);
        return result;

      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Provider ${providerName} failed for keyword extraction:`, error);

        // 如果不是最后一个提供商，继续尝试下一个
        if (providersToTry.indexOf(providerName) < providersToTry.length - 1) {
          console.log(`🔄 Falling back to next provider...`);
          continue;
        }
      }
    }

    // 所有提供商都失败了
    throw new Error(`All providers failed to extract keywords. Last error: ${lastError?.message}`);
  }

  private async extractKeywordsWithProvider(
    provider: AnalysisProvider,
    request: KeywordRequest,
    requestId: string
  ): Promise<KeywordResult> {
    const startTime = Date.now();

    // 构建提示模板
    const prompt = this.buildPrompt(request);

    // 提取关键词
    const rawKeywords = await provider.extractKeywords(prompt);

    const processingTime = Date.now() - startTime;

    // 后处理和评分
    const processedKeywords = this.processKeywords(rawKeywords, request);

    // 计算统计信息
    const statistics = this.calculateStatistics(processedKeywords);

    // 估算成本
    const inputTokens = this.estimateTokens(prompt);
    const outputTokens = this.estimateTokens(rawKeywords.join(', '));

    let cost = 0;
    try {
      cost = aiConfig.calculateCost(provider.name, this.getModelName(provider), inputTokens, outputTokens);
    } catch (error) {
      // 如果成本计算失败，使用默认成本估算
      cost = ((inputTokens + outputTokens) / 1000) * 0.0001; // 默认费率
    }

    return {
      keywords: processedKeywords,
      provider: provider.name,
      model: this.getModelName(provider),
      processingTime,
      cost,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      statistics,
      metadata: {
        requestId,
        processedAt: new Date(),
        version: '1.0.0',
        algorithm: `ai-${provider.name}-${request.priority}`,
      },
    };
  }

  private buildPrompt(request: KeywordRequest): string {
    const {
      content,
      maxKeywords = 8,
      minKeywordLength = 2,
      maxKeywordLength = 6,
      language = 'zh',
      categories = [],
      preferSingleWords = false,
      includePhrases = true,
      priority = 'relevance',
    } = request;

    let prompt = `请从以下内容中提取${maxKeywords}个最重要的关键词：\n\n`;

    // 添加内容
    prompt += `${content}\n\n`;

    // 添加关键词要求
    prompt += `关键词要求：\n`;
    prompt += `1. 提取${maxKeywords}个最相关的关键词\n`;
    prompt += `2. 关键词长度在${minKeywordLength}-${maxKeywordLength}个字符之间\n`;
    prompt += `3. 优先级按照${priority === 'relevance' ? '相关性' : priority === 'frequency' ? '频率' : '重要性'}排序\n`;
    prompt += `4. 去除重复和相似的词汇\n`;
    prompt += `5. 使用${language === 'zh' ? '中文' : '英文'}关键词\n`;

    // 添加类型要求
    if (preferSingleWords) {
      prompt += `6. 优先选择单个词汇，避免短语\n`;
    }

    if (!includePhrases) {
      prompt += `6. 只提取单个词汇，不包含短语\n`;
    }

    // 添加分类要求
    if (categories.length > 0) {
      prompt += `7. 优先考虑以下分类：${categories.join('、')}\n`;
    }

    // 添加特定提供商的提示
    if (request.preferredProvider === 'anthropic') {
      prompt += `8. 请使用结构化格式返回，每个关键词一行\n`;
    }

    prompt += `\n请用逗号分隔返回关键词，不要添加任何格式或解释：`;

    return prompt;
  }

  private processKeywords(rawKeywords: string[], request: KeywordRequest): ExtractedKeyword[] {
    const {
      maxKeywords = 8,
      minKeywordLength = 2,
      maxKeywordLength = 6,
      categories = [],
      preferSingleWords = false,
      includePhrases = true,
      priority = 'relevance',
    } = request;

    // 解析和清理关键词
    let keywords = rawKeywords
      .map(k => k.trim())
      .filter(k => k.length >= minKeywordLength && k.length <= maxKeywordLength)
      .filter(k => !this.isStopWord(k))
      .filter((k, index, arr) => arr.indexOf(k) === index) // 去重
      .slice(0, maxKeywords);

    // 分析关键词类型
    keywords = keywords.map(keyword => ({
      keyword,
      score: this.calculateBaseScore(keyword, request),
      frequency: this.calculateFrequency(keyword, request.content),
      category: this.categorizeKeyword(keyword, categories),
      type: this.determineKeywordType(keyword, preferSingleWords, includePhrases),
      relevance: 0, // 稍后计算
      positions: this.findKeywordPositions(keyword, request.content),
    }));

    // 根据优先级重新评分
    keywords = this.rerankByPriority(keywords, request);

    // 计算相关性分数
    keywords = this.calculateRelevance(keywords, request);

    // 最终排序
    keywords.sort((a, b) => {
      // 首先按相关性分数排序
      if (priority === 'relevance') {
        return b.relevance - a.relevance;
      } else if (priority === 'frequency') {
        return b.frequency - a.frequency;
      } else {
        return b.score - a.score;
      }
    });

    return keywords;
  }

  private calculateBaseScore(keyword: string, request: KeywordRequest): number {
    let score = 0.5; // 基础分数

    // 长度分数
    const length = keyword.length;
    const optimalLength = 4;
    const lengthScore = 1 - Math.abs(length - optimalLength) / optimalLength;
    score += lengthScore * 0.2;

    // 字符类型分数
    const hasChinese = /[\u4e00-\u9fa5]/.test(keyword);
    const hasEnglish = /[a-zA-Z]/.test(keyword);
    if (request.language === 'zh' && hasChinese) {
      score += 0.1;
    } else if (request.language === 'en' && hasEnglish) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  private calculateFrequency(keyword: string, content: string): number {
    const regex = new RegExp(this.escapeRegex(keyword), 'gi');
    const matches = content.match(regex);
    return matches ? matches.length : 1;
  }

  private categorizeKeyword(keyword: string, preferredCategories: string[]): string {
    // 预定义的关键词分类
    const categoryMap: { [key: string]: string[] } = {
      technology: ['技术', '开发', '编程', '算法', '数据', 'AI', '人工智能', '机器学习', '深度学习'],
      business: ['商业', '市场', '销售', '客户', '产品', '服务', '管理', '战略'],
      education: ['学习', '教育', '课程', '知识', '技能', '培训', '研究', '学术'],
      lifestyle: ['生活', '健康', '运动', '饮食', '旅行', '娱乐', '社交', '情感'],
      creative: ['创意', '设计', '艺术', '音乐', '写作', '摄影', '视频', '游戏'],
      personal: ['个人', '成长', '目标', '计划', '思考', '感受', '体验', '回忆'],
    };

    // 首先检查用户偏好的分类
    for (const category of preferredCategories) {
      if (categoryMap[category] && categoryMap[category].some(ck => keyword.includes(ck) || ck.includes(keyword))) {
        return category;
      }
    }

    // 然后检查预定义分类
    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(ck => keyword.includes(ck) || ck.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  private determineKeywordType(
    keyword: string,
    preferSingleWords: boolean,
    includePhrases: boolean
  ): 'single' | 'phrase' | 'compound' {
    const words = keyword.split(/[\s\-_]+/);

    if (words.length === 1) {
      return 'single';
    } else if (words.length === 2 && includePhrases) {
      return 'phrase';
    } else if (words.length > 2) {
      return 'compound';
    }

    return preferSingleWords ? 'single' : 'phrase';
  }

  private findKeywordPositions(keyword: string, content: string): number[] {
    const positions: number[] = [];
    const regex = new RegExp(this.escapeRegex(keyword), 'gi');
    let match;

    while ((match = regex.exec(content)) !== null) {
      positions.push(match.index);
    }

    return positions;
  }

  private rerankByPriority(keywords: ExtractedKeyword[], request: KeywordRequest): ExtractedKeyword[] {
    const { priority } = request;

    return keywords.map(keyword => {
      let adjustedScore = keyword.score;

      switch (priority) {
        case 'frequency':
          adjustedScore = keyword.frequency / 10; // 标准化频率
          break;
        case 'importance':
          adjustedScore = keyword.score;
          if (keyword.category !== 'other') {
            adjustedScore += 0.2; // 有分类的关键词加分
          }
          if (keyword.type === 'compound') {
            adjustedScore += 0.1; // 复合词加分
          }
          break;
        default: // relevance
          adjustedScore = keyword.score;
          break;
      }

      return {
        ...keyword,
        score: Math.min(1.0, adjustedScore),
      };
    });
  }

  private calculateRelevance(keywords: ExtractedKeyword[], request: KeywordRequest): ExtractedKeyword[] {
    const totalScore = keywords.reduce((sum, k) => sum + k.score, 0);

    return keywords.map(keyword => ({
      ...keyword,
      relevance: totalScore > 0 ? keyword.score / totalScore : 0,
    }));
  }

  private calculateStatistics(keywords: ExtractedKeyword[]): KeywordResult['statistics'] {
    const categories = [...new Set(keywords.map(k => k.category).filter(Boolean))];
    const types = {
      single: keywords.filter(k => k.type === 'single').length,
      phrase: keywords.filter(k => k.type === 'phrase').length,
      compound: keywords.filter(k => k.type === 'compound').length,
    };

    return {
      totalKeywords: keywords.length,
      avgScore: keywords.length > 0 ? keywords.reduce((sum, k) => sum + k.score, 0) / keywords.length : 0,
      avgLength: keywords.length > 0 ? keywords.reduce((sum, k) => sum + k.keyword.length, 0) / keywords.length : 0,
      categories,
      types,
    };
  }

  private isStopWord(keyword: string): boolean {
    // 常见停用词
    const stopWords = new Set([
      // 中文停用词
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
      '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
      '自己', '这', '那', '里', '就是', '我们', '还是', '什么', '可以', '但是',
      // 英文停用词
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
      'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
      'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
    ]);

    return stopWords.has(keyword.toLowerCase());
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private getModelName(provider: AnalysisProvider): string {
    // 尝试从provider获取model名称
    if ('model' in provider && typeof provider.model === 'string') {
      return provider.model;
    }

    // 根据provider名称返回默认模型
    switch (provider.name) {
      case 'openai':
        return 'gpt-3.5-turbo';
      case 'anthropic':
        return 'claude-3-haiku-20240307';
      default:
        return 'default-model';
    }
  }

  private estimateTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  // 批量关键词提取
  async extractBatchKeywords(requests: KeywordRequest[]): Promise<KeywordResult[]> {
    console.log(`📦 Processing ${requests.length} keyword extraction requests...`);

    const results: KeywordResult[] = [];
    const batchSize = 3; // 控制并发数

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requests.length / batchSize)}`);

      const batchPromises = batch.map(request =>
        this.extractKeywords(request).catch(error => {
          console.error(`❌ Failed to extract keywords for content:`, error);
          return null;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null) as KeywordResult[]);
    }

    console.log(`✅ Batch processing completed. ${results.length}/${requests.length} extractions completed.`);
    return results;
  }

  // 获取可用的提供商列表
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // 检查服务健康状态
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; providers: string[]; details: any }> {
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      return {
        status: 'unhealthy',
        providers: [],
        details: { error: 'No providers available' }
      };
    }

    if (availableProviders.length === 1) {
      return {
        status: 'degraded',
        providers: availableProviders,
        details: { warning: 'Only one provider available' }
      };
    }

    return {
      status: 'healthy',
      providers: availableProviders,
      details: { fallbackOrder: this.fallbackOrder }
    };
  }

  // 获取服务统计信息
  getStats(): {
    totalProviders: number;
    availableProviders: number;
    fallbackOrder: string[];
    supportedLanguages: string[];
    supportedPriorities: string[];
    maxKeywords: number;
  } {
    return {
      totalProviders: this.providers.size,
      availableProviders: this.getAvailableProviders().length,
      fallbackOrder: this.fallbackOrder,
      supportedLanguages: ['zh', 'en'],
      supportedPriorities: ['relevance', 'frequency', 'importance'],
      maxKeywords: 20,
    };
  }
}

// 单例实例
export const keywordService = new KeywordService();

// 工厂函数
export function createKeywordService(): KeywordService {
  return new KeywordService();
}