/**
 * 自动化测试配置管理器
 * 管理多环境、多类型的自动化测试配置和执行
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface TestEnvironment {
  name: string
  url: string
  database: string
  redis: string
  apiKeys: Record<string, string>
  features: string[]
  timeout: number
}

export interface TestSuite {
  name: string
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security' | 'api'
  tests: string[]
  dependencies: string[]
  timeout: number
  parallel: boolean
  retries: number
  environment: string[]
}

export interface TestConfiguration {
  environments: Record<string, TestEnvironment>
  suites: Record<string, TestSuite>
  global: {
    timeout: number
    retries: number
    parallel: number
    reporters: string[]
    coverage: {
      enabled: boolean
      threshold: number
      reporters: string[]
    }
    notifications: {
      slack: boolean
      email: boolean
      webhook: boolean
    }
  }
}

export class TestConfigManager {
  private config: TestConfiguration
  private configPath: string

  constructor(configPath: string = 'test.config.json') {
    this.configPath = configPath
    this.config = this.loadConfig()
  }

  /**
   * 加载测试配置
   */
  private loadConfig(): TestConfiguration {
    const defaultConfig: TestConfiguration = {
      environments: {
        development: {
          name: 'Development',
          url: 'http://localhost:3000',
          database: 'postgresql://localhost:5432/mindnote_dev',
          redis: 'redis://localhost:6379',
          apiKeys: {
            openai: 'test-key',
            anthropic: 'test-key'
          },
          features: ['ai-analysis', 'real-time-collaboration'],
          timeout: 30000
        },
        staging: {
          name: 'Staging',
          url: 'https://staging.mindnote.app',
          database: process.env.STAGING_DATABASE_URL || '',
          redis: process.env.STAGING_REDIS_URL || '',
          apiKeys: {
            openai: process.env.STAGING_OPENAI_API_KEY || '',
            anthropic: process.env.STAGING_ANTHROPIC_API_KEY || ''
          },
          features: ['ai-analysis', 'real-time-collaboration', 'analytics'],
          timeout: 45000
        },
        production: {
          name: 'Production',
          url: 'https://mindnote.app',
          database: process.env.PRODUCTION_DATABASE_URL || '',
          redis: process.env.PRODUCTION_REDIS_URL || '',
          apiKeys: {
            openai: process.env.PRODUCTION_OPENAI_API_KEY || '',
            anthropic: process.env.PRODUCTION_ANTHROPIC_API_KEY || ''
          },
          features: ['ai-analysis', 'real-time-collaboration', 'analytics', 'monitoring'],
          timeout: 60000
        }
      },
      suites: {
        unit: {
          name: 'Unit Tests',
          type: 'unit',
          tests: ['src/**/*.test.ts', 'src/**/*.test.js'],
          dependencies: [],
          timeout: 10000,
          parallel: true,
          retries: 2,
          environment: ['development']
        },
        integration: {
          name: 'Integration Tests',
          type: 'integration',
          tests: ['tests/integration/**/*.test.ts'],
          dependencies: ['database', 'redis'],
          timeout: 30000,
          parallel: false,
          retries: 2,
          environment: ['development', 'staging']
        },
        api: {
          name: 'API Tests',
          type: 'api',
          tests: ['tests/api/**/*.test.ts'],
          dependencies: ['database', 'redis', 'external-services'],
          timeout: 20000,
          parallel: true,
          retries: 3,
          environment: ['development', 'staging', 'production']
        },
        e2e: {
          name: 'E2E Tests',
          type: 'e2e',
          tests: ['tests/e2e/**/*.spec.ts'],
          dependencies: ['full-application'],
          timeout: 60000,
          parallel: false,
          retries: 1,
          environment: ['staging', 'production']
        },
        performance: {
          name: 'Performance Tests',
          type: 'performance',
          tests: ['tests/performance/**/*.test.ts'],
          dependencies: ['full-application', 'monitoring'],
          timeout: 120000,
          parallel: false,
          retries: 1,
          environment: ['staging', 'production']
        },
        security: {
          name: 'Security Tests',
          type: 'security',
          tests: ['tests/security/**/*.test.ts'],
          dependencies: ['full-application', 'security-tools'],
          timeout: 45000,
          parallel: true,
          retries: 1,
          environment: ['staging']
        }
      },
      global: {
        timeout: 30000,
        retries: 2,
        parallel: 4,
        reporters: ['console', 'json', 'junit'],
        coverage: {
          enabled: true,
          threshold: 80,
          reporters: ['text', 'lcov', 'html']
        },
        notifications: {
          slack: true,
          email: true,
          webhook: true
        }
      }
    }

    if (existsSync(this.configPath)) {
      try {
        const customConfig = JSON.parse(readFileSync(this.configPath, 'utf8'))
        return this.mergeConfigs(defaultConfig, customConfig)
      } catch (error) {
        console.warn(`Failed to load custom config from ${this.configPath}, using defaults:`, error)
      }
    }

    return defaultConfig
  }

  /**
   * 保存配置
   */
  saveConfig(): void {
    writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
  }

  /**
   * 获取配置
   */
  getConfig(): TestConfiguration {
    return this.config
  }

  /**
   * 获取环境配置
   */
  getEnvironment(envName: string): TestEnvironment | null {
    return this.config.environments[envName] || null
  }

  /**
   * 获取测试套件配置
   */
  getTestSuite(suiteName: string): TestSuite | null {
    return this.config.suites[suiteName] || null
  }

  /**
   * 添加环境配置
   */
  addEnvironment(envName: string, envConfig: TestEnvironment): void {
    this.config.environments[envName] = envConfig
  }

  /**
   * 添加测试套件
   */
  addTestSuite(suiteName: string, suiteConfig: TestSuite): void {
    this.config.suites[suiteName] = suiteConfig
  }

  /**
   * 获取指定环境的测试套件
   */
  getTestSuitesForEnvironment(envName: string): TestSuite[] {
    return Object.values(this.config.suites).filter(
      suite => suite.environment.includes(envName)
    )
  }

  /**
   * 生成测试命令
   */
  generateTestCommand(suiteName: string, envName: string, options: {
    coverage?: boolean
    watch?: boolean
    verbose?: boolean
    parallel?: boolean
  } = {}): string {
    const suite = this.getTestSuite(suiteName)
    const environment = this.getEnvironment(envName)

    if (!suite || !environment) {
      throw new Error(`Suite ${suiteName} or environment ${envName} not found`)
    }

    let command = 'npm test'

    // 根据测试类型设置不同的命令
    switch (suite.type) {
      case 'unit':
        command = 'npm run test:unit'
        break
      case 'integration':
        command = 'npm run test:integration'
        break
      case 'e2e':
        command = 'npm run test:e2e'
        break
      case 'performance':
        command = 'npm run test:performance'
        break
      case 'security':
        command = 'npm run test:security'
        break
      case 'api':
        command = 'npm run test:api'
        break
    }

    // 添加选项
    const commandOptions: string[] = []

    if (options.coverage || this.config.global.coverage.enabled) {
      commandOptions.push('--coverage')
    }

    if (options.watch) {
      commandOptions.push('--watch')
    }

    if (options.verbose) {
      commandOptions.push('--verbose')
    }

    if (options.parallel && suite.parallel) {
      commandOptions.push('--parallel')
    }

    // 添加重试选项
    if (suite.retries > 1) {
      commandOptions.push(`--retry-fails=${suite.retries}`)
    }

    // 添加超时选项
    if (suite.timeout !== this.config.global.timeout) {
      commandOptions.push(`--timeout=${suite.timeout}`)
    }

    if (commandOptions.length > 0) {
      command += ` -- ${commandOptions.join(' ')}`
    }

    return command
  }

  /**
   * 验证配置
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 验证环境配置
    for (const [envName, env] of Object.entries(this.config.environments)) {
      if (!env.url) {
        errors.push(`Environment ${envName}: missing url`)
      }
      if (!env.database) {
        errors.push(`Environment ${envName}: missing database`)
      }
      if (!env.redis) {
        errors.push(`Environment ${envName}: missing redis`)
      }
      if (env.timeout <= 0) {
        errors.push(`Environment ${envName}: invalid timeout`)
      }
    }

    // 验证测试套件配置
    for (const [suiteName, suite] of Object.entries(this.config.suites)) {
      if (!suite.name) {
        errors.push(`Suite ${suiteName}: missing name`)
      }
      if (!suite.tests || suite.tests.length === 0) {
        errors.push(`Suite ${suiteName}: no tests defined`)
      }
      if (suite.timeout <= 0) {
        errors.push(`Suite ${suiteName}: invalid timeout`)
      }
      if (suite.retries < 0) {
        errors.push(`Suite ${suiteName}: invalid retries`)
      }
      if (!suite.environment || suite.environment.length === 0) {
        errors.push(`Suite ${suiteName}: no environment specified`)
      }
    }

    // 验证全局配置
    if (this.config.global.timeout <= 0) {
      errors.push('Global config: invalid timeout')
    }
    if (this.config.global.parallel <= 0) {
      errors.push('Global config: invalid parallel count')
    }
    if (this.config.global.coverage.threshold < 0 || this.config.global.coverage.threshold > 100) {
      errors.push('Global config: invalid coverage threshold')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 生成测试报告配置
   */
  generateReportConfig(suiteName: string): any {
    const suite = this.getTestSuite(suiteName)
    if (!suite) {
      throw new Error(`Suite ${suiteName} not found`)
    }

    return {
      reporter: this.config.global.reporters,
      coverage: this.config.global.coverage.enabled ? {
        reporters: this.config.global.coverage.reporters,
        threshold: {
          global: {
            branches: this.config.global.coverage.threshold,
            functions: this.config.global.coverage.threshold,
            lines: this.config.global.coverage.threshold,
            statements: this.config.global.coverage.threshold
          }
        }
      } : undefined,
      testTimeout: suite.timeout,
      retry: suite.retries
    }
  }

  /**
   * 获取测试执行计划
   */
  getExecutionPlan(envName: string): {
    parallel: string[]
    sequential: string[]
    estimatedTime: number
  } {
    const suites = this.getTestSuitesForEnvironment(envName)
    const parallel: string[] = []
    const sequential: string[] = []
    let estimatedTime = 0

    for (const suite of suites) {
      if (suite.parallel) {
        parallel.push(suite.name)
        estimatedTime += suite.timeout
      } else {
        sequential.push(suite.name)
        estimatedTime += suite.timeout * 1.2 // 为非并行测试添加缓冲时间
      }
    }

    return { parallel, sequential, estimatedTime }
  }

  /**
   * 合并配置
   */
  private mergeConfigs(defaultConfig: TestConfiguration, customConfig: Partial<TestConfiguration>): TestConfiguration {
    return {
      environments: { ...defaultConfig.environments, ...customConfig.environments },
      suites: { ...defaultConfig.suites, ...customConfig.suites },
      global: { ...defaultConfig.global, ...customConfig.global }
    }
  }
}

/**
 * 测试配置管理器实例
 */
export const testConfigManager = new TestConfigManager()

/**
 * 获取测试配置
 */
export function getTestConfig(): TestConfiguration {
  return testConfigManager.getConfig()
}

/**
 * 生成测试命令
 */
export function generateTestCommand(suiteName: string, envName: string, options?: {
  coverage?: boolean
  watch?: boolean
  verbose?: boolean
  parallel?: boolean
}): string {
  return testConfigManager.generateTestCommand(suiteName, envName, options)
}

/**
 * 验证测试配置
 */
export function validateTestConfig(): { valid: boolean; errors: string[] } {
  return testConfigManager.validateConfig()
}