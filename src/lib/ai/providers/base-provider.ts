/**
 * AI服务提供商基础接口
 */

export interface AIRequest {
  content: string;
  context?: string;
  language?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  success: boolean;
  content: string;
  provider: string;
  model: string;
  tokensUsed: TokenUsage;
  cost: number;
  responseTime: number;
  timestamp: string;
  error?: AIError;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface AIError {
  code: string;
  message: string;
  details?: any;
}

export interface CategoryRequest extends AIRequest {
  existingCategories?: string[];
  maxCategories?: number;
  confidence?: number;
}

export interface CategoryResponse {
  categories: CategoryPrediction[];
  primaryCategory: CategoryPrediction;
  confidence: number;
  reasoning?: string;
}

export interface CategoryPrediction {
  name: string;
  confidence: number;
  reasoning?: string;
  suggestions?: string[];
}

export interface TagRequest extends AIRequest {
  existingTags?: string[];
  maxTags?: number;
  tagTypes?: TagType[];
  language?: string;
}

export enum TagType {
  TOPIC = 'topic',
  PRIORITY = 'priority',
  STATUS = 'status',
  EMOTION = 'emotion',
  CUSTOM = 'custom',
}

export interface TagResponse {
  tags: TagPrediction[];
  confidence: number;
  reasoning?: string;
}

export interface TagPrediction {
  name: string;
  type: TagType;
  confidence: number;
  relevance: number;
  suggestions?: string[];
}

export interface SummaryRequest extends AIRequest {
  maxLength?: number;
  style?: SummaryStyle;
  focus?: string[];
  language?: string;
}

export enum SummaryStyle {
  BULLET = 'bullet',
  PARAGRAPH = 'paragraph',
  KEY_POINTS = 'key_points',
}

export interface SummaryResponse {
  summary: string;
  style: SummaryStyle;
  length: number;
  confidence: number;
  keyPoints?: string[];
  actionItems?: string[];
}

export interface ModelInfo {
  name: string;
  maxTokens: number;
  supportedOperations: string[];
  costPerToken: {
    input: number;
    output: number;
  };
}

/**
 * AI服务提供商基础接口
 */
export abstract class BaseAIProvider {
  protected name: string;
  protected provider: string;
  protected apiKey: string;
  protected baseURL: string;
  protected model: string;

  constructor(
    name: string,
    provider: string,
    apiKey: string,
    baseURL: string,
    model: string,
  ) {
    this.name = name;
    this.provider = provider;
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.model = model;
  }

  // 基础方法
  abstract isAvailable(): Promise<boolean>;
  abstract getModelInfo(): ModelInfo;

  // 核心分析功能
  abstract generateResponse(request: AIRequest): Promise<AIResponse>;
  abstract generateCategories(content: string): Promise<CategoryResponse>;
  abstract generateTags(
    content: string,
    options?: TagRequest,
  ): Promise<TagResponse>;
  abstract generateSummary(
    content: string,
    options?: SummaryRequest,
  ): Promise<SummaryResponse>;

  // 扩展功能
  abstract extractKeywords(content: string): Promise<KeywordResponse>;
  abstract detectLanguage(content: string): Promise<LanguageResponse>;
  abstract analyzeSentiment(content: string): Promise<SentimentResponse>;

  // 工具方法
  protected calculateTokenUsage(input: string, output: string): TokenUsage {
    const inputTokens = this.estimateTokens(input);
    const outputTokens = this.estimateTokens(output);

    return {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens,
    };
  }

  protected estimateTokens(text: string): number {
    // 简单的token估算：大约4个字符=1个token
    // 这是一个粗略估计，实际实现中应该使用tokenizer
    return Math.ceil(text.length / 4);
  }

  protected calculateCost(tokensUsed: TokenUsage): number {
    const modelInfo = this.getModelInfo();
    return (
      tokensUsed.input * modelInfo.costPerToken.input +
      tokensUsed.output * modelInfo.costPerToken.output
    );
  }

  protected createAIResponse(
    content: string,
    tokensUsed: TokenUsage,
    responseTime: number,
    error?: AIError,
  ): AIResponse {
    return {
      success: !error,
      content,
      provider: this.provider,
      model: this.model,
      tokensUsed,
      cost: this.calculateCost(tokensUsed),
      responseTime,
      timestamp: new Date().toISOString(),
      error,
    };
  }

  protected createError(error: Error): AIError {
    return {
      code: 'PROCESSING_ERROR',
      message: error.message,
      details: error,
    };
  }
}

// 其他接口定义
export interface KeywordRequest extends AIRequest {
  maxKeywords?: number;
  importance?: 'all' | 'high' | 'medium' | 'low';
  includePhrases?: boolean;
  language?: string;
}

export interface KeywordResponse {
  keywords: KeywordPrediction[];
  confidence: number;
  language: string;
}

export interface KeywordPrediction {
  word: string;
  score: number;
  frequency: number;
  type: 'single' | 'phrase' | 'entity';
  context?: string;
}

export interface LanguageResponse {
  language: string;
  confidence: number;
  detectedLanguage: string;
}

export interface SentimentRequest extends AIRequest {
  granularity?: 'document' | 'sentence' | 'aspect';
  emotions?: boolean;
  language?: string;
}

export interface SentimentResponse {
  sentiment: SentimentResult;
  emotions?: EmotionResult[];
  confidence: number;
  language: string;
}

export interface SentimentResult {
  polarity: 'positive' | 'negative' | 'neutral';
  score: number;
  magnitude: number;
}

export interface EmotionResult {
  emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust';
  score: number;
}
