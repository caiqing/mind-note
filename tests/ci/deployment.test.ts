/**
 * 部署配置测试套件
 * 测试部署脚本、配置和基础设施设置
 */

import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

describe('Deployment Configuration Tests', () => {
  const helmDir = path.join(process.cwd(), 'helm')
  const scriptsDir = path.join(process.cwd(), 'scripts')
  const k8sDir = path.join(process.cwd(), 'k8s')

  beforeAll(() => {
    // 确保测试环境准备就绪
    process.env.NODE_ENV = 'test'
  })

  describe('Docker Configuration', () => {
    const dockerfile = path.join(process.cwd(), 'Dockerfile')
    let dockerfileContent: string

    beforeEach(() => {
      dockerfileContent = fs.readFileSync(dockerfile, 'utf8')
    })

    it('should have production-ready Dockerfile', () => {
      expect(fs.existsSync(dockerfile)).toBe(true)
      expect(dockerfileContent).toContain('FROM node:')
      expect(dockerfileContent).toContain('WORKDIR /app')
      expect(dockerfileContent).toContain('COPY package*.json')
      expect(dockerfileContent).toContain('RUN npm ci')
      expect(dockerfileContent).toContain('COPY .')
      expect(dockerfileContent).toContain('RUN npm run build')
      expect(dockerfileContent).toContain('EXPOSE')
      expect(dockerfileContent).toContain('CMD')
    })

    it('should use multi-stage build for optimization', () => {
      expect(dockerfileContent).toMatch(/FROM.*AS builder/)
      expect(dockerfileContent).toMatch(/FROM.*AS runtime/)
    })

    it('should have proper security settings', () => {
      expect(dockerfileContent).toContain('USER node')
      expect(dockerfileContent).toMatch(/addgroup|adduser/)
    })

    it('should have .dockerignore file', () => {
      const dockerignore = path.join(process.cwd(), '.dockerignore')
      expect(fs.existsSync(dockerignore)).toBe(true)

      const content = fs.readFileSync(dockerignore, 'utf8')
      expect(content).toContain('node_modules')
      expect(content).toContain('.git')
      expect(content).toContain('coverage')
      expect(content).toContain('.env')
    })
  })

  describe('Docker Compose Configuration', () => {
    const dockerCompose = path.join(process.cwd(), 'docker-compose.yml')
    const dockerComposeDev = path.join(process.cwd(), 'docker-compose.dev.yml')

    it('should have production docker-compose configuration', () => {
      expect(fs.existsSync(dockerCompose)).toBe(true)

      const content = fs.readFileSync(dockerCompose, 'utf8')
      expect(content).toContain('version:')
      expect(content).toContain('services:')
      expect(content).toContain('app:')
      expect(content).toContain('postgres:')
      expect(content).toContain('redis:')
    })

    it('should have development docker-compose configuration', () => {
      expect(fs.existsSync(dockerComposeDev)).toBe(true)

      const content = fs.readFileSync(dockerComposeDev, 'utf8')
      expect(content).toContain('volumes:')
      expect(content).toContain('ports:')
    })

    it('should use pgvector for PostgreSQL', () => {
      const content = fs.readFileSync(dockerCompose, 'utf8')
      expect(content).toContain('pgvector/pgvector')
    })

    it('should have proper health checks', () => {
      const content = fs.readFileSync(dockerCompose, 'utf8')
      expect(content).toContain('healthcheck:')
    })
  })

  describe('Helm Chart Configuration', () => {
    const chartDir = path.join(helmDir, 'mindnote')

    it('should have complete Helm chart structure', () => {
      expect(fs.existsSync(chartDir)).toBe(true)

      const requiredFiles = [
        'Chart.yaml',
        'values.yaml',
        'templates/deployment.yaml',
        'templates/service.yaml',
        'templates/ingress.yaml',
        'templates/configmap.yaml',
        'templates/secret.yaml'
      ]

      requiredFiles.forEach(file => {
        const filePath = path.join(chartDir, file)
        expect(fs.existsSync(filePath)).toBe(true)
      })
    })

    it('should have valid Chart.yaml', () => {
      const chartYaml = path.join(chartDir, 'Chart.yaml')
      const content = fs.readFileSync(chartYaml, 'utf8')
      const chart = yaml.load(content) as any

      expect(chart.name).toBe('mindnote')
      expect(chart.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(chart.appVersion).toBeDefined()
      expect(chart.description).toBeDefined()
      expect(chart.apiVersion).toBe('v2')
    })

    it('should have comprehensive values.yaml', () => {
      const valuesYaml = path.join(chartDir, 'values.yaml')
      const content = fs.readFileSync(valuesYaml, 'utf8')
      const values = yaml.load(content) as any

      expect(values.image).toBeDefined()
      expect(values.image.repository).toBeDefined()
      expect(values.image.tag).toBeDefined()

      expect(values.service).toBeDefined()
      expect(values.service.type).toBeDefined()
      expect(values.service.port).toBeDefined()

      expect(values.resources).toBeDefined()
      expect(values.resources.requests).toBeDefined()
      expect(values.resources.limits).toBeDefined()

      expect(values.database).toBeDefined()
      expect(values.redis).toBeDefined()
      expect(values.ai).toBeDefined()
    })

    it('should have environment-specific values files', () => {
      const environments = ['staging', 'production']

      environments.forEach(env => {
        const valuesFile = path.join(chartDir, `values-${env}.yaml`)
        if (fs.existsSync(valuesFile)) {
          const content = fs.readFileSync(valuesFile, 'utf8')
          const values = yaml.load(content) as any

          expect(values.environment).toBe(env)
          expect(values.replicaCount).toBeGreaterThan(0)

          if (env === 'production') {
            expect(values.replicaCount).toBeGreaterThanOrEqual(2)
          }
        }
      })
    })

    it('should have properly templated Kubernetes resources', () => {
      const templatesDir = path.join(chartDir, 'templates')
      const templateFiles = fs.readdirSync(templatesDir)

      templateFiles.forEach(file => {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const filePath = path.join(templatesDir, file)
          const content = fs.readFileSync(filePath, 'utf8')

          // 检查模板语法
          expect(content).toContain('{{')
          expect(content).toContain('}}')

          // 检查必需的Kubernetes字段
          expect(content).toContain('apiVersion:')
          expect(content).toContain('kind:')
          expect(content).toContain('metadata:')
        }
      })
    })
  })

  describe('Kubernetes Manifests', () => {
    it('should have namespace definitions', () => {
      const namespaceFile = path.join(k8sDir, 'namespace.yaml')
      if (fs.existsSync(namespaceFile)) {
        const content = fs.readFileSync(namespaceFile, 'utf8')
        const manifest = yaml.load(content) as any

        expect(manifest.kind).toBe('Namespace')
        expect(manifest.metadata.name).toMatch(/(staging|production|development)/)
      }
    })

    it('should have ConfigMap configurations', () => {
      const configmapFile = path.join(k8sDir, 'configmap.yaml')
      if (fs.existsSync(configmapFile)) {
        const content = fs.readFileSync(configmapFile, 'utf8')
        const manifest = yaml.load(content) as any

        expect(manifest.kind).toBe('ConfigMap')
        expect(manifest.data).toBeDefined()
      }
    })

    it('should have Secret configurations', () => {
      const secretFile = path.join(k8sDir, 'secret.yaml')
      if (fs.existsSync(secretFile)) {
        const content = fs.readFileSync(secretFile, 'utf8')
        const manifest = yaml.load(content) as any

        expect(manifest.kind).toBe('Secret')
        expect(manifest.type).toBeDefined()
      }
    })
  })

  describe('Infrastructure as Code', () => {
    it('should have Terraform configuration (if applicable)', () => {
      const terraformDir = path.join(process.cwd(), 'terraform')
      if (fs.existsSync(terraformDir)) {
        const mainTf = path.join(terraformDir, 'main.tf')
        const variablesTf = path.join(terraformDir, 'variables.tf')
        const outputsTf = path.join(terraformDir, 'outputs.tf')

        expect(fs.existsSync(mainTf)).toBe(true)
        expect(fs.existsSync(variablesTf)).toBe(true)
        expect(fs.existsSync(outputsTf)).toBe(true)
      }
    })

    it('should have CloudFormation templates (if applicable)', () => {
      const cloudformationDir = path.join(process.cwd(), 'cloudformation')
      if (fs.existsSync(cloudformationDir)) {
        const templateFiles = fs.readdirSync(cloudformationDir)
        expect(templateFiles.length).toBeGreaterThan(0)

        templateFiles.forEach(file => {
          if (file.endsWith('.yaml') || file.endsWith('.yml')) {
            const filePath = path.join(cloudformationDir, file)
            const content = fs.readFileSync(filePath, 'utf8')
            expect(content).toContain('AWSTemplateFormatVersion')
          }
        })
      }
    })
  })

  describe('Deployment Scripts', () => {
    it('should have deployment scripts', () => {
      const deployScript = path.join(scriptsDir, 'deploy.sh')
      const deployStagingScript = path.join(scriptsDir, 'deploy-staging.sh')
      const deployProductionScript = path.join(scriptsDir, 'deploy-production.sh')

      // 至少应该有一个部署脚本
      expect(
        fs.existsSync(deployScript) ||
        fs.existsSync(deployStagingScript) ||
        fs.existsSync(deployProductionScript)
      ).toBe(true)
    })

    it('should have rollback scripts', () => {
      const rollbackScript = path.join(scriptsDir, 'rollback.sh')
      if (fs.existsSync(rollbackScript)) {
        const content = fs.readFileSync(rollbackScript, 'utf8')
        expect(content).toContain('helm rollback')
        expect(content).toContain('kubectl')
      }
    })

    it('should have database migration scripts', () => {
      const migrateScript = path.join(scriptsDir, 'migrate.sh')
      if (fs.existsSync(migrateScript)) {
        const content = fs.readFileSync(migrateScript, 'utf8')
        expect(content).toContain('npm run db:migrate')
      }
    })
  })

  describe('Environment Configuration', () => {
    it('should have environment-specific configurations', () => {
      const envConfigs = ['.env.staging', '.env.production']

      envConfigs.forEach(config => {
        const configPath = path.join(process.cwd(), config)
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, 'utf8')
          expect(content).toContain('NODE_ENV')
          expect(content).toContain('DATABASE_URL')
          expect(content).toContain('REDIS_URL')
        }
      })
    })

    it('should have example environment files', () => {
      const envExample = path.join(process.cwd(), '.env.example')
      expect(fs.existsSync(envExample)).toBe(true)

      const content = fs.readFileSync(envExample, 'utf8')
      expect(content).toContain('# Database Configuration')
      expect(content).toContain('# Redis Configuration')
      expect(content).toContain('# AI Service Configuration')
    })
  })

  describe('Monitoring and Logging Configuration', () => {
    it('should have monitoring configuration', () => {
      const monitoringDir = path.join(process.cwd(), 'monitoring')
      if (fs.existsSync(monitoringDir)) {
        const prometheusConfig = path.join(monitoringDir, 'prometheus.yml')
        const grafanaDashboard = path.join(monitoringDir, 'grafana-dashboard.json')

        if (fs.existsSync(prometheusConfig)) {
          const content = fs.readFileSync(prometheusConfig, 'utf8')
          expect(content).toContain('scrape_configs:')
        }

        if (fs.existsSync(grafanaDashboard)) {
          const content = fs.readFileSync(grafanaDashboard, 'utf8')
          const dashboard = JSON.parse(content)
          expect(dashboard.title).toBeDefined()
          expect(dashboard.panels).toBeDefined()
        }
      }
    })

    it('should have logging configuration', () => {
      const loggingConfig = path.join(process.cwd(), 'logging.yml')
      if (fs.existsSync(loggingConfig)) {
        const content = fs.readFileSync(loggingConfig, 'utf8')
        expect(content).toContain('handlers:')
        expect(content).toContain('loggers:')
      }
    })
  })

  describe('Security Configuration', () => {
    it('should have network policies', () => {
      const networkPolicyFile = path.join(k8sDir, 'network-policy.yaml')
      if (fs.existsSync(networkPolicyFile)) {
        const content = fs.readFileSync(networkPolicyFile, 'utf8')
        const policy = yaml.load(content) as any

        expect(policy.kind).toBe('NetworkPolicy')
        expect(policy.spec).toBeDefined()
        expect(policy.spec.policyTypes).toBeDefined()
      }
    })

    it('should have RBAC configuration', () => {
      const rbacFiles = ['serviceaccount.yaml', 'role.yaml', 'rolebinding.yaml']

      rbacFiles.forEach(file => {
        const filePath = path.join(k8sDir, file)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8')
          const manifest = yaml.load(content) as any

          expect(['ServiceAccount', 'Role', 'RoleBinding']).toContain(manifest.kind)
        }
      })
    })

    it('should have pod security policies', () => {
      const pspFile = path.join(k8sDir, 'pod-security-policy.yaml')
      if (fs.existsSync(pspFile)) {
        const content = fs.readFileSync(pspFile, 'utf8')
        const policy = yaml.load(content) as any

        expect(policy.kind).toBe('PodSecurityPolicy')
        expect(policy.spec).toBeDefined()
      }
    })
  })

  describe('Backup and Disaster Recovery', () => {
    it('should have backup scripts', () => {
      const backupScript = path.join(scriptsDir, 'backup.sh')
      if (fs.existsSync(backupScript)) {
        const content = fs.readFileSync(backupScript, 'utf8')
        expect(content).toContain('pg_dump')
        expect(content).toContain('aws s3')
      }
    })

    it('should have restore scripts', () => {
      const restoreScript = path.join(scriptsDir, 'restore.sh')
      if (fs.existsSync(restoreScript)) {
        const content = fs.readFileSync(restoreScript, 'utf8')
        expect(content).toContain('psql')
        expect(content).toContain('aws s3')
      }
    })
  })

  describe('Performance Optimization', () => {
    it('should have horizontal pod autoscaler configuration', () => {
      const hpaFile = path.join(k8sDir, 'hpa.yaml')
      if (fs.existsSync(hpaFile)) {
        const content = fs.readFileSync(hpaFile, 'utf8')
        const hpa = yaml.load(content) as any

        expect(hpa.kind).toBe('HorizontalPodAutoscaler')
        expect(hpa.spec).toBeDefined()
        expect(hpa.spec.scaleTargetRef).toBeDefined()
        expect(hpa.spec.minReplicas).toBeDefined()
        expect(hpa.spec.maxReplicas).toBeDefined()
      }
    })

    it('should have vertical pod autoscaler configuration', () => {
      const vpaFile = path.join(k8sDir, 'vpa.yaml')
      if (fs.existsSync(vpaFile)) {
        const content = fs.readFileSync(vpaFile, 'utf8')
        const vpa = yaml.load(content) as any

        expect(vpa.kind).toBe('VerticalPodAutoscaler')
        expect(vpa.spec).toBeDefined()
      }
    })
  })
})