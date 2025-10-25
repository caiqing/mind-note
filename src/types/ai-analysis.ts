// AI分析服务相关类型定义

export interface AnalysisRequest {
  noteId: string;
  content: string;
  title?: string;
  userId: string;
  options?: AnalysisOptions;
}

export interface AnalysisOptions {
  generateSummary?: boolean;
  extractKeywords?: boolean;
  classifyContent?: boolean;
  analyzeSentiment?: boolean;
  extractKeyConcepts?: boolean;
  generateTags?: boolean;
  provider?: string;
  model?: string;
  maxTokens?: number;
}

export interface AnalysisResult {
  noteId: string;
  userId: string;
  provider: string;
  model: string;
  processingTime: number;
  cost: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  results: {
    summary?: string;
    keywords?: string[];
    classification?: ClassificationResult;
    sentiment?: SentimentResult;
    keyConcepts?: string[];
    tags?: string[];
  };
  metadata: {
    confidence: number;
    processedAt: Date;
    requestId: string;
    version: string;
  };
}

export interface ClassificationResult {
  category: string;
  subcategory?: string;
  confidence: number;
  reasoning: string;
  alternatives: Array<{
    category: string;
    confidence: number;
  }>;
}

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  score: number; // -1 to 1
  reasoning: string;
}

export interface KeywordExtraction {
  keyword: string;
  relevance: number;
  category?: string;
}

export interface KeyConcept {
  concept: string;
  importance: number;
  context: string;
  relatedConcepts: string[];
}

export interface AnalysisProvider {
  name: string;
  analyze(request: AnalysisRequest): Promise<AnalysisResult>;
  generateSummary(content: string): Promise<string>;
  extractKeywords(content: string): Promise<string[]>;
  classifyContent(content: string): Promise<ClassificationResult>;
  analyzeSentiment(content: string): Promise<SentimentResult>;
  extractKeyConcepts(content: string): Promise<KeyConcept[]>;
  generateTags(content: string): Promise<string[]>;
}

export interface AIServiceConfig {
  providers: ProviderConfig[];
  fallbackOrder: string[];
  costLimits: {
    maxCostPerNote: number;
    maxCostPerUser: number;
    maxCostPerDay: number;
  };
  performance: {
    maxProcessingTime: number;
    retryAttempts: number;
    timeoutMs: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
}

export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseURL?: string;
  models: ModelConfig[];
  enabled: boolean;
  priority: number;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface ModelConfig {
  name: string;
  maxTokens: number;
  costPerToken: number;
  capabilities: ModelCapabilities;
  optimizedFor?: string[];
}

export interface ModelCapabilities {
  summarization: boolean;
  classification: boolean;
  sentiment: boolean;
  keywordExtraction: boolean;
  conceptExtraction: boolean;
  tagGeneration: boolean;
}

export interface ProcessingLog {
  id: string;
  noteId: string;
  userId: string;
  provider: string;
  model: string;
  processingType: string;
  inputTokens: number;
  outputTokens: number;
  processingTime: number;
  cost: number;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  result?: any;
  createdAt: Date;
}

export interface UserUsageStats {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  averageProcessingTime: number;
  breakdown: {
    byProvider: Record<string, {
      requests: number;
      cost: number;
      tokens: number;
    }>;
    byFeature: Record<string, {
      requests: number;
      cost: number;
      tokens: number;
    }>;
  };
}

// 预定义的分析类型
export const ANALYSIS_TYPES = {
  SUMMARIZATION: 'summarization',
  CLASSIFICATION: 'classification',
  SENTIMENT: 'sentiment',
  KEYWORDS: 'keywords',
  CONCEPTS: 'concepts',
  TAGS: 'tags',
  FULL: 'full',
} as const;

export type AnalysisType = typeof ANALYSIS_TYPES[keyof typeof ANALYSIS_TYPES];

// 预定义的情感阈值
export const SENTIMENT_THRESHOLDS = {
  POSITIVE: 0.1,
  NEGATIVE: -0.1,
  HIGH_CONFIDENCE: 0.8,
  MEDIUM_CONFIDENCE: 0.6,
} as const;

// 预定义的分类类别
export const CONTENT_CATEGORIES = {
  TECHNOLOGY: 'technology',
  BUSINESS: 'business',
  EDUCATION: 'education',
  LIFESTYLE: 'lifestyle',
  CREATIVE: 'creative',
  PERSONAL: 'personal',
  OTHER: 'other',
} as const;

export type ContentCategory = typeof CONTENT_CATEGORIES[keyof typeof CONTENT_CATEGORIES];