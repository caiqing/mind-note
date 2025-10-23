/**
 * AI服务配置文件
 * 支持多个AI服务提供商的统一配置和管理
 */

export interface AIProvider {
  name: string;
  apiKey: string;
  baseURL: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  enabled: boolean;
}

export interface AIServiceConfig {
  providers: Record<string, AIProvider>;
  primaryProvider: string;
  fallbackProviders: string[];
  retryAttempts: number;
  timeoutMs: number;
}

/**
 * 获取AI服务配置
 */
export function getAIServiceConfig(): AIServiceConfig {
  return {
    providers: {
      openai: {
        name: 'OpenAI',
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        maxTokens: 4096,
        temperature: 0.3,
        timeout: 30000,
        enabled: !!process.env.OPENAI_API_KEY,
      },
      anthropic: {
        name: 'Anthropic Claude',
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20241022',
        maxTokens: 4096,
        temperature: 0.3,
        timeout: 30000,
        enabled: !!process.env.ANTHROPIC_API_KEY,
      },
      zhipu: {
        name: '智谱AI GLM',
        apiKey: process.env.ZHIPU_API_KEY || '',
        baseURL: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
        model: process.env.ZHIPU_MODEL || 'glm-4',
        maxTokens: 4096,
        temperature: 0.3,
        timeout: 30000,
        enabled: !!process.env.ZHIPU_API_KEY,
      },
      deepseek: {
        name: 'DeepSeek',
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        maxTokens: 4096,
        temperature: 0.3,
        timeout: 30000,
        enabled: !!process.env.DEEPSEEK_API_KEY,
      },
      kimi: {
        name: 'Kimi Moonshot',
        apiKey: process.env.KIMI_API_KEY || '',
        baseURL: process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
        model: process.env.KIMI_MODEL || 'moonshot-v1-8k',
        maxTokens: 8192,
        temperature: 0.3,
        timeout: 30000,
        enabled: !!process.env.KIMI_API_KEY,
      },
      qwen: {
        name: '通义千问',
        apiKey: process.env.QWEN_API_KEY || '',
        baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: process.env.QWEN_MODEL || 'qwen-turbo',
        maxTokens: 4096,
        temperature: 0.3,
        timeout: 30000,
        enabled: !!process.env.QWEN_API_KEY,
      },
      ollama: {
        name: 'Ollama (本地)',
        apiKey: '', // Ollama不需要API密钥
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'llama3:8b',
        maxTokens: 4096,
        temperature: 0.3,
        timeout: 60000, // 本地模型可能响应较慢
        enabled: true, // Ollama总是启用的
      },
    },
    primaryProvider: process.env.AI_PRIMARY_PROVIDER || 'openai',
    fallbackProviders: (process.env.AI_PROVIDERS_PRIORITY || 'anthropic,zhipu,deepseek,kimi,qwen,ollama').split(','),
    retryAttempts: 3,
    timeoutMs: 30000,
  };
}

/**
 * 获取可用的AI服务提供商列表
 */
export function getAvailableProviders(): string[] {
  const config = getAIServiceConfig();
  return Object.entries(config.providers)
    .filter(([_, provider]) => provider.enabled)
    .map(([name]) => name);
}

/**
 * 获取主要的AI服务提供商
 */
export function getPrimaryProvider(): string {
  const config = getAIServiceConfig();
  const availableProviders = getAvailableProviders();

  // 如果首选提供商可用，返回它
  if (availableProviders.includes(config.primaryProvider)) {
    return config.primaryProvider;
  }

  // 否则返回第一个可用的提供商
  return availableProviders[0] || 'ollama';
}

/**
 * 获取备选服务提供商列表
 */
export function getFallbackProviders(excludeProvider?: string): string[] {
  const config = getAIServiceConfig();
  const availableProviders = getAvailableProviders();

  return config.fallbackProviders.filter(provider =>
    availableProviders.includes(provider) && provider !== excludeProvider
  );
}

/**
 * 验证AI服务配置
 */
export function validateAIConfig(): { isValid: boolean; errors: string[] } {
  const config = getAIServiceConfig();
  const errors: string[] = [];

  // 检查是否有可用的提供商
  const availableProviders = getAvailableProviders();
  if (availableProviders.length === 0) {
    errors.push('没有可用的AI服务提供商，请至少配置一个AI服务的API密钥');
  }

  // 检查主要提供商是否可用
  if (!availableProviders.includes(config.primaryProvider)) {
    errors.push(`主要AI服务提供商 '${config.primaryProvider}' 不可用`);
  }

  // 检查每个提供商的配置
  Object.entries(config.providers).forEach(([name, provider]) => {
    if (provider.enabled && !provider.apiKey && name !== 'ollama') {
      errors.push(`AI服务提供商 '${name}' 已启用但缺少API密钥`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * AI服务特性对比
 */
export const AI_PROVIDER_FEATURES = {
  openai: {
    languages: ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es'],
    maxTokens: 128000,
    supportsJson: true,
    supportsImages: true,
    costPer1MTokens: { input: 10, output: 30 },
    strengths: ['通用理解', '代码生成', '逻辑推理'],
  },
  anthropic: {
    languages: ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es'],
    maxTokens: 200000,
    supportsJson: true,
    supportsImages: true,
    costPer1MTokens: { input: 15, output: 75 },
    strengths: ['长文本处理', '安全对话', '分析能力'],
  },
  zhipu: {
    languages: ['zh', 'en'],
    maxTokens: 128000,
    supportsJson: true,
    supportsImages: false,
    costPer1MTokens: { input: 5, output: 25 },
    strengths: ['中文理解', '知识问答', '创意写作'],
  },
  deepseek: {
    languages: ['zh', 'en'],
    maxTokens: 32000,
    supportsJson: true,
    supportsImages: false,
    costPer1MTokens: { input: 1, output: 2 },
    strengths: ['代码能力', '性价比', '数学推理'],
  },
  kimi: {
    languages: ['zh', 'en'],
    maxTokens: 200000,
    supportsJson: true,
    supportsImages: false,
    costPer1MTokens: { input: 12, output: 60 },
    strengths: ['长文档处理', '信息提取', '总结归纳'],
  },
  qwen: {
    languages: ['zh', 'en'],
    maxTokens: 8000,
    supportsJson: true,
    supportsImages: false,
    costPer1MTokens: { input: 4, output: 12 },
    strengths: ['多语言', '指令跟随', '实用性'],
  },
  ollama: {
    languages: ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es'], // 取决于具体模型
    maxTokens: 8192, // 取决于具体模型
    supportsJson: false, // 通常不支持结构化输出
    supportsImages: false, // 大多数本地模型不支持图像
    costPer1MTokens: { input: 0, output: 0 }, // 本地运行无API成本
    strengths: ['数据隐私', '离线可用', '无成本', '完全控制'],
  },
};

export type AIProviderFeatures = typeof AI_PROVIDER_FEATURES;