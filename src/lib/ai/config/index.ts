// AI配置管理

export interface AIConfig {
  providers: {
    openai: {
      apiKey: string
      baseUrl: string
      model: string
    }
    anthropic: {
      apiKey: string
      baseUrl: string
      model: string
    }
  }
  settings: {
    defaultProvider: string
    defaultModel: string
    fallbackEnabled: boolean
    userDailyBudget: number
    userMonthlyBudget: number
    systemDailyBudget: number
    systemMonthlyBudget: number
    minContentLength: number
    maxContentLength: number
    analysisTimeout: number
    batchSize: number
    embeddingModel: string
    embeddingDimensions: number
    similarityThreshold: number
  }
}

export const aiConfig: AIConfig = {
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-4o'
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet'
    }
  },
  settings: {
    defaultProvider: process.env.AI_DEFAULT_PROVIDER || 'openai',
    defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-4o',
    fallbackEnabled: process.env.AI_FALLBACK_ENABLED === 'true',
    userDailyBudget: parseFloat(process.env.AI_USER_DAILY_BUDGET || '1.0'),
    userMonthlyBudget: parseFloat(process.env.AI_USER_MONTHLY_BUDGET || '30.0'),
    systemDailyBudget: parseFloat(process.env.AI_SYSTEM_DAILY_BUDGET || '100.0'),
    systemMonthlyBudget: parseFloat(process.env.AI_SYSTEM_MONTHLY_BUDGET || '3000.0'),
    minContentLength: parseInt(process.env.AI_MIN_CONTENT_LENGTH || '50'),
    maxContentLength: parseInt(process.env.AI_MAX_CONTENT_LENGTH || '50000'),
    analysisTimeout: parseInt(process.env.AI_ANALYSIS_TIMEOUT || '30000'),
    batchSize: parseInt(process.env.AI_BATCH_SIZE || '5'),
    embeddingModel: process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small',
    embeddingDimensions: parseInt(process.env.AI_EMBEDDING_DIMENSIONS || '1536'),
    similarityThreshold: parseFloat(process.env.AI_SIMILARITY_THRESHOLD || '0.7')
  }
}

// 配置验证函数
export function validateAIConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // 验证必需的API密钥
  if (!aiConfig.providers.openai.apiKey) {
    errors.push('OpenAI API key is required')
  }
  if (!aiConfig.providers.anthropic.apiKey) {
    errors.push('Anthropic API key is required')
  }

  // 验证预算设置
  if (aiConfig.settings.userDailyBudget <= 0) {
    errors.push('User daily budget must be greater than 0')
  }
  if (aiConfig.settings.systemDailyBudget <= 0) {
    errors.push('System daily budget must be greater than 0')
  }

  // 验证内容长度设置
  if (aiConfig.settings.minContentLength < 1) {
    errors.push('Minimum content length must be at least 1')
  }
  if (aiConfig.settings.maxContentLength < aiConfig.settings.minContentLength) {
    errors.push('Maximum content length must be greater than minimum')
  }

  // 验证相似度阈值
  if (aiConfig.settings.similarityThreshold < 0 || aiConfig.settings.similarityThreshold > 1) {
    errors.push('Similarity threshold must be between 0 and 1')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}