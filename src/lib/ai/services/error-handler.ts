// AI服务错误处理

export enum AIErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  QUOTA_EXCEEDED_ERROR = 'QUOTA_EXCEEDED_ERROR',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  CONTENT_TOO_SHORT = 'CONTENT_TOO_SHORT',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class AIServiceError extends Error {
  public readonly type: AIErrorType
  public readonly code?: string
  public readonly details?: any
  public readonly retryable: boolean
  public readonly providerId?: string

  constructor(
    message: string,
    type: AIErrorType = AIErrorType.UNKNOWN_ERROR,
    code?: string,
    details?: any,
    retryable: boolean = false,
    providerId?: string
  ) {
    super(message)
    this.name = 'AIServiceError'
    this.type = type
    this.code = code
    this.details = details
    this.retryable = retryable
    this.providerId = providerId
  }

  static fromError(error: any, providerId?: string): AIServiceError {
    const message = error.message || error.toString()

    // OpenAI错误格式
    if (error.error?.type) {
      switch (error.error.type) {
        case 'invalid_request_error':
          return new AIServiceError(
            message,
            AIErrorType.INVALID_REQUEST,
            error.error.code,
            error.error,
            false,
            providerId
          )
        case 'authentication_error':
          return new AIServiceError(
            'Authentication failed: ' + message,
            AIErrorType.AUTHENTICATION_ERROR,
            error.error.code,
            error.error,
            false,
            providerId
          )
        case 'rate_limit_error':
          return new AIServiceError(
            'Rate limit exceeded: ' + message,
            AIErrorType.RATE_LIMIT_ERROR,
            error.error.code,
            error.error,
            true,
            providerId
          )
        case 'insufficient_quota':
          return new AIServiceError(
            'Quota exceeded: ' + message,
            AIErrorType.QUOTA_EXCEEDED_ERROR,
            error.error.code,
            error.error,
            false,
            providerId
          )
        default:
          return new AIServiceError(
            'API error: ' + message,
            AIErrorType.API_ERROR,
            error.error.code,
            error.error,
            true,
            providerId
          )
      }
    }

    // Anthropic错误格式
    if (error.type === 'error') {
      switch (error.error?.type) {
        case 'authentication_error':
          return new AIServiceError(
            'Authentication failed: ' + message,
            AIErrorType.AUTHENTICATION_ERROR,
            error.error?.type,
            error.error,
            false,
            providerId
          )
        case 'rate_limit_error':
          return new AIServiceError(
            'Rate limit exceeded: ' + message,
            AIErrorType.RATE_LIMIT_ERROR,
            error.error?.type,
            error.error,
            true,
            providerId
          )
        default:
          return new AIServiceError(
            'API error: ' + message,
            AIErrorType.API_ERROR,
            error.error?.type,
            error.error,
            true,
            providerId
          )
      }
    }

    // 网络错误
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new AIServiceError(
        'Network error: ' + message,
        AIErrorType.NETWORK_ERROR,
        error.code,
        error,
        true,
        providerId
      )
    }

    // 超时错误
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return new AIServiceError(
        'Request timeout: ' + message,
        AIErrorType.TIMEOUT_ERROR,
        'TIMEOUT',
        error,
        true,
        providerId
      )
    }

    // 内容长度错误
    if (message.includes('too long') || message.includes('maximum')) {
      return new AIServiceError(
        'Content too long: ' + message,
        AIErrorType.CONTENT_TOO_LONG,
        'CONTENT_TOO_LONG',
        error,
        false,
        providerId
      )
    }

    if (message.includes('too short') || message.includes('minimum')) {
      return new AIServiceError(
        'Content too short: ' + message,
        AIErrorType.CONTENT_TOO_SHORT,
        'CONTENT_TOO_SHORT',
        error,
        false,
        providerId
      )
    }

    // 默认未知错误
    return new AIServiceError(
      'Unknown error: ' + message,
      AIErrorType.UNKNOWN_ERROR,
      'UNKNOWN',
      error,
      true,
      providerId
    )
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      code: this.code,
      details: this.details,
      retryable: this.retryable,
      providerId: this.providerId
    }
  }
}

/**
 * 错误处理工具函数
 */
export class ErrorHandler {
  /**
   * 判断错误是否应该重试
   */
  static shouldRetry(error: AIServiceError): boolean {
    return error.retryable
  }

  /**
   * 计算重试延迟时间
   */
  static calculateRetryDelay(attempt: number, baseDelay: number = 1000): number {
    // 指数退避算法
    return Math.min(baseDelay * Math.pow(2, attempt), 30000)
  }

  /**
   * 格式化错误消息用于日志
   */
  static formatForLog(error: AIServiceError): string {
    const parts = [
      `[${error.type}]`,
      error.providerId ? `[${error.providerId}]` : '',
      error.message
    ].filter(Boolean)

    return parts.join(' ')
  }

  /**
   * 格式化错误消息用于API响应
   */
  static formatForResponse(error: AIServiceError): {
    code: string
    message: string
    details?: any
  } {
    return {
      code: error.code || error.type,
      message: error.message,
      details: error.details
    }
  }

  /**
   * 记录错误日志
   */
  static log(error: AIServiceError, context?: string): void {
    const logMessage = this.formatForLog(error)
    const contextMessage = context ? `[${context}] ${logMessage}` : logMessage

    if (error.type === AIErrorType.AUTHENTICATION_ERROR || error.type === AIErrorType.QUOTA_EXCEEDED_ERROR) {
      console.error(`🚨 ${contextMessage}`)
    } else if (error.type === AIErrorType.RATE_LIMIT_ERROR || error.type === AIErrorType.NETWORK_ERROR) {
      console.warn(`⚠️ ${contextMessage}`)
    } else {
      console.error(`❌ ${contextMessage}`)
    }
  }
}