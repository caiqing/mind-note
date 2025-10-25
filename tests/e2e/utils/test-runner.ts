/**
 * E2E测试运行器
 *
 * 提供统一的测试运行和管理功能
 */

import { execFileNoThrow } from '../../../src/utils/execFileNoThrow'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { E2E_CONFIG, REPORT_CONFIG } from '../config/e2e.config'

export class E2ETestRunner {
  private readonly projectRoot: string
  private readonly reportsDir: string

  constructor() {
    this.projectRoot = process.cwd()
    this.reportsDir = join(this.projectRoot, 'tests/e2e/reports')
  }

  /**
   * 运行所有E2E测试
   */
  async runAllTests(options: {
    headless?: boolean
    recordVideo?: boolean
    parallel?: boolean
    timeout?: number
  } = {}): Promise<TestResult> {
    console.log('🚀 开始运行所有E2E测试...')

    // 确保报告目录存在
    this.ensureReportsDirectory()

    // 设置环境变量
    this.setEnvironmentVariables(options)

    try {
      // 构建测试命令参数
      const args = this.buildVitestArgs({
        pattern: 'tests/e2e/**/*.test.{ts,tsx}',
        options: {
          reporter: ['verbose', 'html', 'json'],
          outputFile: {
            html: join(this.reportsDir, 'index.html'),
            json: join(this.reportsDir, 'e2e-results.json')
          },
          ...options
        }
      })

      // 执行测试
      console.log(`📋 执行命令: npx vitest ${args.join(' ')}`)
      const result = await execFileNoThrow('npx', ['vitest', ...args], {
        cwd: this.projectRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test'
        }
      })

      if (result.success) {
        console.log('✅ E2E测试运行完成')
        return {
          success: true,
          exitCode: 0,
          output: result.stdout,
          reportPath: join(this.reportsDir, 'index.html')
        }
      } else {
        console.error('❌ E2E测试运行失败:', result.stderr)
        return {
          success: false,
          exitCode: result.status,
          output: result.stderr,
          reportPath: join(this.reportsDir, 'index.html')
        }
      }
    } catch (error: any) {
      console.error('❌ E2E测试运行失败:', error.message)
      return {
        success: false,
        exitCode: 1,
        output: error.message,
        reportPath: join(this.reportsDir, 'index.html')
      }
    }
  }

  /**
   * 运行特定测试套件
   */
  async runTestSuite(
    suiteName: string,
    options: {
      headless?: boolean
      recordVideo?: boolean
      timeout?: number
    } = {}
  ): Promise<TestResult> {
    console.log(`🧪 运行测试套件: ${suiteName}`)

    this.ensureReportsDirectory()
    this.setEnvironmentVariables(options)

    try {
      const args = this.buildVitestArgs({
        pattern: `tests/e2e/scenarios/${suiteName}.test.ts`,
        options: {
          reporter: ['verbose', 'json'],
          outputFile: {
            json: join(this.reportsDir, `${suiteName}-results.json`)
          },
          ...options
        }
      })

      const result = await execFileNoThrow('npx', ['vitest', ...args], {
        cwd: this.projectRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test'
        }
      })

      if (result.success) {
        console.log(`✅ 测试套件 ${suiteName} 运行完成`)
        return {
          success: true,
          exitCode: 0,
          output: result.stdout,
          reportPath: join(this.reportsDir, `${suiteName}-results.json`)
        }
      } else {
        console.error(`❌ 测试套件 ${suiteName} 运行失败:`, result.stderr)
        return {
          success: false,
          exitCode: result.status,
          output: result.stderr,
          reportPath: join(this.reportsDir, `${suiteName}-results.json`)
        }
      }
    } catch (error: any) {
      console.error(`❌ 测试套件 ${suiteName} 运行失败:`, error.message)
      return {
        success: false,
        exitCode: 1,
        output: error.message,
        reportPath: join(this.reportsDir, `${suiteName}-results.json`)
      }
    }
  }

  /**
   * 运行特定测试场景
   */
  async runTestScenario(
    scenarioName: string,
    options: {
      headless?: boolean
      recordVideo?: boolean
      timeout?: number
    } = {}
  ): Promise<TestResult> {
    console.log(`🎯 运行测试场景: ${scenarioName}`)

    this.ensureReportsDirectory()
    this.setEnvironmentVariables(options)

    try {
      const args = this.buildVitestArgs({
        pattern: `tests/e2e/scenarios/**/${scenarioName}.test.ts`,
        options: {
          reporter: ['verbose', 'json'],
          outputFile: {
            json: join(this.reportsDir, `${scenarioName}-results.json`)
          },
          ...options
        }
      })

      const result = await execFileNoThrow('npx', ['vitest', ...args], {
        cwd: this.projectRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test'
        }
      })

      if (result.success) {
        console.log(`✅ 测试场景 ${scenarioName} 运行完成`)
        return {
          success: true,
          exitCode: 0,
          output: result.stdout,
          reportPath: join(this.reportsDir, `${scenarioName}-results.json`)
        }
      } else {
        console.error(`❌ 测试场景 ${scenarioName} 运行失败:`, result.stderr)
        return {
          success: false,
          exitCode: result.status,
          output: result.stderr,
          reportPath: join(this.reportsDir, `${scenarioName}-results.json`)
        }
      }
    } catch (error: any) {
      console.error(`❌ 测试场景 ${scenarioName} 运行失败:`, error.message)
      return {
        success: false,
        exitCode: 1,
        output: error.message,
        reportPath: join(this.reportsDir, `${scenarioName}-results.json`)
      }
    }
  }

  /**
   * 生成测试报告
   */
  async generateReport(results: TestResult[]): Promise<void> {
    console.log('📊 生成测试报告...')

    const reportData = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(results),
      suites: results.map(result => ({
        name: this.extractSuiteName(result.reportPath),
        success: result.success,
        exitCode: result.exitCode,
        duration: this.extractDuration(result.output)
      })),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    }

    const reportPath = join(this.reportsDir, 'summary-report.json')
    writeFileSync(reportPath, JSON.stringify(reportData, null, 2))

    // 生成HTML报告
    await this.generateHTMLReport(reportData)

    console.log(`📋 测试报告已生成: ${reportPath}`)
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData(): Promise<void> {
    console.log('🧹 清理测试数据...')

    try {
      // 清理报告目录中的文件（保留目录结构）
      const cleanResult = await execFileNoThrow('find', [
        join(this.reportsDir),
        '-type', 'f',
        '-delete'
      ], { cwd: this.projectRoot })

      if (cleanResult.success) {
        console.log('✅ 测试数据清理完成')
      } else {
        console.warn('⚠️ 部分测试数据清理失败:', cleanResult.stderr)
      }
    } catch (error) {
      console.error('❌ 清理测试数据失败:', error)
    }
  }

  /**
   * 验证测试环境
   */
  async validateEnvironment(): Promise<EnvironmentValidation> {
    console.log('🔍 验证测试环境...')

    const validation: EnvironmentValidation = {
      valid: true,
      issues: []
    }

    // 检查必要的依赖
    const requiredPackages = ['vitest', '@testing-library/react', 'jsdom']
    for (const pkg of requiredPackages) {
      try {
        require.resolve(pkg)
      } catch {
        validation.valid = false
        validation.issues.push(`缺少依赖包: ${pkg}`)
      }
    }

    // 检查环境变量
    const requiredEnvVars = ['E2E_BASE_URL', 'E2E_DATABASE_URL']
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        validation.valid = false
        validation.issues.push(`缺少环境变量: ${envVar}`)
      }
    }

    // 检查测试文件存在
    const testFiles = [
      'tests/e2e/config/e2e.config.ts',
      'tests/e2e/setup/setup.ts',
      'tests/e2e/helpers/page-objects.ts'
    ]

    for (const file of testFiles) {
      const filePath = join(this.projectRoot, file)
      if (!existsSync(filePath)) {
        validation.valid = false
        validation.issues.push(`缺少测试文件: ${file}`)
      }
    }

    if (validation.valid) {
      console.log('✅ 测试环境验证通过')
    } else {
      console.error('❌ 测试环境验证失败:')
      validation.issues.forEach(issue => console.error(`  - ${issue}`))
    }

    return validation
  }

  /**
   * 构建Vitest参数
   */
  private buildVitestArgs(config: {
    pattern: string
    options: any
  }): string[] {
    const { pattern, options } = config

    const args: string[] = ['run', pattern]

    // 添加配置文件
    args.push('--config', 'tests/e2e/config/e2e.config.ts')

    // 添加超时设置
    if (options.timeout) {
      args.push('--timeout', options.timeout.toString())
    }

    // 添加报告器
    if (options.reporter) {
      args.push('--reporter', options.reporter.join(','))
    }

    // 添加输出文件
    if (options.outputFile) {
      if (options.outputFile.html) {
        args.push('--outputFile.html', options.outputFile.html)
      }
      if (options.outputFile.json) {
        args.push('--outputFile.json', options.outputFile.json)
      }
    }

    // 添加覆盖率报告
    if (options.coverage) {
      args.push('--coverage')
    }

    return args
  }

  /**
   * 确保报告目录存在
   */
  private ensureReportsDirectory(): void {
    const directories = [
      this.reportsDir,
      join(this.reportsDir, 'screenshots'),
      join(this.reportsDir, 'videos'),
      join(this.reportsDir, 'network'),
      join(this.reportsDir, 'console')
    ]

    directories.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    })
  }

  /**
   * 设置环境变量
   */
  private setEnvironmentVariables(options: any): void {
    process.env.E2E_HEADLESS = options.headless !== false ? 'true' : 'false'
    process.env.E2E_RECORD_VIDEO = options.recordVideo ? 'true' : 'false'
    process.env.E2E_DEBUG = options.debug ? 'true' : 'false'
    process.env.E2E_PRESERVE_DATA = options.preserveData ? 'true' : 'false'
  }

  /**
   * 生成测试摘要
   */
  private generateSummary(results: TestResult[]): TestSummary {
    const total = results.length
    const passed = results.filter(r => r.success).length
    const failed = total - passed

    return {
      total,
      passed,
      failed,
      successRate: total > 0 ? (passed / total) * 100 : 0,
      duration: results.reduce((sum, r) => sum + this.extractDuration(r.output), 0)
    }
  }

  /**
   * 提取套件名称
   */
  private extractSuiteName(reportPath: string): string {
    const filename = reportPath.split('/').pop() || ''
    return filename.replace('-results.json', '').replace('.json', '')
  }

  /**
   * 提取执行时间
   */
  private extractDuration(output: string): number {
    const match = output.match(/(?:Duration|Time):\s*(\d+)ms/)
    return match ? parseInt(match[1]) : 0
  }

  /**
   * 生成HTML报告
   */
  private async generateHTMLReport(reportData: any): Promise<void> {
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .timestamp { opacity: 0.9; font-size: 0.9em; margin-top: 10px; }
        .summary { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
        .metric { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; flex: 1; min-width: 120px; }
        .metric h3 { margin: 0 0 10px 0; color: #333; font-size: 1.1em; }
        .metric .value { font-size: 2.5em; font-weight: bold; color: #007acc; }
        .metric.success .value { color: #28a745; }
        .metric.failed .value { color: #dc3545; }
        .suites { margin-top: 30px; }
        .suite { background: white; margin: 15px 0; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #ddd; }
        .suite.success { border-left-color: #28a745; }
        .suite.failed { border-left-color: #dc3545; }
        .suite h3 { margin: 0 0 10px 0; color: #333; }
        .suite p { margin: 5px 0; color: #666; }
        .environment { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px; }
        .environment h2 { margin: 0 0 15px 0; color: #333; }
        .environment p { margin: 5px 0; color: #666; }
        .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .status-badge.success { background: #d4edda; color: #155724; }
        .status-badge.failed { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 MindNote E2E测试报告</h1>
            <p class="timestamp">📅 生成时间: ${reportData.timestamp}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <h3>总测试数</h3>
                <div class="value">${reportData.summary.total}</div>
            </div>
            <div class="metric success">
                <h3>✅ 通过</h3>
                <div class="value">${reportData.summary.passed}</div>
            </div>
            <div class="metric failed">
                <h3>❌ 失败</h3>
                <div class="value">${reportData.summary.failed}</div>
            </div>
            <div class="metric">
                <h3>📊 成功率</h3>
                <div class="value">${reportData.summary.successRate.toFixed(1)}%</div>
            </div>
            <div class="metric">
                <h3>⏱️ 总耗时</h3>
                <div class="value">${(reportData.summary.duration / 1000).toFixed(1)}s</div>
            </div>
        </div>

        <div class="suites">
            <h2>📋 测试套件详情</h2>
            ${reportData.suites.map((suite: any) => `
                <div class="suite ${suite.success ? 'success' : 'failed'}">
                    <h3>${suite.name}</h3>
                    <p>状态: <span class="status-badge ${suite.success ? 'success' : 'failed'}">${suite.success ? '✅ 通过' : '❌ 失败'}</span></p>
                    <p>退出码: ${suite.exitCode}</p>
                    <p>耗时: ${(suite.duration / 1000).toFixed(1)}s</p>
                </div>
            `).join('')}
        </div>

        <div class="environment">
            <h2>🖥️ 环境信息</h2>
            <p><strong>Node.js版本:</strong> ${reportData.environment.nodeVersion}</p>
            <p><strong>平台:</strong> ${reportData.environment.platform}</p>
            <p><strong>架构:</strong> ${reportData.environment.arch}</p>
        </div>
    </div>
</body>
</html>`

    const htmlPath = join(this.reportsDir, 'summary-report.html')
    writeFileSync(htmlPath, htmlContent)
  }
}

// 类型定义
export interface TestResult {
  success: boolean
  exitCode: number
  output: string
  reportPath: string
}

export interface TestSummary {
  total: number
  passed: number
  failed: number
  successRate: number
  duration: number
}

export interface EnvironmentValidation {
  valid: boolean
  issues: string[]
}

// 导出单例实例
export const e2eTestRunner = new E2ETestRunner()