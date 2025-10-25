import { AIServiceConfig, ProviderConfig, ModelConfig } from '@/types/ai-analysis';

export class AIConfigManager {
  private static instance: AIConfigManager;
  private config: AIServiceConfig;

  private constructor() {
    this.config = this.loadDefaultConfig();
  }

  public static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager();
    }
    return AIConfigManager.instance;
  }

  private loadDefaultConfig(): AIServiceConfig {
    return {
      providers: this.loadProvidersFromEnv(),
      fallbackOrder: process.env.AI_PROVIDERS_PRIORITY?.split(',') || [
        'openai', 'anthropic', 'zhipu', 'deepseek', 'kimi', 'qwen', 'ollama'
      ],
      costLimits: {
        maxCostPerNote: 0.01, // $0.01 per note
        maxCostPerUser: 10.0, // $10 per user per month
        maxCostPerDay: 100.0, // $100 per day for the system
      },
      performance: {
        maxProcessingTime: 30000, // 30 seconds
        retryAttempts: 3,
        timeoutMs: 25000, // 25 seconds
      },
      cache: {
        enabled: true,
        ttl: 86400 * 1000, // 24 hours in milliseconds
        maxSize: 1000,
      },
    };
  }

  private loadProvidersFromEnv(): ProviderConfig[] {
    const providers: ProviderConfig[] = [];

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      providers.push({
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        models: [
          {
            name: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
            maxTokens: 128000,
            costPerToken: 0.00001, // $0.01 per 1K tokens
            capabilities: {
              summarization: true,
              classification: true,
              sentiment: true,
              keywordExtraction: true,
              conceptExtraction: true,
              tagGeneration: true,
            },
            optimizedFor: ['summarization', 'analysis'],
          },
        ],
        enabled: true,
        priority: 1,
        rateLimit: {
          requestsPerMinute: 60,
          tokensPerMinute: 90000,
        },
      });
    }

    // Anthropic Claude
    if (process.env.ANTHROPIC_API_KEY) {
      providers.push({
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
        models: [
          {
            name: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20241022',
            maxTokens: 200000,
            costPerToken: 0.000003, // $0.003 per 1K tokens
            capabilities: {
              summarization: true,
              classification: true,
              sentiment: true,
              keywordExtraction: true,
              conceptExtraction: true,
              tagGeneration: true,
            },
            optimizedFor: ['analysis', 'classification'],
          },
        ],
        enabled: true,
        priority: 2,
        rateLimit: {
          requestsPerMinute: 50,
          tokensPerMinute: 100000,
        },
      });
    }

    // 智谱AI
    if (process.env.ZHIPU_API_KEY) {
      providers.push({
        name: 'zhipu',
        apiKey: process.env.ZHIPU_API_KEY,
        baseURL: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
        models: [
          {
            name: process.env.ZHIPU_MODEL || 'glm-4',
            maxTokens: 128000,
            costPerToken: 0.000001, // $0.001 per 1K tokens
            capabilities: {
              summarization: true,
              classification: true,
              sentiment: true,
              keywordExtraction: true,
              conceptExtraction: true,
              tagGeneration: true,
            },
            optimizedFor: ['chinese-content', 'classification'],
          },
        ],
        enabled: true,
        priority: 3,
        rateLimit: {
          requestsPerMinute: 40,
          tokensPerMinute: 80000,
        },
      });
    }

    // DeepSeek
    if (process.env.DEEPSEEK_API_KEY) {
      providers.push({
        name: 'deepseek',
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        models: [
          {
            name: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
            maxTokens: 128000,
            costPerToken: 0.0000001, // $0.0001 per 1K tokens
            capabilities: {
              summarization: true,
              classification: true,
              sentiment: true,
              keywordExtraction: true,
              conceptExtraction: false,
              tagGeneration: true,
            },
            optimizedFor: ['cost-effective', 'summarization'],
          },
        ],
        enabled: true,
        priority: 4,
        rateLimit: {
          requestsPerMinute: 30,
          tokensPerMinute: 60000,
        },
      });
    }

    // Kimi (Moonshot AI)
    if (process.env.KIMI_API_KEY) {
      providers.push({
        name: 'kimi',
        apiKey: process.env.KIMI_API_KEY,
        baseURL: process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
        models: [
          {
            name: process.env.KIMI_MODEL || 'moonshot-v1-8k',
            maxTokens: 8000,
            costPerToken: 0.0000012, // $0.0012 per 1K tokens
            capabilities: {
              summarization: true,
              classification: true,
              sentiment: true,
              keywordExtraction: true,
              conceptExtraction: false,
              tagGeneration: true,
            },
            optimizedFor: ['short-content', 'quick-analysis'],
          },
        ],
        enabled: true,
        priority: 5,
        rateLimit: {
          requestsPerMinute: 20,
          tokensPerMinute: 40000,
        },
      });
    }

    // 通义千问
    if (process.env.QWEN_API_KEY) {
      providers.push({
        name: 'qwen',
        apiKey: process.env.QWEN_API_KEY,
        baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        models: [
          {
            name: process.env.QWEN_MODEL || 'qwen-turbo',
            maxTokens: 8192,
            costPerToken: 0.0000008, // $0.0008 per 1K tokens
            capabilities: {
              summarization: true,
              classification: true,
              sentiment: true,
              keywordExtraction: true,
              conceptExtraction: false,
              tagGeneration: true,
            },
            optimizedFor: ['chinese-content', 'cost-effective'],
          },
        ],
        enabled: true,
        priority: 6,
        rateLimit: {
          requestsPerMinute: 25,
          tokensPerMinute: 50000,
        },
      });
    }

    // Ollama (本地)
    providers.push({
      name: 'ollama',
      apiKey: 'local-model',
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      models: [
        {
          name: process.env.OLLAMA_MODEL || 'llama3:8b',
          maxTokens: 8192,
          costPerToken: 0, // 本地模型无成本
          capabilities: {
            summarization: true,
            classification: true,
            sentiment: true,
            keywordExtraction: true,
            conceptExtraction: false,
            tagGeneration: true,
          },
          optimizedFor: ['local', 'privacy', 'no-cost'],
        },
      ],
      enabled: true,
      priority: 7, // 最低优先级，作为fallback
    });

    return providers;
  }

  public getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfig();
  }

  private validateConfig(): void {
    // 验证provider配置
    if (this.config.providers.length === 0) {
      throw new Error('At least one AI provider must be configured');
    }

    // 验证fallback顺序
    const configuredProviders = this.config.providers.map(p => p.name);
    for (const providerName of this.config.fallbackOrder) {
      if (!configuredProviders.includes(providerName)) {
        throw new Error(`Fallback provider ${providerName} is not configured`);
      }
    }

    // 验证成本限制
    if (this.config.costLimits.maxCostPerNote <= 0) {
      throw new Error('maxCostPerNote must be positive');
    }

    if (this.config.costLimits.maxCostPerUser <= 0) {
      throw new Error('maxCostPerUser must be positive');
    }

    if (this.config.costLimits.maxCostPerDay <= 0) {
      throw new Error('maxCostPerDay must be positive');
    }

    // 验证性能配置
    if (this.config.performance.maxProcessingTime <= 0) {
      throw new Error('maxProcessingTime must be positive');
    }

    if (this.config.performance.retryAttempts < 0) {
      throw new Error('retryAttempts must be non-negative');
    }

    if (this.config.performance.timeoutMs <= 0) {
      throw new Error('timeoutMs must be positive');
    }
  }

  public getProviderConfig(providerName: string): ProviderConfig | null {
    return this.config.providers.find(p => p.name === providerName) || null;
  }

  public getEnabledProviders(): ProviderConfig[] {
    return this.config.providers
      .filter(p => p.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  public getFallbackOrder(): string[] {
    return [...this.config.fallbackOrder];
  }

  public updateProviderConfig(providerName: string, config: Partial<ProviderConfig>): void {
    const providerIndex = this.config.providers.findIndex(p => p.name === providerName);
    if (providerIndex === -1) {
      throw new Error(`Provider ${providerName} not found`);
    }

    this.config.providers[providerIndex] = {
      ...this.config.providers[providerIndex],
      ...config,
    };

    this.validateConfig();
  }

  public enableProvider(providerName: string): void {
    this.updateProviderConfig(providerName, { enabled: true });
  }

  public disableProvider(providerName: string): void {
    this.updateProviderConfig(providerName, { enabled: false });
  }

  public calculateCost(providerName: string, model: string, inputTokens: number, outputTokens: number): number {
    const provider = this.getProviderConfig(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    const modelConfig = provider.models.find(m => m.name === model);
    if (!modelConfig) {
      throw new Error(`Model ${model} not found for provider ${providerName}`);
    }

    const totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000) * modelConfig.costPerToken;
  }

  public getCostLimits() {
    return { ...this.config.costLimits };
  }

  public updateCostLimits(newLimits: Partial<AIServiceConfig['costLimits']>): void {
    this.config.costLimits = { ...this.config.costLimits, ...newLimits };
    this.validateConfig();
  }

  public getPerformanceConfig() {
    return { ...this.config.performance };
  }

  public updatePerformanceConfig(newConfig: Partial<AIServiceConfig['performance']>): void {
    this.config.performance = { ...this.config.performance, ...newConfig };
    this.validateConfig();
  }

  public getCacheConfig() {
    return { ...this.config.cache };
  }

  public updateCacheConfig(newConfig: Partial<AIServiceConfig['cache']>): void {
    this.config.cache = { ...this.config.cache, ...newConfig };
  }

  // 导出配置为JSON
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  // 从JSON导入配置
  public importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      this.updateConfig(config);
    } catch (error) {
      throw new Error(`Invalid configuration JSON: ${error}`);
    }
  }
}

// 单例实例
export const aiConfig = AIConfigManager.getInstance();