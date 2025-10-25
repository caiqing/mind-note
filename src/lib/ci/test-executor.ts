/**
 * 多环境测试执行器
 * 支持在不同环境中执行各种类型的测试
 */

import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { TestConfigManager, TestSuite, TestEnvironment, TestConfiguration } from './test-config-manager'

const execAsync = promisify(exec)

export interface TestExecutionResult {
  suiteName: string
  environment: string
  success: boolean
  duration: number
  coverage?: {
    lines: number
    functions: number
    branches: number
    statements: number
  }
  tests: {
    total: number
    passed: number
    failed: number
    skipped: number
  }
  errors: string[]
  output: string
  artifacts: string[]
}

export interface TestExecutionContext {
  environment: string
  suite: string
  options: {
    coverage?: boolean
    watch?: boolean
    verbose?: boolean
    parallel?: boolean
    retries?: number
    timeout?: number
  }
  variables: Record<string, string>
}

export interface TestExecutorOptions {
  configPath?: string
  outputDir?: string
  parallelExecution?: boolean
  maxConcurrency?: number
  retries?: number
  timeout?: number
  notifications?: {
    slack?: boolean
    email?: boolean
    webhook?: boolean
  }
}

export class TestExecutor {
  private configManager: TestConfigManager
  private options: TestExecutorOptions
  private results: TestExecutionResult[] = []

  constructor(options: TestExecutorOptions = {}) {
    this.options = {
      configPath: options.configPath || 'test.config.json',
      outputDir: options.outputDir || 'test-results',
      parallelExecution: options.parallelExecution !== false,
      maxConcurrency: options.maxConcurrency || 4,
      retries: options.retries || 2,
      timeout: options.timeout || 300000, // 5 minutes
      notifications: options.notifications || {
        slack: true,
        email: false,
        webhook: true
      }
    }

    this.configManager = new TestConfigManager(this.options.configPath)
    this.ensureOutputDirectory()
  }

  /**
   * 确保输出目录存在
   */
  private ensureOutputDirectory(): void {
    if (!existsSync(this.options.outputDir)) {
      mkdirSync(this.options.outputDir, { recursive: true })
    }
  }

  /**
   * 执行单个测试套件
   */
  async executeTestSuite(context: TestExecutionContext): Promise<TestExecutionResult> {
    const startTime = Date.now()
    const environment = this.configManager.getEnvironment(context.environment)
    const suite = this.configManager.getTestSuite(context.suite)

    if (!environment || !suite) {
      throw new Error(`Environment ${context.environment} or suite ${context.suite} not found`)
    }

    console.log(`🧪 Executing ${suite.name} in ${environment.name} environment`)

    try {
      // 设置环境变量
      const envVars = {
        ...process.env,
        NODE_ENV: context.environment,
        TEST_ENVIRONMENT: context.environment,
        TEST_SUITE: context.suite,
        TEST_URL: environment.url,
        DATABASE_URL: environment.database,
        REDIS_URL: environment.redis,
        TEST_TIMEOUT: String(context.options.timeout || suite.timeout),
        ...context.variables,
        ...environment.apiKeys
      }

      // 生成测试命令
      const command = this.configManager.generateTestCommand(
        context.suite,
        context.environment,
        context.options
      )

      console.log(`📝 Running command: ${command}`)

      // 执行测试
      const { stdout, stderr } = await execAsync(command, {
        env: envVars,
        timeout: context.options.timeout || this.options.timeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      })

      const duration = Date.now() - startTime
      const result = this.parseTestOutput(stdout, stderr)

      const executionResult: TestExecutionResult = {
        suiteName: context.suite,
        environment: context.environment,
        success: result.success,
        duration,
        coverage: result.coverage,
        tests: result.tests,
        errors: result.errors,
        output: stdout,
        artifacts: result.artifacts
      }

      // 保存测试结果
      this.saveTestResult(executionResult)

      // 发送通知
      if (this.options.notifications) {
        await this.sendNotification(executionResult, suite, environment)
      }

      console.log(`✅ Test execution completed in ${duration}ms - ${result.success ? 'PASSED' : 'FAILED'}`)

      return executionResult

    } catch (error: any) {
      const duration = Date.now() - startTime
      const executionResult: TestExecutionResult = {
        suiteName: context.suite,
        environment: context.environment,
        success: false,
        duration,
        tests: { total: 0, passed: 0, failed: 1, skipped: 0 },
        errors: [error.message],
        output: error.stdout || '',
        artifacts: []
      }

      this.saveTestResult(executionResult)
      await this.sendNotification(executionResult, suite, environment)

      console.error(`❌ Test execution failed after ${duration}ms:`, error.message)
      return executionResult
    }
  }

  /**
   * 并行执行多个测试套件
   */
  async executeTestSuites(contexts: TestExecutionContext[]): Promise<TestExecutionResult[]> {
    if (!this.options.parallelExecution || contexts.length === 1) {
      // 顺序执行
      const results: TestExecutionResult[] = []
      for (const context of contexts) {
        const result = await this.executeTestSuite(context)
        results.push(result)
      }
      return results
    }

    // 并行执行
    const concurrency = Math.min(contexts.length, this.options.maxConcurrency!)
    const batches: TestExecutionContext[][] = []

    for (let i = 0; i < contexts.length; i += concurrency) {
      batches.push(contexts.slice(i, i + concurrency))
    }

    const allResults: TestExecutionResult[] = []

    for (const batch of batches) {
      const batchPromises = batch.map(context => this.executeTestSuite(context))
      const batchResults = await Promise.all(batchPromises)
      allResults.push(...batchResults)
    }

    return allResults
  }

  /**
   * 执行环境中的所有测试
   */
  async executeEnvironmentTests(
    environmentName: string,
    options: {
      includeSuites?: string[]
      excludeSuites?: string[]
      coverage?: boolean
    } = {}
  ): Promise<TestExecutionResult[]> {
    const suites = this.configManager.getTestSuitesForEnvironment(environmentName)

    let targetSuites = suites
    if (options.includeSuites) {
      targetSuites = suites.filter(suite => options.includeSuites!.includes(suite.name))
    }
    if (options.excludeSuites) {
      targetSuites = targetSuites.filter(suite => !options.excludeSuites!.includes(suite.name))
    }

    const contexts: TestExecutionContext[] = targetSuites.map(suite => ({
      environment: environmentName,
      suite: suite.name,
      options: {
        coverage: options.coverage,
        parallel: suite.parallel,
        retries: suite.retries,
        timeout: suite.timeout
      },
      variables: {}
    }))

    return this.executeTestSuites(contexts)
  }

  /**
   * 执行完整的测试流水线
   */
  async executeFullPipeline(
    environments: string[] = ['development', 'staging'],
    options: {
      failFast?: boolean
      generateReport?: boolean
    } = {}
  ): Promise<{
    results: TestExecutionResult[]
    summary: {
      total: number
      passed: number
      failed: number
      duration: number
    }
  }> {
    console.log('🚀 Starting full test pipeline...')
    const startTime = Date.now()
    const allResults: TestExecutionResult[] = []

    for (const environment of environments) {
      console.log(`\n📍 Running tests in ${environment} environment...`)

      try {
        const results = await this.executeEnvironmentTests(environment, {
          coverage: environment === 'development'
        })
        allResults.push(...results)

        // 如果启用failFast且有失败，则停止执行
        if (options.failFast) {
          const hasFailures = results.some(result => !result.success)
          if (hasFailures) {
            console.log(`⚠️ Fail fast enabled - stopping pipeline due to failures in ${environment}`)
            break
          }
        }
      } catch (error) {
        console.error(`❌ Failed to execute tests in ${environment}:`, error)
        if (options.failFast) {
          break
        }
      }
    }

    const duration = Date.now() - startTime
    const summary = this.generateSummary(allResults, duration)

    if (options.generateReport) {
      await this.generateHtmlReport(allResults, summary)
    }

    console.log(`\n📊 Pipeline Summary:`)
    console.log(`   Total tests: ${summary.total}`)
    console.log(`   Passed: ${summary.passed}`)
    console.log(`   Failed: ${summary.failed}`)
    console.log(`   Duration: ${(summary.duration / 1000).toFixed(2)}s`)

    return { results: allResults, summary }
  }

  /**
   * 解析测试输出
   */
  private parseTestOutput(stdout: string, stderr: string): {
    success: boolean
    coverage?: any
    tests: { total: number; passed: number; failed: number; skipped: number }
    errors: string[]
    artifacts: string[]
  } {
    const result = {
      success: true,
      tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
      errors: [] as string[],
      artifacts: [] as string[]
    }

    // 解析Jest输出
    const jestMatch = stdout.match(/(\d+) tests?, (\d+) passed?, (\d+) failed?/)
    if (jestMatch) {
      result.tests.total = parseInt(jestMatch[1])
      result.tests.passed = parseInt(jestMatch[2])
      result.tests.failed = parseInt(jestMatch[3])
      result.tests.skipped = result.tests.total - result.tests.passed - result.tests.failed
      result.success = result.tests.failed === 0
    }

    // 解析覆盖率报告
    const coverageMatch = stdout.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/)
    if (coverageMatch) {
      result.coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      }
    }

    // 收集错误信息
    if (stderr) {
      result.errors.push(stderr)
    }

    // 检查失败标记
    if (stdout.includes('FAIL') || stderr.includes('FAIL')) {
      result.success = false
    }

    // 收集构件信息
    const artifactMatches = stdout.match(/(?:generated|created|saved)\s+([^\s]+\.(?:json|xml|html|txt|log))/gi)
    if (artifactMatches) {
      result.artifacts = artifactMatches.map(match => match.split(' ').pop()!)
    }

    return result
  }

  /**
   * 保存测试结果
   */
  private saveTestResult(result: TestExecutionResult): void {
    this.results.push(result)

    // 保存详细结果到文件
    const filename = `${result.suiteName}-${result.environment}-${Date.now()}.json`
    const filepath = join(this.options.outputDir!, filename)

    try {
      writeFileSync(filepath, JSON.stringify(result, null, 2))
    } catch (error) {
      console.error('Failed to save test result:', error)
    }
  }

  /**
   * 发送通知
   */
  private async sendNotification(
    result: TestExecutionResult,
    suite: TestSuite,
    environment: TestEnvironment
  ): Promise<void> {
    if (!this.options.notifications) return

    const message = {
      suite: suite.name,
      environment: environment.name,
      status: result.success ? 'PASSED' : 'FAILED',
      duration: result.duration,
      tests: result.tests,
      coverage: result.coverage
    }

    // Slack通知
    if (this.options.notifications.slack && process.env.SLACK_WEBHOOK_URL) {
      try {
        await this.sendSlackNotification(message)
      } catch (error) {
        console.error('Failed to send Slack notification:', error)
      }
    }

    // Webhook通知
    if (this.options.notifications.webhook && process.env.TEST_WEBHOOK_URL) {
      try {
        await this.sendWebhookNotification(message)
      } catch (error) {
        console.error('Failed to send webhook notification:', error)
      }
    }
  }

  /**
   * 发送Slack通知
   */
  private async sendSlackNotification(message: any): Promise<void> {
    const payload = {
      text: `🧪 Test ${message.status}: ${message.suite} in ${message.environment}`,
      attachments: [{
        color: message.status === 'PASSED' ? 'good' : 'danger',
        fields: [
          { title: 'Duration', value: `${(message.duration / 1000).toFixed(2)}s`, short: true },
          { title: 'Tests', value: `${message.tests.passed}/${message.tests.total}`, short: true },
          { title: 'Coverage', value: message.coverage ? `${message.coverage.lines}%` : 'N/A', short: true }
        ]
      }]
    }

    await fetch(process.env.SLACK_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }

  /**
   * 发送Webhook通知
   */
  private async sendWebhookNotification(message: any): Promise<void> {
    await fetch(process.env.TEST_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    })
  }

  /**
   * 生成测试摘要
   */
  private generateSummary(results: TestExecutionResult[], duration: number): {
    total: number
    passed: number
    failed: number
    duration: number
  } {
    const total = results.length
    const passed = results.filter(r => r.success).length
    const failed = total - passed

    return { total, passed, failed, duration }
  }

  /**
   * 生成HTML报告
   */
  private async generateHtmlReport(results: TestExecutionResult[], summary: any): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Execution Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .metric h3 { margin: 0; font-size: 24px; }
        .results { margin-top: 20px; }
        .result { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .passed { border-left: 5px solid #28a745; }
        .failed { border-left: 5px solid #dc3545; }
        .coverage { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Test Execution Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>${summary.total}</h3>
            <p>Total Tests</p>
        </div>
        <div class="metric">
            <h3>${summary.passed}</h3>
            <p>Passed</p>
        </div>
        <div class="metric">
            <h3>${summary.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="metric">
            <h3>${(summary.duration / 1000).toFixed(2)}s</h3>
            <p>Duration</p>
        </div>
    </div>

    <div class="results">
        <h2>Test Results</h2>
        ${results.map(result => `
            <div class="result ${result.success ? 'passed' : 'failed'}">
                <h3>${result.suiteName} - ${result.environment}</h3>
                <p><strong>Status:</strong> ${result.success ? '✅ PASSED' : '❌ FAILED'}</p>
                <p><strong>Duration:</strong> ${(result.duration / 1000).toFixed(2)}s</p>
                <p><strong>Tests:</strong> ${result.tests.passed}/${result.tests.total} passed</p>
                ${result.coverage ? `
                    <div class="coverage">
                        <strong>Coverage:</strong>
                        Lines: ${result.coverage.lines}%,
                        Functions: ${result.coverage.functions}%,
                        Branches: ${result.coverage.branches}%
                    </div>
                ` : ''}
                ${result.errors.length > 0 ? `
                    <details>
                        <summary>Errors</summary>
                        <pre>${result.errors.join('\n')}</pre>
                    </details>
                ` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`

    const reportPath = join(this.options.outputDir!, 'test-report.html')
    writeFileSync(reportPath, html)
    console.log(`📄 HTML report generated: ${reportPath}`)
  }

  /**
   * 获取测试结果
   */
  getResults(): TestExecutionResult[] {
    return this.results
  }

  /**
   * 清除结果
   */
  clearResults(): void {
    this.results = []
  }
}

/**
 * 默认测试执行器实例
 */
export const testExecutor = new TestExecutor()

/**
 * 执行测试套件
 */
export async function executeTestSuite(context: TestExecutionContext): Promise<TestExecutionResult> {
  return testExecutor.executeTestSuite(context)
}

/**
 * 执行完整测试流水线
 */
export async function executeFullPipeline(
  environments?: string[],
  options?: { failFast?: boolean; generateReport?: boolean }
): Promise<{ results: TestExecutionResult[]; summary: any }> {
  return testExecutor.executeFullPipeline(environments, options)
}