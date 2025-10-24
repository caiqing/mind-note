/**
 * 文本分析服务
 *
 * 提供文本摘要、关键词提取、关键概念识别、情感分析等功能
 */

import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import crypto from 'crypto';
import {
  TextAnalysisRequest,
  TextAnalysisResult,
  SentimentAnalysis,
  AnalysisProgress,
  AnalysisError,
  AnalysisErrorCode,
  AnalysisProvider,
} from './text-analysis-types';

export class TextAnalysisService {
  private static instance: TextAnalysisService;
  private providers: Map<string, AnalysisProvider>;
  private cache: Map<string, any>;
  private cacheTimeout: number;
  private processingRequests: Map<string, AnalysisProgress>;

  private constructor() {
    this.providers = new Map();
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1小时缓存
    this.processingRequests = new Map();
    this.initializeProviders();
  }

  public static getInstance(): TextAnalysisService {
    if (!TextAnalysisService.instance) {
      TextAnalysisService.instance = new TextAnalysisService();
    }
    return TextAnalysisService.instance;
  }

  /**
   * 初始化AI提供商
   */
  private initializeProviders(): void {
    // OpenAI Provider
    this.providers.set('openai', {
      name: 'OpenAI',
      type: 'openai',
      capabilities: {
        summarization: true,
        keywordExtraction: true,
        conceptIdentification: true,
        sentimentAnalysis: true,
        categorization: true,
        tagGeneration: true,
        languages: ['zh', 'en'],
        maxTokens: 4096,
        supportedModels: ['gpt-4', 'gpt-3.5-turbo'],
      },
      config: {
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        temperature: 0.3,
        maxTokens: 2000,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
      },
      isAvailable: !!process.env.OPENAI_API_KEY,
      priority: 1,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 3000,
        tokensPerMinute: 90000,
        tokensPerDay: 1000000,
      },
    });

    // Anthropic Provider
    this.providers.set('anthropic', {
      name: 'Anthropic',
      type: 'anthropic',
      capabilities: {
        summarization: true,
        keywordExtraction: true,
        conceptIdentification: true,
        sentimentAnalysis: true,
        categorization: true,
        tagGeneration: true,
        languages: ['zh', 'en'],
        maxTokens: 4096,
        supportedModels: ['claude-3-sonnet', 'claude-3-haiku'],
      },
      config: {
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20241022',
        temperature: 0.3,
        maxTokens: 2000,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
      },
      isAvailable: !!process.env.ANTHROPIC_API_KEY,
      priority: 2,
    });

    // Zhipu Provider
    this.providers.set('zhipu', {
      name: 'Zhipu AI',
      type: 'zhipu',
      capabilities: {
        summarization: true,
        keywordExtraction: true,
        conceptIdentification: true,
        sentimentAnalysis: true,
        categorization: true,
        tagGeneration: true,
        languages: ['zh', 'en'],
        maxTokens: 4096,
        supportedModels: ['glm-4', 'glm-3-turbo'],
      },
      config: {
        model: process.env.ZHIPU_MODEL || 'glm-4',
        temperature: 0.3,
        maxTokens: 2000,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
      },
      isAvailable: !!process.env.ZHIPU_API_KEY,
      priority: 3,
    });
  }

  /**
   * 分析文本内容
   */
  public async analyzeText(request: TextAnalysisRequest): Promise<TextAnalysisResult> {
    const startTime = Date.now();
    const requestId = request.id || this.generateId();

    try {
      // 检查缓存
      const cacheKey = this.generateCacheKey(request);
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        return { ...cachedResult, id: requestId, requestId };
      }

      // 初始化进度跟踪
      this.updateProgress(requestId, 'preprocessing', 0);

      // 验证请求
      this.validateRequest(request);

      // 选择可用的提供商
      const provider = this.selectProvider();
      if (!provider) {
        throw new AnalysisError('No available AI providers', 'PROVIDER_UNAVAILABLE');
      }

      this.updateProgress(requestId, 'preprocessing', 20);

      // 并行执行各种分析任务
      const results = await this.executeAnalysisTasks(request, provider);

      this.updateProgress(requestId, 'completed', 100);

      // 组装最终结果
      const analysisResult: TextAnalysisResult = {
        id: requestId,
        requestId,
        title: request.title,
        content: request.content,
        ...results,
        processingTime: Date.now() - startTime,
        metadata: {
          model: provider.config.model,
          provider: provider.name,
          tokens: {
            input: 0, // 会在具体任务中计算
            output: 0,
            total: 0,
          },
          cost: {
            currency: 'USD',
            amount: 0, // 会在具体任务中计算
          },
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      // 缓存结果
      this.setCache(cacheKey, analysisResult);

      // 清理进度跟踪
      this.processingRequests.delete(requestId);

      return analysisResult;

    } catch (error) {
      this.processingRequests.delete(requestId);
      throw this.handleError(error, requestId);
    }
  }

  /**
   * 执行分析任务
   */
  private async executeAnalysisTasks(
    request: TextAnalysisRequest,
    provider: AnalysisProvider
  ): Promise<Partial<TextAnalysisResult>> {
    const options = request.options || {};
    const tasks: Promise<any>[] = [];

    // 文本摘要
    if (options.enableSummary !== false) {
      this.updateProgress(request.id!, 'summarization', 30);
      tasks.push(this.generateSummary(request, provider));
    }

    // 关键词提取
    if (options.enableKeywords !== false) {
      this.updateProgress(request.id!, 'keyword_extraction', 50);
      tasks.push(this.extractKeywords(request, provider));
    }

    // 关键概念识别
    if (options.enableKeyConcepts !== false) {
      this.updateProgress(request.id!, 'concept_identification', 60);
      tasks.push(this.identifyKeyConcepts(request, provider));
    }

    // 情感分析
    if (options.enableSentiment !== false) {
      this.updateProgress(request.id!, 'sentiment_analysis', 70);
      tasks.push(this.analyzeSentiment(request, provider));
    }

    // 分类和标签
    if (options.enableCategory !== false || options.enableTags !== false) {
      this.updateProgress(request.id!, 'categorization', 80);
      tasks.push(this.categorizeAndTag(request, provider));
    }

    const results = await Promise.allSettled(tasks);

    // 处理结果
    const partialResult: Partial<TextAnalysisResult> = {};
    let taskIndex = 0;

    if (options.enableSummary !== false) {
      const result = results[taskIndex++];
      if (result.status === 'fulfilled') {
        partialResult.summary = result.value.summary;
      }
    }

    if (options.enableKeywords !== false) {
      const result = results[taskIndex++];
      if (result.status === 'fulfilled') {
        partialResult.keywords = result.value.keywords;
      }
    }

    if (options.enableKeyConcepts !== false) {
      const result = results[taskIndex++];
      if (result.status === 'fulfilled') {
        partialResult.keyConcepts = result.value.keyConcepts;
      }
    }

    if (options.enableSentiment !== false) {
      const result = results[taskIndex++];
      if (result.status === 'fulfilled') {
        partialResult.sentiment = result.value.sentiment;
      }
    }

    if (options.enableCategory !== false || options.enableTags !== false) {
      const result = results[taskIndex];
      if (result.status === 'fulfilled') {
        partialResult.category = result.value.category;
        partialResult.tags = result.value.tags;
        partialResult.confidence = result.value.confidence;
      }
    }

    return partialResult;
  }

  /**
   * 生成文本摘要
   */
  private async generateSummary(request: TextAnalysisRequest, provider: AnalysisProvider): Promise<{ summary: string }> {
    const maxLength = request.options?.maxSummaryLength || 200;
    const language = request.options?.language || 'auto';

    const prompt = this.buildSummaryPrompt(request.title, request.content, maxLength, language);

    try {
      const { text } = await generateText({
        model: this.getProviderModel(provider),
        prompt,
        maxTokens: maxLength * 2, // 为安全起见，生成更多tokens
        temperature: provider.config.temperature || 0.3,
      });

      return { summary: text.trim() };
    } catch (error) {
      console.error('Summary generation failed:', error);
      return { summary: this.generateFallbackSummary(request.content) };
    }
  }

  /**
   * 提取关键词
   */
  private async extractKeywords(request: TextAnalysisRequest, provider: AnalysisProvider): Promise<{ keywords: string[] }> {
    const maxKeywords = request.options?.maxKeywords || 10;

    const prompt = this.buildKeywordPrompt(request.title, request.content, maxKeywords);

    try {
      const { object } = await generateObject({
        model: this.getProviderModel(provider),
        prompt,
        schema: z.object({
          keywords: z.array(z.string()).max(maxKeywords),
        }),
        temperature: provider.config.temperature || 0.2,
      });

      return { keywords: object.keywords };
    } catch (error) {
      console.error('Keyword extraction failed:', error);
      return { keywords: this.extractFallbackKeywords(request.content) };
    }
  }

  /**
   * 识别关键概念
   */
  private async identifyKeyConcepts(request: TextAnalysisRequest, provider: AnalysisProvider): Promise<{ keyConcepts: string[] }> {
    const maxConcepts = request.options?.maxKeyConcepts || 8;

    const prompt = this.buildConceptPrompt(request.title, request.content, maxConcepts);

    try {
      const { object } = await generateObject({
        model: this.getProviderModel(provider),
        prompt,
        schema: z.object({
          keyConcepts: z.array(z.string()).max(maxConcepts),
        }),
        temperature: provider.config.temperature || 0.3,
      });

      return { keyConcepts: object.keyConcepts };
    } catch (error) {
      console.error('Concept identification failed:', error);
      return { keyConcepts: this.extractFallbackConcepts(request.content) };
    }
  }

  /**
   * 分析情感
   */
  private async analyzeSentiment(request: TextAnalysisRequest, provider: AnalysisProvider): Promise<{ sentiment: SentimentAnalysis }> {
    const prompt = this.buildSentimentPrompt(request.title, request.content);

    try {
      const { object } = await generateObject({
        model: this.getProviderModel(provider),
        prompt,
        schema: z.object({
          sentiment: z.enum(['positive', 'neutral', 'negative']),
          score: z.number().min(-1).max(1),
          confidence: z.number().min(0).max(1),
          emotions: z.object({
            joy: z.number().min(0).max(1),
            sadness: z.number().min(0).max(1),
            anger: z.number().min(0).max(1),
            fear: z.number().min(0).max(1),
            surprise: z.number().min(0).max(1),
          }).optional(),
        }),
        temperature: provider.config.temperature || 0.1,
      });

      return { sentiment: object };
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return { sentiment: this.analyzeFallbackSentiment(request.content) };
    }
  }

  /**
   * 分类和标签生成
   */
  private async categorizeAndTag(request: TextAnalysisRequest, provider: AnalysisProvider): Promise<{
    category: string;
    tags: string[];
    confidence: number;
  }> {
    const customCategories = request.options?.customCategories || [];
    const prompt = this.buildCategoryPrompt(request.title, request.content, customCategories);

    try {
      const { object } = await generateObject({
        model: this.getProviderModel(provider),
        prompt,
        schema: z.object({
          category: z.string(),
          tags: z.array(z.string()).max(10),
          confidence: z.number().min(0).max(1),
        }),
        temperature: provider.config.temperature || 0.2,
      });

      return object;
    } catch (error) {
      console.error('Categorization failed:', error);
      return this.categorizeFallback(request.content);
    }
  }

  /**
   * 构建各种提示词
   */
  private buildSummaryPrompt(title: string, content: string, maxLength: number, language: string): string {
    const langInstruction = language === 'zh' ? '请用中文' : language === 'en' ? 'Please use English' : 'Please auto-detect the language and';

    return `${langInstruction}为以下内容生成一个简洁的摘要（不超过${maxLength}个字符）：

标题：${title}

内容：
${content}

要求：
1. 摘要应该简洁明了，抓住核心要点
2. 保持原意不变
3. 语言通顺流畅
4. 字数控制在${maxLength}字符以内

摘要：`;
  }

  private buildKeywordPrompt(title: string, content: string, maxKeywords: number): string {
    return `请从以下文本中提取${maxKeywords}个最重要的关键词：

标题：${title}

内容：
${content}

要求：
1. 关键词应该能够代表文本的核心内容
2. 避免过于宽泛或过于具体的词汇
3. 优先选择专业术语和重要概念
4. 每个关键词应该是2-4个字

请以JSON格式返回：
{
  "keywords": ["关键词1", "关键词2", ...]
}`;
  }

  private buildConceptPrompt(title: string, content: string, maxConcepts: number): string {
    return `请从以下文本中识别出${maxConcepts}个最重要的概念：

标题：${title}

内容：
${content}

要求：
1. 概念应该是文本中讨论的核心思想或理论
2. 可以是技术概念、理论框架、重要观点等
3. 每个概念应该用简洁的短语表达
4. 优先选择对理解文本内容至关重要的概念

请以JSON格式返回：
{
  "keyConcepts": ["概念1", "概念2", ...]
}`;
  }

  private buildSentimentPrompt(title: string, content: string): string {
    return `请分析以下文本的情感倾向：

标题：${title}

内容：
${content}

请从以下维度进行分析：
1. 整体情感（positive/neutral/negative）
2. 情感强度（-1到1的分数）
3. 分析的置信度（0到1）
4. 具体情感（可选）：joy, sadness, anger, fear, surprise的强度

请以JSON格式返回：
{
  "sentiment": "positive|neutral|negative",
  "score": -1.0到1.0,
  "confidence": 0.0到1.0,
  "emotions": {
    "joy": 0.0到1.0,
    "sadness": 0.0到1.0,
    "anger": 0.0到1.0,
    "fear": 0.0到1.0,
    "surprise": 0.0到1.0
  }
}`;
  }

  private buildCategoryPrompt(title: string, content: string, customCategories: string[]): string {
    const categoryList = customCategories.length > 0
      ? customCategories.join(', ')
      : '技术, 商业, 教育, 生活, 科学, 艺术, 健康, 金融, 娱乐, 其他';

    return `请为以下文本进行分类并生成相关标签：

标题：${title}

内容：
${content}

可用分类：${categoryList}

要求：
1. 选择最合适的分类
2. 生成3-8个相关标签
3. 评估分类的置信度（0-1）
4. 标签应该准确反映内容特点

请以JSON格式返回：
{
  "category": "选择的分类",
  "tags": ["标签1", "标签2", ...],
  "confidence": 0.0到1.0
}`;
  }

  /**
   * 后备方法（当AI服务不可用时）
   */
  private generateFallbackSummary(content: string): string {
    const sentences = content.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return '';

    // 取前几句作为摘要
    const summarySentences = sentences.slice(0, 3);
    return summarySentences.join('。') + '。';
  }

  private extractFallbackKeywords(content: string): string[] {
    // 简单的关键词提取：基于词频和常见停用词
    const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '他', '她', '它', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);

    const words = content.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];
    const wordFreq = new Map<string, number>();

    words.forEach(word => {
      if (word.length > 1 && !stopWords.has(word.toLowerCase())) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private extractFallbackConcepts(content: string): string[] {
    // 简单的概念识别：寻找较长的词汇和术语
    const concepts = content.match(/[\u4e00-\u9fa5]{4,}|[a-zA-Z]{6,}/g) || [];
    const uniqueConcepts = [...new Set(concepts)];
    return uniqueConcepts.slice(0, 8);
  }

  private analyzeFallbackSentiment(content: string): SentimentAnalysis {
    // 简单的情感分析：基于积极和消极词汇
    const positiveWords = ['好', '棒', '优秀', '成功', '喜欢', '快乐', 'good', 'great', 'excellent', 'success', 'love', 'happy'];
    const negativeWords = ['坏', '差', '失败', '问题', '困难', '讨厌', '悲伤', 'bad', 'poor', 'fail', 'problem', 'difficult', 'hate', 'sad'];

    const words = content.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    });

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) {
      return {
        label: 'neutral',
        score: 0,
        confidence: 0.5,
      };
    }

    const score = (positiveCount - negativeCount) / Math.max(words.length / 100, 1);
    const label = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';
    const confidence = Math.min(totalSentimentWords / 10, 1);

    return {
      label: label as 'positive' | 'neutral' | 'negative',
      score: Math.max(-1, Math.min(1, score)),
      confidence,
    };
  }

  private categorizeFallback(content: string): { category: string; tags: string[]; confidence: number } {
    // 简单的基于关键词的分类
    const categoryKeywords = {
      '技术': ['代码', '编程', '开发', '软件', '系统', '算法', 'code', 'programming', 'development', 'software'],
      '商业': ['市场', '销售', '客户', '产品', '服务', '业务', 'market', 'sales', 'customer', 'business'],
      '教育': ['学习', '教学', '课程', '知识', '技能', '教育', 'learn', 'teach', 'course', 'knowledge'],
      '生活': ['生活', '日常', '家庭', '朋友', '健康', '运动', 'life', 'daily', 'family', 'health'],
    };

    const contentLower = content.toLowerCase();
    let bestCategory = '其他';
    let maxScore = 0;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const score = keywords.reduce((count, keyword) => {
        return count + (contentLower.includes(keyword) ? 1 : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    const tags = this.extractFallbackKeywords(content).slice(0, 5);
    const confidence = maxScore > 0 ? Math.min(maxScore / 5, 1) : 0.3;

    return {
      category: bestCategory,
      tags,
      confidence,
    };
  }

  /**
   * 工具方法
   */
  private selectProvider(): AnalysisProvider | null {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.isAvailable)
      .sort((a, b) => a.priority - b.priority);

    return availableProviders[0] || null;
  }

  private getProviderModel(provider: AnalysisProvider): any {
    switch (provider.type) {
      case 'openai':
        return openai(provider.config.model);
      case 'anthropic':
        return anthropic(provider.config.model);
      case 'zhipu':
        // 需要集成智谱AI的SDK
        throw new Error('Zhipu AI provider not implemented yet');
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }

  private validateRequest(request: TextAnalysisRequest): void {
    if (!request.title && !request.content) {
      throw new AnalysisError('Title or content is required', 'INVALID_REQUEST');
    }

    const totalLength = (request.title || '').length + (request.content || '').length;
    if (totalLength > 50000) {
      throw new AnalysisError('Content too long', 'CONTENT_TOO_LONG');
    }

    if (totalLength < 10) {
      throw new AnalysisError('Content too short', 'CONTENT_TOO_SHORT');
    }
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  private generateCacheKey(request: TextAnalysisRequest): string {
    const content = `${request.title}|${request.content}|${JSON.stringify(request.options)}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private updateProgress(requestId: string, stage: AnalysisStage, progress: number, message?: string): void {
    const progressData: AnalysisProgress = {
      id: requestId,
      stage,
      progress,
      message,
      estimatedTimeRemaining: undefined,
    };

    this.processingRequests.set(requestId, progressData);
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      cached.hitCount = (cached.hitCount || 0) + 1;
      cached.lastAccessed = new Date().toISOString();
      return cached.result;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, result: any): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hitCount: 0,
      lastAccessed: new Date().toISOString(),
    });

    // 清理过期缓存
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  private handleError(error: any, requestId?: string): AnalysisError {
    if (error instanceof AnalysisError) {
      return error;
    }

    let code: AnalysisErrorCode = 'INTERNAL_ERROR';
    let retryable = false;
    let suggestedAction: string | undefined;

    if (error.message?.includes('rate limit')) {
      code = 'RATE_LIMIT_EXCEEDED';
      retryable = true;
      suggestedAction = 'Please try again later';
    } else if (error.message?.includes('quota')) {
      code = 'QUOTA_EXCEEDED';
      retryable = false;
      suggestedAction = 'Please check your account balance';
    } else if (error.message?.includes('timeout')) {
      code = 'TIMEOUT';
      retryable = true;
      suggestedAction = 'Please try again with shorter content';
    }

    const analysisError = new AnalysisError(
      error.message || 'Unknown error occurred',
      code,
      requestId
    ) as AnalysisError;

    analysisError.retryable = retryable;
    analysisError.suggestedAction = suggestedAction;

    return analysisError;
  }

  /**
   * 公共API方法
   */
  public getProgress(requestId: string): AnalysisProgress | null {
    return this.processingRequests.get(requestId) || null;
  }

  public getAvailableProviders(): AnalysisProvider[] {
    return Array.from(this.providers.values()).filter(p => p.isAvailable);
  }

  public getStatistics(): any {
    return {
      cacheSize: this.cache.size,
      activeRequests: this.processingRequests.size,
      availableProviders: this.getAvailableProviders().length,
    };
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

// 创建并导出单例实例
export const textAnalysisService = TextAnalysisService.getInstance();

// 自定义错误类
class AnalysisError extends Error {
  constructor(
    message: string,
    public code: AnalysisErrorCode,
    public requestId?: string
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}