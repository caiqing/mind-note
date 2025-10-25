/**
 * Enhanced Authentication Middleware
 *
 * 完善的认证中间件，包含JWT验证、用户会话管理、权限控制等功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractTokenFromHeader, AuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import logger from '@/lib/utils/logger'

// 扩展Request接口以包含用户信息
declare global {
  interface Request {
    user?: AuthUser
  }
}

// Token黑名单存储（生产环境应使用Redis）
const tokenBlacklist = new Set<string>()

// 用户会话缓存
const userSessionCache = new Map<string, { user: AuthUser; lastUpdated: number }>()
const SESSION_CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

/**
 * 从数据库获取用户信息
 */
async function getUserFromDatabase(userId: string): Promise<AuthUser | null> {
  try {
    // 首先检查缓存
    const cached = userSessionCache.get(userId)
    if (cached && Date.now() - cached.lastUpdated < SESSION_CACHE_TTL) {
      return cached.user
    }

    // 从数据库获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        isActive: true,
        emailVerified: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      }
    })

    if (!user || !user.isActive) {
      return null
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.fullName || user.username,
      avatar: user.avatarUrl || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }

    // 更新缓存
    userSessionCache.set(userId, {
      user: authUser,
      lastUpdated: Date.now()
    })

    // 定期清理缓存
    if (userSessionCache.size > 1000) {
      const entriesToDelete: string[] = []
      for (const [uid, session] of userSessionCache.entries()) {
        if (Date.now() - session.lastUpdated > SESSION_CACHE_TTL) {
          entriesToDelete.push(uid)
        }
      }
      entriesToDelete.forEach(uid => userSessionCache.delete(uid))
    }

    return authUser
  } catch (error) {
    logger.error('Failed to get user from database:', error)
    return null
  }
}

/**
 * 检查token是否在黑名单中
 */
function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token)
}

/**
 * 将token添加到黑名单
 */
function addTokenToBlacklist(token: string): void {
  tokenBlacklist.add(token)

  // 定期清理黑名单（避免内存泄漏）
  if (tokenBlacklist.size > 10000) {
    // 简单的清理策略：删除一半的token
    const tokens = Array.from(tokenBlacklist)
    tokens.slice(0, 5000).forEach(token => tokenBlacklist.delete(token))
  }
}

/**
 * 验证用户权限
 */
async function checkUserPermission(userId: string, resource: string, action: string): Promise<boolean> {
  try {
    // 获取用户权限
    const userPermissions = await prisma.permission.findMany({
      where: {
        userId: userId,
        isActive: true
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    })

    // 检查管理员权限
    const isAdmin = userPermissions.some(p => p.role.name === 'admin')
    if (isAdmin) {
      return true
    }

    // 检查具体权限
    const requiredPermission = `${resource}:${action}`
    const hasPermission = userPermissions.some(p =>
      p.resource === resource && p.action === action ||
      p.role.rolePermissions.some(rp =>
        rp.permission.name === requiredPermission
      )
    )

    return hasPermission
  } catch (error) {
    logger.error('Failed to check user permission:', error)
    return false
  }
}

/**
 * 认证中间件
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest & { user: AuthUser }) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // 提取Authorization头中的token
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader || undefined)

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        ip: request.ip,
        userAgent: request.headers.get('user-agent'),
        url: request.url
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          message: 'No token provided',
          code: 'AUTH_TOKEN_MISSING'
        },
        { status: 401 }
      )
    }

    // 检查token是否在黑名单中
    if (isTokenBlacklisted(token)) {
      logger.warn('Authentication failed: Token is blacklisted', {
        ip: request.ip,
        url: request.url
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token',
          message: 'Token has been revoked',
          code: 'AUTH_TOKEN_REVOKED'
        },
        { status: 401 }
      )
    }

    // 验证JWT token
    const payload = await verifyAccessToken(token)

    if (!payload) {
      logger.warn('Authentication failed: Invalid token', {
        ip: request.ip,
        url: request.url
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token',
          message: 'Token is invalid or expired',
          code: 'AUTH_TOKEN_INVALID'
        },
        { status: 401 }
      )
    }

    // 从数据库获取用户信息
    const user = await getUserFromDatabase(payload.userId)

    if (!user) {
      logger.warn('Authentication failed: User not found or inactive', {
        userId: payload.userId,
        ip: request.ip,
        url: request.url
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token',
          message: 'User not found or inactive',
          code: 'AUTH_USER_INACTIVE'
        },
        { status: 401 }
      )
    }

    // 将用户信息添加到请求对象
    const authenticatedRequest = request as NextRequest & { user }
    authenticatedRequest.user = user

    // 记录成功的认证
    logger.info('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      ip: request.ip,
      processingTime: Date.now() - startTime
    })

    // 执行处理器
    const response = await handler(authenticatedRequest)

    // 添加安全头部
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    return response

  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Authentication middleware error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: request.ip,
      url: request.url,
      processingTime
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Authentication failed',
        message: 'Internal server error',
        code: 'AUTH_INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

/**
 * 可选认证中间件（不强制要求认证）
 */
export async function withOptionalAuth(
  request: NextRequest,
  handler: (request: NextRequest & { user?: AuthUser }) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader || undefined)

    if (token && !isTokenBlacklisted(token)) {
      const payload = await verifyAccessToken(token)

      if (payload) {
        const user = await getUserFromDatabase(payload.userId)

        if (user) {
          const authenticatedRequest = request as NextRequest & { user }
          authenticatedRequest.user = user
          return await handler(authenticatedRequest)
        }
      }
    }

    // 未认证用户，直接执行处理器
    return await handler(request as NextRequest & { user?: AuthUser })

  } catch (error) {
    logger.error('Optional authentication middleware error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication failed',
        message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * 权限控制中间件
 */
export function withPermission(resource: string, action: string) {
  return async (
    request: NextRequest & { user: AuthUser },
    handler: (request: NextRequest & { user: AuthUser }) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    try {
      const hasPermission = await checkUserPermission(request.user.id, resource, action)

      if (!hasPermission) {
        logger.warn('Access denied: Insufficient permissions', {
          userId: request.user.id,
          resource,
          action,
          ip: request.ip,
          url: request.url
        })

        return NextResponse.json(
          {
            success: false,
            error: 'Access denied',
            message: `Insufficient permissions for ${action} on ${resource}`,
            code: 'AUTH_INSUFFICIENT_PERMISSIONS'
          },
          { status: 403 }
        )
      }

      return await handler(request)
    } catch (error) {
      logger.error('Permission check error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Access control failed',
          message: 'Internal server error'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * 角色控制中间件
 */
export function withRole(requiredRoles: string | string[]) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

  return async (
    request: NextRequest & { user: AuthUser },
    handler: (request: NextRequest & { user: AuthUser }) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    try {
      // 获取用户角色
      const userRoles = await prisma.userRole.findMany({
        where: {
          userId: request.user.id,
          isActive: true
        },
        include: {
          role: true
        }
      })

      const userRoleNames = userRoles.map(ur => ur.role.name)

      // 检查是否有必需的角色
      const hasRequiredRole = roles.some(role =>
        userRoleNames.includes(role) || userRoleNames.includes('admin')
      )

      if (!hasRequiredRole) {
        logger.warn('Access denied: Insufficient roles', {
          userId: request.user.id,
          userRoles: userRoleNames,
          requiredRoles: roles,
          ip: request.ip,
          url: request.url
        })

        return NextResponse.json(
          {
            success: false,
            error: 'Access denied',
            message: `Requires one of these roles: ${roles.join(', ')}`,
            code: 'AUTH_INSUFFICIENT_ROLES'
          },
          { status: 403 }
        )
      }

      return await handler(request)
    } catch (error) {
      logger.error('Role check error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Access control failed',
          message: 'Internal server error'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * 速率限制中间件（改进版）
 */
const rateLimitStore = new Map<string, { count: number; lastReset: number; blockedUntil?: number }>()

export function withRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const clientIP = request.ip ||
                     request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'

    const now = Date.now()
    const windowStart = now - windowMs

    // 获取或创建速率限制数据
    let rateLimitData = rateLimitStore.get(clientIP)

    if (!rateLimitData || rateLimitData.lastReset < windowStart) {
      rateLimitData = {
        count: 0,
        lastReset: now,
        blockedUntil: undefined
      }
      rateLimitStore.set(clientIP, rateLimitData)
    }

    // 检查是否被临时封禁
    if (rateLimitData.blockedUntil && now < rateLimitData.blockedUntil) {
      const remainingTime = Math.ceil((rateLimitData.blockedUntil - now) / 1000)

      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${remainingTime} seconds.`,
          code: 'RATE_LIMIT_BLOCKED',
          retryAfter: remainingTime
        },
        {
          status: 429,
          headers: {
            'Retry-After': remainingTime.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitData.blockedUntil.toString()
          }
        }
      )
    }

    // 检查速率限制
    if (rateLimitData.count >= maxRequests) {
      // 临时封禁该IP
      rateLimitData.blockedUntil = now + windowMs

      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Max ${maxRequests} requests per ${windowMs / 1000} seconds.`,
          code: 'RATE_LIMIT_EXCEEDED'
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(windowMs / 1000).toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (now + windowMs).toString()
          }
        }
      )
    }

    // 增加请求计数
    rateLimitData.count++

    // 添加速率限制头部
    const response = await handler(request)
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', (maxRequests - rateLimitData.count).toString())
    response.headers.set('X-RateLimit-Reset', (rateLimitData.lastReset + windowMs).toString())

    // 定期清理旧的速率限制数据
    if (Math.random() < 0.01) { // 1% 概率清理
      const entriesToDelete: string[] = []
      for (const [ip, data] of rateLimitStore.entries()) {
        if (data.lastReset < windowStart && (!data.blockedUntil || data.blockedUntil < now)) {
          entriesToDelete.push(ip)
        }
      }
      entriesToDelete.forEach(ip => rateLimitStore.delete(ip))
    }

    return response
  }
}

/**
 * 登出用户（将token加入黑名单）
 */
export async function logoutUser(token: string): Promise<void> {
  addTokenToBlacklist(token)
  logger.info('User logged out, token added to blacklist')
}

/**
 * 清理用户会话缓存
 */
export function clearUserSessionCache(userId?: string): void {
  if (userId) {
    userSessionCache.delete(userId)
  } else {
    userSessionCache.clear()
  }
}

export default {
  withAuth,
  withOptionalAuth,
  withPermission,
  withRole,
  withRateLimit,
  logoutUser,
  clearUserSessionCache,
}