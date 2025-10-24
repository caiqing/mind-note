/**
 * 文本分析类型定义
 *
 * 定义文本分析相关的接口和类型
 */

export interface TextAnalysisRequest {
  id?: string;
  title: string;
  content: string;
  userId: string;
  options?: TextAnalysisOptions;
}

export interface TextAnalysisOptions {
  enableSummary?: boolean;
  enableKeywords?: boolean;
  enableKeyConcepts?: boolean;
  enableSentiment?: boolean;
  enableCategory?: boolean;
  enableTags?: boolean;
  maxSummaryLength?: number;
  maxKeywords?: number;
  maxKeyConcepts?: number;
  language?: 'zh' | 'en' | 'auto';
  customCategories?: string[];
}

export interface TextAnalysisResult {
  id: string;
  requestId: string;
  title: string;
  content: string;
  summary?: string;
  keywords?: string[];
  keyConcepts?: string[];
  sentiment?: SentimentAnalysis;
  category?: string;
  confidence?: number;
  tags?: string[];
  language?: string;
  processingTime?: number;
  metadata?: AnalysisMetadata;
}

export interface SentimentAnalysis {
  label: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  emotions?: {
    joy?: number;
    sadness?: number;
    anger?: number;
    fear?: number;
    surprise?: number;
  };
}

export interface AnalysisMetadata {
  model: string;
  provider: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: {
    currency: string;
    amount: number;
  };
  processingTime: number;
  timestamp: string;
  version: string;
}

export interface AnalysisProgress {
  id: string;
  stage: AnalysisStage;
  progress: number; // 0-100
  message?: string;
  error?: string;
  estimatedTimeRemaining?: number;
}

export type AnalysisStage =
  | 'preprocessing'
  | 'summarization'
  | 'keyword_extraction'
  | 'concept_identification'
  | 'sentiment_analysis'
  | 'categorization'
  | 'tag_generation'
  | 'completed'
  | 'failed';

export interface AnalysisTemplate {
  id: string;
  name: string;
  description: string;
  options: TextAnalysisOptions;
  category: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisStatistics {
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  averageProcessingTime: number;
  totalCost: number;
  averageConfidence: number;
  mostCommonCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  languageDistribution: Array<{
    language: string;
    count: number;
    percentage: number;
  }>;
  sentimentDistribution: Array<{
    sentiment: string;
    count: number;
    percentage: number;
  }>;
}

export interface AnalysisBatchRequest {
  id: string;
  userId: string;
  requests: TextAnalysisRequest[];
  options?: TextAnalysisOptions;
  priority?: 'low' | 'normal' | 'high';
  notifyOnCompletion?: boolean;
}

export interface AnalysisBatchResult {
  id: string;
  batchId: string;
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  results: TextAnalysisResult[];
  errors: Array<{
    requestId: string;
    error: string;
  }>;
  startTime: string;
  endTime?: string;
  totalCost: number;
  totalProcessingTime: number;
}

export interface AnalysisCacheEntry {
  id: string;
  contentHash: string;
  result: TextAnalysisResult;
  createdAt: string;
  expiresAt: string;
  hitCount: number;
  lastAccessed: string;
}

export interface AnalysisQueueItem {
  id: string;
  request: TextAnalysisRequest;
  priority: number;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
}

export interface AnalysisProvider {
  name: string;
  type: 'openai' | 'anthropic' | 'zhipu' | 'ollama' | 'custom';
  capabilities: AnalysisCapabilities;
  config: ProviderConfig;
  isAvailable: boolean;
  priority: number;
  rateLimit?: RateLimit;
}

export interface AnalysisCapabilities {
  summarization: boolean;
  keywordExtraction: boolean;
  conceptIdentification: boolean;
  sentimentAnalysis: boolean;
  categorization: boolean;
  tagGeneration: boolean;
  languages: string[];
  maxTokens: number;
  supportedModels: string[];
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  tokensPerMinute: number;
  tokensPerDay: number;
  currentUsage?: {
    requests: number;
    tokens: number;
    windowStart: string;
  };
}

export interface AnalysisError extends Error {
  code: AnalysisErrorCode;
  provider?: string;
  requestId?: string;
  retryable: boolean;
  suggestedAction?: string;
}

export type AnalysisErrorCode =
  | 'INVALID_REQUEST'
  | 'CONTENT_TOO_LONG'
  | 'CONTENT_TOO_SHORT'
  | 'PROVIDER_UNAVAILABLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'QUOTA_EXCEEDED'
  | 'MODEL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INSUFFICIENT_CREDITS'
  | 'CONTENT_FILTERED'
  | 'LANGUAGE_NOT_SUPPORTED'
  | 'INTERNAL_ERROR';