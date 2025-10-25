/**
 * CORS Configuration Testing Tool
 *
 * CORS配置测试工具，用于验证跨域策略的正确性和安全性
 */

import { corsSecurity } from './enhanced-cors'
import logger from '@/lib/utils/logger'

export interface CORSTestCase {
  name: string
  origin: string
  method: string
  headers: Record<string, string>
  expected: {
    allowed: boolean
    status?: number
    headers?: string[]
  }
  description: string
}

export interface CORSTestResult {
  testCase: CORSTestCase
  passed: boolean
  actual: {
    allowed: boolean
    status: number
    headers: Record<string, string>
    error?: string
  }
  performance: {
    duration: number
  }
  timestamp: string
}

export interface CORSTestSummary {
  total: number
  passed: number
  failed: number
  duration: number
  results: CORSTestResult[]
  recommendations: string[]
  securityScore: number
}

/**
 * CORS Configuration Tester
 */
export class CORSTester {
  private testCases: CORSTestCase[] = []

  constructor() {
    this.initializeTestCases()
  }

  /**
   * 初始化测试用例
   */
  private initializeTestCases(): void {
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isProduction = process.env.NODE_ENV === 'production'

    // 基础功能测试
    this.testCases.push(
      {
        name: 'Allowed Origin GET',
        origin: 'http://localhost:3000',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
        expected: { allowed: true },
        description: '测试允许源的GET请求'
      },
      {
        name: 'Allowed Origin POST',
        origin: 'http://localhost:3000',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer token'
        },
        expected: { allowed: true },
        description: '测试允许源的POST请求'
      },
      {
        name: 'OPTIONS Preflight',
        origin: 'http://localhost:3000',
        method: 'OPTIONS',
        headers: {
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type,authorization'
        },
        expected: { allowed: true, status: 200 },
        description: '测试预检请求处理'
      }
    )

    // 安全性测试
    if (isProduction) {
      this.testCases.push(
        {
          name: 'Blocked HTTP Origin',
          origin: 'http://malicious-site.com',
          method: 'GET',
          headers: { 'content-type': 'application/json' },
          expected: { allowed: false, status: 403 },
          description: '生产环境应阻止不受信任的HTTP源'
        },
        {
          name: 'Blocked Localhost in Production',
          origin: 'http://localhost:4000',
          method: 'GET',
          headers: { 'content-type': 'application/json' },
          expected: { allowed: false, status: 403 },
          description: '生产环境应阻止localhost请求'
        }
      )
    }

    // 开发环境特定测试
    if (isDevelopment) {
      this.testCases.push(
        {
          name: 'Development 127.0.0.1',
          origin: 'http://127.0.0.1:3000',
          method: 'GET',
          headers: { 'content-type': 'application/json' },
          expected: { allowed: true },
          description: '开发环境允许127.0.0.1访问'
        },
        {
          name: 'Development Port Range',
          origin: 'http://localhost:3001',
          method: 'GET',
          headers: { 'content-type': 'application/json' },
          expected: { allowed: true },
          description: '开发环境允许其他开发端口'
        }
      )
    }

    // 恶意请求测试
    this.testCases.push(
      {
        name: 'Suspicious User Agent',
        origin: 'http://localhost:3000',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'curl/7.68.0'
        },
        expected: { allowed: true }, // 仍然允许，但会记录警告
        description: '测试可疑User-Agent的处理'
      },
      {
        name: 'Missing Content-Type',
        origin: 'http://localhost:3000',
        method: 'POST',
        headers: { 'authorization': 'Bearer token' },
        expected: { allowed: true }, // 中间件会处理
        description: '测试缺少Content-Type的请求'
      },
      {
        name: 'Large Content-Length',
        origin: 'http://localhost:3000',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': '15728640' // 15MB
        },
        expected: { allowed: true }, // 中间件会处理
        description: '测试大内容长度请求'
      }
    )

    // 方法测试
    this.testCases.push(
      {
        name: 'Unsupported Method',
        origin: 'http://localhost:3000',
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        expected: { allowed: false, status: 405 },
        description: '测试不支持的HTTP方法'
      },
      {
        name: 'Valid PUT Method',
        origin: 'http://localhost:3000',
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer token'
        },
        expected: { allowed: true },
        description: '测试支持的PUT方法'
      }
    )

    // 头部测试
    this.testCases.push(
      {
        name: 'Custom Headers',
        origin: 'http://localhost:3000',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
          'x-api-key': 'secret-key'
        },
        expected: { allowed: true },
        description: '测试自定义请求头'
      },
      {
        name: 'Dangerous Headers',
        origin: 'http://localhost:3000',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.100',
          'x-real-ip': '10.0.0.1'
        },
        expected: { allowed: true }, // 仍然允许，但会记录
        description: '测试可能危险的请求头'
      }
    )
  }

  /**
   * 执行单个测试用例
   */
  private async runTestCase(testCase: CORSTestCase): Promise<CORSTestResult> {
    const startTime = Date.now()

    try {
      // 创建模拟请求
      const mockRequest = this.createMockRequest(testCase)

      // 执行CORS处理
      const response = corsSecurity.handleCORS(mockRequest)

      const duration = Date.now() - startTime

      // 检查结果
      const allowed = response.status < 400
      const passed = allowed === testCase.expected.allowed &&
        (!testCase.expected.status || response.status === testCase.expected.status)

      // 提取响应头
      const headers: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        headers[key] = value
      })

      const result: CORSTestResult = {
        testCase,
        passed,
        actual: {
          allowed,
          status: response.status,
          headers
        },
        performance: {
          duration
        },
        timestamp: new Date().toISOString()
      }

      // 记录测试结果
      if (passed) {
        logger.debug('CORS test passed', {
          testName: testCase.name,
          origin: testCase.origin,
          method: testCase.method,
          duration
        })
      } else {
        logger.warn('CORS test failed', {
          testName: testCase.name,
          origin: testCase.origin,
          method: testCase.method,
          expected: testCase.expected,
          actual: { allowed, status: response.status },
          duration
        })
      }

      return result

    } catch (error) {
      const duration = Date.now() - startTime

      logger.error('CORS test error', {
        testName: testCase.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      })

      return {
        testCase,
        passed: false,
        actual: {
          allowed: false,
          status: 500,
          headers: {},
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        performance: {
          duration
        },
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * 创建模拟请求
   */
  private createMockRequest(testCase: CORSTestCase): Request {
    const url = `http://localhost:3000/api/test`
    const headers = new Headers()

    // 设置Origin头
    if (testCase.origin) {
      headers.set('origin', testCase.origin)
    }

    // 设置其他头部
    Object.entries(testCase.headers).forEach(([key, value]) => {
      headers.set(key, value)
    })

    // 设置通用头部
    headers.set('user-agent', 'CORS-Tester/1.0')
    headers.set('x-forwarded-for', '127.0.0.1')

    // 创建请求
    const request = new Request(url, {
      method: testCase.method,
      headers
    })

    return request
  }

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<CORSTestSummary> {
    const startTime = Date.now()
    const results: CORSTestResult[] = []

    logger.info('Starting CORS configuration tests', {
      totalTests: this.testCases.length,
      environment: process.env.NODE_ENV
    })

    // 并行执行测试（限制并发数）
    const concurrencyLimit = 5
    for (let i = 0; i < this.testCases.length; i += concurrencyLimit) {
      const batch = this.testCases.slice(i, i + concurrencyLimit)
      const batchResults = await Promise.all(
        batch.map(testCase => this.runTestCase(testCase))
      )
      results.push(...batchResults)
    }

    const totalDuration = Date.now() - startTime
    const passed = results.filter(r => r.passed).length
    const failed = results.length - passed

    // 生成建议
    const recommendations = this.generateRecommendations(results)

    // 计算安全评分
    const securityScore = this.calculateSecurityScore(results)

    const summary: CORSTestSummary = {
      total: results.length,
      passed,
      failed,
      duration: totalDuration,
      results,
      recommendations,
      securityScore
    }

    logger.info('CORS configuration tests completed', {
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      securityScore: summary.securityScore,
      duration: summary.duration
    })

    return summary
  }

  /**
   * 生成测试建议
   */
  private generateRecommendations(results: CORSTestResult[]): string[] {
    const recommendations: string[] = []

    // 分析失败测试
    const failedTests = results.filter(r => !r.passed)
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} 个测试失败，需要检查CORS配置`)

      const commonFailures = failedTests.reduce((acc, result) => {
        const reason = result.actual.error || `Status ${result.actual.status}`
        acc[reason] = (acc[reason] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      Object.entries(commonFailures).forEach(([reason, count]) => {
        recommendations.push(`${count} 个测试因"${reason}"失败`)
      })
    }

    // 性能分析
    const avgDuration = results.reduce((sum, r) => sum + r.performance.duration, 0) / results.length
    if (avgDuration > 50) {
      recommendations.push('CORS处理平均耗时较长，考虑优化性能')
    }

    // 安全性分析
    const suspiciousResults = results.filter(r =>
      r.testCase.name.includes('Suspicious') || r.testCase.name.includes('Dangerous')
    )
    if (suspiciousResults.length > 0 && suspiciousResults.every(r => r.passed)) {
      recommendations.push('可疑请求被允许通过，确保已启用适当的监控和日志记录')
    }

    // 环境特定建议
    const isProduction = process.env.NODE_ENV === 'production'
    if (isProduction) {
      const localhostTests = results.filter(r =>
        r.testCase.origin?.includes('localhost') || r.testCase.origin?.includes('127.0.0.1')
      )
      if (localhostTests.some(r => r.passed)) {
        recommendations.push('生产环境中检测到localhost请求被允许，考虑收紧安全策略')
      }
    } else {
      recommendations.push('开发环境配置完成，部署前请在生产环境中重新测试')
    }

    // 通用建议
    recommendations.push('定期执行CORS配置测试以确保安全性')
    recommendations.push('监控CORS错误日志，及时发现潜在的安全问题')

    return recommendations
  }

  /**
   * 计算安全评分
   */
  private calculateSecurityScore(results: CORSTestResult[]): number {
    const totalTests = results.length
    const passedTests = results.filter(r => r.passed).length

    // 基础分数（通过率）
    let score = (passedTests / totalTests) * 70

    // 安全加分项
    const securityTests = results.filter(r =>
      r.testCase.name.includes('Blocked') ||
      r.testCase.name.includes('Suspicious') ||
      r.testCase.name.includes('Dangerous')
    )

    const blockedMalicious = securityTests.filter(r =>
      !r.passed && r.testCase.name.includes('Blocked')
    ).length

    score += (blockedMalicious / Math.max(securityTests.length, 1)) * 20

    // 性能加分项
    const avgDuration = results.reduce((sum, r) => sum + r.performance.duration, 0) / results.length
    if (avgDuration < 20) {
      score += 10
    } else if (avgDuration < 50) {
      score += 5
    }

    return Math.round(Math.min(100, Math.max(0, score)))
  }

  /**
   * 生成测试报告
   */
  generateTestReport(summary: CORSTestSummary): string {
    const report = [
      '# CORS 配置测试报告',
      '',
      `**测试时间**: ${new Date().toLocaleString()}`,
      `**环境**: ${process.env.NODE_ENV}`,
      `**总测试数**: ${summary.total}`,
      `**通过**: ${summary.passed}`,
      `**失败**: ${summary.failed}`,
      `**安全评分**: ${summary.securityScore}/100`,
      `**总耗时**: ${summary.duration}ms`,
      '',
      '## 测试结果详情',
      ''
    ]

    // 按类别分组显示结果
    const categories = {
      '基础功能': summary.results.filter(r =>
        r.testCase.name.includes('Allowed') || r.testCase.name.includes('OPTIONS')
      ),
      '安全性': summary.results.filter(r =>
        r.testCase.name.includes('Blocked') || r.testCase.name.includes('Suspicious')
      ),
      '请求方法': summary.results.filter(r =>
        r.testCase.name.includes('Method')
      ),
      '请求头': summary.results.filter(r =>
        r.testCase.name.includes('Headers') || r.testCase.name.includes('Content-Type')
      )
    }

    Object.entries(categories).forEach(([category, tests]) => {
      if (tests.length === 0) return

      report.push(`### ${category} (${tests.length})`)
      tests.forEach(test => {
        const status = test.passed ? '✅' : '❌'
        const performance = test.performance.duration < 20 ? '🚀' :
                          test.performance.duration < 50 ? '⚡' : '🐌'

        report.push(`${status} ${performance} **${test.testCase.name}**`)
        report.push(`   - ${test.testCase.description}`)
        report.push(`   - 源: ${test.testCase.origin}`)
        report.push(`   - 方法: ${test.testCase.method}`)
        report.push(`   - 耗时: ${test.performance.duration}ms`)

        if (!test.passed) {
          report.push(`   - 失败原因: ${test.actual.error || `状态码 ${test.actual.status}`}`)
        }
        report.push('')
      })
    })

    // 添加建议
    if (summary.recommendations.length > 0) {
      report.push('## 改进建议')
      summary.recommendations.forEach((rec, index) => {
        report.push(`${index + 1}. ${rec}`)
      })
      report.push('')
    }

    // 添加安全评估
    report.push('## 安全评估')
    if (summary.securityScore >= 90) {
      report.push('🟢 **优秀** - CORS配置非常安全')
    } else if (summary.securityScore >= 70) {
      report.push('🟡 **良好** - CORS配置基本安全，有改进空间')
    } else if (summary.securityScore >= 50) {
      report.push('🟠 **一般** - CORS配置存在安全问题，需要改进')
    } else {
      report.push('🔴 **较差** - CORS配置存在严重安全风险，急需修复')
    }

    return report.join('\n')
  }
}

/**
 * 导出便捷函数
 */
export const corsTester = new CORSTester()

/**
 * 运行CORS测试的便捷函数
 */
export async function runCORSTests(): Promise<CORSTestSummary> {
  return corsTester.runAllTests()
}