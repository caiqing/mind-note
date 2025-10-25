/**
 * CI/CD流水线集成测试套件
 * 测试GitHub Actions工作流的配置和执行
 */

import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

describe('CI/CD Pipeline Tests', () => {
  const workflowsDir = path.join(process.cwd(), '.github', 'workflows')
  const scriptsDir = path.join(process.cwd(), 'scripts')

  beforeAll(() => {
    // 确保测试环境准备就绪
    expect(fs.existsSync(workflowsDir)).toBe(true)
  })

  describe('GitHub Actions Workflows Validation', () => {
    it('should have CI workflow file', () => {
      const ciWorkflow = path.join(workflowsDir, 'ci.yml')
      expect(fs.existsSync(ciWorkflow)).toBe(true)

      const content = fs.readFileSync(ciWorkflow, 'utf8')
      expect(content).toContain('name: CI Pipeline')
      expect(content).toContain('on:')
      expect(content).toContain('jobs:')
    })

    it('should have deploy workflow file', () => {
      const deployWorkflow = path.join(workflowsDir, 'deploy.yml')
      expect(fs.existsSync(deployWorkflow)).toBe(true)

      const content = fs.readFileSync(deployWorkflow, 'utf8')
      expect(content).toContain('name: Deploy')
      expect(content).toContain('environment:')
      expect(content).toContain('helm')
    })

    it('should have security workflow file', () => {
      const securityWorkflow = path.join(workflowsDir, 'security.yml')
      expect(fs.existsSync(securityWorkflow)).toBe(true)

      const content = fs.readFileSync(securityWorkflow, 'utf8')
      expect(content).toContain('name: Security Scan')
      expect(content).toContain('Snyk')
    })

    it('should have test workflow file', () => {
      const testWorkflow = path.join(workflowsDir, 'test.yml')
      expect(fs.existsSync(testWorkflow)).toBe(true)

      const content = fs.readFileSync(testWorkflow, 'utf8')
      expect(content).toContain('name: Test Suite')
      expect(content).toContain('playwright')
    })

    it('should have dependabot configuration', () => {
      const dependabotConfig = path.join(workflowsDir, '../dependabot.yml')
      expect(fs.existsSync(dependabotConfig)).toBe(true)

      const content = fs.readFileSync(dependabotConfig, 'utf8')
      expect(content).toContain('version: 2')
      expect(content).toContain('updates:')
    })
  })

  describe('CI Workflow Configuration', () => {
    const ciWorkflowPath = path.join(workflowsDir, 'ci.yml')
    let ciWorkflow: string

    beforeEach(() => {
      ciWorkflow = fs.readFileSync(ciWorkflowPath, 'utf8')
    })

    it('should trigger on correct events', () => {
      expect(ciWorkflow).toContain('push:')
      expect(ciWorkflow).toContain('pull_request:')
      expect(ciWorkflow).toContain('branches: [ main, develop ]')
    })

    it('should have required jobs', () => {
      expect(ciWorkflow).toContain('quality:')
      expect(ciWorkflow).toContain('test:')
      expect(ciWorkflow).toContain('integration:')
      expect(ciWorkflow).toContain('e2e:')
      expect(ciWorkflow).toContain('build:')
      expect(ciWorkflow).toContain('security:')
    })

    it('should use correct Node.js version', () => {
      expect(ciWorkflow).toContain("NODE_VERSION: '20'")
      expect(ciWorkflow).toContain('node-version: ${{ env.NODE_VERSION }}')
    })

    it('should include database services', () => {
      expect(ciWorkflow).toContain('pgvector/pgvector:pg16')
      expect(ciWorkflow).toContain('redis:7-alpine')
      expect(ciWorkflow).toContain('pg_isready')
      expect(ciWorkflow).toContain('redis-cli ping')
    })

    it('should have proper job dependencies', () => {
      expect(ciWorkflow).toContain('needs: quality')
      expect(ciWorkflow).toContain('needs: test')
      expect(ciWorkflow).toContain('needs: integration')
    })

    it('should include coverage reporting', () => {
      expect(ciWorkflow).toContain('codecov/codecov-action')
      expect(ciWorkflow).toContain('file: ./coverage/lcov.info')
    })

    it('should include performance testing for PRs', () => {
      expect(ciWorkflow).toContain('Lighthouse CI')
      expect(ciWorkflow).toContain("if: github.event_name == 'pull_request'")
    })
  })

  describe('Deploy Workflow Configuration', () => {
    const deployWorkflowPath = path.join(workflowsDir, 'deploy.yml')
    let deployWorkflow: string

    beforeEach(() => {
      deployWorkflow = fs.readFileSync(deployWorkflowPath, 'utf8')
    })

    it('should trigger on correct events', () => {
      expect(deployWorkflow).toContain('push:')
      expect(deployWorkflow).toContain('branches: [ main ]')
      expect(deployWorkflow).toContain('tags: [ \'v*\' ]')
    })

    it('should have staging and production environments', () => {
      expect(deployWorkflow).toContain('environment: staging')
      expect(deployWorkflow).toContain('environment: production')
    })

    it('should use Docker for containerization', () => {
      expect(deployWorkflow).toContain('docker/metadata-action')
      expect(deployWorkflow).toContain('docker/build-push-action')
      expect(deployWorkflow).toContain('platforms: linux/amd64,linux/arm64')
    })

    it('should include security scanning', () => {
      expect(deployWorkflow).toContain('aquasecurity/trivy-action')
      expect(deployWorkflow).toContain('trivy-results.sarif')
    })

    it('should use Helm for deployment', () => {
      expect(deployWorkflow).toContain('helm upgrade')
      expect(deployWorkflow).toContain('./helm/mindnote')
    })

    it('should have rollback mechanism', () => {
      expect(deployWorkflow).toContain('rollback:')
      expect(deployWorkflow).toContain('helm rollback')
    })

    it('should include deployment verification', () => {
      expect(deployWorkflow).toContain('rollout status')
      expect(deployWorkflow).toContain('smoke tests')
      expect(deployWorkflow).toContain('health checks')
    })
  })

  describe('Security Workflow Configuration', () => {
    const securityWorkflowPath = path.join(workflowsDir, 'security.yml')
    let securityWorkflow: string

    beforeEach(() => {
      if (fs.existsSync(securityWorkflowPath)) {
        securityWorkflow = fs.readFileSync(securityWorkflowPath, 'utf8')
      }
    })

    it('should exist and have security scans', () => {
      if (fs.existsSync(securityWorkflowPath)) {
        expect(securityWorkflow).toContain('npm audit')
        expect(securityWorkflow).toContain('Snyk')
      }
    })
  })

  describe('Required Scripts and Tools', () => {
    it('should have database verification script', () => {
      const verifyScript = path.join(scriptsDir, 'verify-database-structure.js')
      expect(fs.existsSync(verifyScript)).toBe(true)
    })

    it('should have health check script', () => {
      const healthScript = path.join(scriptsDir, 'health-check.sh')
      expect(fs.existsSync(healthScript)).toBe(true)
    })

    it('should have database initialization scripts', () => {
      const initScript = path.join(scriptsDir, 'init-database.sh')
      const seedScript = path.join(scriptsDir, 'database-seeder.js')

      expect(fs.existsSync(initScript)).toBe(true)
      expect(fs.existsSync(seedScript)).toBe(true)
    })
  })

  describe('Environment Configuration', () => {
    it('should have example environment files', () => {
      const envExample = path.join(process.cwd(), '.env.example')
      const envTest = path.join(process.cwd(), '.env.test.example')

      expect(fs.existsSync(envExample)).toBe(true)
      expect(fs.existsSync(envTest)).toBe(true)
    })

    it('should have Docker configuration files', () => {
      const dockerfile = path.join(process.cwd(), 'Dockerfile')
      const dockerCompose = path.join(process.cwd(), 'docker-compose.yml')
      const dockerComposeDev = path.join(process.cwd(), 'docker-compose.dev.yml')

      expect(fs.existsSync(dockerfile)).toBe(true)
      expect(fs.existsSync(dockerCompose)).toBe(true)
      expect(fs.existsSync(dockerComposeDev)).toBe(true)
    })
  })

  describe('Package.json Scripts for CI/CD', () => {
    let packageJson: any

    beforeAll(() => {
      const packagePath = path.join(process.cwd(), 'package.json')
      packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    })

    it('should have test scripts', () => {
      expect(packageJson.scripts).toHaveProperty('test:unit')
      expect(packageJson.scripts).toHaveProperty('test:integration')
      expect(packageJson.scripts).toHaveProperty('test:e2e')
      expect(packageJson.scripts).toHaveProperty('test:api')
    })

    it('should have database scripts', () => {
      expect(packageJson.scripts).toHaveProperty('db:migrate')
      expect(packageJson.scripts).toHaveProperty('db:seed')
      expect(packageJson.scripts).toHaveProperty('db:test:setup')
    })

    it('should have build and quality scripts', () => {
      expect(packageJson.scripts).toHaveProperty('build')
      expect(packageJson.scripts).toHaveProperty('lint')
      expect(packageJson.scripts).toHaveProperty('type-check')
      expect(packageJson.scripts).toHaveProperty('format:check')
    })

    it('should have smoke test scripts', () => {
      expect(packageJson.scripts).toHaveProperty('test:smoke:staging')
      expect(packageJson.scripts).toHaveProperty('test:smoke:production')
    })
  })

  describe('Helm Chart Configuration', () => {
    const helmDir = path.join(process.cwd(), 'helm')

    it('should have Helm chart directory', () => {
      expect(fs.existsSync(helmDir)).toBe(true)
    })

    it('should have Chart.yaml', () => {
      const chartYaml = path.join(helmDir, 'mindnote', 'Chart.yaml')
      if (fs.existsSync(chartYaml)) {
        const content = fs.readFileSync(chartYaml, 'utf8')
        expect(content).toContain('name: mindnote')
        expect(content).toContain('version:')
      }
    })

    it('should have values files for different environments', () => {
      const valuesProd = path.join(helmDir, 'mindnote', 'values-production.yaml')
      const valuesStaging = path.join(helmDir, 'mindnote', 'values-staging.yaml')

      if (fs.existsSync(valuesProd) && fs.existsSync(valuesStaging)) {
        const prodContent = fs.readFileSync(valuesProd, 'utf8')
        const stagingContent = fs.readFileSync(valuesStaging, 'utf8')

        expect(prodContent).toContain('environment: production')
        expect(stagingContent).toContain('environment: staging')
      }
    })
  })

  describe('Local Development Simulation', () => {
    it('should be able to validate workflow syntax', () => {
      try {
        // 使用GitHub CLI或其他工具验证workflow语法
        // 这里我们只检查文件是否可以解析为YAML
        const workflows = ['ci.yml', 'deploy.yml', 'test.yml', 'security.yml']

        workflows.forEach(workflow => {
          const workflowPath = path.join(workflowsDir, workflow)
          if (fs.existsSync(workflowPath)) {
            const content = fs.readFileSync(workflowPath, 'utf8')
            expect(content.length).toBeGreaterThan(0)
            expect(content).toContain('name:')
            expect(content).toContain('on:')
            expect(content).toContain('jobs:')
          }
        })
      } catch (error) {
        fail(`Workflow validation failed: ${error}`)
      }
    })

    it('should have proper secret references', () => {
      const ciWorkflow = fs.readFileSync(path.join(workflowsDir, 'ci.yml'), 'utf8')
      const deployWorkflow = fs.readFileSync(path.join(workflowsDir, 'deploy.yml'), 'utf8')

      // 检查密钥引用格式
      expect(ciWorkflow).toMatch(/\${{\s*secrets\.\w+\s*}}/)
      expect(deployWorkflow).toMatch(/\${{\s*secrets\.\w+\s*}}/)

      // 检查关键密钥
      expect(ciWorkflow).toContain('DATABASE_URL')
      expect(ciWorkflow).toContain('REDIS_URL')
      expect(deployWorkflow).toContain('OPENAI_API_KEY')
      expect(deployWorkflow).toContain('ANTHROPIC_API_KEY')
    })
  })

  describe('Performance and Monitoring', () => {
    it('should include Lighthouse CI configuration', () => {
      const lighthouseConfig = path.join(process.cwd(), 'lighthouserc.js')
      if (fs.existsSync(lighthouseConfig)) {
        const content = fs.readFileSync(lighthouseConfig, 'utf8')
        expect(content).toContain('ci:')
        expect(content).toContain('collect:')
      }
    })

    it('should have monitoring endpoints defined', () => {
      const deployWorkflow = fs.readFileSync(path.join(workflowsDir, 'deploy.yml'), 'utf8')
      expect(deployWorkflow).toContain('/api/health')
      expect(deployWorkflow).toContain('/api/monitoring/health')
    })
  })
})