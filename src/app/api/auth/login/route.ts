/**
 * Enhanced Authentication Login API Route
 *
 * 用户登录API端点，包含速率限制、密码验证、令牌生成等功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import {
  hashPassword,
  comparePassword,
  generateAuthTokens,
  checkAuthRateLimit,
  clearAuthAttempts,
  needsRehash
} from '@/lib/auth'
import logger from '@/lib/utils/logger'

// 登录请求验证模式
const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '密码不能为空'),
  rememberMe: z.boolean().optional().default(false)
})

// 防止暴力破解的速率限制
const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15分钟
  blockDurationMs: 15 * 60 * 1000 // 15分钟封禁
}

/**
 * POST /api/auth/login - 用户登录
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const clientIP = request.ip ||
                   request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown'

  try {
    // 解析请求体
    const body = await request.json()
    const validationResult = loginSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: '请求参数无效',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 })
    }

    const { email, password, rememberMe } = validationResult.data

    // 检查登录速率限制
    const rateLimitResult = checkAuthRateLimit(
      `${clientIP}:${email}`,
      LOGIN_RATE_LIMIT.maxAttempts,
      LOGIN_RATE_LIMIT.windowMs
    )

    if (!rateLimitResult.allowed) {
      logger.warn('Login rate limit exceeded', {
        email,
        ip: clientIP,
        blockedUntil: rateLimitResult.blockedUntil
      })

      return NextResponse.json({
        success: false,
        error: '登录尝试过于频繁，请稍后再试',
        retryAfter: rateLimitResult.blockedUntil,
        code: 'RATE_LIMIT_EXCEEDED'
      }, {
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.blockedUntil?.getTime().toString() || ''
        }
      })
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        passwordHash: true,
        avatarUrl: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        loginAttempts: true,
        lockedUntil: true,
        // 获取用户角色
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    // 用户不存在
    if (!user) {
      logger.warn('Login attempt with non-existent email', {
        email,
        ip: clientIP,
        remainingAttempts: rateLimitResult.remainingAttempts - 1
      })

      return NextResponse.json({
        success: false,
        error: '邮箱或密码错误',
        code: 'INVALID_CREDENTIALS',
        remainingAttempts: rateLimitResult.remainingAttempts - 1
      }, { status: 401 })
    }

    // 检查用户账户状态
    if (!user.isActive) {
      logger.warn('Login attempt with inactive account', {
        userId: user.id,
        email,
        ip: clientIP
      })

      return NextResponse.json({
        success: false,
        error: '账户已被禁用，请联系管理员',
        code: 'ACCOUNT_DISABLED'
      }, { status: 403 })
    }

    // 检查账户是否被锁定
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      logger.warn('Login attempt with locked account', {
        userId: user.id,
        email,
        ip: clientIP,
        lockedUntil: user.lockedUntil
      })

      return NextResponse.json({
        success: false,
        error: '账户已被临时锁定，请稍后再试',
        lockedUntil: user.lockedUntil,
        code: 'ACCOUNT_LOCKED'
      }, { status: 423 })
    }

    // 验证密码
    const isPasswordValid = await comparePassword(password, user.passwordHash)

    if (!isPasswordValid) {
      // 增加失败尝试次数
      const newAttempts = (user.loginAttempts || 0) + 1
      const shouldLockAccount = newAttempts >= 5

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: newAttempts,
          lockedUntil: shouldLockAccount ? new Date(Date.now() + LOGIN_RATE_LIMIT.blockDurationMs) : null
        }
      })

      logger.warn('Login attempt with invalid password', {
        userId: user.id,
        email,
        ip: clientIP,
        attempts: newAttempts,
        locked: shouldLockAccount
      })

      return NextResponse.json({
        success: false,
        error: '邮箱或密码错误',
        code: 'INVALID_CREDENTIALS',
        remainingAttempts: Math.max(0, 5 - newAttempts)
      }, { status: 401 })
    }

    // 检查密码是否需要重新哈希
    if (await needsRehash(user.passwordHash)) {
      const newPasswordHash = await hashPassword(password)
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash }
      })
    }

    // 重置登录尝试次数
    if (user.loginAttempts > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lockedUntil: null
        }
      })
    }

    // 清除速率限制记录
    clearAuthAttempts(`${clientIP}:${email}`)

    // 提取用户角色和权限
    const roles = user.userRoles.map(ur => ur.role.name)
    const scopes = roles.includes('admin') ? ['admin', 'user'] : ['user']

    // 生成认证令牌
    const tokenMetadata = {
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15分钟后过期
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent')
    }

    const tokens = await generateAuthTokens(
      {
        id: user.id,
        email: user.email,
        name: user.fullName || user.username,
        avatar: user.avatarUrl || undefined
      },
      tokenMetadata,
      scopes
    )

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // 记录成功的登录
    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      ip: clientIP,
      processingTime: Date.now() - startTime,
      rememberMe
    })

    // 设置HTTP-only Cookie
    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.fullName || user.username,
          avatar: user.avatarUrl,
          roles,
          emailVerified: user.emailVerified,
          lastLoginAt: user.lastLoginAt
        },
        tokens: {
          accessToken: tokens.accessToken,
          // 不返回refresh token，只通过cookie发送
        }
      }
    })

    // 设置安全Cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/'
    }

    // Access token cookie（短期）
    response.cookies.set('access_token', tokens.accessToken, {
      ...cookieOptions,
      maxAge: rememberMe ? 7 * 24 * 60 * 60 : 15 * 60 // 7天或15分钟
    })

    // Refresh token cookie（长期）
    response.cookies.set('refresh_token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60 // 30天或7天
    })

    // 添加安全头部
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    return response

  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Login API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: clientIP,
      processingTime
    })

    return NextResponse.json({
      success: false,
      error: '登录失败，请稍后再试',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

/**
 * GET /api/auth/login - 获取登录状态信息
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      rateLimit: {
        maxAttempts: LOGIN_RATE_LIMIT.maxAttempts,
        windowMinutes: LOGIN_RATE_LIMIT.windowMs / (60 * 1000),
        blockDurationMinutes: LOGIN_RATE_LIMIT.blockDurationMs / (60 * 1000)
      },
      passwordRequirements: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      }
    }
  })
}