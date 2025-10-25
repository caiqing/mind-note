#!/usr/bin/env node

/**
 * 自动化测试CLI工具
 * 提供命令行界面来执行和管理各种测试
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { Table } from 'console-table-printer'
import { TestExecutor, TestExecutionContext, TestConfiguration } from './test-executor'
import { testConfigManager } from './test-config-manager'

interface CLIOptions {
  environment?: string
  suite?: string
  coverage?: boolean
  watch?: boolean
  verbose?: boolean
  parallel?: boolean
  retries?: number
  timeout?: number
  output?: string
  config?: string
  failFast?: boolean
  report?: boolean
  json?: boolean
  notifications?: boolean
}

class TestCLI {
  private program: Command
  private executor: TestExecutor

  constructor() {
    this.program = new Command()
    this.executor = new TestExecutor()
    this.setupCommands()
  }

  /**
   * 设置CLI命令
   */
  private setupCommands(): void {
    this.program
      .name('test-cli')
      .description('MindNote 自动化测试CLI工具')
      .version('1.0.0')

    // 运行测试命令
    this.program
      .command('run')
      .description('运行测试套件')
      .option('-e, --environment <env>', '目标环境', 'development')
      .option('-s, --suite <suite>', '测试套件名称')
      .option('-c, --coverage', '启用覆盖率报告', false)
      .option('-w, --watch', '监视模式', false)
      .option('-v, --verbose', '详细输出', false)
      .option('-p, --parallel', '并行执行', false)
      .option('-r, --retries <number>', '重试次数', '2')
      .option('-t, --timeout <number>', '超时时间(ms)', '300000')
      .option('-o, --output <dir>', '输出目录', 'test-results')
      .option('--config <path>', '配置文件路径', 'test.config.json')
      .option('--fail-fast', '快速失败', false)
      .option('--no-notifications', '禁用通知', false)
      .action(async (options: CLIOptions) => {
        await this.runTests(options)
      })

    // 运行环境测试命令
    this.program
      .command('env')
      .description('运行指定环境的所有测试')
      .argument('<environment>', '环境名称')
      .option('-s, --suites <suites>', '指定测试套件(逗号分隔)')
      .option('-x, --exclude <suites>', '排除测试套件(逗号分隔)')
      .option('-c, --coverage', '启用覆盖率报告', false)
      .option('--fail-fast', '快速失败', false)
      .option('--report', '生成HTML报告', false)
      .action(async (environment: string, options: any) => {
        await this.runEnvironmentTests(environment, options)
      })

    // 运行完整流水线命令
    this.program
      .command('pipeline')
      .description('运行完整测试流水线')
      .option('-e, --environments <envs>', '环境列表(逗号分隔)', 'development,staging')
      .option('--fail-fast', '快速失败', false)
      .option('--report', '生成HTML报告', true)
      .option('--json', 'JSON输出', false)
      .action(async (options: any) => {
        await this.runPipeline(options)
      })

    // 列出配置命令
    this.program
      .command('list')
      .description('列出可用的测试配置')
      .option('--environments', '仅列出环境')
      .option('--suites', '仅列出测试套件')
      .action(async (options: any) => {
        await this.listConfigurations(options)
      })

    // 验证配置命令
    this.program
      .command('validate')
      .description('验证测试配置')
      .option('--config <path>', '配置文件路径', 'test.config.json')
      .action(async (options: any) => {
        await this.validateConfiguration(options)
      })

    // 初始化配置命令
    this.program
      .command('init')
      .description('初始化测试配置文件')
      .option('--force', '覆盖现有配置', false)
      .action(async (options: any) => {
        await this.initConfiguration(options)
      })

    // 状态检查命令
    this.program
      .command('status')
      .description('显示测试环境状态')
      .option('-e, --environment <env>', '检查特定环境')
      .action(async (options: any) => {
        await this.checkStatus(options)
      })
  }

  /**
   * 运行测试
   */
  private async runTests(options: CLIOptions): Promise<void> {
    console.log(chalk.blue('🧪 MindNote 测试执行器'))

    try {
      const context: TestExecutionContext = {
        environment: options.environment!,
        suite: options.suite || 'all',
        options: {
          coverage: options.coverage,
          watch: options.watch,
          verbose: options.verbose,
          parallel: options.parallel,
          retries: parseInt(options.retries!),
          timeout: parseInt(options.timeout!)
        },
        variables: {}
      }

      if (options.suite === 'all') {
        // 运行环境中的所有测试
        const results = await this.executor.executeEnvironmentTests(
          options.environment!,
          { coverage: options.coverage }
        )
        this.displayResults(results)
      } else {
        // 运行指定测试套件
        const result = await this.executor.executeTestSuite(context)
        this.displayResults([result])
      }

    } catch (error: any) {
      console.error(chalk.red('❌ 测试执行失败:'), error.message)
      process.exit(1)
    }
  }

  /**
   * 运行环境测试
   */
  private async runEnvironmentTests(environment: string, options: any): Promise<void> {
    console.log(chalk.blue(`🧪 运行 ${environment} 环境测试`))

    try {
      const testOptions = {
        coverage: options.coverage,
        includeSuites: options.suites ? options.suites.split(',') : undefined,
        excludeSuites: options.exclude ? options.exclude.split(',') : undefined
      }

      const results = await this.executor.executeEnvironmentTests(environment, testOptions)
      this.displayResults(results)

      if (options.report) {
        console.log(chalk.green('📄 生成测试报告...'))
      }

    } catch (error: any) {
      console.error(chalk.red('❌ 环境测试失败:'), error.message)
      process.exit(1)
    }
  }

  /**
   * 运行完整流水线
   */
  private async runPipeline(options: any): Promise<void> {
    console.log(chalk.blue('🚀 运行完整测试流水线'))

    try {
      const environments = options.environments.split(',')
      const pipelineOptions = {
        failFast: options.failFast,
        generateReport: options.report
      }

      const { results, summary } = await this.executor.executeFullPipeline(
        environments,
        pipelineOptions
      )

      if (options.json) {
        console.log(JSON.stringify({ results, summary }, null, 2))
      } else {
        this.displayPipelineSummary(summary)
      }

      // 设置退出码
      if (summary.failed > 0) {
        process.exit(1)
      }

    } catch (error: any) {
      console.error(chalk.red('❌ 流水线执行失败:'), error.message)
      process.exit(1)
    }
  }

  /**
   * 列出配置
   */
  private async listConfigurations(options: any): Promise<void> {
    const config = testConfigManager.getConfig()

    if (options.environments || (!options.environments && !options.suites)) {
      console.log(chalk.yellow('\n📍 可用环境:'))
      const envTable = new Table({
        columns: [
          { name: 'name', title: '环境名称' },
          { name: 'url', title: 'URL' },
          { name: 'features', title: '功能特性' },
          { name: 'timeout', title: '超时(ms)' }
        ]
      })

      Object.entries(config.environments).forEach(([name, env]) => {
        envTable.addRow({
          name,
          url: env.url,
          features: env.features.join(', '),
          timeout: env.timeout
        })
      })

      envTable.printTable()
    }

    if (options.suites || (!options.environments && !options.suites)) {
      console.log(chalk.yellow('\n🧪 可用测试套件:'))
      const suiteTable = new Table({
        columns: [
          { name: 'name', title: '套件名称' },
          { name: 'type', title: '类型' },
          { name: 'parallel', title: '并行' },
          { name: 'retries', title: '重试' },
          { name: 'timeout', title: '超时(ms)' },
          { name: 'environments', title: '支持环境' }
        ]
      })

      Object.entries(config.suites).forEach(([name, suite]) => {
        suiteTable.addRow({
          name,
          type: suite.type,
          parallel: suite.parallel ? '✓' : '✗',
          retries: suite.retries,
          timeout: suite.timeout,
          environments: suite.environment.join(', ')
        })
      })

      suiteTable.printTable()
    }
  }

  /**
   * 验证配置
   */
  private async validateConfiguration(options: any): Promise<void> {
    console.log(chalk.blue('🔍 验证测试配置...'))

    const validation = testConfigManager.validateConfig()

    if (validation.valid) {
      console.log(chalk.green('✅ 配置验证通过'))
    } else {
      console.log(chalk.red('❌ 配置验证失败:'))
      validation.errors.forEach(error => {
        console.log(chalk.red(`  - ${error}`))
      })
      process.exit(1)
    }
  }

  /**
   * 初始化配置
   */
  private async initConfiguration(options: any): Promise<void> {
    console.log(chalk.blue('📝 初始化测试配置...'))

    try {
      testConfigManager.saveConfig()
      console.log(chalk.green('✅ 配置文件已创建: test.config.json'))

      if (!options.force) {
        console.log(chalk.yellow('💡 提示: 编辑 test.config.json 来自定义测试配置'))
      }
    } catch (error: any) {
      console.error(chalk.red('❌ 配置初始化失败:'), error.message)
      process.exit(1)
    }
  }

  /**
   * 检查状态
   */
  private async checkStatus(options: any): Promise<void> {
    console.log(chalk.blue('📊 检查测试环境状态...'))

    const config = testConfigManager.getConfig()
    const environments = options.environment
      ? [options.environment]
      : Object.keys(config.environments)

    for (const envName of environments) {
      const env = config.environments[envName]
      if (!env) {
        console.log(chalk.red(`❌ 环境 ${envName} 不存在`))
        continue
      }

      console.log(chalk.yellow(`\n📍 ${env.name} (${envName})`))

      // 检查URL连通性
      try {
        const response = await fetch(env.url, { method: 'HEAD' })
        console.log(chalk.green(`  ✓ URL: ${env.url} (${response.status})`))
      } catch (error) {
        console.log(chalk.red(`  ✗ URL: ${env.url} (不可达)`))
      }

      // 显示配置信息
      console.log(chalk.gray(`  📊 数据库: ${env.database.substring(0, 50)}...`))
      console.log(chalk.gray(`  🔴 Redis: ${env.redis.substring(0, 50)}...`))
      console.log(chalk.gray(`  🚀 超时: ${env.timeout}ms`))
      console.log(chalk.gray(`  ⚡ 功能: ${env.features.join(', ')}`))
    }
  }

  /**
   * 显示测试结果
   */
  private displayResults(results: any[]): void {
    console.log(chalk.yellow('\n📊 测试结果:'))

    const table = new Table({
      columns: [
        { name: 'suite', title: '测试套件' },
        { name: 'environment', title: '环境' },
        { name: 'status', title: '状态' },
        { name: 'duration', title: '耗时' },
        { name: 'tests', title: '测试' },
        { name: 'coverage', title: '覆盖率' }
      ]
    })

    results.forEach(result => {
      table.addRow({
        suite: result.suiteName,
        environment: result.environment,
        status: result.success ? chalk.green('✓ PASSED') : chalk.red('✗ FAILED'),
        duration: `${(result.duration / 1000).toFixed(2)}s`,
        tests: `${result.tests.passed}/${result.tests.total}`,
        coverage: result.coverage ? `${result.coverage.lines}%` : 'N/A'
      })
    })

    table.printTable()

    // 显示摘要
    const total = results.length
    const passed = results.filter(r => r.success).length
    const failed = total - passed
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

    console.log(chalk.yellow(`\n📈 摘要:`))
    console.log(`  总计: ${total}, 通过: ${chalk.green(passed)}, 失败: ${chalk.red(failed)}`)
    console.log(`  总耗时: ${(totalDuration / 1000).toFixed(2)}s`)

    if (failed > 0) {
      console.log(chalk.red('\n❌ 存在失败的测试，请查看详细日志'))
      process.exit(1)
    }
  }

  /**
   * 显示流水线摘要
   */
  private displayPipelineSummary(summary: any): void {
    console.log(chalk.yellow('\n🚀 流水线执行摘要:'))
    console.log(`  总测试数: ${summary.total}`)
    console.log(`  通过: ${chalk.green(summary.passed)}`)
    console.log(`  失败: ${chalk.red(summary.failed)}`)
    console.log(`  总耗时: ${(summary.duration / 1000).toFixed(2)}s`)

    if (summary.failed > 0) {
      console.log(chalk.red('\n❌ 流水线执行失败'))
      process.exit(1)
    } else {
      console.log(chalk.green('\n✅ 流水线执行成功'))
    }
  }

  /**
   * 运行CLI
   */
  async run(argv: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv)
    } catch (error: any) {
      console.error(chalk.red('CLI错误:'), error.message)
      process.exit(1)
    }
  }
}

/**
 * 运行CLI
 */
export async function runTestCLI(argv: string[]): Promise<void> {
  const cli = new TestCLI()
  await cli.run(argv)
}

// 如果直接运行此脚本
if (require.main === module) {
  runTestCLI(process.argv).catch(error => {
    console.error('CLI运行失败:', error)
    process.exit(1)
  })
}