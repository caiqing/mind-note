// 速率限制中间件

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/ai/services'

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (request: NextRequest) => string
  skipSuccessfulRequests?: boolean
}

export class RateLimiter {
  private static stores: Map<string, {
    requests: number[]
    config: RateLimitConfig
  }> = new Map()

  static createMiddleware(config: RateLimitConfig) {
    return async (request: NextRequest) => {
      const key = config.keyGenerator ? config.keyGenerator(request) : this.getDefaultKey(request)

      if (!key) {
        return NextResponse.next()
      }

      const store = this.getStore(key, config)
      const now = Date.now()
      const windowStart = now - config.windowMs

      // 清理过期的请求记录
      store.requests = store.requests.filter(timestamp => timestamp > windowStart)

      // 检查是否超过限制
      if (store.requests.length >= config.maxRequests) {
        logger.warn('速率限制触发', {
          key,
          requestCount: store.requests.length,
          maxRequests: config.maxRequests,
          windowMs: config.windowMs
        })

        return new NextResponse(
          JSON.stringify({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests',
              retryAfter: Math.ceil(config.windowMs / 1000)
            }
          }),
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil(config.windowMs / 1000).toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(Date.now() + config.windowMs).toISOString()
            }
          }
        )
      }

      // 记录当前请求
      store.requests.push(now)

      // 添加响应头
      const responseHeaders = {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': (config.maxRequests - store.requests.length).toString(),
        'X-RateLimit-Reset': new Date(now + config.windowMs).toISOString()
      }

      return { headers: responseHeaders }
    }
  }

  private static getStore(key: string, config: RateLimitConfig) {
    if (!this.stores.has(key)) {
      this.stores.set(key, {
        requests: [],
        config
      })
    }
    return this.stores.get(key)!
  }

  private static getDefaultKey(request: NextRequest): string {
    // 优先使用用户ID
    const userId = request.headers.get('x-user-id')
    if (userId) {
      return `user:${userId}`
    }

    // 其次使用IP地址
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.ip
    if (ip) {
      return `ip:${ip}`
    }

    // 最后使用请求路径
    return `path:${new URL(request.url).pathname}`
  }
}

// 预定义的速率限制配置
export const rateLimitConfigs = {
  // AI分析API - 每用户每分钟10次
  aiAnalysis: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 10,
    keyGenerator: (request: NextRequest) => {
      const userId = request.headers.get('x-user-id')
      return userId ? `ai-analysis:user:${userId}` : 'ai-analysis:anonymous'
    }
  },

  // 搜索API - 每用户每分钟30次
  search: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyGenerator: (request: NextRequest) => {
      const userId = request.headers.get('x-user-id')
      return userId ? `search:user:${userId}` : 'search:anonymous'
    }
  },

  // 批量分析API - 每用户每小时5次
  batchAnalysis: {
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 5,
    keyGenerator: (request: NextRequest) => {
      const userId = request.headers.get('x-user-id')
      return userId ? `batch:user:${userId}` : 'batch:anonymous'
    }
  },

  // 配置API - 每用户每分钟5次
  config: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyGenerator: (request: NextRequest) => {
      const userId = request.headers.get('x-user-id')
      return userId ? `config:user:${userId}` : 'config:anonymous'
    }
  },

  // 统计API - 每用户每分钟20次
  stats: {
    windowMs: 60 * 1000,
    maxRequests: 20,
    keyGenerator: (request: NextRequest) => {
      const userId = request.headers.get('x-user-id')
      return userId ? `stats:user:${userId}` : 'stats:anonymous'
    }
  }
}

// 全局速率限制 - 基于IP
export const globalRateLimit = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 100,
  keyGenerator: (request: NextRequest) => {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.ip
    return `global:${ip}`
  }
}

// 基于用户角色的速率限制
export const roleBasedRateLimit = {
  windowMs: 60 * 1000,
  maxRequests: (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return 100
      case 'premium':
        return 50
      case 'user':
        return 20
      default:
        return 10
    }
  },
  keyGenerator: (request: NextRequest) => {
    const userRole = request.headers.get('x-user-role')
    const userId = request.headers.get('x-user-id')
    return userRole && userId ? `role:${userRole}:${userId}` : 'anonymous'
  }
}

// 动态速率限制
export class DynamicRateLimiter {
  private static configs: Map<string, RateLimitConfig> = new Map()

  static setConfig(endpoint: string, config: RateLimitConfig): void {
    this.configs.set(endpoint, config)
  }

  static getConfig(endpoint: string): RateLimitConfig | null {
    return this.configs.get(endpoint) || null
  }

  static createMiddleware(endpoint: string) {
    const config = this.getConfig(endpoint)
    if (!config) {
      throw new Error(`No rate limit config found for endpoint: ${endpoint}`)
    }
    return RateLimiter.createMiddleware(config)
  }
}

// 成本感知速率限制
export class CostAwareRateLimiter {
  private static budgets: Map<string, number> = new Map()

  static setUserBudget(userId: string, budget: number): void {
    this.budgets.set(userId, budget)
  }

  static getUserBudget(userId: string): number {
    return this.budgets.get(userId) || parseFloat(process.env.AI_USER_DAILY_BUDGET || '1.0')
  }

  static createMiddleware(config: {
    baseCost: number
    windowMs: number
    budgetMultiplier?: number
  }) {
    return async (request: NextRequest) => {
      const userId = request.headers.get('x-user-id')

      if (!userId) {
        return NextResponse.next()
      }

      const userBudget = this.getUserBudget(userId)
      const effectiveBudget = userBudget * (config.budgetMultiplier || 1)
      const maxRequests = Math.floor(effectiveBudget / config.baseCost)

      return RateLimiter.createMiddleware({
        windowMs: config.windowMs,
        maxRequests,
        keyGenerator: () => `cost-aware:${userId}`
      })(request)
    }
  }
}