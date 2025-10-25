/**
 * 情感分析服务 - T103.5
 * 统一的情感分析服务，支持多AI提供商和智能算法
 */

import { AnalysisProvider } from '@/types/ai-analysis';
import { createOpenAIProviderV2 } from '../providers/openai-provider-v2';
import { createClaudeProvider } from '../providers/claude-provider';
import { aiConfig } from '../ai-config';

export interface SentimentRequest {
  content: string;
  language?: 'zh' | 'en';
  detailLevel?: 'basic' | 'detailed' | 'comprehensive';
  includeEmotions?: boolean;
  includeConfidence?: boolean;
  preferredProvider?: string;
  userId: string;
}

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  polarity: number; // -1 到 1
  confidence: number; // 0 到 1
  intensity: number; // 0 到 1
  emotions?: EmotionAnalysis[];
  aspects?: AspectSentiment[];
  provider: string;
  model: string;
  processingTime: number;
  cost: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  metadata: {
    requestId: string;
    processedAt: Date;
    version: string;
    algorithm: string;
    language: string;
    detailLevel: string;
  };
}

export interface EmotionAnalysis {
  emotion: string; // joy, anger, fear, sadness, surprise, disgust, trust, anticipation
  intensity: number; // 0 到 1
  confidence: number; // 0 到 1
  triggers: string[]; // 触发该情感的关键词或短语
}

export interface AspectSentiment {
  aspect: string; // 方面/主题
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  keywords: string[];
  context: string;
}

export class SentimentService {
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
      console.log('✅ OpenAI provider initialized for sentiment analysis');
    } catch (error) {
      console.warn('⚠️ OpenAI provider not available for sentiment analysis:', error);
    }

    try {
      const claudeProvider = createClaudeProvider();
      this.providers.set('anthropic', claudeProvider);
      console.log('✅ Claude provider initialized for sentiment analysis');
    } catch (error) {
      console.warn('⚠️ Claude provider not available for sentiment analysis:', error);
    }

    // 设置fallback顺序
    this.fallbackOrder = aiConfig.getFallbackOrder().filter(provider =>
      this.providers.has(provider)
    );

    if (this.fallbackOrder.length === 0) {
      throw new Error('No AI providers available for sentiment analysis');
    }

    console.log(`📋 Available providers for sentiment analysis: ${this.fallbackOrder.join(', ')}`);
  }

  async analyzeSentiment(request: SentimentRequest): Promise<SentimentResult> {
    const requestId = `sentiment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`💭 Analyzing sentiment (Request: ${requestId})`);
    console.log(`Content length: ${request.content.length} characters`);
    console.log(`Detail level: ${request.detailLevel || 'basic'}`);
    console.log(`Include emotions: ${request.includeEmotions || false}`);

    let lastError: Error | null = null;

    // 尝试按优先级顺序使用提供商
    const providersToTry = request.preferredProvider && this.providers.has(request.preferredProvider)
      ? [request.preferredProvider, ...this.fallbackOrder.filter(p => p !== request.preferredProvider)]
      : this.fallbackOrder;

    for (const providerName of providersToTry) {
      try {
        console.log(`🔄 Trying sentiment analysis with provider: ${providerName}`);

        const provider = this.providers.get(providerName)!;
        const result = await this.analyzeSentimentWithProvider(provider, request, requestId);

        console.log(`✅ Sentiment analysis completed with ${providerName}`);
        return result;

      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Provider ${providerName} failed for sentiment analysis:`, error);

        // 如果不是最后一个提供商，继续尝试下一个
        if (providersToTry.indexOf(providerName) < providersToTry.length - 1) {
          console.log(`🔄 Falling back to next provider...`);
          continue;
        }
      }
    }

    // 所有提供商都失败了
    throw new Error(`All providers failed to analyze sentiment. Last error: ${lastError?.message}`);
  }

  private async analyzeSentimentWithProvider(
    provider: AnalysisProvider,
    request: SentimentRequest,
    requestId: string
  ): Promise<SentimentResult> {
    const startTime = Date.now();

    // 构建提示模板
    const prompt = this.buildPrompt(request);

    // 分析情感
    const rawSentiment = await provider.analyzeSentiment(prompt);

    const processingTime = Date.now() - startTime;

    // 后处理和结构化
    const processedResult = this.processSentimentResult(rawSentiment, request);

    // 计算置信度和强度
    const confidence = this.calculateConfidence(processedResult, request);
    const intensity = this.calculateIntensity(processedResult, request);

    // 提取情感分析（如果需要）
    let emotions: EmotionAnalysis[] | undefined;
    if (request.includeEmotions) {
      emotions = await this.extractEmotions(provider, request.content, request.language || 'zh');
    }

    // 提取方面情感（详细分析）
    let aspects: AspectSentiment[] | undefined;
    if (request.detailLevel === 'comprehensive') {
      aspects = await this.extractAspectSentiments(provider, request.content, request.language || 'zh');
    }

    // 估算成本
    const inputTokens = this.estimateTokens(prompt);
    const outputTokens = this.estimateTokens(JSON.stringify(rawSentiment));
    let cost = 0;
    try {
      cost = aiConfig.calculateCost(provider.name, this.getModelName(provider), inputTokens, outputTokens);
    } catch (error) {
      // 如果成本计算失败，使用默认成本估算
      cost = ((inputTokens + outputTokens) / 1000) * 0.0001; // 默认费率
    }

    return {
      sentiment: processedResult.sentiment,
      polarity: processedResult.polarity,
      confidence,
      intensity,
      emotions,
      aspects,
      provider: provider.name,
      model: this.getModelName(provider),
      processingTime,
      cost,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      metadata: {
        requestId,
        processedAt: new Date(),
        version: '1.0.0',
        algorithm: `ai-${provider.name}-sentiment`,
        language: request.language || 'zh',
        detailLevel: request.detailLevel || 'basic',
      },
    };
  }

  private buildPrompt(request: SentimentRequest): string {
    const {
      content,
      language = 'zh',
      detailLevel = 'basic',
      includeEmotions = false,
      includeConfidence = true,
    } = request;

    let prompt = '';

    if (language === 'zh') {
      prompt = `请分析以下文本的情感倾向：\n\n"${content}"\n\n`;

      if (detailLevel === 'basic') {
        prompt += `请返回JSON格式的分析结果：
{
  "sentiment": "positive/negative/neutral",
  "polarity": -1到1的数值（负数表示负面，正数表示正面，0表示中性）,
  "confidence": 0到1的置信度
}`;
      } else if (detailLevel === 'detailed') {
        prompt += `请返回详细的分析结果：
{
  "sentiment": "positive/negative/neutral",
  "polarity": -1到1的数值,
  "confidence": 0到1的置信度,
  "reasoning": "分析理由",
  "keyPhrases": ["影响情感判断的关键短语"]
}`;
      } else if (detailLevel === 'comprehensive') {
        prompt += `请返回全面的分析结果：
{
  "sentiment": "positive/negative/neutral",
  "polarity": -1到1的数值,
  "confidence": 0到1的置信度,
  "reasoning": "详细分析理由",
  "keyPhrases": ["影响情感判断的关键短语"],
  "emotionalWords": ["情感词汇"],
  "intensity": 0到1的情感强度
}`;
      }

      if (includeEmotions) {
        prompt += `\n\n另外请识别主要情感（最多3个）：
{
  "emotions": [
    {
      "emotion": "joy/anger/fear/sadness/surprise/disgust/trust/anticipation",
      "intensity": 0到1的强度
    }
  ]
}`;
      }
    } else {
      // 英文提示
      prompt = `Please analyze the sentiment of the following text:\n\n"${content}"\n\n`;

      if (detailLevel === 'basic') {
        prompt += `Please return the analysis in JSON format:
{
  "sentiment": "positive/negative/neutral",
  "polarity": number between -1 and 1,
  "confidence": number between 0 and 1
}`;
      } else if (detailLevel === 'detailed') {
        prompt += `Please return detailed analysis in JSON format:
{
  "sentiment": "positive/negative/neutral",
  "polarity": number between -1 and 1,
  "confidence": number between 0 and 1,
  "reasoning": "analysis reasoning",
  "keyPhrases": ["key phrases affecting sentiment"]
}`;
      } else if (detailLevel === 'comprehensive') {
        prompt += `Please return comprehensive analysis in JSON format:
{
  "sentiment": "positive/negative/neutral",
  "polarity": number between -1 and 1,
  "confidence": number between 0 and 1,
  "reasoning": "detailed analysis reasoning",
  "keyPhrases": ["key phrases affecting sentiment"],
  "emotionalWords": ["emotional words"],
  "intensity": number between 0 and 1
}`;
      }

      if (includeEmotions) {
        prompt += `\n\nAlso identify primary emotions (max 3):
{
  "emotions": [
    {
      "emotion": "joy/anger/fear/sadness/surprise/disgust/trust/anticipation",
      "intensity": number between 0 and 1
    }
  ]
}`;
      }
    }

    return prompt;
  }

  private processSentimentResult(rawResult: any, request: SentimentRequest): {
    sentiment: 'positive' | 'negative' | 'neutral';
    polarity: number;
    confidence: number;
    reasoning?: string;
    keyPhrases?: string[];
    emotionalWords?: string[];
    intensity?: number;
  } {
    // 尝试解析JSON结果
    let parsed = rawResult;
    if (typeof rawResult === 'string') {
      try {
        parsed = JSON.parse(rawResult);
      } catch (e) {
        // 如果解析失败，使用文本分析
        parsed = this.parseTextSentiment(rawResult, request.language || 'zh');
      }
    }

    // 标准化结果
    return {
      sentiment: this.normalizeSentiment(parsed.sentiment),
      polarity: this.normalizePolarity(parsed.polarity),
      confidence: this.normalizeConfidence(parsed.confidence),
      reasoning: parsed.reasoning,
      keyPhrases: parsed.keyPhrases || [],
      emotionalWords: parsed.emotionalWords || [],
      intensity: parsed.intensity,
    };
  }

  private normalizeSentiment(sentiment: any): 'positive' | 'negative' | 'neutral' {
    if (typeof sentiment !== 'string') {
      return 'neutral';
    }

    const s = sentiment.toLowerCase().trim();
    if (s.includes('positive') || s.includes('正面') || s.includes('积极')) {
      return 'positive';
    } else if (s.includes('negative') || s.includes('负面') || s.includes('消极')) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }

  private normalizePolarity(polarity: any): number {
    const num = Number(polarity);
    if (isNaN(num)) {
      return 0;
    }
    return Math.max(-1, Math.min(1, num));
  }

  private normalizeConfidence(confidence: any): number {
    const num = Number(confidence);
    if (isNaN(num)) {
      return 0.5;
    }
    return Math.max(0, Math.min(1, num));
  }

  private parseTextSentiment(text: string, language: string): any {
    // 简单的文本情感解析逻辑
    const positiveWords = language === 'zh'
      ? ['好', '棒', '优秀', '喜欢', '满意', '开心', '快乐', '高兴', '赞']
      : ['good', 'great', 'excellent', 'like', 'happy', 'joy', 'wonderful', 'amazing'];

    const negativeWords = language === 'zh'
      ? ['差', '坏', '糟糕', '讨厌', '不满', '难过', '失望', '愤怒', '垃圾']
      : ['bad', 'terrible', 'awful', 'hate', 'sad', 'disappointed', 'angry', 'garbage'];

    const textLower = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (textLower.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (textLower.includes(word)) negativeCount++;
    });

    const totalWords = positiveCount + negativeCount;
    if (totalWords === 0) {
      return { sentiment: 'neutral', polarity: 0, confidence: 0.5 };
    }

    const sentiment = positiveCount > negativeCount ? 'positive' :
                     negativeCount > positiveCount ? 'negative' : 'neutral';
    const polarity = (positiveCount - negativeCount) / Math.max(totalWords, 1);
    const confidence = Math.min(totalWords / 5, 1); // 最多5个词达到完全置信

    return { sentiment, polarity, confidence };
  }

  private calculateConfidence(processedResult: any, request: SentimentRequest): number {
    // 基于多个因素计算置信度
    let confidence = processedResult.confidence || 0.5;

    // 基于内容长度调整
    const contentLength = request.content.length;
    if (contentLength < 10) {
      confidence *= 0.7; // 短文本置信度较低
    } else if (contentLength > 100) {
      confidence *= 1.1; // 长文本置信度较高
    }

    // 基于关键词数量调整
    if (processedResult.keyPhrases && processedResult.keyPhrases.length > 0) {
      confidence *= 1.05;
    }

    return Math.min(1, confidence);
  }

  private calculateIntensity(processedResult: any, request: SentimentRequest): number {
    // 计算情感强度
    let intensity = 0.5; // 基础强度

    // 基于极性值
    if (processedResult.polarity) {
      intensity = Math.abs(processedResult.polarity);
    }

    // 基于情感词汇数量
    if (processedResult.emotionalWords && processedResult.emotionalWords.length > 0) {
      intensity = Math.min(1, intensity + (processedResult.emotionalWords.length * 0.1));
    }

    // 基于推理详细程度
    if (processedResult.reasoning && processedResult.reasoning.length > 50) {
      intensity = Math.min(1, intensity + 0.1);
    }

    return intensity;
  }

  private async extractEmotions(
    provider: AnalysisProvider,
    content: string,
    language: string
  ): Promise<EmotionAnalysis[]> {
    const emotionPrompt = language === 'zh'
      ? `请分析以下文本中的主要情感（最多3个）：\n\n"${content}"\n\n返回JSON格式：
{
  "emotions": [
    {
      "emotion": "joy/anger/fear/sadness/surprise/disgust/trust/anticipation",
      "intensity": 0到1的强度,
      "triggers": ["触发该情感的关键词"]
    }
  ]
}`
      : `Please analyze the primary emotions in the following text (max 3):\n\n"${content}"\n\nReturn in JSON format:
{
  "emotions": [
    {
      "emotion": "joy/anger/fear/sadness/surprise/disgust/trust/anticipation",
      "intensity": number between 0 and 1,
      "triggers": ["trigger keywords for this emotion"]
    }
  ]
}`;

    try {
      const result = await provider.analyzeSentiment(emotionPrompt);
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;

      return (parsed.emotions || []).map((emotion: any) => ({
        emotion: emotion.emotion,
        intensity: Math.max(0, Math.min(1, Number(emotion.intensity) || 0.5)),
        confidence: 0.8, // 默认置信度
        triggers: emotion.triggers || [],
      }));
    } catch (error) {
      console.warn('Failed to extract emotions:', error);
      return [];
    }
  }

  private async extractAspectSentiments(
    provider: AnalysisProvider,
    content: string,
    language: string
  ): Promise<AspectSentiment[]> {
    const aspectPrompt = language === 'zh'
      ? `请分析以下文本中不同方面的情感倾向：\n\n"${content}"\n\n返回JSON格式：
{
  "aspects": [
    {
      "aspect": "方面名称",
      "sentiment": "positive/negative/neutral",
      "confidence": 0到1的置信度,
      "keywords": ["相关关键词"],
      "context": "相关上下文"
    }
  ]
}`
      : `Please analyze aspect-based sentiments in the following text:\n\n"${content}"\n\nReturn in JSON format:
{
  "aspects": [
    {
      "aspect": "aspect name",
      "sentiment": "positive/negative/neutral",
      "confidence": number between 0 and 1,
      "keywords": ["relevant keywords"],
      "context": "relevant context"
    }
  ]
}`;

    try {
      const result = await provider.analyzeSentiment(aspectPrompt);
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;

      return (parsed.aspects || []).map((aspect: any) => ({
        aspect: aspect.aspect,
        sentiment: this.normalizeSentiment(aspect.sentiment),
        confidence: this.normalizeConfidence(aspect.confidence),
        keywords: aspect.keywords || [],
        context: aspect.context || '',
      }));
    } catch (error) {
      console.warn('Failed to extract aspect sentiments:', error);
      return [];
    }
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

  // 批量情感分析
  async analyzeBatchSentiments(requests: SentimentRequest[]): Promise<SentimentResult[]> {
    console.log(`📦 Processing ${requests.length} sentiment analysis requests...`);

    const results: SentimentResult[] = [];
    const batchSize = 3; // 控制并发数

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requests.length / batchSize)}`);

      const batchPromises = batch.map(request =>
        this.analyzeSentiment(request).catch(error => {
          console.error(`❌ Failed to analyze sentiment for content:`, error);
          return null;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null) as SentimentResult[]);
    }

    console.log(`✅ Batch processing completed. ${results.length}/${requests.length} analyses completed.`);
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
    supportedDetailLevels: string[];
    supportedEmotions: string[];
  } {
    return {
      totalProviders: this.providers.size,
      availableProviders: this.getAvailableProviders().length,
      fallbackOrder: this.fallbackOrder,
      supportedLanguages: ['zh', 'en'],
      supportedDetailLevels: ['basic', 'detailed', 'comprehensive'],
      supportedEmotions: ['joy', 'anger', 'fear', 'sadness', 'surprise', 'disgust', 'trust', 'anticipation'],
    };
  }
}

// 单例实例
export const sentimentService = new SentimentService();

// 工厂函数
export function createSentimentService(): SentimentService {
  return new SentimentService();
}