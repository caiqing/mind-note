// AI服务认证中间件

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/ai/services'

export interface AuthResult {
  success: boolean
  userId?: string
  userRole?: string
  error?: {
    code: string
    message: string
  }
}

export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // 从请求头获取Authorization token
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('认证失败：缺少Authorization头', {
        url: request.url,
        method: request.method
      })

      return {
        success: false,
        error: {
          code: 'MISSING_AUTH_TOKEN',
          message: 'Authorization token is required'
        }
      }
    }

    const token = authHeader.substring(7) // 移除 "Bearer " 前缀

    // 验证token格式
    if (!token || token.length < 10) {
      logger.warn('认证失败：无效的token格式', {
        tokenLength: token?.length || 0
      })

      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Invalid token format'
        }
      }
    }

    // 验证token（这里应该连接到你的认证服务）
    const authResult = await verifyToken(token)

    if (!authResult.success) {
      logger.warn('认证失败：token验证失败', {
        error: authResult.error?.message
      })

      return authResult
    }

    logger.debug('认证成功', {
      userId: authResult.userId,
      userRole: authResult.userRole
    })

    return authResult

  } catch (error) {
    logger.error('认证过程中发生错误', {
      error: error.message,
      url: request.url
    })

    return {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error occurred'
      }
    }
  }
}

async function verifyToken(token: string): Promise<AuthResult> {
  try {
    // 这里应该连接到你的认证服务（如NextAuth.js、JWT验证等）
    // 以下是示例实现

    // 如果使用NextAuth.js
    if (process.env.NEXTAUTH_SECRET) {
      // 这里应该使用NextAuth.js的token验证逻辑
      // 暂时返回模拟数据
      const mockUserId = 'demo-user-id'
      const mockUserRole = 'user'

      return {
        success: true,
        userId: mockUserId,
        userRole: mockUserRole
      }
    }

    // 如果使用JWT
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any

    return {
      success: true,
      userId: decoded.sub || decoded.userId,
      userRole: decoded.role || 'user'
    }

  } catch (error) {
    logger.error('Token验证失败', {
      error: error.message,
      token: token.substring(0, 10) + '...'
    })

    return {
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    }
  }
}

// 权限检查
export function checkPermission(userRole: string, requiredPermission: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    'admin': ['*'], // 管理员拥有所有权限
    'premium': [
      'ai:analyze:note',
      'ai:read:history',
      'ai:analyze:batch',
      'ai:search:similar',
      'ai:config:read'
    ],
    'user': [
      'ai:analyze:note',
      'ai:read:history',
      'ai:search:similar'
    ],
    'guest': [
      'ai:read:history'
    ]
  }

  const permissions = rolePermissions[userRole] || []

  // 如果角色有所有权限
  if (permissions.includes('*')) {
    return true
  }

  // 检查是否有特定权限
  return permissions.includes(requiredPermission)
}

// 速率限制检查
export class RateLimiter {
  private static requests: Map<string, number[]> = new Map()
  private static readonly WINDOW_MS = 60000 // 1分钟
  private static readonly MAX_REQUESTS = 60 // 每分钟最大请求数

  static isAllowed(userId: string, userRole: string): boolean {
    const now = Date.now()
    const windowStart = now - this.WINDOW_MS

    // 获取用户的请求时间戳
    if (!this.requests.has(userId)) {
      this.requests.set(userId, [])
    }

    const userRequests = this.requests.get(userId)!

    // 清理过期的请求记录
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart)
    this.requests.set(userId, validRequests)

    // 根据用户角色设置不同的限制
    let maxRequests = this.MAX_REQUESTS
    if (userRole === 'premium') {
      maxRequests = 120 // 高级用户2倍限制
    } else if (userRole === 'admin') {
      maxRequests = 300 // 管理员5倍限制
    }

    // 检查是否超过限制
    if (validRequests.length >= maxRequests) {
      logger.warn('速率限制触发', {
        userId,
        userRole,
        requestCount: validRequests.length,
        maxRequests
      })
      return false
    }

    // 记录当前请求
    validRequests.push(now)
    this.requests.set(userId, validRequests)

    return true
  }

  static getRemainingRequests(userId: string, userRole: string): number {
    const now = Date.now()
    const windowStart = now - this.WINDOW_MS

    if (!this.requests.has(userId)) {
      return this.getMaxRequests(userRole)
    }

    const userRequests = this.requests.get(userId)!
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart)

    let maxRequests = this.MAX_REQUESTS
    if (userRole === 'premium') {
      maxRequests = 120
    } else if (userRole === 'admin') {
      maxRequests = 300
    }

    return Math.max(0, maxRequests - validRequests.length)
  }

  private static getMaxRequests(userRole: string): number {
    switch (userRole) {
      case 'admin':
        return 300
      case 'premium':
        return 120
      default:
        return 60
    }
  }
}

// 成本控制检查
export class BudgetController {
  private static dailySpending: Map<string, number> = new Map()

  static async checkBudget(userId: string, estimatedCost: number): Promise<boolean> {
    const dailyBudget = parseFloat(process.env.AI_USER_DAILY_BUDGET || '1.0')
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // 获取今日已花费金额
    if (!this.dailySpending.has(userId)) {
      this.dailySpending.set(userId, 0)
    }

    const currentSpending = this.dailySpending.get(userId)!
    const remainingBudget = dailyBudget - currentSpending

    if (estimatedCost > remainingBudget) {
      logger.warn('预算不足', {
        userId,
        estimatedCost,
        currentSpending,
        dailyBudget,
        remainingBudget
      })
      return false
    }

    return true
  }

  static recordSpending(userId: string, cost: number): void {
    const currentSpending = this.dailySpending.get(userId) || 0
    this.dailySpending.set(userId, currentSpending + cost)

    logger.debug('记录花费', {
      userId,
      cost,
      totalSpending: currentSpending + cost
    })
  }

  static getDailyBudget(): number {
    return parseFloat(process.env.AI_USER_DAILY_BUDGET || '1.0')
  }

  static getRemainingBudget(userId: string): number {
    const dailyBudget = this.getDailyBudget()
    const currentSpending = this.dailySpending.get(userId) || 0
    return Math.max(0, dailyBudget - currentSpending)
  }
}