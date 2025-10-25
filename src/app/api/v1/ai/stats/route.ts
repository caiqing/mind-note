// AI使用统计API

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/ai/services'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const timeRange = searchParams.get('timeRange') || '24h' // 24h, 7d, 30d

    logger.info('获取AI统计请求', { userId, timeRange })

    // 计算时间范围
    const now = new Date()
    let startTime: Date

    switch (timeRange) {
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    const whereClause: any = {
      createdAt: {
        gte: startTime
      },
      success: true
    }

    if (userId) {
      whereClause.userId = userId
    }

    // 获取统计数据
    const [
      totalAnalyses,
      totalCost,
      totalTokens,
      providerStats,
      typeStats,
      dailyStats,
      errorStats
    ] = await Promise.all([
      // 总分析次数
      prisma.analysisLog.count({ where: whereClause }),

      // 总成本
      prisma.analysisLog.aggregate({
        where: whereClause,
        _sum: { cost: true }
      }),

      // 总Token数
      prisma.analysisLog.aggregate({
        where: whereClause,
        _sum: { totalTokens: true }
      }),

      // 按提供商统计
      prisma.analysisLog.groupBy({
        by: ['aiProviderId'],
        where: whereClause,
        _count: true,
        _sum: { cost: true, totalTokens: true },
        _avg: { responseTime: true }
      }),

      // 按分析类型统计
      prisma.analysisLog.groupBy({
        by: ['requestType'],
        where: whereClause,
        _count: true,
        _sum: { cost: true, totalTokens: true }
      }),

      // 按日统计（最近7天）
      prisma.$queryRaw`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count,
          SUM(cost) as cost,
          SUM(total_tokens) as tokens,
          AVG(response_time) as avg_response_time
        FROM analysis_logs
        WHERE created_at >= $1
          AND success = true
          ${userId ? 'AND user_id = $2' : ''}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 7
      `,
      userId ? [startTime, userId] : [startTime],

      // 错误统计
      prisma.analysisLog.groupBy({
        by: ['errorCode'],
        where: {
          createdAt: { gte: startTime },
          success: false,
          ...(userId && { userId })
        },
        _count: true
      })
    ])

    // 计算平均响应时间
    const avgResponseTime = await prisma.analysisLog.aggregate({
      where: whereClause,
      _avg: { responseTime: true }
    })

    // 计算成功率
    const [successCount, totalCount] = await Promise.all([
      prisma.analysisLog.count({
        where: {
          ...whereClause,
          success: true
        }
      }),
      prisma.analysisLog.count({
        where: {
          createdAt: { gte: startTime },
          ...(userId && { userId })
        }
      })
    ])

    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0

    const stats = {
      summary: {
        totalAnalyses,
        totalCost: Number(totalCost._sum.cost || 0),
        totalTokens: Number(totalTokens._sum.totalTokens || 0),
        avgResponseTime: Number(avgResponseTime._avg.responseTime || 0),
        successRate: Math.round(successRate * 100) / 100,
        timeRange
      },
      providers: providerStats.map(stat => ({
        providerId: stat.aiProviderId,
        count: stat._count,
        cost: Number(stat._sum.cost || 0),
        tokens: Number(stat._sum.totalTokens || 0),
        avgResponseTime: Number(stat._avg.responseTime || 0)
      })),
      types: typeStats.map(stat => ({
        type: stat.requestType,
        count: stat._count,
        cost: Number(stat._sum.cost || 0),
        tokens: Number(stat._sum.totalTokens || 0)
      })),
      daily: (dailyStats as any[]).map(stat => ({
        date: stat.date,
        count: Number(stat.count),
        cost: Number(stat.cost),
        tokens: Number(stat.tokens),
        avgResponseTime: Number(stat.avg_response_time)
      })),
      errors: errorStats.map(stat => ({
        errorCode: stat.errorCode || 'UNKNOWN',
        count: stat._count
      }))
    }

    logger.info('AI统计获取成功', {
      userId,
      timeRange,
      totalAnalyses: stats.summary.totalAnalyses,
      totalCost: stats.summary.totalCost
    })

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    logger.error('获取AI统计失败', { error: error.message })

    return NextResponse.json({
      success: false,
      error: {
        code: 'STATS_FETCH_FAILED',
        message: 'Failed to fetch AI statistics'
      }
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}