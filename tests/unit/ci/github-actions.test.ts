/**
 * GitHub Actions工作流测试
 * 测试GitHub Actions工作流的执行逻辑和配置
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from 'fs'
import { join } from 'path'
import {
  parseWorkflowFile,
  validateWorkflowExecution,
  simulateWorkflowRun,
  checkWorkflowDependencies,
  WorkflowRunner
} from '@/lib/ci/github-actions-runner'

describe('GitHub Actions工作流测试', () => {
  const testWorkflowsDir = join(process.cwd(), 'test-tmp', '.github', 'workflows')
  let workflowRunner: WorkflowRunner

  beforeEach(() => {
    // 创建测试目录
    if (!existsSync(testWorkflowsDir)) {
      mkdirSync(testWorkflowsDir, { recursive: true })
    }
    workflowRunner = new WorkflowRunner()
  })

  afterEach(() => {
    // 清理测试文件
    try {
      const testFiles = ['ci.yml', 'deploy.yml', 'security-scan.yml']
      testFiles.forEach(file => {
        const filePath = join(testWorkflowsDir, file)
        if (existsSync(filePath)) {
          unlinkSync(filePath)
        }
      })
    } catch (error) {
      // 忽略清理错误
    }
  })

  describe('工作流文件解析', () => {
    it('应该正确解析CI工作流文件', () => {
      const ciWorkflowContent = `
name: CI Pipeline
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  lint:
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
      - name: Run linting
        run: npm run lint

  test:
    runs-on: ubuntu-latest
    needs: lint
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
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: false
      `.trim()

      const workflowPath = join(testWorkflowsDir, 'ci.yml')
      writeFileSync(workflowPath, ciWorkflowContent)

      const parsedWorkflow = parseWorkflowFile(workflowPath)

      expect(parsedWorkflow.name).toBe('CI Pipeline')
      expect(parsedWorkflow.on).toHaveProperty('push')
      expect(parsedWorkflow.on).toHaveProperty('pull_request')
      expect(parsedWorkflow.jobs).toHaveProperty('lint')
      expect(parsedWorkflow.jobs).toHaveProperty('test')
      expect(parsedWorkflow.jobs.test.needs).toBe('lint')
    })

    it('应该正确解析部署工作流文件', () => {
      const deployWorkflowContent = `
name: Deploy to Production
on:
  push:
    tags: ['v*']

jobs:
  build:
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
      - name: Build application
        run: npm run build
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/

  deploy:
    runs-on: ubuntu-latest
    needs: build
    environment: production
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build
          path: dist/
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
      `.trim()

      const workflowPath = join(testWorkflowsDir, 'deploy.yml')
      writeFileSync(workflowPath, deployWorkflowContent)

      const parsedWorkflow = parseWorkflowFile(workflowPath)

      expect(parsedWorkflow.name).toBe('Deploy to Production')
      expect(parsedWorkflow.on).toHaveProperty('push')
      expect(parsedWorkflow.jobs).toHaveProperty('build')
      expect(parsedWorkflow.jobs).toHaveProperty('deploy')
      expect(parsedWorkflow.jobs.deploy.environment).toBe('production')
    })

    it('应该处理格式错误的工作流文件', () => {
      const invalidWorkflowContent = `
name: Invalid Workflow
on:
  push:
    branches: [ main
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Invalid step
        invalid_field: value
      `.trim()

      const workflowPath = join(testWorkflowsDir, 'invalid.yml')
      writeFileSync(workflowPath, invalidWorkflowContent)

      expect(() => parseWorkflowFile(workflowPath)).toThrow()
    })
  })

  describe('工作流执行验证', () => {
    it('应该验证CI工作流的执行顺序', () => {
      const workflow = {
        name: 'CI Pipeline',
        on: { push: { branches: ['main'] } },
        jobs: {
          lint: { 'runs-on': 'ubuntu-latest', steps: [] },
          test: { 'runs-on': 'ubuntu-latest', needs: 'lint', steps: [] },
          build: { 'runs-on': 'ubuntu-latest', needs: 'test', steps: [] }
        }
      }

      const execution = validateWorkflowExecution(workflow)

      expect(execution.isValid).toBe(true)
      expect(execution.executionOrder).toEqual(['lint', 'test', 'build'])
      expect(execution.parallelJobs).toEqual([])
    })

    it('应该验证并行作业执行', () => {
      const workflow = {
        name: 'Parallel Tests',
        on: { push: { branches: ['main'] } },
        jobs: {
          test_unit: { 'runs-on': 'ubuntu-latest', steps: [] },
          test_integration: { 'runs-on': 'ubuntu-latest', steps: [] },
          test_e2e: { 'runs-on': 'ubuntu-latest', steps: [] },
          coverage: {
            'runs-on': 'ubuntu-latest',
            needs: ['test_unit', 'test_integration', 'test_e2e'],
            steps: []
          }
        }
      }

      const execution = validateWorkflowExecution(workflow)

      expect(execution.isValid).toBe(true)
      expect(execution.parallelJobs).toContain('test_unit')
      expect(execution.parallelJobs).toContain('test_integration')
      expect(execution.parallelJobs).toContain('test_e2e')
      expect(execution.executionOrder).toEqual(['test_unit', 'test_integration', 'test_e2e', 'coverage'])
    })

    it('应该检测循环依赖', () => {
      const workflow = {
        name: 'Circular Dependency',
        on: { push: { branches: ['main'] } },
        jobs: {
          job_a: { 'runs-on': 'ubuntu-latest', needs: 'job_c', steps: [] },
          job_b: { 'runs-on': 'ubuntu-latest', needs: 'job_a', steps: [] },
          job_c: { 'runs-on': 'ubuntu-latest', needs: 'job_b', steps: [] }
        }
      }

      const execution = validateWorkflowExecution(workflow)

      expect(execution.isValid).toBe(false)
      expect(execution.errors.some(e => e.includes('circular dependency'))).toBe(true)
    })

    it('应该检测缺失的依赖', () => {
      const workflow = {
        name: 'Missing Dependency',
        on: { push: { branches: ['main'] } },
        jobs: {
          job_a: { 'runs-on': 'ubuntu-latest', needs: 'nonexistent_job', steps: [] },
          job_b: { 'runs-on': 'ubuntu-latest', steps: [] }
        }
      }

      const execution = validateWorkflowExecution(workflow)

      expect(execution.isValid).toBe(false)
      expect(execution.errors.some(e => e.includes('nonexistent_job'))).toBe(true)
    })
  })

  describe('工作流模拟执行', () => {
    it('应该模拟成功的CI工作流执行', async () => {
      const workflow = {
        name: 'CI Pipeline',
        on: { push: { branches: ['main'] } },
        jobs: {
          lint: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Run linting', run: 'npm run lint' }
            ]
          },
          test: {
            'runs-on': 'ubuntu-latest',
            needs: 'lint',
            steps: [
              { name: 'Run tests', run: 'npm run test' }
            ]
          }
        }
      }

      // 模拟执行步骤
      const mockStepRunner = vi.fn().mockResolvedValue({ success: true })
      workflowRunner.setStepRunner(mockStepRunner)

      const result = await simulateWorkflowRun(workflow, {
        branch: 'main',
        commit: 'abc123'
      })

      expect(result.success).toBe(true)
      expect(result.completedJobs).toEqual(['lint', 'test'])
      expect(result.failedJobs).toHaveLength(0)
      expect(mockStepRunner).toHaveBeenCalledTimes(2)
    })

    it('应该处理工作流执行失败', async () => {
      const workflow = {
        name: 'CI Pipeline with Failure',
        on: { push: { branches: ['main'] } },
        jobs: {
          lint: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Run linting', run: 'npm run lint' }
            ]
          },
          test: {
            'runs-on': 'ubuntu-latest',
            needs: 'lint',
            steps: [
              { name: 'Run tests', run: 'npm run test' }
            ]
          }
        }
      }

      // 模拟lint步骤失败
      const mockStepRunner = vi.fn()
        .mockResolvedValueOnce({ success: false, error: 'Linting failed' })
        .mockResolvedValueOnce({ success: true })

      workflowRunner.setStepRunner(mockStepRunner)

      const result = await simulateWorkflowRun(workflow, {
        branch: 'main',
        commit: 'abc123'
      })

      expect(result.success).toBe(false)
      expect(result.completedJobs).toEqual([])
      expect(result.failedJobs).toContain('lint')
      expect(result.skippedJobs).toContain('test')
    })

    it('应该处理部分工作流失败', async () => {
      const workflow = {
        name: 'Partial Failure Pipeline',
        on: { push: { branches: ['main'] } },
        jobs: {
          test_unit: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Run unit tests', run: 'npm run test:unit' }
            ]
          },
          test_integration: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Run integration tests', run: 'npm run test:integration' }
            ]
          },
          coverage: {
            'runs-on': 'ubuntu-latest',
            needs: ['test_unit', 'test_integration'],
            steps: [
              { name: 'Generate coverage', run: 'npm run coverage' }
            ]
          }
        }
      }

      // 模拟集成测试失败
      const mockStepRunner = vi.fn()
        .mockResolvedValueOnce({ success: true })  // unit tests pass
        .mockResolvedValueOnce({ success: false, error: 'Integration tests failed' })  // integration tests fail

      workflowRunner.setStepRunner(mockStepRunner)

      const result = await simulateWorkflowRun(workflow, {
        branch: 'main',
        commit: 'abc123'
      })

      expect(result.success).toBe(false)
      expect(result.completedJobs).toContain('test_unit')
      expect(result.failedJobs).toContain('test_integration')
      expect(result.skippedJobs).toContain('coverage')
    })
  })

  describe('工作流依赖检查', () => {
    it('应该检查工作流间的依赖关系', () => {
      const workflows = [
        {
          name: 'CI Pipeline',
          file: 'ci.yml',
          triggers: ['push', 'pull_request'],
          outputs: ['test-results', 'build-artifacts']
        },
        {
          name: 'Deploy Pipeline',
          file: 'deploy.yml',
          triggers: ['push:tags'],
          requires: ['build-artifacts'],
          outputs: ['deployment-url']
        },
        {
          name: 'Security Scan',
          file: 'security-scan.yml',
          triggers: ['schedule'],
          requires: ['test-results'],
          outputs: ['security-report']
        }
      ]

      const dependencies = checkWorkflowDependencies(workflows)

      expect(dependencies.isValid).toBe(true)
      expect(dependencies.missingInputs).toHaveLength(0)
      expect(dependencies.unusedOutputs).toHaveLength(0)
    })

    it('应该检测缺失的输入依赖', () => {
      const workflows = [
        {
          name: 'CI Pipeline',
          file: 'ci.yml',
          triggers: ['push'],
          outputs: ['test-results']
        },
        {
          name: 'Deploy Pipeline',
          file: 'deploy.yml',
          triggers: ['push'],
          requires: ['build-artifacts'],  // CI没有提供这个输出
          outputs: ['deployment-url']
        }
      ]

      const dependencies = checkWorkflowDependencies(workflows)

      expect(dependencies.isValid).toBe(false)
      expect(dependencies.missingInputs).toContain('build-artifacts')
    })

    it('应该检测未使用的输出', () => {
      const workflows = [
        {
          name: 'CI Pipeline',
          file: 'ci.yml',
          triggers: ['push'],
          outputs: ['test-results', 'unused-artifacts']
        },
        {
          name: 'Deploy Pipeline',
          file: 'deploy.yml',
          triggers: ['push'],
          requires: ['test-results'],
          outputs: ['deployment-url']
        }
      ]

      const dependencies = checkWorkflowDependencies(workflows)

      expect(dependencies.unusedOutputs).toContain('unused-artifacts')
    })
  })

  describe('工作流性能测试', () => {
    it('应该估算工作流执行时间', () => {
      const workflow = {
        name: 'Performance Test Workflow',
        on: { push: { branches: ['main'] } },
        jobs: {
          setup: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Checkout', uses: 'actions/checkout@v4' },
              { name: 'Setup Node.js', uses: 'actions/setup-node@v4' },
              { name: 'Install dependencies', run: 'npm ci' }
            ]
          },
          test: {
            'runs-on': 'ubuntu-latest',
            needs: 'setup',
            steps: [
              { name: 'Run tests', run: 'npm run test' }
            ]
          }
        }
      }

      const performance = workflowRunner.estimatePerformance(workflow)

      expect(performance.estimatedDuration).toBeGreaterThan(0)
      expect(performance.jobTimes).toHaveProperty('setup')
      expect(performance.jobTimes).toHaveProperty('test')
      expect(performance.criticalPath.length).toBeGreaterThan(0)
    })

    it('应该识别性能瓶颈', () => {
      const workflow = {
        name: 'Bottleneck Workflow',
        on: { push: { branches: ['main'] } },
        jobs: {
          slow_job: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Slow operation', run: 'npm run very-slow-process' }
            ]
          },
          fast_job: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { name: 'Quick operation', run: 'npm run lint' }
            ]
          },
          final_job: {
            'runs-on': 'ubuntu-latest',
            needs: ['slow_job', 'fast_job'],
            steps: [
              { name: 'Final step', run: 'echo "done"' }
            ]
          }
        }
      }

      const bottlenecks = workflowRunner.identifyBottlenecks(workflow)

      expect(bottlenecks.length).toBeGreaterThan(0)
      expect(bottlenecks[0].job).toBe('slow_job')
      expect(bottlenecks[0].impact).toBe('high')
    })
  })
})