/**
 * Enhanced CORS Security Configuration
 *
 * 增强的CORS安全配置系统，提供动态、环境感知的跨域资源共享管理
 */

import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/utils/logger'

export interface CORSConfig {
  allowedOrigins: string[]
  allowedMethods: string[]
  allowedHeaders: string[]
  exposedHeaders?: string[]
  credentials: boolean
  maxAge: number
  preflightContinue: boolean
  optionsSuccessStatus: number
}

export interface CORSRequestContext {
  origin?: string
  method: string
  headers: Record<string, string>
  ip?: string
  userAgent?: string
  referer?: string
}

export interface CORSPolicy {
  origin: {
    allowed: string[]
    denied: string[]
    dynamic: boolean
  }
  methods: string[]
  headers: {
    allowed: string[]
    required: string[]
    dangerous: string[]
  }
  credentials: boolean
  maxAge: number
  rateLimit: {
    enabled: boolean
    requests: number
    window: number
  }
}

/**
 * Enhanced CORS Security Manager
 */
export class EnhancedCORSSecurity {
  private static instance: EnhancedCORSSecurity
  private rateLimitStore = new Map<string, { count: number; resetTime: number; blocked: boolean }>()
  private suspiciousOrigins = new Set<string>()
  private trustedOrigins = new Set<string>()

  private constructor() {
    this.initializeTrustedOrigins()
    this.initializeRateLimitCleanup()
  }

  static getInstance(): EnhancedCORSSecurity {
    if (!EnhancedCORSSecurity.instance) {
      EnhancedCORSSecurity.instance = new EnhancedCORSSecurity()
    }
    return EnhancedCORSSecurity.instance
  }

  /**
   * 初始化受信任的源
   */
  private initializeTrustedOrigins(): void {
    const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://mindnote.app',
      'https://www.mindnote.app',
      'https://app.mindnote.app'
    ]

    trustedOrigins.forEach(origin => {
      this.trustedOrigins.add(origin.trim())
    })

    logger.info('Trusted origins initialized', {
      count: this.trustedOrigins.size,
      origins: Array.from(this.trustedOrigins)
    })
  }

  /**
   * 初始化速率限制清理器
   */
  private initializeRateLimitCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      const expiredKeys: string[] = []

      for (const [key, data] of this.rateLimitStore.entries()) {
        if (data.resetTime < now) {
          expiredKeys.push(key)
        }
      }

      expiredKeys.forEach(key => this.rateLimitStore.delete(key))

      if (expiredKeys.length > 0) {
        logger.debug('CORS rate limit cleanup', { removed: expiredKeys.length })
      }
    }, 5 * 60 * 1000) // 每5分钟清理一次
  }

  /**
   * 获取环境特定的CORS策略
   */
  private getCORSPolicy(): CORSPolicy {
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isProduction = process.env.NODE_ENV === 'production'
    const isTest = process.env.NODE_ENV === 'test'

    if (isDevelopment) {
      return {
        origin: {
          allowed: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
          denied: [],
          dynamic: true
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        headers: {
          allowed: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
          required: ['Content-Type'],
          dangerous: ['X-Forwarded-For', 'X-Real-IP', 'X-Originating-IP']
        },
        credentials: true,
        maxAge: 7200, // 2小时
        rateLimit: {
          enabled: true,
          requests: 1000,
          window: 15 * 60 * 1000 // 15分钟
        }
      }
    }

    if (isProduction) {
      return {
        origin: {
          allowed: [
            'https://mindnote.app',
            'https://www.mindnote.app',
            'https://app.mindnote.app'
          ],
          denied: [
            'http://localhost:*',
            'http://127.0.0.1:*',
            'https://*.test',
            'https://*.dev'
          ],
          dynamic: false
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        headers: {
          allowed: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
          required: ['Authorization'],
          dangerous: ['*']
        },
        credentials: true,
        maxAge: 86400, // 24小时
        rateLimit: {
          enabled: true,
          requests: 500,
          window: 15 * 60 * 1000 // 15分钟
        }
      }
    }

    // Test environment
    return {
      origin: {
        allowed: ['http://localhost:*'],
        denied: [],
        dynamic: false
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: {
        allowed: ['Content-Type', 'Authorization', 'X-Requested-With'],
        required: [],
        dangerous: []
      },
      credentials: false,
      maxAge: 3600, // 1小时
      rateLimit: {
        enabled: false,
        requests: 10000,
        window: 60 * 1000 // 1分钟
      }
    }
  }

  /**
   * 验证请求源
   */
  private validateOrigin(origin: string, policy: CORSPolicy): {
    allowed: boolean
    reason?: string
    risk: 'low' | 'medium' | 'high'
  } {
    // 检查是否在受信任源列表中
    if (this.trustedOrigins.has(origin)) {
      return { allowed: true, risk: 'low' }
    }

    // 检查是否在拒绝列表中
    for (const denied of policy.origin.denied) {
      if (this.matchPattern(origin, denied)) {
        return {
          allowed: false,
          reason: `Origin matches denied pattern: ${denied}`,
          risk: 'high'
        }
      }
    }

    // 检查是否在允许列表中
    for (const allowed of policy.origin.allowed) {
      if (this.matchPattern(origin, allowed)) {
        return { allowed: true, risk: 'medium' }
      }
    }

    // 动态验证
    if (policy.origin.dynamic) {
      return this.dynamicOriginValidation(origin)
    }

    return {
      allowed: false,
      reason: 'Origin not in allowed list',
      risk: 'high'
    }
  }

  /**
   * 动态源验证
   */
  private dynamicOriginValidation(origin: string): {
    allowed: boolean
    reason?: string
    risk: 'low' | 'medium' | 'high'
  } {
    try {
      const url = new URL(origin)

      // 检查协议
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return {
          allowed: false,
          reason: 'Invalid protocol',
          risk: 'high'
        }
      }

      // 检查端口
      if (url.protocol === 'https:' && url.port && url.port !== '443') {
        return {
          allowed: false,
          reason: 'HTTPS with non-standard port',
          risk: 'medium'
        }
      }

      if (url.protocol === 'http:' && url.port && url.port !== '80' && url.port !== '3000' && url.port !== '3001') {
        return {
          allowed: false,
          reason: 'HTTP with non-standard port',
          risk: 'medium'
        }
      }

      // 检查域名模式
      const hostname = url.hostname

      // 允许本地开发
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
        return { allowed: true, risk: 'low' }
      }

      // 检查可疑域名
      const suspiciousPatterns = [
        /\.tk$/,
        /\.ml$/,
        /\.ga$/,
        /\.cf$/,
        /.*\.000webhostapp\.com$/,
        /.*\.herokuapp\.com$/,
        /.*\.netlify\.app$/
      ]

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(hostname)) {
          return {
            allowed: false,
            reason: 'Suspicious domain pattern',
            risk: 'high'
          }
        }
      }

      return { allowed: true, risk: 'medium' }

    } catch (error) {
      return {
        allowed: false,
        reason: 'Invalid origin URL',
        risk: 'high'
      }
    }
  }

  /**
   * 模式匹配
   */
  private matchPattern(origin: string, pattern: string): boolean {
    if (pattern === '*') return true

    // 支持通配符
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/:/g, '\\:')

    const regex = new RegExp(`^${regexPattern}$`, 'i')
    return regex.test(origin)
  }

  /**
   * 验证请求方法
   */
  private validateMethod(method: string, policy: CORSPolicy): {
    allowed: boolean
    reason?: string
  } {
    const normalizedMethod = method.toUpperCase()

    if (policy.methods.includes(normalizedMethod)) {
      return { allowed: true }
    }

    // OPTIONS方法总是允许（预检请求）
    if (normalizedMethod === 'OPTIONS') {
      return { allowed: true }
    }

    return {
      allowed: false,
      reason: `Method ${method} not allowed`
    }
  }

  /**
   * 验证请求头
   */
  private validateHeaders(headers: Record<string, string>, policy: CORSPolicy): {
    allowed: boolean
    missing: string[]
    dangerous: string[]
  } {
    const missing: string[] = []
    const dangerous: string[] = []

    // 检查必需的头
    for (const required of policy.headers.required) {
      if (!headers[required.toLowerCase()]) {
        missing.push(required)
      }
    }

    // 检查危险的头
    for (const [headerName, headerValue] of Object.entries(headers)) {
      for (const dangerousHeader of policy.headers.dangerous) {
        if (headerName.toLowerCase().includes(dangerousHeader.toLowerCase())) {
          dangerous.push(headerName)
        }
      }
    }

    return {
      allowed: missing.length === 0,
      missing,
      dangerous
    }
  }

  /**
   * 检查速率限制
   */
  private checkRateLimit(context: CORSRequestContext, policy: CORSPolicy): {
    allowed: boolean
    remaining: number
    resetTime: number
  } {
    if (!policy.rateLimit.enabled) {
      return { allowed: true, remaining: Infinity, resetTime: 0 }
    }

    const key = `${context.origin}:${context.ip}`
    const now = Date.now()
    const windowStart = now - policy.rateLimit.window

    let rateLimitData = this.rateLimitStore.get(key)

    if (!rateLimitData || rateLimitData.resetTime < now) {
      rateLimitData = {
        count: 0,
        resetTime: now + policy.rateLimit.window,
        blocked: false
      }
      this.rateLimitStore.set(key, rateLimitData)
    }

    if (rateLimitData.blocked) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: rateLimitData.resetTime
      }
    }

    if (rateLimitData.count >= policy.rateLimit.requests) {
      rateLimitData.blocked = true
      logger.warn('CORS rate limit exceeded', {
        origin: context.origin,
        ip: context.ip,
        userAgent: context.userAgent
      })

      return {
        allowed: false,
        remaining: 0,
        resetTime: rateLimitData.resetTime
      }
    }

    rateLimitData.count++
    const remaining = policy.rateLimit.requests - rateLimitData.count

    return {
      allowed: true,
      remaining,
      resetTime: rateLimitData.resetTime
    }
  }

  /**
   * 创建CORS上下文
   */
  private createCORSContext(request: NextRequest): CORSRequestContext {
    return {
      origin: request.headers.get('origin') || undefined,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      ip: request.ip ||
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      referer: request.headers.get('referer') || undefined
    }
  }

  /**
   * 处理CORS请求
   */
  public handleCORS(request: NextRequest): NextResponse {
    const context = this.createCORSContext(request)
    const policy = this.getCORSPolicy()

    logger.debug('CORS request', {
      origin: context.origin,
      method: context.method,
      ip: context.ip,
      userAgent: context.userAgent
    })

    // 验证速率限制
    const rateLimitResult = this.checkRateLimit(context, policy)
    if (!rateLimitResult.allowed) {
      return this.createBlockedResponse(rateLimitResult.resetTime)
    }

    // 验证源
    if (context.origin) {
      const originValidation = this.validateOrigin(context.origin, policy)
      if (!originValidation.allowed) {
        logger.warn('CORS origin validation failed', {
          origin: context.origin,
          reason: originValidation.reason,
          risk: originValidation.risk,
          ip: context.ip
        })

        return this.createErrorResponse(403, `CORS policy violation: ${originValidation.reason}`)
      }

      // 记录高风险请求
      if (originValidation.risk === 'high') {
        logger.warn('High risk CORS request', {
          origin: context.origin,
          ip: context.ip,
          userAgent: context.userAgent,
          referer: context.referer
        })
      }
    }

    // 验证方法
    const methodValidation = this.validateMethod(context.method, policy)
    if (!methodValidation.allowed) {
      return this.createErrorResponse(405, methodValidation.reason || 'Method not allowed')
    }

    // 验证头部
    const headersValidation = this.validateHeaders(context.headers, policy)
    if (!headersValidation.allowed) {
      logger.warn('CORS headers validation failed', {
        missing: headersValidation.missing,
        dangerous: headersValidation.dangerous,
        origin: context.origin
      })
    }

    // 创建响应
    if (context.method === 'OPTIONS') {
      return this.createPreflightResponse(context, policy, rateLimitResult)
    }

    return this.createCORSResponse(context, policy, rateLimitResult)
  }

  /**
   * 创建预检响应
   */
  private createPreflightResponse(
    context: CORSRequestContext,
    policy: CORSPolicy,
    rateLimitResult: { allowed: boolean; remaining: number; resetTime: number }
  ): NextResponse {
    const response = new NextResponse(null, { status: 200 })

    if (context.origin) {
      const originValidation = this.validateOrigin(context.origin, policy)
      if (originValidation.allowed) {
        response.headers.set('Access-Control-Allow-Origin', context.origin)
      }
    }

    response.headers.set('Access-Control-Allow-Methods', policy.methods.join(', '))
    response.headers.set('Access-Control-Allow-Headers', policy.headers.allowed.join(', '))
    response.headers.set('Access-Control-Max-Age', policy.maxAge.toString())

    if (policy.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    // 添加速率限制头部
    response.headers.set('X-RateLimit-Limit', policy.rateLimit.requests.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString())

    // 添加安全头部
    this.addSecurityHeaders(response)

    return response
  }

  /**
   * 创建CORS响应
   */
  private createCORSResponse(
    context: CORSRequestContext,
    policy: CORSPolicy,
    rateLimitResult: { allowed: boolean; remaining: number; resetTime: number }
  ): NextResponse {
    const response = NextResponse.next()

    if (context.origin) {
      const originValidation = this.validateOrigin(context.origin, policy)
      if (originValidation.allowed) {
        response.headers.set('Access-Control-Allow-Origin', context.origin)
        response.headers.set('Vary', 'Origin')
      }
    }

    if (policy.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    // 添加速率限制头部
    response.headers.set('X-RateLimit-Limit', policy.rateLimit.requests.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString())

    // 添加安全头部
    this.addSecurityHeaders(response)

    return response
  }

  /**
   * 添加安全头部
   */
  private addSecurityHeaders(response: NextResponse): void {
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(status: number, message: string): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: 'CORS Policy Violation',
        message,
        timestamp: new Date().toISOString()
      },
      { status }
    )
  }

  /**
   * 创建被阻止的响应
   */
  private createBlockedResponse(resetTime: number): NextResponse {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)

    return NextResponse.json(
      {
        success: false,
        error: 'Rate Limit Exceeded',
        message: 'Too many CORS requests',
        retryAfter,
        timestamp: new Date().toISOString()
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString()
        }
      }
    )
  }

  /**
   * 获取CORS统计信息
   */
  public getCORSStats(): {
    activeRateLimits: number
    trustedOrigins: number
    suspiciousOrigins: number
  } {
    return {
      activeRateLimits: this.rateLimitStore.size,
      trustedOrigins: this.trustedOrigins.size,
      suspiciousOrigins: this.suspiciousOrigins.size
    }
  }

  /**
   * 清理速率限制数据
   */
  public clearRateLimitData(): void {
    this.rateLimitStore.clear()
    logger.info('CORS rate limit data cleared')
  }

  /**
   * 添加受信任源
   */
  public addTrustedOrigin(origin: string): void {
    this.trustedOrigins.add(origin.trim())
    logger.info('Trusted origin added', { origin })
  }

  /**
   * 移除受信任源
   */
  public removeTrustedOrigin(origin: string): void {
    this.trustedOrigins.delete(origin.trim())
    logger.info('Trusted origin removed', { origin })
  }
}

/**
 * 导出单例实例
 */
export const corsSecurity = EnhancedCORSSecurity.getInstance()

/**
 * 便捷函数：处理CORS
 */
export function handleCORS(request: NextRequest): NextResponse {
  return corsSecurity.handleCORS(request)
}

/**
 * 便捷函数：创建安全的API响应
 */
export function createSecureAPIResponse(
  data: any,
  status: number = 200,
  request: NextRequest
): NextResponse {
  const response = NextResponse.json(data, { status })

  // 添加CORS头部
  const corsResponse = corsSecurity.handleCORS(request)

  // 复制CORS头部到响应
  corsResponse.headers.forEach((value, key) => {
    if (key.startsWith('Access-Control-') || key.startsWith('X-')) {
      response.headers.set(key, value)
    }
  })

  return response
}