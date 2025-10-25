/**
 * GitHub Actions工作流运行器
 * 提供工作流解析、执行模拟和性能分析功能
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'

export interface WorkflowConfig {
  name: string
  on: Record<string, any>
  jobs: Record<string, JobConfig>
}

export interface JobConfig {
  'runs-on'?: string | string[]
  needs?: string | string[]
  environment?: string
  steps?: StepConfig[]
  timeout?: number
}

export interface StepConfig {
  name?: string
  uses?: string
  run?: string
  with?: Record<string, any>
  env?: Record<string, any>
  'continue-on-error'?: boolean
}

export interface WorkflowExecutionResult {
  success: boolean
  completedJobs: string[]
  failedJobs: string[]
  skippedJobs: string[]
  executionTime: number
  errors: string[]
}

export interface WorkflowValidation {
  isValid: boolean
  executionOrder: string[]
  parallelJobs: string[]
  errors: string[]
}

export interface WorkflowDependency {
  workflow: string
  file: string
  triggers: string[]
  requires: string[]
  outputs: string[]
}

export interface DependencyCheck {
  isValid: boolean
  missingInputs: string[]
  unusedOutputs: string[]
  circularDependencies: string[]
}

export interface WorkflowPerformance {
  estimatedDuration: number
  jobTimes: Record<string, number>
  criticalPath: string[]
  bottlenecks: PerformanceBottleneck[]
}

export interface PerformanceBottleneck {
  job: string
  estimatedTime: number
  impact: 'low' | 'medium' | 'high'
  suggestions: string[]
}

export interface WorkflowContext {
  branch?: string
  commit?: string
  tag?: string
  event?: string
  actor?: string
}

/**
 * GitHub Actions工作流运行器
 */
export class WorkflowRunner {
  private stepRunner: ((step: StepConfig) => Promise<{ success: boolean; error?: string }>) | null = null

  /**
   * 设置步骤执行器（用于测试）
   */
  setStepRunner(runner: (step: StepConfig) => Promise<{ success: boolean; error?: string }>): void {
    this.stepRunner = runner
  }

  /**
   * 解析工作流文件
   */
  parseWorkflowFile(filePath: string): WorkflowConfig {
    if (!existsSync(filePath)) {
      throw new Error(`工作流文件不存在: ${filePath}`)
    }

    try {
      const content = readFileSync(filePath, 'utf8')
      const workflow = parseYaml(content) as WorkflowConfig

      // 验证必需字段
      if (!workflow.name) {
        throw new Error('工作流缺少name字段')
      }

      if (!workflow.on) {
        throw new Error('工作流缺少on字段')
      }

      if (!workflow.jobs || Object.keys(workflow.jobs).length === 0) {
        throw new Error('工作流缺少jobs字段')
      }

      return workflow
    } catch (error) {
      throw new Error(`解析工作流文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 验证工作流执行
   */
  validateWorkflowExecution(workflow: WorkflowConfig): WorkflowValidation {
    const errors: string[] = []
    const jobs = workflow.jobs
    const jobNames = Object.keys(jobs)

    // 检查依赖关系
    const dependencies = new Map<string, string[]>()
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const executionOrder: string[] = []
    const parallelJobs: string[] = []

    // 构建依赖图
    for (const [jobName, job] of Object.entries(jobs)) {
      if (job.needs) {
        const needs = Array.isArray(job.needs) ? job.needs : [job.needs]
        dependencies.set(jobName, needs)

        // 检查依赖的job是否存在
        for (const dep of needs) {
          if (!jobs[dep]) {
            errors.push(`Job "${jobName}" 依赖的job "${dep}" 不存在`)
          }
        }
      }
    }

    // 检测循环依赖
    const hasCircularDependency = (job: string): boolean => {
      if (visiting.has(job)) {
        return true
      }

      if (visited.has(job)) {
        return false
      }

      visiting.add(job)
      const deps = dependencies.get(job) || []

      for (const dep of deps) {
        if (hasCircularDependency(dep)) {
          return true
        }
      }

      visiting.delete(job)
      visited.add(job)
      return false
    }

    for (const jobName of jobNames) {
      if (hasCircularDependency(jobName)) {
        errors.push(`检测到循环依赖，涉及job: ${jobName}`)
        break
      }
    }

    // 计算执行顺序
    const inDegree = new Map<string, number>()
    for (const jobName of jobNames) {
      inDegree.set(jobName, 0)
    }

    for (const [jobName, deps] of dependencies) {
      for (const dep of deps) {
        inDegree.set(jobName, (inDegree.get(jobName) || 0) + 1)
      }
    }

    const queue: string[] = []
    for (const [jobName, degree] of inDegree) {
      if (degree === 0) {
        queue.push(jobName)
        parallelJobs.push(jobName)
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!
      executionOrder.push(current)

      const deps = dependencies.get(current) || []
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) || 0) - 1)
        if (inDegree.get(dep) === 0) {
          queue.push(dep)
        }
      }
    }

    // 识别并行job
    const jobLevels = new Map<string, number>()
    for (const jobName of executionOrder) {
      const deps = dependencies.get(jobName) || []
      let maxLevel = 0
      for (const dep of deps) {
        const depLevel = jobLevels.get(dep) || 0
        maxLevel = Math.max(maxLevel, depLevel + 1)
      }
      jobLevels.set(jobName, maxLevel)
    }

    const levelGroups = new Map<number, string[]>()
    for (const [jobName, level] of jobLevels) {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, [])
      }
      levelGroups.get(level)!.push(jobName)
    }

    // 更新并行job列表（同一级别的job可以并行执行）
    for (const jobs of levelGroups.values()) {
      if (jobs.length > 1) {
        parallelJobs.push(...jobs)
      }
    }

    return {
      isValid: errors.length === 0,
      executionOrder,
      parallelJobs,
      errors
    }
  }

  /**
   * 模拟工作流执行
   */
  async simulateWorkflowRun(workflow: WorkflowConfig, context: WorkflowContext = {}): Promise<WorkflowExecutionResult> {
    const validation = this.validateWorkflowExecution(workflow)
    if (!validation.isValid) {
      return {
        success: false,
        completedJobs: [],
        failedJobs: [],
        skippedJobs: [],
        executionTime: 0,
        errors: validation.errors
      }
    }

    const completedJobs: string[] = []
    const failedJobs: string[] = []
    const skippedJobs: string[] = []
    const errors: string[] = []
    const startTime = Date.now()

    // 按执行顺序处理jobs
    for (const jobName of validation.executionOrder) {
      const job = workflow.jobs[jobName]

      // 检查依赖是否成功
      if (job.needs) {
        const needs = Array.isArray(job.needs) ? job.needs : [job.needs]
        const hasFailedDep = needs.some(dep => failedJobs.includes(dep))
        if (hasFailedDep) {
          skippedJobs.push(jobName)
          continue
        }
      }

      try {
        const success = await this.executeJob(job, jobName)
        if (success) {
          completedJobs.push(jobName)
        } else {
          failedJobs.push(jobName)
        }
      } catch (error) {
        failedJobs.push(jobName)
        errors.push(`Job "${jobName}" 执行失败: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    }

    const executionTime = Date.now() - startTime
    const success = failedJobs.length === 0

    return {
      success,
      completedJobs,
      failedJobs,
      skippedJobs,
      executionTime,
      errors
    }
  }

  /**
   * 执行单个job
   */
  private async executeJob(job: JobConfig, jobName: string): Promise<boolean> {
    if (!job.steps || job.steps.length === 0) {
      return true
    }

    for (const step of job.steps) {
      try {
        let result: { success: boolean; error?: string }

        if (this.stepRunner) {
          // 使用自定义步骤执行器（测试模式）
          result = await this.stepRunner(step)
        } else {
          // 模拟步骤执行
          result = await this.simulateStep(step)
        }

        if (!result.success) {
          if (step['continue-on-error']) {
            continue
          }
          return false
        }
      } catch (error) {
        if (step['continue-on-error']) {
          continue
        }
        return false
      }
    }

    return true
  }

  /**
   * 模拟步骤执行
   */
  private async simulateStep(step: StepConfig): Promise<{ success: boolean; error?: string }> {
    // 模拟不同类型的步骤执行时间
    const stepTypes = {
      'actions/checkout@v4': { time: 1000, successRate: 0.99 },
      'actions/setup-node@v4': { time: 2000, successRate: 0.98 },
      'npm ci': { time: 5000, successRate: 0.95 },
      'npm run lint': { time: 3000, successRate: 0.90 },
      'npm run test': { time: 10000, successRate: 0.85 },
      'npm run build': { time: 8000, successRate: 0.92 },
      'codecov/codecov-action@v3': { time: 2000, successRate: 0.95 }
    }

    let stepKey = ''
    if (step.uses) {
      stepKey = step.uses
    } else if (step.run) {
      // 从run命令中提取关键信息
      if (step.run.includes('npm ci')) stepKey = 'npm ci'
      else if (step.run.includes('npm run')) stepKey = step.run
      else stepKey = 'custom_command'
    }

    const stepType = stepTypes[stepKey] || { time: 3000, successRate: 0.95 }

    // 模拟执行时间
    await new Promise(resolve => setTimeout(resolve, Math.min(stepType.time, 100)))

    // 模拟成功率
    const isSuccess = Math.random() < stepType.successRate

    return {
      success: isSuccess,
      error: isSuccess ? undefined : '步骤执行失败（模拟）'
    }
  }

  /**
   * 估算工作流性能
   */
  estimatePerformance(workflow: WorkflowConfig): WorkflowPerformance {
    const jobTimes: Record<string, number> = {}
    const bottlenecks: PerformanceBottleneck[] = []

    // 估算每个job的执行时间
    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      let totalTime = 0

      if (job.steps) {
        for (const step of job.steps) {
          totalTime += this.estimateStepTime(step)
        }
      }

      jobTimes[jobName] = totalTime

      // 识别瓶颈
      if (totalTime > 30000) { // 超过30秒
        bottlenecks.push({
          job: jobName,
          estimatedTime: totalTime,
          impact: totalTime > 60000 ? 'high' : 'medium',
          suggestions: this.generateOptimizationSuggestions(job)
        })
      }
    }

    // 计算关键路径
    const criticalPath = this.calculateCriticalPath(workflow, jobTimes)
    const estimatedDuration = criticalPath.reduce((total, jobName) => total + jobTimes[jobName], 0)

    return {
      estimatedDuration,
      jobTimes,
      criticalPath,
      bottlenecks
    }
  }

  /**
   * 估算步骤执行时间
   */
  private estimateStepTime(step: StepConfig): number {
    const stepTimes: Record<string, number> = {
      'actions/checkout@v4': 1000,
      'actions/setup-node@v4': 2000,
      'npm ci': 5000,
      'npm run lint': 3000,
      'npm run test': 10000,
      'npm run test:coverage': 12000,
      'npm run build': 8000,
      'npm run type-check': 4000,
      'codecov/codecov-action@v3': 2000
    }

    if (step.uses) {
      return stepTimes[step.uses] || 3000
    }

    if (step.run) {
      for (const [pattern, time] of Object.entries(stepTimes)) {
        if (step.run.includes(pattern)) {
          return time
        }
      }
      return 3000 // 默认命令时间
    }

    return 1000 // 默认步骤时间
  }

  /**
   * 计算关键路径
   */
  private calculateCriticalPath(workflow: WorkflowConfig, jobTimes: Record<string, number>): string[] {
    const validation = this.validateWorkflowExecution(workflow)
    return validation.executionOrder
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationSuggestions(job: JobConfig): string[] {
    const suggestions: string[] = []

    if (job.steps) {
      const npmSteps = job.steps.filter(step => step.run && step.run.includes('npm run'))
      if (npmSteps.length > 1) {
        suggestions.push('考虑合并多个npm脚本以减少启动开销')
      }

      const hasCache = job.steps.some(step => step.uses && step.uses.includes('cache'))
      if (!hasCache && npmSteps.length > 0) {
        suggestions.push('添加依赖缓存以减少安装时间')
      }

      const hasParallel = job.steps.some(step => step.run && step.run.includes('parallel'))
      if (!hasParallel && job.steps.length > 3) {
        suggestions.push('考虑使用并行执行来减少总体时间')
      }
    }

    return suggestions
  }

  /**
   * 识别性能瓶颈
   */
  identifyBottlenecks(workflow: WorkflowConfig): PerformanceBottleneck[] {
    const performance = this.estimatePerformance(workflow)
    return performance.bottlenecks.sort((a, b) => b.estimatedTime - a.estimatedTime)
  }
}

/**
 * 解析工作流文件
 */
export function parseWorkflowFile(filePath: string): WorkflowConfig {
  const runner = new WorkflowRunner()
  return runner.parseWorkflowFile(filePath)
}

/**
 * 验证工作流执行
 */
export function validateWorkflowExecution(workflow: WorkflowConfig): WorkflowValidation {
  const runner = new WorkflowRunner()
  return runner.validateWorkflowExecution(workflow)
}

/**
 * 模拟工作流执行
 */
export async function simulateWorkflowRun(workflow: WorkflowConfig, context?: WorkflowContext): Promise<WorkflowExecutionResult> {
  const runner = new WorkflowRunner()
  return runner.simulateWorkflowRun(workflow, context)
}

/**
 * 检查工作流依赖
 */
export function checkWorkflowDependencies(workflows: WorkflowDependency[]): DependencyCheck {
  const allOutputs = new Set<string>()
  const allRequires = new Set<string>()
  const missingInputs: string[] = []
  const unusedOutputs: string[] = []

  // 收集所有输出和需求
  for (const workflow of workflows) {
    workflow.outputs.forEach(output => allOutputs.add(output))
    workflow.requires.forEach(require => allRequires.add(require))
  }

  // 检查缺失的输入
  for (const require of allRequires) {
    if (!allOutputs.has(require)) {
      missingInputs.push(require)
    }
  }

  // 检查未使用的输出
  for (const output of allOutputs) {
    if (!allRequires.has(output)) {
      unusedOutputs.push(output)
    }
  }

  return {
    isValid: missingInputs.length === 0,
    missingInputs,
    unusedOutputs,
    circularDependencies: [] // 简化实现，实际需要更复杂的循环依赖检测
  }
}