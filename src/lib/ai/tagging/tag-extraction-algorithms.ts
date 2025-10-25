/**
 * 标签提取算法和相关性评分系统 - T105
 * 实现多种标签提取策略和智能评分算法
 */

import {
  ContentTag,
  TagType,
  TagCategory,
  TagSource,
  TagGenerationRequest,
  TagGenerationOptions,
  TagGenerationContext,
  GeneratedTag,
  TextPosition,
  UserTagPreferences,
  DEFAULT_TAG_LIBRARY
} from './types';
import { createAIServiceManager } from '../services/ai-service-manager';

/**
 * 标签提取算法配置
 */
const EXTRACTION_CONFIG = {
  // 关键词提取配置
  keywordExtraction: {
    minKeywordLength: 2,
    maxKeywordLength: 20,
    minFrequency: 1,
    maxKeywords: 20,
    boostProperNouns: true,
    boostTechnicalTerms: true
  },
  // 概念提取配置
  conceptExtraction: {
    minConceptRelevance: 0.3,
    maxConcepts: 15,
    includeRelations: true,
    abstractnessThreshold: 0.7
  },
  // 情感分析配置
  sentimentAnalysis: {
    sentimentThreshold: 0.6,
    emotionTypes: ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust'],
    includeEmotionTags: true
  },
  // 行动项识别配置
  actionItemExtraction: {
    actionKeywords: ['需要', '要', '应该', '必须', '计划', '安排', '准备', '联系', '完成', '实现'],
    urgencyKeywords: ['紧急', '重要', '优先', '立即', '马上', '尽快'],
    deadlinePatterns: [/(\d{4}-\d{2}-\d{2})/, /(下周|明天|今天|本周)/, /(\d+天后|\d+周后)/]
  }
};

/**
 * 标签提取算法类
 */
export class TagExtractionAlgorithms {
  private aiServiceManager: ReturnType<typeof createAIServiceManager>;
  private customTagLibrary: Map<string, ContentTag> = new Map();
  private userPreferences: Map<string, UserTagPreferences> = new Map();

  constructor() {
    this.aiServiceManager = createAIServiceManager({
      enableFallback: true,
      retryAttempts: 2,
      timeoutMs: 10000
    });

    // 初始化默认标签库
    this.initializeDefaultLibrary();
  }

  /**
   * 初始化默认标签库
   */
  private initializeDefaultLibrary(): void {
    DEFAULT_TAG_LIBRARY.forEach(tag => {
      this.customTagLibrary.set(tag.id, tag);
    });
  }

  /**
   * 主要标签提取方法
   */
  async extractTags(request: TagGenerationRequest): Promise<GeneratedTag[]> {
    const startTime = Date.now();
    const generatedTags: GeneratedTag[] = [];

    try {
      // 1. 关键词提取
      const keywordTags = await this.extractKeywordTags(request);
      generatedTags.push(...keywordTags);

      // 2. 概念提取
      const conceptTags = await this.extractConceptTags(request);
      generatedTags.push(...conceptTags);

      // 3. 情感标签提取
      const sentimentTags = await this.extractSentimentTags(request);
      generatedTags.push(...sentimentTags);

      // 4. 行动项提取
      const actionTags = await this.extractActionItemTags(request);
      generatedTags.push(...actionTags);

      // 5. 用户偏好标签
      const preferenceTags = await this.extractPreferenceTags(request);
      generatedTags.push(...preferenceTags);

      // 6. 去重和排序
      const uniqueTags = this.deduplicateTags(generatedTags);
      const sortedTags = this.sortTagsByRelevance(uniqueTags);

      // 7. 应用选项过滤
      const filteredTags = this.applyOptionsFilter(sortedTags, request.options);

      // 8. 限制数量
      return filteredTags.slice(0, request.options?.maxTags || 5);

    } catch (error) {
      console.error('标签提取失败:', error);
      throw new Error(`标签提取失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 关键词标签提取
   */
  private async extractKeywordTags(request: TagGenerationRequest): Promise<GeneratedTag[]> {
    const tags: GeneratedTag[] = [];
    const content = request.content;
    const config = EXTRACTION_CONFIG.keywordExtraction;

    try {
      // 使用AI服务提取关键词
      const aiResult = await this.aiServiceManager.performUnifiedAnalysis({
        content: request.content,
        userId: request.userId,
        options: {
          keywords: {
            maxKeywords: config.maxKeywords,
            priority: 'relevance'
          }
        }
      });

      if (aiResult.keywords?.keywords) {
        for (const keywordData of aiResult.keywords.keywords) {
          const relevanceScore = this.calculateKeywordRelevance(keywordData, content);

          if (relevanceScore >= (request.options?.minRelevance || 0.3)) {
            const tag = await this.createKeywordTag(keywordData, relevanceScore, request);
            if (tag) {
              tags.push(tag);
            }
          }
        }
      }

      // 添加技术术语和专业词汇
      const technicalTerms = this.extractTechnicalTerms(content);
      for (const term of technicalTerms) {
        const relevanceScore = this.calculateTechnicalTermRelevance(term, content);
        const tag = await this.createTechnicalTermTag(term, relevanceScore, request);
        if (tag) {
          tags.push(tag);
        }
      }

    } catch (error) {
      console.warn('AI关键词提取失败，使用备用算法:', error);
      // 备用关键词提取算法
      const fallbackTags = this.extractKeywordsFallback(content, request);
      tags.push(...fallbackTags);
    }

    return tags;
  }

  /**
   * 概念标签提取
   */
  private async extractConceptTags(request: TagGenerationRequest): Promise<GeneratedTag[]> {
    const tags: GeneratedTag[] = [];
    const config = EXTRACTION_CONFIG.conceptExtraction;

    try {
      const aiResult = await this.aiServiceManager.performUnifiedAnalysis({
        content: request.content,
        userId: request.userId,
        options: {
          concepts: {
            maxConcepts: config.maxConcepts,
            includeRelations: config.includeRelations
          }
        }
      });

      if (aiResult.concepts?.concepts) {
        for (const conceptData of aiResult.concepts.concepts) {
          const relevanceScore = conceptData.relevance || 0.5;

          if (relevanceScore >= config.minConceptRelevance) {
            const tag = await this.createConceptTag(conceptData, relevanceScore, request);
            if (tag) {
              tags.push(tag);
            }
          }
        }
      }

    } catch (error) {
      console.warn('概念提取失败:', error);
    }

    return tags;
  }

  /**
   * 情感标签提取
   */
  private async extractSentimentTags(request: TagGenerationRequest): Promise<GeneratedTag[]> {
    const tags: GeneratedTag[] = [];
    const config = EXTRACTION_CONFIG.sentimentAnalysis;

    try {
      const aiResult = await this.aiServiceManager.performUnifiedAnalysis({
        content: request.content,
        userId: request.userId,
        options: {
          sentiment: {
            includeEmotions: config.includeEmotionTags,
            emotionTypes: config.emotionTypes
          }
        }
      });

      if (aiResult.sentiment) {
        // 情感极性标签
        if (Math.abs(aiResult.sentiment.polarity) >= config.sentimentThreshold) {
          const sentimentTag = await this.createSentimentTag(aiResult.sentiment, request);
          if (sentimentTag) {
            tags.push(sentimentTag);
          }
        }

        // 情感类型标签
        if (aiResult.sentiment.emotions && config.includeEmotionTags) {
          for (const emotion of aiResult.sentiment.emotions) {
            if (emotion.intensity >= config.sentimentThreshold) {
              const emotionTag = await this.createEmotionTag(emotion, request);
              if (emotionTag) {
                tags.push(emotionTag);
              }
            }
          }
        }
      }

    } catch (error) {
      console.warn('情感分析失败:', error);
    }

    return tags;
  }

  /**
   * 行动项标签提取
   */
  private async extractActionItemTags(request: TagGenerationRequest): Promise<GeneratedTag[]> {
    const tags: GeneratedTag[] = [];
    const content = request.content;
    const config = EXTRACTION_CONFIG.actionItemExtraction;

    // 检测行动关键词
    const actionSentences = this.extractActionSentences(content, config.actionKeywords);

    for (const sentence of actionSentences) {
      const actionTag = await this.createActionTag(sentence, request);
      if (actionTag) {
        tags.push(actionTag);
      }
    }

    // 检测紧急程度
    const urgencyLevel = this.detectUrgencyLevel(content, config.urgencyKeywords);
    if (urgencyLevel > 0) {
      const urgencyTag = await this.createUrgencyTag(urgencyLevel, request);
      if (urgencyTag) {
        tags.push(urgencyTag);
      }
    }

    // 检测截止日期
    const deadlines = this.extractDeadlines(content, config.deadlinePatterns);
    for (const deadline of deadlines) {
      const deadlineTag = await this.createDeadlineTag(deadline, request);
      if (deadlineTag) {
        tags.push(deadlineTag);
      }
    }

    return tags;
  }

  /**
   * 用户偏好标签提取
   */
  private async extractPreferenceTags(request: TagGenerationRequest): Promise<GeneratedTag[]> {
    const tags: GeneratedTag[] = [];
    const userPref = this.userPreferences.get(request.userId);

    if (!userPref || !request.options?.preferUserTags) {
      return tags;
    }

    // 基于用户历史标签偏好生成
    for (const tagId of userPref.frequentlyUsed) {
      const tag = this.customTagLibrary.get(tagId);
      if (tag && this.isTagRelevantToContent(tag, request.content)) {
        const relevanceScore = this.calculateUserPreferenceRelevance(tag, userPref);
        const generatedTag: GeneratedTag = {
          tag: { ...tag },
          score: relevanceScore,
          reasoning: `基于用户历史偏好 - 标签使用${tag.count}次`,
          context: this.extractTagContext(tag.name, request.content)
        };
        tags.push(generatedTag);
      }
    }

    return tags;
  }

  /**
   * 计算关键词相关性
   */
  private calculateKeywordRelevance(keywordData: any, content: string): number {
    let score = keywordData.score || 0.5;

    // 长度权重
    const length = keywordData.keyword.length;
    if (length >= 6 && length <= 12) {
      score *= 1.2; // 中等长度关键词权重更高
    }

    // 频率权重
    const frequency = (content.match(new RegExp(keywordData.keyword, 'gi')) || []).length;
    if (frequency > 1) {
      score *= Math.min(1 + frequency * 0.1, 1.5);
    }

    // 位置权重（标题、开头等位置权重更高）
    if (content.indexOf(keywordData.keyword) < content.length * 0.2) {
      score *= 1.3;
    }

    return Math.min(score, 1.0);
  }

  /**
   * 计算技术术语相关性
   */
  private calculateTechnicalTermRelevance(term: string, content: string): number {
    const technicalIndicators = [
      '算法', 'API', '框架', '库', '工具', '技术', '平台', '系统',
      '数据库', '网络', '安全', '性能', '优化', '架构', '设计模式'
    ];

    let score = 0.4; // 基础分数

    // 术语复杂度
    if (term.length > 6) score += 0.1;
    if (/[A-Z]/.test(term)) score += 0.1; // 包含大写字母

    // 上下文相关性
    for (const indicator of technicalIndicators) {
      if (content.includes(indicator)) {
        score += 0.1;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * 计算用户偏好相关性
   */
  private calculateUserPreferenceRelevance(tag: ContentTag, userPref: UserTagPreferences): number {
    let score = 0.3; // 基础分数

    // 用户自定义权重
    if (userPref.tagWeights[tag.id]) {
      score = userPref.tagWeights[tag.id];
    }

    // 偏好类型加权
    if (userPref.preferredTypes.includes(tag.type)) {
      score *= 1.3;
    }

    // 偏好类别加权
    if (userPref.preferredCategories.includes(tag.category)) {
      score *= 1.2;
    }

    // 使用频率加权
    if (tag.count > 10) {
      score *= 1.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * 创建关键词标签
   */
  private async createKeywordTag(
    keywordData: any,
    relevanceScore: number,
    request: TagGenerationRequest
  ): Promise<GeneratedTag | null> {
    const tagId = `keyword-${keywordData.keyword.toLowerCase().replace(/\s+/g, '-')}`;

    const tag: ContentTag = {
      id: tagId,
      name: keywordData.keyword,
      type: TagType.RELATED,
      category: TagCategory.CONTENT,
      relevanceScore,
      weight: relevanceScore * 0.8,
      source: TagSource.KEYWORD_EXTRACTION,
      confidence: 0.8,
      count: 1,
      lastUsed: new Date(),
      createdBy: 'ai',
      metadata: {
        color: '#3B82F6',
        icon: '🏷️',
        description: `从内容中提取的关键词: ${keywordData.keyword}`,
        isActive: true
      }
    };

    return {
      tag,
      score: relevanceScore,
      reasoning: `关键词提取 - 评分: ${keywordData.score}`,
      position: this.findTextPosition(keywordData.keyword, request.content),
      context: this.extractTagContext(keywordData.keyword, request.content)
    };
  }

  /**
   * 创建概念标签
   */
  private async createConceptTag(
    conceptData: any,
    relevanceScore: number,
    request: TagGenerationRequest
  ): Promise<GeneratedTag | null> {
    const tagId = `concept-${conceptData.concept.toLowerCase().replace(/\s+/g, '-')}`;

    const tag: ContentTag = {
      id: tagId,
      name: conceptData.concept,
      type: TagType.CORE,
      category: TagCategory.CONCEPT,
      relevanceScore,
      weight: relevanceScore * 0.9,
      source: TagSource.CONCEPT_ANALYSIS,
      confidence: 0.85,
      count: 1,
      lastUsed: new Date(),
      createdBy: 'ai',
      metadata: {
        color: '#8B5CF6',
        icon: '💡',
        description: `AI识别的核心概念: ${conceptData.concept}`,
        isActive: true
      }
    };

    return {
      tag,
      score: relevanceScore,
      reasoning: `概念分析 - 相关性: ${conceptData.relevance}`,
      context: this.extractTagContext(conceptData.concept, request.content)
    };
  }

  /**
   * 创建情感标签
   */
  private async createSentimentTag(
    sentimentData: any,
    request: TagGenerationRequest
  ): Promise<GeneratedTag | null> {
    const sentiment = sentimentData.polarity > 0 ? '积极' : '消极';
    const tagId = `sentiment-${sentiment}`;

    const tag: ContentTag = {
      id: tagId,
      name: `${sentiment}情感`,
      type: TagType.EMOTIONAL,
      category: TagCategory.PERSONAL,
      relevanceScore: Math.abs(sentimentData.polarity),
      weight: 0.7,
      source: TagSource.SENTIMENT_ANALYSIS,
      confidence: sentimentData.confidence || 0.7,
      count: 1,
      lastUsed: new Date(),
      createdBy: 'ai',
      metadata: {
        color: sentimentData.polarity > 0 ? '#22C55E' : '#EF4444',
        icon: sentimentData.polarity > 0 ? '😊' : '😔',
        description: `内容情感倾向: ${sentiment}`,
        isActive: true
      }
    };

    return {
      tag,
      score: Math.abs(sentimentData.polarity),
      reasoning: `情感分析 - 极性: ${sentimentData.polarity.toFixed(2)}`,
      context: this.extractTagContext(sentiment, request.content)
    };
  }

  /**
   * 创建情感类型标签
   */
  private async createEmotionTag(
    emotionData: any,
    request: TagGenerationRequest
  ): Promise<GeneratedTag | null> {
    const tagId = `emotion-${emotionData.emotion}`;

    const tag: ContentTag = {
      id: tagId,
      name: emotionData.emotion,
      type: TagType.EMOTIONAL,
      category: TagCategory.PERSONAL,
      relevanceScore: emotionData.intensity,
      weight: emotionData.intensity * 0.8,
      source: TagSource.SENTIMENT_ANALYSIS,
      confidence: 0.75,
      count: 1,
      lastUsed: new Date(),
      createdBy: 'ai',
      metadata: {
        color: '#EC4899',
        icon: '😊',
        description: `情感类型: ${emotionData.emotion}`,
        isActive: true
      }
    };

    return {
      tag,
      score: emotionData.intensity,
      reasoning: `情感识别 - 强度: ${emotionData.intensity.toFixed(2)}`,
      context: this.extractTagContext(emotionData.emotion, request.content)
    };
  }

  /**
   * 创建行动项标签
   */
  private async createActionTag(
    sentence: string,
    request: TagGenerationRequest
  ): Promise<GeneratedTag | null> {
    const tagId = `action-${Date.now()}`;

    const tag: ContentTag = {
      id: tagId,
      name: '行动项',
      type: TagType.ACTIONABLE,
      category: TagCategory.TASK,
      relevanceScore: 0.8,
      weight: 0.85,
      source: TagSource.AI_GENERATED,
      confidence: 0.9,
      count: 1,
      lastUsed: new Date(),
      createdBy: 'ai',
      metadata: {
        color: '#EF4444',
        icon: '✅',
        description: `需要执行的行动: ${sentence.substring(0, 50)}...`,
        priority: 'high',
        isActive: true
      }
    };

    return {
      tag,
      score: 0.8,
      reasoning: `行动项检测: ${sentence}`,
      position: this.findTextPosition(sentence, request.content),
      context: sentence
    };
  }

  /**
   * 创建紧急程度标签
   */
  private async createUrgencyTag(
    urgencyLevel: number,
    request: TagGenerationRequest
  ): Promise<GeneratedTag | null> {
    const urgency = urgencyLevel > 0.8 ? '紧急' : '重要';
    const tagId = `urgency-${urgency}`;

    const tag: ContentTag = {
      id: tagId,
      name: urgency,
      type: TagType.ACTIONABLE,
      category: TagCategory.TASK,
      relevanceScore: urgencyLevel,
      weight: urgencyLevel * 0.9,
      source: TagSource.AI_GENERATED,
      confidence: 0.85,
      count: 1,
      lastUsed: new Date(),
      createdBy: 'ai',
      metadata: {
        color: urgencyLevel > 0.8 ? '#DC2626' : '#F59E0B',
        icon: urgencyLevel > 0.8 ? '🚨' : '⚠️',
        description: `优先级: ${urgency}`,
        priority: urgencyLevel > 0.8 ? 'critical' : 'high',
        isActive: true
      }
    };

    return {
      tag,
      score: urgencyLevel,
      reasoning: `紧急程度检测: ${urgency}`,
      context: this.extractTagContext(urgency, request.content)
    };
  }

  /**
   * 创建截止日期标签
   */
  private async createDeadlineTag(
    deadline: string,
    request: TagGenerationRequest
  ): Promise<GeneratedTag | null> {
    const tagId = `deadline-${Date.now()}`;

    const tag: ContentTag = {
      id: tagId,
      name: '有截止日期',
      type: TagType.TEMPORAL,
      category: TagCategory.TASK,
      relevanceScore: 0.7,
      weight: 0.75,
      source: TagSource.AI_GENERATED,
      confidence: 0.8,
      count: 1,
      lastUsed: new Date(),
      createdBy: 'ai',
      metadata: {
        color: '#6B7280',
        icon: '📅',
        description: `截止日期: ${deadline}`,
        priority: 'medium',
        isActive: true
      }
    };

    return {
      tag,
      score: 0.7,
      reasoning: `截止日期检测: ${deadline}`,
      position: this.findTextPosition(deadline, request.content),
      context: this.extractTagContext(deadline, request.content)
    };
  }

  /**
   * 创建技术术语标签
   */
  private async createTechnicalTermTag(
    term: string,
    relevanceScore: number,
    request: TagGenerationRequest
  ): Promise<GeneratedTag | null> {
    const tagId = `tech-${term.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const tag: ContentTag = {
      id: tagId,
      name: term,
      type: TagType.RELATED,
      category: TagCategory.DOMAIN,
      relevanceScore,
      weight: relevanceScore * 0.85,
      source: TagSource.KEYWORD_EXTRACTION,
      confidence: 0.8,
      count: 1,
      lastUsed: new Date(),
      createdBy: 'ai',
      metadata: {
        color: '#059669',
        icon: '🔧',
        description: `技术术语: ${term}`,
        isActive: true
      }
    };

    return {
      tag,
      score: relevanceScore,
      reasoning: `技术术语识别: ${term}`,
      position: this.findTextPosition(term, request.content),
      context: this.extractTagContext(term, request.content)
    };
  }

  /**
   * 辅助方法 - 提取技术术语
   */
  private extractTechnicalTerms(content: string): string[] {
    const terms: string[] = [];

    // 常见技术模式
    const techPatterns = [
      /\b[A-Z][a-z]+[A-Z][a-z]+\b/g, // 驼峰命名
      /\b[A-Z]{2,}\b/g, // 缩写
      /\b\w+\.js\b/gi, // JavaScript文件
      /\b\w+\.(py|java|cpp|ts|jsx|tsx)\b/gi, // 代码文件
      /\b(API|SDK|UI|UX|AI|ML|NLP|SQL|NoSQL|JSON|XML|HTML|CSS|HTTP|REST|GraphQL)\b/g // 技术缩写
    ];

    for (const pattern of techPatterns) {
      const matches = content.match(pattern) || [];
      terms.push(...matches.filter(term => term.length >= 3));
    }

    return [...new Set(terms)]; // 去重
  }

  /**
   * 辅助方法 - 提取行动句
   */
  private extractActionSentences(content: string, actionKeywords: string[]): string[] {
    const sentences = content.split(/[。！？.!?]+/);
    return sentences.filter(sentence => {
      const trimmed = sentence.trim();
      return trimmed.length > 5 && actionKeywords.some(keyword => trimmed.includes(keyword));
    });
  }

  /**
   * 辅助方法 - 检测紧急程度
   */
  private detectUrgencyLevel(content: string, urgencyKeywords: string[]): number {
    let level = 0;
    for (const keyword of urgencyKeywords) {
      const matches = (content.match(new RegExp(keyword, 'gi')) || []).length;
      if (keyword === '紧急' || keyword === '立即' || keyword === '马上') {
        level += matches * 0.4;
      } else {
        level += matches * 0.2;
      }
    }
    return Math.min(level, 1.0);
  }

  /**
   * 辅助方法 - 提取截止日期
   */
  private extractDeadlines(content: string, patterns: RegExp[]): string[] {
    const deadlines: string[] = [];
    for (const pattern of patterns) {
      const matches = content.match(pattern) || [];
      deadlines.push(...matches);
    }
    return [...new Set(deadlines)];
  }

  /**
   * 辅助方法 - 查找文本位置
   */
  private findTextPosition(text: string, content: string): TextPosition | undefined {
    const index = content.indexOf(text);
    if (index === -1) return undefined;

    return {
      start: index,
      end: index + text.length,
      snippet: content.substring(Math.max(0, index - 20), Math.min(content.length, index + text.length + 20))
    };
  }

  /**
   * 辅助方法 - 提取标签上下文
   */
  private extractTagContext(tagName: string, content: string): string {
    const index = content.indexOf(tagName);
    if (index === -1) return '';

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + tagName.length + 50);
    return content.substring(start, end);
  }

  /**
   * 辅助方法 - 判断标签是否与内容相关
   */
  private isTagRelevantToContent(tag: ContentTag, content: string): boolean {
    // 检查标签名或别名是否在内容中
    const searchTerms = [tag.name, ...(tag.metadata?.aliases || [])];
    return searchTerms.some(term => content.toLowerCase().includes(term.toLowerCase()));
  }

  /**
   * 辅助方法 - 备用关键词提取
   */
  private extractKeywordsFallback(content: string, request: TagGenerationRequest): GeneratedTag[] {
    const tags: GeneratedTag[] = [];

    // 简单的关键词提取
    const words = content.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];
    const wordFreq: Record<string, number> = {};

    for (const word of words) {
      if (word.length >= 2 && word.length <= 10) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }

    // 按频率排序并创建标签
    const sortedWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    for (const [word, freq] of sortedWords) {
      if (freq >= 2) {
        const relevanceScore = Math.min(freq * 0.3, 0.8);
        const tag = this.createFallbackKeywordTag(word, relevanceScore, request);
        if (tag) {
          tags.push(tag);
        }
      }
    }

    return tags;
  }

  /**
   * 辅助方法 - 创建备用关键词标签
   */
  private createFallbackKeywordTag(
    word: string,
    relevanceScore: number,
    request: TagGenerationRequest
  ): GeneratedTag | null {
    const tagId = `fallback-${word.toLowerCase().replace(/\s+/g, '-')}`;

    const tag: ContentTag = {
      id: tagId,
      name: word,
      type: TagType.RELATED,
      category: TagCategory.CONTENT,
      relevanceScore,
      weight: relevanceScore * 0.7,
      source: TagSource.KEYWORD_EXTRACTION,
      confidence: 0.6,
      count: 1,
      lastUsed: new Date(),
      createdBy: 'ai',
      metadata: {
        color: '#6B7280',
        icon: '📝',
        description: `备用算法提取的关键词: ${word}`,
        isActive: true
      }
    };

    return {
      tag,
      score: relevanceScore,
      reasoning: `备用关键词提取 - 频率: ${relevanceScore}`,
      context: this.extractTagContext(word, request.content)
    };
  }

  /**
   * 辅助方法 - 标签去重
   */
  private deduplicateTags(tags: GeneratedTag[]): GeneratedTag[] {
    const seen = new Set<string>();
    const unique: GeneratedTag[] = [];

    for (const tag of tags) {
      const key = tag.tag.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(tag);
      } else {
        // 如果已存在，合并评分
        const existing = unique.find(t => t.tag.name.toLowerCase() === key);
        if (existing) {
          existing.score = Math.max(existing.score, tag.score);
          existing.reasoning += `; ${tag.reasoning}`;
        }
      }
    }

    return unique;
  }

  /**
   * 辅助方法 - 按相关性排序
   */
  private sortTagsByRelevance(tags: GeneratedTag[]): GeneratedTag[] {
    return tags.sort((a, b) => {
      // 首先按评分排序
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 然后按类型权重排序
      const typeWeight = { [TagType.CORE]: 3, [TagType.ACTIONABLE]: 2, [TagType.EMOTIONAL]: 1.5 };
      const aWeight = typeWeight[a.tag.type] || 1;
      const bWeight = typeWeight[b.tag.type] || 1;
      return bWeight - aWeight;
    });
  }

  /**
   * 辅助方法 - 应用选项过滤
   */
  private applyOptionsFilter(
    tags: GeneratedTag[],
    options?: TagGenerationOptions
  ): GeneratedTag[] {
    if (!options) return tags;

    let filtered = [...tags];

    // 包含类型过滤
    if (options.includeTypes) {
      filtered = filtered.filter(tag => options.includeTypes!.includes(tag.tag.type));
    }

    // 排除类型过滤
    if (options.excludeTypes) {
      filtered = filtered.filter(tag => !options.excludeTypes!.includes(tag.tag.type));
    }

    // 包含类别过滤
    if (options.includeCategories) {
      filtered = filtered.filter(tag => options.includeCategories!.includes(tag.tag.category));
    }

    // 排除类别过滤
    if (options.excludeCategories) {
      filtered = filtered.filter(tag => !options.excludeCategories!.includes(tag.tag.category));
    }

    // 最小相关性过滤
    if (options.minRelevance) {
      filtered = filtered.filter(tag => tag.score >= options.minRelevance!);
    }

    return filtered;
  }

  /**
   * 设置用户偏好
   */
  public setUserPreferences(userId: string, preferences: UserTagPreferences): void {
    this.userPreferences.set(userId, preferences);
  }

  /**
   * 添加自定义标签库
   */
  public addCustomTags(tags: ContentTag[]): void {
    for (const tag of tags) {
      this.customTagLibrary.set(tag.id, tag);
    }
  }

  /**
   * 获取标签库统计
   */
  public getLibraryStats(): { total: number; byType: Record<TagType, number>; byCategory: Record<TagCategory, number> } {
    const tags = Array.from(this.customTagLibrary.values());
    const byType: Record<TagType, number> = {} as any;
    const byCategory: Record<TagCategory, number> = {} as any;

    for (const tag of tags) {
      byType[tag.type] = (byType[tag.type] || 0) + 1;
      byCategory[tag.category] = (byCategory[tag.category] || 0) + 1;
    }

    return {
      total: tags.length,
      byType,
      byCategory
    };
  }
}