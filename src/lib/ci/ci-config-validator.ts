/**
 * CI/CD配置验证器
 * 提供GitHub Actions工作流和CI配置文件的验证功能
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface WorkflowConfig {
  name: string
  on: Record<string, any>
  jobs: Record<string, JobConfig>
}

export interface JobConfig {
  'runs-on'?: string | string[]
  needs?: string | string[]
  steps?: StepConfig[]
}

export interface StepConfig {
  name?: string
  uses?: string
  run?: string
  with?: Record<string, any>
  env?: Record<string, any>
}

export interface CIConfig {
  environments: Record<string, EnvironmentConfig>
  test?: TestConfig
  deploy?: DeployConfig
}

export interface EnvironmentConfig {
  apiUrl?: string
  databaseUrl?: string
  [key: string]: any
}

export interface TestConfig {
  coverage?: {
    threshold?: number
    reporters?: string[]
  }
  parallel?: {
    workers?: number
  }
}

export interface DeployConfig {
  strategy?: string
  healthCheck?: {
    endpoint?: string
    timeout?: number
    retries?: number
  }
}

/**
 * 验证GitHub Actions工作流配置
 */
export function validateWorkflowConfig(config: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 检查必需字段
  if (!config.name || typeof config.name !== 'string') {
    errors.push('工作流必须包含name字段且为字符串类型')
  }

  if (!config.on || typeof config.on !== 'object') {
    errors.push('工作流必须包含on字段定义触发条件')
  } else {
    // 验证触发条件
    validateTriggers(config.on, errors, warnings)
  }

  if (!config.jobs || typeof config.jobs !== 'object' || Object.keys(config.jobs).length === 0) {
    errors.push('工作流必须包含至少一个job')
  } else {
    // 验证job配置
    validateJobs(config.jobs, errors, warnings)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * 验证CI配置文件
 */
export function validateCiConfig(config: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 检查必需的环境配置
  if (!config.environments || typeof config.environments !== 'object') {
    errors.push('CI配置必须包含environments字段')
  } else {
    validateEnvironments(config.environments, errors, warnings)
  }

  // 验证测试配置
  if (config.test) {
    validateTestConfig(config.test, errors, warnings)
  }

  // 验证部署配置
  if (config.deploy) {
    validateDeployConfig(config.deploy, errors, warnings)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * 验证工作流触发条件
 */
function validateTriggers(triggers: Record<string, any>, errors: string[], warnings: string[]): void {
  const validTriggerTypes = ['push', 'pull_request', 'schedule', 'workflow_dispatch', 'repository_dispatch']

  Object.keys(triggers).forEach(triggerType => {
    if (!validTriggerTypes.includes(triggerType)) {
      warnings.push(`未知的触发条件类型: ${triggerType}`)
    }

    const trigger = triggers[triggerType]

    if (triggerType === 'push' || triggerType === 'pull_request') {
      if (trigger && typeof trigger === 'object' && trigger.branches) {
        if (!Array.isArray(trigger.branches) || trigger.branches.length === 0) {
          errors.push(`${triggerType}触发条件必须包含有效的branches数组`)
        }
      }
    }

    if (triggerType === 'schedule') {
      if (Array.isArray(trigger)) {
        trigger.forEach((cron, index) => {
          if (!validateCronExpression(cron)) {
            errors.push(`第${index + 1}个schedule的cron表达式格式无效: ${cron}`)
          }
        })
      }
    }
  })
}

/**
 * 验证job配置
 */
function validateJobs(jobs: Record<string, JobConfig>, errors: string[], warnings: string[]): void {
  Object.entries(jobs).forEach(([jobName, job]) => {
    // 检查runs-on字段
    if (!job['runs-on']) {
      errors.push(`Job "${jobName}" 必须指定runs-on字段`)
    } else if (typeof job['runs-on'] === 'string') {
      const validRunners = ['ubuntu-latest', 'ubuntu-20.04', 'ubuntu-22.04', 'windows-latest', 'windows-2022', 'macos-latest', 'macos-13']
      if (!validRunners.includes(job['runs-on'] as string)) {
        warnings.push(`Job "${jobName}" 使用了非标准的runner: ${job['runs-on']}`)
      }
    }

    // 检查依赖关系
    if (job.needs) {
      const needs = Array.isArray(job.needs) ? job.needs : [job.needs]
      needs.forEach(dep => {
        if (!jobs[dep]) {
          errors.push(`Job "${jobName}" 依赖的job "${dep}" 不存在`)
        }
      })
    }

    // 检查步骤
    if (job.steps) {
      if (!Array.isArray(job.steps)) {
        errors.push(`Job "${jobName}" 的steps字段必须是数组`)
      } else if (job.steps.length === 0) {
        warnings.push(`Job "${jobName}" 没有定义任何步骤`)
      } else {
        job.steps.forEach((step, index) => {
          validateStep(step, jobName, index, errors, warnings)
        })
      }
    }
  })
}

/**
 * 验证单个步骤
 */
function validateStep(step: StepConfig, jobName: string, index: number, errors: string[], warnings: string[]): void {
  const stepPrefix = `Job "${jobName}" 步骤 ${index + 1}`

  // 每个步骤必须包含name或run/uses之一
  if (!step.name && !step.run && !step.uses) {
    errors.push(`${stepPrefix} 必须包含name、run或uses字段`)
  }

  // 检查uses和run是否同时存在
  if (step.uses && step.run) {
    warnings.push(`${stepPrefix} 同时包含uses和run字段，建议只使用一种`)
  }

  // 验证uses字段
  if (step.uses) {
    const validActionPattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(@.+)?$/
    if (!validActionPattern.test(step.uses)) {
      errors.push(`${stepPrefix} uses字段格式无效: ${step.uses}`)
    }
  }

  // 验证run字段
  if (step.run && typeof step.run !== 'string') {
    errors.push(`${stepPrefix} run字段必须是字符串类型`)
  }
}

/**
 * 验证环境配置
 */
function validateEnvironments(environments: Record<string, EnvironmentConfig>, errors: string[], warnings: string[]): void {
  const requiredEnvironments = ['development', 'staging', 'production']

  requiredEnvironments.forEach(env => {
    if (!environments[env]) {
      errors.push(`缺少必需的环境配置: ${env}`)
    } else {
      const envConfig = environments[env]

      // 检查必需的配置项
      if (!envConfig.apiUrl) {
        warnings.push(`环境 ${env} 缺少apiUrl配置`)
      }

      if (!envConfig.databaseUrl) {
        warnings.push(`环境 ${env} 缺少databaseUrl配置`)
      }
    }
  })
}

/**
 * 验证测试配置
 */
function validateTestConfig(test: TestConfig, errors: string[], warnings: string[]): void {
  if (test.coverage) {
    if (typeof test.coverage.threshold !== 'number' || test.coverage.threshold < 0 || test.coverage.threshold > 100) {
      errors.push('coverage.threshold必须是0-100之间的数字')
    }

    if (test.coverage.reporters && !Array.isArray(test.coverage.reporters)) {
      errors.push('coverage.reporters必须是数组')
    }
  }

  if (test.parallel) {
    if (test.parallel.workers && (typeof test.parallel.workers !== 'number' || test.parallel.workers < 1)) {
      errors.push('parallel.workers必须是大于0的数字')
    }
  }
}

/**
 * 验证部署配置
 */
function validateDeployConfig(deploy: DeployConfig, errors: string[], warnings: string[]): void {
  const validStrategies = ['rolling', 'blue-green', 'canary', 'recreate']

  if (deploy.strategy && !validStrategies.includes(deploy.strategy)) {
    warnings.push(`未知的部署策略: ${deploy.strategy}`)
  }

  if (deploy.healthCheck) {
    if (!deploy.healthCheck.endpoint) {
      errors.push('healthCheck必须包含endpoint字段')
    }

    if (deploy.healthCheck.timeout && (typeof deploy.healthCheck.timeout !== 'number' || deploy.healthCheck.timeout < 0)) {
      errors.push('healthCheck.timeout必须是大于0的数字')
    }

    if (deploy.healthCheck.retries && (typeof deploy.healthCheck.retries !== 'number' || deploy.healthCheck.retries < 0)) {
      errors.push('healthCheck.retries必须是大于等于0的数字')
    }
  }
}

/**
 * 验证cron表达式格式
 */
function validateCronExpression(cron: string): boolean {
  // 简单的cron表达式验证
  const cronPattern = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/
  return cronPattern.test(cron)
}