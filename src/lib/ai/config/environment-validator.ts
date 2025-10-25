// 环境变量验证器
// 确保所有必要的环境变量都已正确配置

import { logger } from '@/lib/ai/services'

export interface EnvironmentConfig {
  // 数据库配置
  database: {
    url: string
    ssl?: boolean
    connectionTimeout?: number
  }

  // AI服务配置
  ai: {
    openai: {
      apiKey: string
      baseUrl?: string
      models: string[]
    }
    anthropic: {
      apiKey: string
      baseUrl?: string
      models: string[]
    }
    defaultProvider: string
    timeout: number
    retries: number
  }

  // 应用配置
  app: {
    nodeEnv: 'development' | 'production' | 'test'
    port: number
    logLevel: 'debug' | 'info' | 'warn' | 'error'
  }

  // 安全配置
  security: {
    jwtSecret: string
    sessionSecret: string
    corsOrigins: string[]
    rateLimiting: {
      enabled: boolean
      windowMs: number
      maxRequests: number
    }
  }

  // 成本控制配置
  costControl: {
    userDailyBudget: number
    userMonthlyBudget: number
    systemDailyBudget: number
    systemMonthlyBudget: number
  }
}

export interface ValidationError {
  field: string
  code: string
  message: string
  severity: 'error' | 'warning'
}

export class EnvironmentValidator {
  private static instance: EnvironmentValidator
  private config: EnvironmentConfig | null = null
  private validationErrors: ValidationError[] = []

  static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator()
    }
    return EnvironmentValidator.instance
  }

  /**
   * 验证并加载环境配置
   */
  validateAndLoad(): EnvironmentConfig {
    if (this.config) {
      return this.config
    }

    this.validationErrors = []
    const config: Partial<EnvironmentConfig> = {}

    // 验证数据库配置
    config.database = this.validateDatabaseConfig()

    // 验证AI服务配置
    config.ai = this.validateAIConfig()

    // 验证应用配置
    config.app = this.validateAppConfig()

    // 验证安全配置
    config.security = this.validateSecurityConfig()

    // 验证成本控制配置
    config.costControl = this.validateCostControlConfig()

    // 检查是否有错误
    const errors = this.validationErrors.filter(e => e.severity === 'error')
    if (errors.length > 0) {
      const errorMessages = errors.map(e => `${e.field}: ${e.message}`).join('\n')
      throw new Error(`Environment validation failed:\n${errorMessages}`)
    }

    // 记录警告
    const warnings = this.validationErrors.filter(e => e.severity === 'warning')
    if (warnings.length > 0) {
      logger.warn('Environment validation warnings:', warnings)
    }

    this.config = config as EnvironmentConfig
    logger.info('Environment configuration loaded successfully')

    return this.config
  }

  /**
   * 验证数据库配置
   */
  private validateDatabaseConfig(): EnvironmentConfig['database'] {
    const url = process.env.DATABASE_URL
    if (!url) {
      this.addError('DATABASE_URL', 'MISSING_REQUIRED', 'DATABASE_URL environment variable is required')
    }

    return {
      url: url || '',
      ssl: this.parseBoolean(process.env.DATABASE_SSL, true),
      connectionTimeout: this.parseInt(process.env.DATABASE_CONNECTION_TIMEOUT, 30000)
    }
  }

  /**
   * 验证AI服务配置
   */
  private validateAIConfig(): EnvironmentConfig['ai'] {
    // OpenAI配置
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      this.addWarning('OPENAI_API_KEY', 'MISSING_OPTIONAL', 'OpenAI API key not configured, OpenAI features will be disabled')
    }

    // Anthropic配置
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicApiKey) {
      this.addWarning('ANTHROPIC_API_KEY', 'MISSING_OPTIONAL', 'Anthropic API key not configured, Claude features will be disabled')
    }

    return {
      openai: {
        apiKey: openaiApiKey || '',
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        models: (process.env.OPENAI_MODELS || 'gpt-4,gpt-3.5-turbo').split(',').map(m => m.trim())
      },
      anthropic: {
        apiKey: anthropicApiKey || '',
        baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
        models: (process.env.ANTHROPIC_MODELS || 'claude-3-5-sonnet,claude-3-haiku').split(',').map(m => m.trim())
      },
      defaultProvider: process.env.AI_DEFAULT_PROVIDER || 'openai',
      timeout: this.parseInt(process.env.AI_TIMEOUT, 30000),
      retries: this.parseInt(process.env.AI_RETRIES, 3)
    }
  }

  /**
   * 验证应用配置
   */
  private validateAppConfig(): EnvironmentConfig['app'] {
    const nodeEnv = process.env.NODE_ENV as EnvironmentConfig['app']['nodeEnv']
    const validEnvs: EnvironmentConfig['app']['nodeEnv'][] = ['development', 'production', 'test']

    if (!nodeEnv || !validEnvs.includes(nodeEnv)) {
      this.addWarning('NODE_ENV', 'INVALID_VALUE', `Invalid NODE_ENV, defaulting to development`)
    }

    const logLevels: EnvironmentConfig['app']['logLevel'][] = ['debug', 'info', 'warn', 'error']
    const logLevel = process.env.LOG_LEVEL as EnvironmentConfig['app']['logLevel']

    if (logLevel && !logLevels.includes(logLevel)) {
      this.addWarning('LOG_LEVEL', 'INVALID_VALUE', `Invalid LOG_LEVEL, defaulting to info`)
    }

    return {
      nodeEnv: nodeEnv || 'development',
      port: this.parseInt(process.env.PORT, 3000),
      logLevel: logLevel || 'info'
    }
  }

  /**
   * 验证安全配置
   */
  private validateSecurityConfig(): EnvironmentConfig['security'] {
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
    if (!jwtSecret) {
      this.addWarning('JWT_SECRET', 'MISSING_RECOMMENDED', 'JWT secret not configured, using development default')
    }

    const sessionSecret = process.env.SESSION_SECRET
    if (!sessionSecret) {
      this.addWarning('SESSION_SECRET', 'MISSING_RECOMMENDED', 'Session secret not configured, using development default')
    }

    const corsOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000']

    return {
      jwtSecret: jwtSecret || 'development-jwt-secret-change-in-production',
      sessionSecret: sessionSecret || 'development-session-secret-change-in-production',
      corsOrigins,
      rateLimiting: {
        enabled: this.parseBoolean(process.env.RATE_LIMITING_ENABLED, true),
        windowMs: this.parseInt(process.env.RATE_LIMITING_WINDOW, 60000),
        maxRequests: this.parseInt(process.env.RATE_LIMITING_MAX_REQUESTS, 100)
      }
    }
  }

  /**
   * 验证成本控制配置
   */
  private validateCostControlConfig(): EnvironmentConfig['costControl'] {
    return {
      userDailyBudget: this.parseFloat(process.env.AI_USER_DAILY_BUDGET, 1.0),
      userMonthlyBudget: this.parseFloat(process.env.AI_USER_MONTHLY_BUDGET, 30.0),
      systemDailyBudget: this.parseFloat(process.env.AI_SYSTEM_DAILY_BUDGET, 100.0),
      systemMonthlyBudget: this.parseFloat(process.env.AI_SYSTEM_MONTHLY_BUDGET, 3000.0)
    }
  }

  /**
   * 获取配置
   */
  getConfig(): EnvironmentConfig {
    if (!this.config) {
      return this.validateAndLoad()
    }
    return this.config
  }

  /**
   * 获取验证错误
   */
  getValidationErrors(): ValidationError[] {
    return [...this.validationErrors]
  }

  /**
   * 检查是否为开发环境
   */
  isDevelopment(): boolean {
    return this.getConfig().app.nodeEnv === 'development'
  }

  /**
   * 检查是否为生产环境
   */
  isProduction(): boolean {
    return this.getConfig().app.nodeEnv === 'production'
  }

  /**
   * 检查是否为测试环境
   */
  isTest(): boolean {
    return this.getConfig().app.nodeEnv === 'test'
  }

  /**
   * 获取AI提供商配置
   */
  getAIProviderConfig(providerName: string) {
    const config = this.getConfig()
    switch (providerName.toLowerCase()) {
      case 'openai':
        return config.ai.openai
      case 'anthropic':
        return config.ai.anthropic
      default:
        throw new Error(`Unknown AI provider: ${providerName}`)
    }
  }

  /**
   * 辅助方法
   */
  private addError(field: string, code: string, message: string): void {
    this.validationErrors.push({
      field,
      code,
      message,
      severity: 'error'
    })
  }

  private addWarning(field: string, code: string, message: string): void {
    this.validationErrors.push({
      field,
      code,
      message,
      severity: 'warning'
    })
  }

  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) return defaultValue
    return value.toLowerCase() === 'true'
  }

  private parseInt(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? defaultValue : parsed
  }

  private parseFloat(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue
    const parsed = parseFloat(value)
    return isNaN(parsed) ? defaultValue : parsed
  }
}

// 导出单例实例
export const environmentValidator = EnvironmentValidator.getInstance()

// 导出便捷函数
export const getConfig = () => environmentValidator.getConfig()
export const isDevelopment = () => environmentValidator.isDevelopment()
export const isProduction = () => environmentValidator.isProduction()
export const isTest = () => environmentValidator.isTest()