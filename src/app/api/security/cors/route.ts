/**
 * CORS Security Monitoring API
 *
 * CORS安全监控和健康检查API端点
 */

import { NextRequest, NextResponse } from 'next/server'
import { corsSecurity } from '@/lib/security/enhanced-cors'
import { withOptionalAuth } from '@/lib/auth/enhanced-middleware'
import logger from '@/lib/utils/logger'

/**
 * GET /api/security/cors - 获取CORS安全状态和统计信息
 */
export async function GET(request: NextRequest) {
  return withOptionalAuth(request, async (req) => {
    try {
      const stats = corsSecurity.getCORSStats()
      const isProduction = process.env.NODE_ENV === 'production'
      const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(',') || []
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || []

      const response = {
        success: true,
        data: {
          cors: {
            statistics: stats,
            configuration: {
              environment: process.env.NODE_ENV,
              credentials: process.env.CORS_CREDENTIALS === 'true',
              maxAge: parseInt(process.env.CORS_MAX_AGE || '86400'),
              rateLimit: {
                enabled: process.env.CORS_RATE_LIMIT_ENABLED === 'true',
                requests: parseInt(process.env.CORS_RATE_LIMIT_REQUESTS || '500'),
                window: parseInt(process.env.CORS_RATE_LIMIT_WINDOW || '900000')
              }
            },
            origins: {
              trusted: trustedOrigins,
              allowed: allowedOrigins,
              total: trustedOrigins.length
            },
            security: {
              httpsRequired: isProduction,
              dynamicOriginValidation: !isProduction,
              suspiciousDomainDetection: true,
              rateLimitProtection: true,
              detailedLogging: true
            }
          },
          securityHeaders: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Strict-Transport-Security': isProduction ? 'max-age=31536000; includeSubDomains; preload' : null
          },
          recommendations: generateCORSRecommendations(stats, isProduction),
          timestamp: new Date().toISOString()
        }
      }

      logger.info('CORS security status retrieved', {
        userId: req.user?.id,
        ip: req.ip || request.headers.get('x-forwarded-for'),
        statistics: stats
      })

      return NextResponse.json(response)

    } catch (error) {
      logger.error('CORS security status error:', error)

      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve CORS security status',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  })
}

/**
 * POST /api/security/cors/trusted-origins - 管理受信任源
 */
export async function POST(request: NextRequest) {
  return withOptionalAuth(request, async (req) => {
    try {
      // 验证权限（只有管理员可以修改）
      if (!req.user || !req.user.roles?.includes('admin')) {
        return NextResponse.json({
          success: false,
          error: 'Insufficient permissions',
          message: 'Admin access required'
        }, { status: 403 })
      }

      const body = await request.json()
      const { action, origin } = body

      if (!action || !origin) {
        return NextResponse.json({
          success: false,
          error: 'Invalid request',
          message: 'Action and origin are required'
        }, { status: 400 })
      }

      let result
      switch (action) {
        case 'add':
          corsSecurity.addTrustedOrigin(origin)
          result = { action: 'added', origin }
          break
        case 'remove':
          corsSecurity.removeTrustedOrigin(origin)
          result = { action: 'removed', origin }
          break
        default:
          return NextResponse.json({
            success: false,
            error: 'Invalid action',
            message: 'Action must be "add" or "remove"'
          }, { status: 400 })
      }

      logger.info('Trusted origin modified', {
        userId: req.user.id,
        action,
        origin,
        ip: req.ip || request.headers.get('x-forwarded-for')
      })

      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Trusted origin modification error:', error)

      return NextResponse.json({
        success: false,
        error: 'Failed to modify trusted origins',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  })
}

/**
 * DELETE /api/security/cors/rate-limit - 清理CORS速率限制数据
 */
export async function DELETE(request: NextRequest) {
  return withOptionalAuth(request, async (req) => {
    try {
      // 验证权限（只有管理员可以清理）
      if (!req.user || !req.user.roles?.includes('admin')) {
        return NextResponse.json({
          success: false,
          error: 'Insufficient permissions',
          message: 'Admin access required'
        }, { status: 403 })
      }

      const oldStats = corsSecurity.getCORSStats()
      corsSecurity.clearRateLimitData()
      const newStats = corsSecurity.getCORSStats()

      logger.info('CORS rate limit data cleared', {
        userId: req.user.id,
        oldActiveRateLimits: oldStats.activeRateLimits,
        ip: req.ip || request.headers.get('x-forwarded-for')
      })

      return NextResponse.json({
        success: true,
        data: {
          cleared: {
            activeRateLimits: oldStats.activeRateLimits - newStats.activeRateLimits,
            timestamp: new Date().toISOString()
          }
        }
      })

    } catch (error) {
      logger.error('CORS rate limit cleanup error:', error)

      return NextResponse.json({
        success: false,
        error: 'Failed to clear CORS rate limit data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  })
}

/**
 * 生成CORS安全建议
 */
function generateCORSRecommendations(
  stats: { activeRateLimits: number; trustedOrigins: number; suspiciousOrigins: number },
  isProduction: boolean
): string[] {
  const recommendations: string[] = []

  // 基于环境配置的建议
  if (isProduction) {
    if (stats.trustedOrigins < 3) {
      recommendations.push('生产环境建议配置更多受信任源以提高灵活性')
    }

    if (stats.activeRateLimits > 1000) {
      recommendations.push('活跃速率限制条目较多，考虑调整速率限制策略')
    }

    recommendations.push('生产环境建议定期审查和更新受信任源列表')
  } else {
    recommendations.push('开发环境CORS配置较为宽松，生产前请收紧安全策略')
    recommendations.push('测试CORS配置以确保前端应用正常工作')
  }

  // 基于统计数据的建议
  if (stats.suspiciousOrigins > 0) {
    recommendations.push('检测到可疑源，建议审查安全日志并考虑阻止')
  }

  if (stats.activeRateLimits > 500) {
    recommendations.push('速率限制活动频繁，监控系统性能表现')
  }

  // 安全最佳实践建议
  recommendations.push('定期轮换CORS安全密钥和配置')
  recommendations.push('监控CORS错误日志，及时发现潜在安全问题')
  recommendations.push('考虑使用CDN或代理来增强CORS安全性')

  return recommendations
}

/**
 * OPTIONS /api/security/cors - 处理预检请求
 */
export async function OPTIONS(request: NextRequest) {
  // 使用增强的CORS处理
  return corsSecurity.handleCORS(request)
}