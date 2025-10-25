// AI服务模块导出

export { BaseAIService } from './base-service'
export { AIServiceError, AIErrorType, ErrorHandler } from './error-handler'
export { AIServiceLogger, logger, LogLevel } from './logger'

// 服务类型定义
export interface ServiceMetrics {
  requestCount: number
  successCount: number
  errorCount: number
  avgResponseTime: number
  totalCost: number
  totalTokens: number
}

// 服务状态
export interface ServiceStatus {
  isHealthy: boolean
  lastCheck: Date
  responseTime?: number
  error?: string
}

// 服务配置
export interface ServiceConfig {
  maxRetries: number
  timeout: number
  enableLogging: boolean
  enableMetrics: boolean
}