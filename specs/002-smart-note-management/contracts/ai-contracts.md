# AI Service Contracts: Smart Note Management

**Version**: 1.0.0
**Date**: 2025-10-23
**Purpose**: Define AI service integration contracts and interfaces

## Overview

本文档定义了智能笔记管理功能中所有AI服务的统一接口契约，包括内容分析、分类、标签生成、摘要生成等功能。支持多个AI服务提供商的统一接入。

## AI Service Provider Interfaces

### Base AI Client Interface

```typescript
interface BaseAIClient {
  name: string;
  provider: string;

  // 基础方法
  isAvailable(): Promise<boolean>;
  getModelInfo(): ModelInfo;

  // 核心分析功能
  generateResponse(request: AIRequest): Promise<AIResponse>;
  generateCategories(content: string): Promise<CategoryResponse>;
  generateTags(content: string, options?: TagOptions): Promise<TagResponse>;
  generateSummary(content: string, options?: SummaryOptions): Promise<SummaryResponse>;

  // 扩展功能
  extractKeywords(content: string): Promise<KeywordResponse>;
  detectLanguage(content: string): Promise<LanguageResponse>;
  analyzeSentiment(content: string): Promise<SentimentResponse>;
}
```

### AI Request/Response Models

```typescript
// 通用请求模型
interface AIRequest {
  content: string;
  context?: string;
  language?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, any>;
}

// 通用响应模型
interface AIResponse {
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

interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

interface AIError {
  code: string;
  message: string;
  details?: any;
}
```

## Category Analysis Contract

### Request Schema
```typescript
interface CategoryRequest extends AIRequest {
  existingCategories?: string[];
  maxCategories?: number; // default: 3
  confidence?: number; // minimum confidence threshold
}

interface CategoryResponse {
  categories: CategoryPrediction[];
  primaryCategory: CategoryPrediction;
  confidence: number;
  reasoning?: string;
}

interface CategoryPrediction {
  name: string;
  confidence: number;
  reasoning?: string;
  suggestions?: string[];
}
```

### OpenAI Implementation
```typescript
class OpenAICategoryAnalyzer implements BaseAIClient {
  async generateCategories(content: string): Promise<CategoryResponse> {
    const prompt = `
分析以下笔记内容，为其推荐最合适的分类。

笔记内容：
${content}

请返回JSON格式的结果：
{
  "categories": [
    {
      "name": "分类名称",
      "confidence": 0.85,
      "reasoning": "分类理由",
      "suggestions": ["相关建议1", "相关建议2"]
    }
  ],
  "primaryCategory": {
    "name": "主要分类",
    "confidence": 0.92
  },
  "confidence": 0.92,
  "reasoning": "整体分析理由"
}
`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: "你是一个专业的笔记分类助手。" },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    return this.parseCategoryResponse(response.choices[0].message.content);
  }
}
```

### 智谱AI Implementation
```typescript
class ZhipuCategoryAnalyzer implements BaseAIClient {
  async generateCategories(content: string): Promise<CategoryResponse> {
    const response = await this.client.chat.completions.create({
      model: "glm-4",
      messages: [
        {
          role: "system",
          content: "你是一个专业的中文笔记分类助手，请为笔记内容推荐合适的分类。"
        },
        {
          role: "user",
          content: `请分析以下笔记内容并推荐分类：\n\n${content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    return this.parseCategoryResponse(response.choices[0].message.content);
  }
}
```

## Tag Generation Contract

### Request Schema
```typescript
interface TagRequest extends AIRequest {
  existingTags?: string[];
  maxTags?: number; // default: 5
  tagTypes?: TagType[]; // ['topic', 'priority', 'status', 'custom']
  language?: string; // default: auto-detect
}

enum TagType {
  TOPIC = 'topic',
  PRIORITY = 'priority',
  STATUS = 'status',
  EMOTION = 'emotion',
  CUSTOM = 'custom'
}

interface TagResponse {
  tags: TagPrediction[];
  confidence: number;
  reasoning?: string;
}

interface TagPrediction {
  name: string;
  type: TagType;
  confidence: number;
  relevance: number; // 0-1, 内容相关性
  suggestions?: string[];
}
```

### Tag Generation Examples

#### OpenAI Prompt Template
```typescript
const tagPrompt = `
为以下笔记内容生成相关的标签。

笔记内容：
${content}

要求：
1. 生成最多${maxTags}个标签
2. 标签应该简洁明了（1-3个词）
3. 包含不同类型的标签：主题、优先级、状态等
4. 如果有现有标签，请考虑相关性：${existingTags?.join(', ') || '无'}

请返回JSON格式：
{
  "tags": [
    {
      "name": "标签名",
      "type": "topic",
      "confidence": 0.9,
      "relevance": 0.85,
      "suggestions": ["相关建议1"]
    }
  ],
  "confidence": 0.88,
  "reasoning": "标签生成理由"
}
`;
```

## Summary Generation Contract

### Request Schema
```typescript
interface SummaryRequest extends AIRequest {
  maxLength?: number; // default: 200 characters
  style?: SummaryStyle; // 'bullet' | 'paragraph' | 'key_points'
  focus?: string[]; // ['main_points', 'action_items', 'key_facts']
  language?: string; // default: auto-detect
}

enum SummaryStyle {
  BULLET = 'bullet',
  PARAGRAPH = 'paragraph',
  KEY_POINTS = 'key_points'
}

interface SummaryResponse {
  summary: string;
  style: SummaryStyle;
  length: number;
  confidence: number;
  keyPoints?: string[];
  actionItems?: string[];
}
```

### Summary Generation Examples

#### DeepSeek Implementation
```typescript
class DeepSeekSummarizer implements BaseAIClient {
  async generateSummary(content: string, options?: SummaryOptions): Promise<SummaryResponse> {
    const { maxLength = 200, style = 'paragraph' } = options || {};

    const prompt = `
请为以下笔记内容生成简洁的摘要。

笔记内容：
${content}

要求：
- 摘要长度：${maxLength}字以内
- 摘要风格：${style}
- 突出重点和关键信息

${style === 'key_points' ? '- 请以要点形式输出' : ''}

摘要：
`;

    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是一个专业的内容摘要助手。" },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 500
    });

    return this.parseSummaryResponse(response.choices[0].message.content, options);
  }
}
```

## Keyword Extraction Contract

### Request Schema
```typescript
interface KeywordRequest extends AIRequest {
  maxKeywords?: number; // default: 10
  importance?: 'all' | 'high' | 'medium' | 'low';
  includePhrases?: boolean; // default: true
  language?: string;
}

interface KeywordResponse {
  keywords: KeywordPrediction[];
  confidence: number;
  language: string;
}

interface KeywordPrediction {
  word: string;
  score: number; // 0-1, 重要性评分
  frequency: number;
  type: 'single' | 'phrase' | 'entity';
  context?: string; // 出现的上下文
}
```

## Sentiment Analysis Contract

### Request Schema
```typescript
interface SentimentRequest extends AIRequest {
  granularity?: 'document' | 'sentence' | 'aspect';
  emotions?: boolean; // 是否分析情感细粒度
  language?: string;
}

interface SentimentResponse {
  sentiment: SentimentResult;
  emotions?: EmotionResult[];
  confidence: number;
  language: string;
}

interface SentimentResult {
  polarity: 'positive' | 'negative' | 'neutral';
  score: number; // -1 to 1
  magnitude: number; // 0 to 1
}

interface EmotionResult {
  emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust';
  score: number; // 0-1
}
```

## Batch Processing Contract

### Request Schema
```typescript
interface BatchRequest {
  items: BatchItem[];
  operations: AIOperation[];
  options: BatchOptions;
}

interface BatchItem {
  id: string;
  content: string;
  metadata?: Record<string, any>;
}

interface BatchOptions {
  batchSize?: number; // default: 5
  delayBetweenBatches?: number; // milliseconds
  maxConcurrency?: number; // default: 3
  retryAttempts?: number; // default: 3
  timeout?: number; // milliseconds per item
}

type AIOperation = 'categorize' | 'tag' | 'summarize' | 'extract_keywords' | 'analyze_sentiment';
```

### Response Schema
```typescript
interface BatchResponse {
  batchId: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  results: BatchResult[];
  errors: BatchError[];
  summary: BatchSummary;
}

interface BatchResult {
  id: string;
  operation: AIOperation;
  result: any;
  success: boolean;
  processingTime: number;
  cost: number;
}

interface BatchSummary {
  totalCost: number;
  totalTokens: number;
  averageResponseTime: number;
  successRate: number;
}
```

## Error Handling Contracts

### Error Types
```typescript
enum AIErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSING_ERROR = 'PARSING_ERROR'
}

interface AIErrorResponse {
  error: {
    type: AIErrorType;
    code: string;
    message: string;
    details?: any;
    provider: string;
    model?: string;
    requestId?: string;
    timestamp: string;
  };
}
```

### Retry Logic
```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
  retryableErrors: AIErrorType[];
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableErrors: [
    AIErrorType.NETWORK_ERROR,
    AIErrorType.TIMEOUT_ERROR,
    AIErrorType.PROCESSING_ERROR,
    AIErrorType.RATE_LIMIT_ERROR
  ]
};
```

## Quality Assurance Contracts

### Response Validation
```typescript
interface ResponseValidator {
  validate(response: AIResponse): ValidationResult;
  sanitize(response: AIResponse): AIResponse;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}
```

### Quality Metrics
```typescript
interface QualityMetrics {
  accuracy: number; // 分类准确率
  relevance: number; // 内容相关性
  coherence: number; // 内容连贯性
  completeness: number; // 信息完整性
  consistency: number; // 结果一致性
}

interface QualityAssessment {
  overall: number; // 0-1 综合质量评分
  metrics: QualityMetrics;
  feedback?: string;
  suggestions?: string[];
}
```

## Cost Management Contracts

### Cost Tracking
```typescript
interface CostTracker {
  trackUsage(usage: TokenUsage, provider: string): void;
  getCostSummary(period?: TimePeriod): CostSummary;
  setBudgetLimit(limit: number): void;
  checkBudget(): BudgetStatus;
}

interface CostSummary {
  totalCost: number;
  costByProvider: Record<string, number>;
  costByOperation: Record<string, number>;
  totalTokens: number;
  period: TimePeriod;
}

interface BudgetStatus {
  remaining: number;
  used: number;
  limit: number;
  percentage: number;
  alert: boolean;
}
```

## Configuration Management

### Provider Configuration
```typescript
interface ProviderConfig {
  name: string;
  apiKey: string;
  baseURL: string;
  models: ModelConfig[];
  rateLimit: RateLimitConfig;
  retryConfig: RetryConfig;
  costConfig: CostConfig;
}

interface ModelConfig {
  name: string;
  maxTokens: number;
  supportedOperations: AIOperation[];
  costPerToken: CostPerToken;
  performance: PerformanceMetrics;
}

interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  concurrentRequests: number;
}
```

## Integration Examples

### Multi-Provider Usage
```typescript
class AIServiceOrchestrator {
  private providers: Map<string, BaseAIClient>;
  private config: OrchestratorConfig;

  async analyzeNote(content: string, options?: AnalysisOptions): Promise<AnalysisResult> {
    const provider = this.selectProvider(options?.preferredProvider);

    try {
      const result = await provider.generateResponse({
        content,
        ...options
      });

      await this.trackUsage(provider.name, result.tokensUsed);
      return this.formatResult(result);
    } catch (error) {
      return this.handleError(error, content, options);
    }
  }

  private selectProvider(preferred?: string): BaseAIClient {
    // 智能选择逻辑：成本、质量、可用性
    if (preferred && this.providers.has(preferred)) {
      return this.providers.get(preferred)!;
    }

    return this.getOptimalProvider();
  }
}
```

### Usage Examples
```typescript
// 基础分类分析
const categoryResult = await aiService.analyzeNote(noteContent, {
  operations: ['categorize'],
  provider: 'zhipu',
  options: {
    maxCategories: 3,
    confidence: 0.8
  }
});

// 批量分析
const batchResult = await aiService.batchAnalyze([
  { id: '1', content: note1 },
  { id: '2', content: note2 },
  { id: '3', content: note3 }
], {
  operations: ['categorize', 'tag', 'summarize'],
  options: {
    batchSize: 2,
    maxConcurrency: 2
  }
});

// 高级分析
const advancedResult = await aiService.advancedAnalysis(noteContent, {
  operations: ['categorize', 'tag', 'summarize', 'extract_keywords', 'analyze_sentiment'],
  provider: 'auto', // 自动选择最优提供商
  options: {
    language: 'zh-CN',
    maxTags: 8,
    summaryLength: 150,
    qualityThreshold: 0.85
  }
});
```

## Testing Contracts

### Mock Services
```typescript
interface MockAIClient extends BaseAIClient {
  setResponses(responses: Record<string, any>): void;
  setDelay(delay: number): void;
  setError(error: Error): void;
  getCallHistory(): CallRecord[];
}

// 测试用例示例
describe('AI Service Integration', () => {
  let mockClient: MockAIClient;

  beforeEach(() => {
    mockClient = new MockAIClient();
    mockClient.setResponses({
      categorize: {
        categories: [{ name: 'Work', confidence: 0.9 }],
        confidence: 0.9
      }
    });
  });

  test('should categorize note correctly', async () => {
    const result = await mockClient.generateCategories('Work related content');
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].name).toBe('Work');
  });
});
```

## Monitoring & Analytics

### Performance Metrics
```typescript
interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  successRate: number;
  errorRate: number;
  costEfficiency: number;
  qualityScore: number;
}

interface MonitoringDashboard {
  getRealTimeMetrics(): PerformanceMetrics;
  getHistoricalMetrics(period: TimePeriod): PerformanceMetrics[];
  setAlerts(alerts: AlertConfig[]): void;
  generateReport(period: TimePeriod): AnalyticsReport;
}
```

---

**Implementation Notes**:
1. 所有AI服务提供商都必须实现BaseAIClient接口
2. 响应格式必须标准化，便于上层应用统一处理
3. 错误处理和重试逻辑必须健壮，保证服务可靠性
4. 成本跟踪和质量监控是必需功能
5. 所有配置必须支持运行时动态调整