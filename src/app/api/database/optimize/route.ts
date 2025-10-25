/**
 * Database Optimization API Route
 *
 * Provides database performance analysis and optimization endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authOptions } from '@/lib/auth/auth'
import { PrismaClient } from '@prisma/client'
import { getQueryOptimizer } from '@/lib/database/query-optimizer'
import logger from '@/lib/utils/logger'

const prisma = new PrismaClient()

export interface OptimizationRequest {
  action?: 'analyze' | 'optimize' | 'statistics' | 'indexes' | 'vacuum'
  table?: string
  dryRun?: boolean
}

export interface OptimizationResponse {
  success: boolean
  data?: {
    analysis?: {
      slowQueries: any[]
      frequentQueries: any[]
      errorQueries: any[]
      recommendations: string[]
      indexSuggestions: any[]
    }
    optimization?: {
      indexesCreated: number
      queriesOptimized: number
      recommendations: string[]
      executionTime: number
    }
    statistics?: {
      totalQueries: number
      averageDuration: number
      slowQueries: number
      errorRate: number
      mostActiveTable: string
      operationDistribution: Record<string, number>
    }
    indexes?: any[]
    vacuumResult?: {
      success: boolean
      tablesProcessed: string[]
      duration: number
      spaceReclaimed?: number
    }
  }
  error?: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify authentication
    const session = await authOptions.adapter?.getSession?.(request)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: OptimizationRequest = await request.json()
    const { action, table, dryRun = false } = body

    // Get query optimizer instance
    const optimizer = getQueryOptimizer(prisma)

    let response: OptimizationResponse = { success: true }

    switch (action) {
      case 'analyze':
        const analysis = await optimizer.analyzeQueries()
        response.data = { analysis }
        break

      case 'optimize':
        if (dryRun) {
          const analysis = await optimizer.analyzeQueries()
          response.data = {
            optimization: {
              indexesCreated: 0,
              queriesOptimized: analysis.slowQueries.length,
              recommendations: analysis.recommendations,
              executionTime: Date.now() - startTime
            }
          }
        } else {
          const optimization = await optimizer.optimizeQueries()
          response.data = { optimization }
        }
        break

      case 'statistics':
        const timeRange = {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          end: new Date()
        }
        const statistics = optimizer.getQueryStats(timeRange)
        response.data = { statistics }
        break

      case 'indexes':
        const indexAnalysis = await analyzeDatabaseIndexes(prisma, table)
        response.data = { indexes: indexAnalysis }
        break

      case 'vacuum':
        if (dryRun) {
          response.data = {
            vacuumResult: {
              success: true,
              tablesProcessed: table ? [table] : ['Note', 'Category', 'Tag', 'User'],
              duration: 0,
              spaceReclaimed: 0
            }
          }
        } else {
          const vacuumResult = await performVacuum(prisma, table)
          response.data = { vacuumResult }
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    const duration = Date.now() - startTime
    logger.info('Database optimization API request completed', {
      userId: session.user.id,
      action,
      duration,
      success: response.success
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Database optimization API error:', error)

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Analyze database indexes
 */
async function analyzeDatabaseIndexes(
  prisma: PrismaClient,
  table?: string
): Promise<any[]> {
  try {
    const tables = table ? [table] : ['Note', 'Category', 'Tag', 'User']
    const indexInfo = []

    for (const tableName of tables) {
      try {
        // Get index information for the table
        const result = await prisma.$queryRaw`
          SELECT
            indexname as index_name,
            indexdef as index_definition,
            tablename as table_name
          FROM pg_indexes
          WHERE tablename = ${tableName}
          ORDER BY indexname
        ` as any[]

        const tableInfo = await prisma.$queryRaw`
          SELECT
            schemaname,
            tablename,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes,
            n_live_tup as live_tuples,
            n_dead_tup as dead_tuples
          FROM pg_stat_user_tables
          WHERE tablename = ${tableName}
        ` as any

        indexInfo.push({
          table: tableName,
          indexes: result,
          statistics: tableInfo[0] || {}
        })

      } catch (error) {
        logger.warn(`Failed to analyze indexes for table ${tableName}:`, error)
        indexInfo.push({
          table: tableName,
          indexes: [],
          statistics: {},
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return indexInfo

  } catch (error) {
    logger.error('Failed to analyze database indexes:', error)
    throw error
  }
}

/**
 * Perform VACUUM operation
 */
async function performVacuum(
  prisma: PrismaClient,
  table?: string
): Promise<{
  success: boolean
  tablesProcessed: string[]
  duration: number
  spaceReclaimed?: number
}> {
  const startTime = Date.now()
  const tables = table ? [table] : ['Note', 'Category', 'Tag', 'User']
  const processedTables: string[] = []

  try {
    for (const tableName of tables) {
      try {
        logger.info(`Performing VACUUM on table ${tableName}`)

        // Perform ANALYZE first
        await prisma.$executeRawUnsafe(`ANALYZE "${tableName}";`)

        // Get table size before vacuum (simplified)
        const beforeSize = await prisma.$queryRawUnsafe(`
          SELECT pg_total_relation_size('${tableName}') as size
        `) as any[]

        // Perform VACUUM
        await prisma.$executeRawUnsafe(`VACUUM ANALYZE "${tableName}";`)

        processedTables.push(tableName)

        logger.info(`VACUUM completed for table ${tableName}`)

      } catch (error) {
        logger.error(`Failed to vacuum table ${tableName}:`, error)
        // Continue with other tables even if one fails
      }
    }

    const duration = Date.now() - startTime

    return {
      success: processedTables.length > 0,
      tablesProcessed: processedTables,
      duration
    }

  } catch (error) {
    logger.error('VACUUM operation failed:', error)
    return {
      success: false,
      tablesProcessed: processedTables,
      duration: Date.now() - startTime
    }
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST instead.' },
    { status: 405 }
  )
}