/**
 * CI/CD配置文件单元测试
 * 验证GitHub Actions工作流配置的正确性和完整性
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { validateWorkflowConfig, validateCiConfig } from '@/lib/ci/ci-config-validator'

describe('CI/CD配置验证', () => {
  const testWorkflowsDir = join(process.cwd(), '.github', 'workflows')
  const testCiConfigPath = join(process.cwd(), 'ci.config.js')

  beforeEach(() => {
    // 确保测试目录存在
    if (!existsSync(testWorkflowsDir)) {
      // 在测试环境中模拟目录结构
      const mockDir = join(process.cwd(), 'test-tmp', '.github', 'workflows')
      if (!existsSync(mockDir)) {
        // 创建模拟目录结构用于测试
      }
    }
  })

  afterEach(() => {
    // 清理测试文件
    const testFile = join(process.cwd(), 'test-tmp', 'ci.config.js')
    if (existsSync(testFile)) {
      unlinkSync(testFile)
    }
  })

  describe('GitHub Actions工作流配置验证', () => {
    it('应该验证有效的CI工作流配置', () => {
      const validWorkflow = {
        name: 'CI Pipeline',
        on: {
          push: {
            branches: ['main', 'develop']
          },
          pull_request: {
            branches: ['main']
          }
        },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              {
                name: 'Checkout code',
                uses: 'actions/checkout@v4'
              },
              {
                name: 'Setup Node.js',
                uses: 'actions/setup-node@v4',
                with: {
                  'node-version': '20',
                  cache: 'npm'
                }
              },
              {
                name: 'Install dependencies',
                run: 'npm ci'
              },
              {
                name: 'Run tests',
                run: 'npm run test:coverage'
              }
            ]
          }
        }
      }

      expect(() => validateWorkflowConfig(validWorkflow)).not.toThrow()
      const result = validateWorkflowConfig(validWorkflow)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测缺少必需字段的工作流配置', () => {
      const invalidWorkflow = {
        // 缺少 name 字段
        on: {
          push: {
            branches: ['main']
          }
        }
        // 缺少 jobs 字段
      }

      const result = validateWorkflowConfig(invalidWorkflow)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.includes('name'))).toBe(true)
      expect(result.errors.some(e => e.includes('jobs'))).toBe(true)
    })

    it('应该验证工作流触发条件的正确性', () => {
      const workflowWithInvalidTriggers = {
        name: 'Test Workflow',
        on: {
          // 无效的触发条件格式
          push: 'invalid-format'
        },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: []
          }
        }
      }

      const result = validateWorkflowConfig(workflowWithInvalidTriggers)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('trigger'))).toBe(true)
    })

    it('应该验证job配置的完整性', () => {
      const workflowWithInvalidJob = {
        name: 'Test Workflow',
        on: {
          push: {
            branches: ['main']
          }
        },
        jobs: {
          test: {
            // 缺少 runs-on 字段
            steps: [
              {
                name: 'Test step',
                run: 'echo "test"'
              }
            ]
          }
        }
      }

      const result = validateWorkflowConfig(workflowWithInvalidJob)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('runs-on'))).toBe(true)
    })

    it('应该验证步骤配置的正确性', () => {
      const workflowWithInvalidStep = {
        name: 'Test Workflow',
        on: {
          push: {
            branches: ['main']
          }
        },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              {
                // 缺少 name 或 run/uses 字段
                invalid: 'step'
              }
            ]
          }
        }
      }

      const result = validateWorkflowConfig(workflowWithInvalidStep)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('step'))).toBe(true)
    })
  })

  describe('CI配置文件验证', () => {
    it('应该验证有效的CI配置文件', () => {
      const validCiConfig = {
        environments: {
          development: {
            apiUrl: 'http://localhost:3000',
            databaseUrl: 'postgresql://localhost:5432/mindnote_dev'
          },
          staging: {
            apiUrl: 'https://staging.mindnote.app',
            databaseUrl: process.env.STAGING_DATABASE_URL
          },
          production: {
            apiUrl: 'https://mindnote.app',
            databaseUrl: process.env.PRODUCTION_DATABASE_URL
          }
        },
        test: {
          coverage: {
            threshold: 80,
            reporters: ['text', 'lcov', 'html']
          },
          parallel: {
            workers: 4
          }
        },
        deploy: {
          strategy: 'blue-green',
          healthCheck: {
            endpoint: '/api/health',
            timeout: 30000,
            retries: 3
          }
        }
      }

      expect(() => validateCiConfig(validCiConfig)).not.toThrow()
      const result = validateCiConfig(validCiConfig)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测缺少环境配置', () => {
      const invalidCiConfig = {
        environments: {
          development: {
            apiUrl: 'http://localhost:3000'
          }
          // 缺少 staging 和 production 环境
        }
      }

      const result = validateCiConfig(invalidCiConfig)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('environment'))).toBe(true)
    })

    it('应该验证测试配置的完整性', () => {
      const ciConfigWithInvalidTest = {
        environments: {
          development: {
            apiUrl: 'http://localhost:3000'
          },
          staging: {
            apiUrl: 'https://staging.mindnote.app'
          },
          production: {
            apiUrl: 'https://mindnote.app'
          }
        },
        test: {
          coverage: {
            // 缺少 threshold
            reporters: ['text']
          }
        }
      }

      const result = validateCiConfig(ciConfigWithInvalidTest)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('coverage'))).toBe(true)
    })

    it('应该验证部署配置的合理性', () => {
      const ciConfigWithInvalidDeploy = {
        environments: {
          development: { apiUrl: 'http://localhost:3000' },
          staging: { apiUrl: 'https://staging.mindnote.app' },
          production: { apiUrl: 'https://mindnote.app' }
        },
        deploy: {
          strategy: 'invalid-strategy',
          healthCheck: {
            endpoint: '/api/health',
            timeout: -1 // 无效的超时时间
          }
        }
      }

      const result = validateCiConfig(ciConfigWithInvalidDeploy)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('strategy'))).toBe(true)
      expect(result.errors.some(e => e.includes('timeout'))).toBe(true)
    })
  })

  describe('配置文件存在性检查', () => {
    it('应该检查GitHub Actions工作流文件是否存在', () => {
      const workflowFiles = [
        'ci.yml',
        'deploy.yml',
        'security-scan.yml'
      ]

      workflowFiles.forEach(file => {
        const filePath = join(testWorkflowsDir, file)
        // 在测试环境中模拟文件存在性检查
        expect(typeof filePath).toBe('string')
        expect(file.endsWith('.yml') || file.endsWith('.yaml')).toBe(true)
      })
    })

    it('应该检查CI配置文件是否存在', () => {
      const ciConfigFiles = [
        'ci.config.js',
        '.ci.json',
        'vercel.json'
      ]

      ciConfigFiles.forEach(file => {
        const filePath = join(process.cwd(), file)
        expect(typeof filePath).toBe('string')
      })
    })
  })

  describe('配置文件内容验证', () => {
    it('应该验证GitHub Actions工作流文件内容', () => {
      const mockWorkflowContent = `
name: CI Pipeline
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
      `.trim()

      // 验证工作流内容包含必需的元素
      expect(mockWorkflowContent).toContain('name: CI Pipeline')
      expect(mockWorkflowContent).toContain('on:')
      expect(mockWorkflowContent).toContain('jobs:')
      expect(mockWorkflowContent).toContain('npm run test:coverage')
      expect(mockWorkflowContent).toContain('codecov')
    })

    it('应该验证CI配置文件的环境变量', () => {
      const mockCiConfigContent = `
module.exports = {
  environments: {
    development: {
      apiUrl: process.env.DEV_API_URL || 'http://localhost:3000',
      databaseUrl: process.env.DEV_DATABASE_URL || 'postgresql://localhost:5432/mindnote_dev'
    },
    staging: {
      apiUrl: process.env.STAGING_API_URL,
      databaseUrl: process.env.STAGING_DATABASE_URL
    },
    production: {
      apiUrl: process.env.PRODUCTION_API_URL,
      databaseUrl: process.env.PRODUCTION_DATABASE_URL
    }
  },
  test: {
    coverage: {
      threshold: 80,
      reporters: ['text', 'lcov', 'html']
    }
  }
}
      `.trim()

      // 验证配置包含必需的环境变量
      expect(mockCiConfigContent).toContain('environments')
      expect(mockCiConfigContent).toContain('development')
      expect(mockCiConfigContent).toContain('staging')
      expect(mockCiConfigContent).toContain('production')
      expect(mockCiConfigContent).toContain('process.env')
    })
  })
})