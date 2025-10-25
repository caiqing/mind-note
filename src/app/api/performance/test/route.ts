/**
 * Performance Test API Route
 *
 * Provides comprehensive performance testing endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authOptions } from '@/lib/auth/auth'
import { PerformanceTester, DEFAULT_PERFORMANCE_TEST_CONFIG } from '@/lib/performance/performance-tester'
import logger from '@/lib/utils/logger'

export interface PerformanceTestRequest {
  config?: any
  runId?: string
  saveResults?: boolean
}

export interface PerformanceTestResponse {
  success: boolean
  data?: {
    runId: string
    results?: any
    status?: 'running' | 'completed' | 'failed'
    progress?: number
    message?: string
  }
  error?: string
}

// Running tests registry
const runningTests = new Map<string, {
  status: 'running' | 'completed' | 'failed'
  startTime: Date
  results?: any
  progress: number
  message: string
}>()

/**
 * POST - Run performance test
 */
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
    const body: PerformanceTestRequest = await request.json()
    const { config = DEFAULT_PERFORMANCE_TEST_CONFIG, saveResults = true } = body

    // Generate unique run ID
    const runId = `perf_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Register test run
    runningTests.set(runId, {
      status: 'running',
      startTime: new Date(),
      progress: 0,
      message: '初始化性能测试...'
    })

    // Start test in background
    runPerformanceTestAsync(runId, config, saveResults, session.user.id)

    const response: PerformanceTestResponse = {
      success: true,
      data: {
        runId,
        status: 'running',
        progress: 0,
        message: '性能测试已启动'
      }
    }

    const duration = Date.now() - startTime
    logger.info('Performance test initiated', {
      userId: session.user.id,
      runId,
      duration,
      success: response.success
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Performance test initiation error:', error)

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET - Get test status or results
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await authOptions.adapter?.getSession?.(request)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')

    if (!runId) {
      return NextResponse.json(
        { success: false, error: 'Run ID is required' },
        { status: 400 }
      )
    }

    const testRun = runningTests.get(runId)

    if (!testRun) {
      return NextResponse.json(
        { success: false, error: 'Test run not found' },
        { status: 404 }
      )
    }

    const response: PerformanceTestResponse = {
      success: true,
      data: {
        runId,
        status: testRun.status,
        results: testRun.results,
        progress: testRun.progress,
        message: testRun.message
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Performance test status check error:', error)

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Cancel running test
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const session = await authOptions.adapter?.getSession?.(request)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')

    if (!runId) {
      return NextResponse.json(
        { success: false, error: 'Run ID is required' },
        { status: 400 }
      )
    }

    const testRun = runningTests.get(runId)

    if (!testRun) {
      return NextResponse.json(
        { success: false, error: 'Test run not found' },
        { status: 404 }
      )
    }

    if (testRun.status === 'running') {
      testRun.status = 'failed'
      testRun.message = '测试已被用户取消'
      testRun.progress = 100
    }

    return NextResponse.json({
      success: true,
      data: {
        runId,
        status: testRun.status,
        message: '测试已取消'
      }
    })

  } catch (error) {
    logger.error('Performance test cancellation error:', error)

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Run performance test asynchronously
 */
async function runPerformanceTestAsync(
  runId: string,
  config: any,
  saveResults: boolean,
  userId: string
): Promise<void> {
  const testRun = runningTests.get(runId)!
  const performanceTester = new PerformanceTester()

  try {
    // Update progress
    testRun.progress = 10
    testRun.message = '正在测试数据库性能...'

    // Run performance test
    const results = await performanceTester.runPerformanceTest(config)

    // Update progress
    testRun.progress = 90
    testRun.message = '正在生成测试报告...'

    // Save results if requested
    if (saveResults) {
      await saveTestResults(userId, runId, results)
    }

    // Update final status
    testRun.status = 'completed'
    testRun.results = results
    testRun.progress = 100
    testRun.message = `测试完成 - 总分: ${results.overallScore} (${results.grade})`

    logger.info('Performance test completed', {
      userId,
      runId,
      overallScore: results.overallScore,
      grade: results.grade
    })

  } catch (error) {
    logger.error('Performance test failed:', error)

    testRun.status = 'failed'
    testRun.progress = 100
    testRun.message = `测试失败: ${error instanceof Error ? error.message : '未知错误'`
  }
}

/**
 * Save test results (placeholder for database storage)
 */
async function saveTestResults(userId: string, runId: string, results: any): Promise<void> {
  // In a real implementation, this would save to database
  logger.info('Saving test results', { userId, runId, overallScore: results.overallScore })

  // For now, just log the results
  console.log(`Performance Test Results for ${runId}:`, {
    timestamp: results.timestamp,
    overallScore: results.overallScore,
    grade: results.grade,
    criticalIssues: results.criticalIssues.length,
    highPriorityOptimizations: results.highPriorityOptimizations.length
  })
}

/**
 * Clean up old test runs (should be called periodically)
 */
export function cleanupOldTestRuns(maxAge: number = 24 * 60 * 60 * 1000): void {
  const now = Date.now()

  for (const [runId, testRun] of runningTests.entries()) {
    const age = now - testRun.startTime.getTime()

    if (age > maxAge) {
      runningTests.delete(runId)
      logger.info('Cleaned up old test run', { runId, age })
    }
  }
}

// Auto-cleanup every hour
setInterval(() => {
  cleanupOldTestRuns()
}, 60 * 60 * 1000)