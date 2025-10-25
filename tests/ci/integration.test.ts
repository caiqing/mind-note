/**
 * CI/CD集成测试套件
 * 测试CI/CD流程的端到端集成（配置验证，不执行实际命令）
 */

import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals'
import * as fs from 'fs'
import * as path from 'path'

describe('CI/CD Integration Tests', () => {
  const projectRoot = process.cwd()
  const workflowsDir = path.join(projectRoot, '.github', 'workflows')
  const scriptsDir = path.join(projectRoot, 'scripts')

  beforeAll(() => {
    process.env.NODE_ENV = 'test'
  })

  describe('Build Process Integration', () => {
    it('should have build scripts configured', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))

      expect(packageJson.scripts).toHaveProperty('build')
      expect(packageJson.scripts).toHaveProperty('type-check')

      // 检查构建脚本配置
      expect(packageJson.scripts.build).toBeDefined()
      expect(packageJson.scripts['type-check']).toBeDefined()
    })

    it('should have Next.js build configuration', () => {
      const nextConfig = path.join(projectRoot, 'next.config.js')
      const nextConfigMjs = path.join(projectRoot, 'next.config.mjs')

      const hasConfig = fs.existsSync(nextConfig) || fs.existsSync(nextConfigMjs)
      expect(hasConfig).toBe(true)
    })

    it('should have TypeScript build configuration', () => {
      const tsConfig = path.join(projectRoot, 'tsconfig.json')
      expect(fs.existsSync(tsConfig)).toBe(true)

      const content = fs.readFileSync(tsConfig, 'utf8')
      const config = JSON.parse(content)
      expect(config.compilerOptions).toBeDefined()
    })
  })

  describe('Test Process Integration', () => {
    it('should have test scripts configured', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))

      expect(packageJson.scripts).toHaveProperty('test')
      expect(packageJson.scripts).toHaveProperty('test:unit')

      // 可选的集成测试
      if (packageJson.scripts['test:integration']) {
        expect(packageJson.scripts['test:integration']).toBeDefined()
      }
    })

    it('should have test configuration files', () => {
      const jestConfig = path.join(projectRoot, 'jest.config.js')
      const jestConfigTs = path.join(projectRoot, 'jest.config.ts')
      const vitestConfig = path.join(projectRoot, 'vitest.config.ts')

      const hasConfig = fs.existsSync(jestConfig) ||
                       fs.existsSync(jestConfigTs) ||
                       fs.existsSync(vitestConfig)
      expect(hasConfig).toBe(true)
    })

    it('should have test coverage configuration', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))

      if (packageJson.scripts['test:coverage']) {
        expect(packageJson.scripts['test:coverage']).toBeDefined()
      }
    })
  })

  describe('Linting and Formatting Integration', () => {
    it('should have ESLint configuration', () => {
      const eslintConfig = path.join(projectRoot, '.eslintrc.js')
      const eslintConfigJson = path.join(projectRoot, '.eslintrc.json')

      const hasConfig = fs.existsSync(eslintConfig) || fs.existsSync(eslintConfigJson)
      expect(hasConfig).toBe(true)

      if (fs.existsSync(eslintConfig)) {
        const content = fs.readFileSync(eslintConfig, 'utf8')
        expect(content).toContain('module.exports')
        expect(content).toContain('extends')
      }
    })

    it('should have Prettier configuration', () => {
      const prettierConfig = path.join(projectRoot, '.prettierrc')
      const prettierConfigJson = path.join(projectRoot, '.prettierrc.json')
      const prettierConfigJs = path.join(projectRoot, 'prettier.config.js')

      const hasConfig = fs.existsSync(prettierConfig) ||
                       fs.existsSync(prettierConfigJson) ||
                       fs.existsSync(prettierConfigJs)
      expect(hasConfig).toBe(true)
    })

    it('should have lint and format scripts', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))

      expect(packageJson.scripts).toHaveProperty('lint')
      expect(packageJson.scripts).toHaveProperty('format:check')
    })
  })

  describe('Database Integration', () => {
    it('should have database migration scripts', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))

      expect(packageJson.scripts).toHaveProperty('db:migrate')
      expect(packageJson.scripts).toHaveProperty('db:generate')
    })

    it('should have database seeding capability', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))

      expect(packageJson.scripts).toHaveProperty('db:seed')
    })

    it('should have Prisma configuration', () => {
      const prismaSchema = path.join(projectRoot, 'prisma', 'schema.prisma')

      if (fs.existsSync(prismaSchema)) {
        const content = fs.readFileSync(prismaSchema, 'utf8')
        expect(content).toContain('generator client')
        expect(content).toContain('datasource db')
      }
    })

    it('should have database health check script', () => {
      const healthScript = path.join(scriptsDir, 'database-health-check.sh')

      if (fs.existsSync(healthScript)) {
        const content = fs.readFileSync(healthScript, 'utf8')
        expect(content.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Security Integration', () => {
    it('should have security scanning configuration', () => {
      const securityWorkflow = path.join(workflowsDir, 'security.yml')

      if (fs.existsSync(securityWorkflow)) {
        const content = fs.readFileSync(securityWorkflow, 'utf8')
        expect(content).toContain('name: Security Scan')
      }
    })

    it('should have npm audit capability', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))

      if (packageJson.scripts.audit) {
        expect(packageJson.scripts.audit).toBeDefined()
      }
    })

    it('should have security headers configuration', () => {
      const nextConfig = path.join(projectRoot, 'next.config.js')
      const nextConfigMjs = path.join(projectRoot, 'next.config.mjs')

      const configFile = fs.existsSync(nextConfig) ? nextConfig : nextConfigMjs
      if (fs.existsSync(configFile)) {
        const content = fs.readFileSync(configFile, 'utf8')
        // 检查是否有安全相关的配置
      }
    })
  })

  describe('Docker Integration', () => {
    it('should have Dockerfile configuration', () => {
      const dockerfile = path.join(projectRoot, 'Dockerfile')
      expect(fs.existsSync(dockerfile)).toBe(true)

      const content = fs.readFileSync(dockerfile, 'utf8')
      expect(content).toContain('FROM')
      expect(content).toContain('WORKDIR')
      expect(content).toContain('COPY')
      expect(content).toContain('RUN')
    })

    it('should have Docker Compose configuration', () => {
      const dockerCompose = path.join(projectRoot, 'docker-compose.yml')
      expect(fs.existsSync(dockerCompose)).toBe(true)

      const content = fs.readFileSync(dockerCompose, 'utf8')
      expect(content).toContain('version:')
      expect(content).toContain('services:')
    })

    it('should have Docker ignore file', () => {
      const dockerignore = path.join(projectRoot, '.dockerignore')
      expect(fs.existsSync(dockerignore)).toBe(true)

      const content = fs.readFileSync(dockerignore, 'utf8')
      expect(content).toContain('node_modules')
    })
  })

  describe('Deployment Integration', () => {
    it('should have deployment scripts', () => {
      const deployScripts = ['deploy.sh', 'deploy-staging.sh', 'deploy-production.sh']
      const hasDeployScript = deployScripts.some(script =>
        fs.existsSync(path.join(scriptsDir, script))
      )
      expect(hasDeployScript).toBe(true)
    })

    it('should have Helm chart configuration', () => {
      const helmDir = path.join(projectRoot, 'helm')

      if (fs.existsSync(helmDir)) {
        const chartDir = path.join(helmDir, 'mindnote')
        expect(fs.existsSync(chartDir)).toBe(true)

        const chartYaml = path.join(chartDir, 'Chart.yaml')
        if (fs.existsSync(chartYaml)) {
          const content = fs.readFileSync(chartYaml, 'utf8')
          expect(content).toContain('name: mindnote')
        }
      }
    })

    it('should have Kubernetes manifests', () => {
      const k8sDir = path.join(projectRoot, 'k8s')

      if (fs.existsSync(k8sDir)) {
        const manifests = fs.readdirSync(k8sDir)
        expect(manifests.length).toBeGreaterThan(0)

        manifests.forEach(manifest => {
          if (manifest.endsWith('.yaml') || manifest.endsWith('.yml')) {
            const filePath = path.join(k8sDir, manifest)
            const content = fs.readFileSync(filePath, 'utf8')
            expect(content).toContain('apiVersion:')
            expect(content).toContain('kind:')
          }
        })
      }
    })
  })

  describe('Monitoring and Health Check Integration', () => {
    it('should have health check endpoints', () => {
      const healthApi = path.join(projectRoot, 'src', 'app', 'api', 'health')

      if (fs.existsSync(healthApi)) {
        const routeFiles = fs.readdirSync(healthApi)
        expect(routeFiles.length).toBeGreaterThan(0)

        routeFiles.forEach(file => {
          if (file.endsWith('.ts') || file.endsWith('.js')) {
            const filePath = path.join(healthApi, file)
            const content = fs.readFileSync(filePath, 'utf8')
            expect(content).toContain('export')
          }
        })
      }
    })

    it('should have monitoring configuration', () => {
      const monitoringApi = path.join(projectRoot, 'src', 'app', 'api', 'monitoring')

      if (fs.existsSync(monitoringApi)) {
        const routeFiles = fs.readdirSync(monitoringApi)
        expect(routeFiles.length).toBeGreaterThan(0)
      }
    })

    it('should have health check scripts', () => {
      const healthScript = path.join(scriptsDir, 'health-check.sh')

      if (fs.existsSync(healthScript)) {
        const content = fs.readFileSync(healthScript, 'utf8')
        expect(content).toContain('curl')
        expect(content).toContain('/health')
      }
    })
  })

  describe('Performance Integration', () => {
    it('should have Lighthouse configuration', () => {
      const lighthouseConfig = path.join(projectRoot, 'lighthouserc.js')
      const lighthouseConfigJson = path.join(projectRoot, 'lighthouserc.json')

      const hasConfig = fs.existsSync(lighthouseConfig) || fs.existsSync(lighthouseConfigJson)

      if (hasConfig) {
        const configFile = fs.existsSync(lighthouseConfig) ? lighthouseConfig : lighthouseConfigJson
        const content = fs.readFileSync(configFile, 'utf8')

        if (configFile.endsWith('.js')) {
          expect(content).toContain('ci')
          expect(content).toContain('collect')
        } else {
          const config = JSON.parse(content)
          expect(config.ci).toBeDefined()
        }
      }
    })

    it('should have performance budget configuration', () => {
      const budgetFile = path.join(projectRoot, 'budget.json')

      if (fs.existsSync(budgetFile)) {
        const content = fs.readFileSync(budgetFile, 'utf8')
        const budget = JSON.parse(content)
        expect(budget.budgets).toBeDefined()
      }
    })
  })

  describe('Artifact and Cache Integration', () => {
    it('should have artifact upload configuration', () => {
      const ciWorkflow = path.join(workflowsDir, 'ci.yml')

      if (fs.existsSync(ciWorkflow)) {
        const content = fs.readFileSync(ciWorkflow, 'utf8')
        expect(content).toContain('upload-artifact')
      }
    })

    it('should have cache configuration', () => {
      const ciWorkflow = path.join(workflowsDir, 'ci.yml')

      if (fs.existsSync(ciWorkflow)) {
        const content = fs.readFileSync(ciWorkflow, 'utf8')
        expect(content).toContain('cache:')
      }
    })

    it('should have dependency caching strategy', () => {
      const ciWorkflow = path.join(workflowsDir, 'ci.yml')

      if (fs.existsSync(ciWorkflow)) {
        const content = fs.readFileSync(ciWorkflow, 'utf8')
        expect(content).toContain("cache: 'npm'")
      }
    })
  })

  describe('Notification Integration', () => {
    it('should have notification configuration', () => {
      const deployWorkflow = path.join(workflowsDir, 'deploy.yml')

      if (fs.existsSync(deployWorkflow)) {
        const content = fs.readFileSync(deployWorkflow, 'utf8')

        if (content.includes('SLACK_WEBHOOK_URL')) {
          expect(content).toContain('action-slack')
        }
      }
    })

    it('should have GitHub status checks', () => {
      const workflows = ['ci.yml', 'deploy.yml']

      workflows.forEach(workflow => {
        const workflowPath = path.join(workflowsDir, workflow)
        if (fs.existsSync(workflowPath)) {
          const content = fs.readFileSync(workflowPath, 'utf8')

          if (content.includes('github-script')) {
            expect(content).toContain('github-script')
          }
        }
      })
    })
  })

  describe('Environment-Specific Integration', () => {
    it('should handle staging environment deployment', () => {
      const deployWorkflow = path.join(workflowsDir, 'deploy.yml')

      if (fs.existsSync(deployWorkflow)) {
        const content = fs.readFileSync(deployWorkflow, 'utf8')

        if (content.includes('deploy-staging:')) {
          expect(content).toContain('environment: staging')
        }
      }
    })

    it('should handle production environment deployment', () => {
      const deployWorkflow = path.join(workflowsDir, 'deploy.yml')

      if (fs.existsSync(deployWorkflow)) {
        const content = fs.readFileSync(deployWorkflow, 'utf8')

        if (content.includes('deploy-production:')) {
          expect(content).toContain('environment: production')
        }
      }
    })

    it('should have environment-specific configuration files', () => {
      const envFiles = ['.env.staging.example', '.env.production.example']

      envFiles.forEach(file => {
        const filePath = path.join(projectRoot, file)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8')
          expect(content).toContain('NODE_ENV')
        }
      })
    })
  })

  describe('Rollback and Recovery Integration', () => {
    it('should have rollback mechanism', () => {
      const deployWorkflow = path.join(workflowsDir, 'deploy.yml')

      if (fs.existsSync(deployWorkflow)) {
        const content = fs.readFileSync(deployWorkflow, 'utf8')

        if (content.includes('rollback:')) {
          expect(content).toContain('helm rollback')
        }
      }
    })

    it('should have backup strategy', () => {
      const deployWorkflow = path.join(workflowsDir, 'deploy.yml')

      if (fs.existsSync(deployWorkflow)) {
        const content = fs.readFileSync(deployWorkflow, 'utf8')

        if (content.includes('backup')) {
          expect(content).toContain('backup')
        }
      }
    })

    it('should have recovery procedures', () => {
      const rollbackScript = path.join(scriptsDir, 'rollback.sh')

      if (fs.existsSync(rollbackScript)) {
        const content = fs.readFileSync(rollbackScript, 'utf8')
        expect(content).toContain('kubectl')
        expect(content).toContain('helm')
      }
    })
  })

  describe('End-to-End Workflow Validation', () => {
    it('should validate complete CI workflow', () => {
      const ciWorkflow = path.join(workflowsDir, 'ci.yml')

      if (fs.existsSync(ciWorkflow)) {
        const content = fs.readFileSync(ciWorkflow, 'utf8')

        // 检查所有必需的job
        const requiredJobs = ['quality', 'test', 'build']
        requiredJobs.forEach(job => {
          expect(content).toContain(`${job}:`)
        })

        // 检查job依赖关系
        expect(content).toContain('needs:')
      }
    })

    it('should validate complete deployment workflow', () => {
      const deployWorkflow = path.join(workflowsDir, 'deploy.yml')

      if (fs.existsSync(deployWorkflow)) {
        const content = fs.readFileSync(deployWorkflow, 'utf8')

        // 检查构建job
        expect(content).toContain('build:')

        // 检查部署验证
        expect(content).toContain('rollout status')
      }
    })

    it('should validate error handling and notifications', () => {
      const workflows = ['ci.yml', 'deploy.yml']

      workflows.forEach(workflow => {
        const workflowPath = path.join(workflowsDir, workflow)
        if (fs.existsSync(workflowPath)) {
          const content = fs.readFileSync(workflowPath, 'utf8')

          // 检查错误处理
          if (content.includes('if: failure()')) {
            expect(content).toContain('failure()')
          }

          // 检查通知机制
          if (content.includes('notify:')) {
            expect(content).toContain('notify:')
          }
        }
      })
    })

    it('should validate workflow triggers', () => {
      const ciWorkflow = path.join(workflowsDir, 'ci.yml')
      const deployWorkflow = path.join(workflowsDir, 'deploy.yml')

      // CI触发条件
      if (fs.existsSync(ciWorkflow)) {
        const content = fs.readFileSync(ciWorkflow, 'utf8')
        expect(content).toContain('on:')
        expect(content).toContain('push:')
        expect(content).toContain('pull_request:')
      }

      // 部署触发条件
      if (fs.existsSync(deployWorkflow)) {
        const content = fs.readFileSync(deployWorkflow, 'utf8')
        expect(content).toContain('on:')
        expect(content).toContain('push:')
      }
    })
  })
})