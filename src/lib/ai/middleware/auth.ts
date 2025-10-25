// AI服务认证中间件

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/ai/services'

export interface AuthResult {
  success: boolean
  userId?: string
  userRole?: string
  userInfo?: {
    email: string
    permissions: string[]
  }
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

// JWT Token验证
import jwt from 'jsonwebtoken'
import { Logger } from '@/lib/ai/services/logger'

export interface JWTPayload {
  sub: string // 用户ID
  email: string
  role: string
  permissions: string[]
  iat?: number // 签发时间
  exp?: number // 过期时间
  jti?: string // JWT ID
  iss?: string // 签发者
  aud?: string // 受众
}

// 被撤销的token黑名单（生产环境应使用Redis）
const revokedTokens = new Set<string>()

async function verifyToken(token: string): Promise<AuthResult> {
  const logger = Logger.getInstance()

  try {
    // 检查token是否被撤销
    if (await isTokenRevoked(token)) {
      logger.warn('Token已被撤销', {
        tokenPrefix: token.substring(0, 10)
      })

      return {
        success: false,
        error: {
          code: 'TOKEN_REVOKED',
          message: 'Token has been revoked'
        }
      }
    }

    // 验证JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      logger.error('JWT_SECRET环境变量未设置')
      return {
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'Server configuration error'
        }
      }
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload

    // 验证token结构
    if (!decoded.sub || !decoded.role) {
      logger.warn('Token结构无效', {
        hasSub: !!decoded.sub,
        hasRole: !!decoded.role
      })

      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN_STRUCTURE',
          message: 'Invalid token structure'
        }
      }
    }

    // 检查用户权限和状态（这里应该连接到用户数据库）
    const userStatus = await getUserStatus(decoded.sub)
    if (!userStatus.active) {
      logger.warn('用户账户未激活', {
        userId: decoded.sub
      })

      return {
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is not active'
        }
      }
    }

    logger.info('Token验证成功', {
      userId: decoded.sub,
      role: decoded.role,
      email: decoded.email
    })

    return {
      success: true,
      userId: decoded.sub,
      userRole: decoded.role,
      // 可以返回更多用户信息
      userInfo: {
        email: decoded.email,
        permissions: decoded.permissions || []
      }
    }

  } catch (error: any) {
    logger.error('Token验证失败', {
      error: error.message,
      errorName: error.name,
      tokenPrefix: token.substring(0, 10) + '...'
    })

    // 根据错误类型返回不同的错误码
    let errorCode = 'INVALID_TOKEN'
    let errorMessage = 'Invalid or expired token'

    if (error.name === 'TokenExpiredError') {
      errorCode = 'TOKEN_EXPIRED'
      errorMessage = 'Token has expired'
    } else if (error.name === 'JsonWebTokenError') {
      errorCode = 'MALFORMED_TOKEN'
      errorMessage = 'Malformed token'
    } else if (error.name === 'NotBeforeError') {
      errorCode = 'TOKEN_NOT_ACTIVE'
      errorMessage = 'Token is not active yet'
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage
      }
    }
  }
}

// 检查token是否被撤销
async function isTokenRevoked(token: string): Promise<boolean> {
  // 生产环境应该使用Redis或其他持久化存储
  return revokedTokens.has(token)
}

// 撤销token
export async function revokeToken(token: string): Promise<void> {
  const logger = Logger.getInstance()

  try {
    const decoded = jwt.decode(token) as any
    if (decoded && decoded.jti) {
      revokedTokens.add(token)
      logger.info('Token已撤销', { jti: decoded.jti })
    }
  } catch (error) {
    logger.error('撤销token失败', { error: error.message })
  }
}

// 模拟用户状态检查（生产环境应该连接数据库）
async function getUserStatus(userId: string): Promise<{ active: boolean; role: string }> {
  // 这里应该查询数据库获取用户状态
  // 暂时返回默认值
  return {
    active: true,
    role: 'user'
  }
}

// 生成JWT token（用于登录）
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET环境变量未设置')
  }

  const jwtPayload: JWTPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24小时过期
    jti: generateJTI(),
    iss: 'mindnote-ai',
    aud: 'mindnote-users'
  }

  return jwt.sign(jwtPayload, jwtSecret)
}

// 生成唯一的JWT ID
function generateJTI(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// 刷新token
export async function refreshToken(refreshToken: string): Promise<{ token: string; expiresIn: number }> {
  const logger = Logger.getInstance()

  try {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error('JWT_SECRET环境变量未设置')
    }

    // 验证refresh token
    const decoded = jwt.verify(refreshToken, jwtSecret) as any

    // 生成新的access token
    const newPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    }

    const newToken = generateToken(newPayload)

    logger.info('Token刷新成功', {
      userId: decoded.sub
    })

    return {
      token: newToken,
      expiresIn: 24 * 60 * 60 // 24小时
    }

  } catch (error: any) {
    logger.error('Token刷新失败', {
      error: error.message
    })

    throw new Error('Invalid refresh token')
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