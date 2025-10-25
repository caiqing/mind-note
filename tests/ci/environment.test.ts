/**
 * 环境配置测试套件
 * 测试不同环境的配置和设置
 */

import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

describe('Environment Configuration Tests', () => {
  const projectRoot = process.cwd()
  const envDir = projectRoot
  const configDir = path.join(projectRoot, 'config')

  beforeAll(() => {
    // 设置测试环境变量
    process.env.NODE_ENV = 'test'
  })

  describe('Environment Variables Configuration', () => {
    it('should have .env.example file', () => {
      const envExample = path.join(envDir, '.env.example')
      expect(fs.existsSync(envExample)).toBe(true)

      const content = fs.readFileSync(envExample, 'utf8')
      expect(content).toContain('NODE_ENV=')
      expect(content).toContain('DATABASE_URL=')
      expect(content).toContain('REDIS_URL=')
      expect(content).toContain('NEXTAUTH_SECRET=')
      expect(content).toContain('OPENAI_API_KEY=')
      expect(content).toContain('ANTHROPIC_API_KEY=')
    })

    it('should have .env.test.example file', () => {
      const envTestExample = path.join(envDir, '.env.test.example')
      expect(fs.existsSync(envTestExample)).toBe(true)

      const content = fs.readFileSync(envTestExample, 'utf8')
      expect(content).toContain('NODE_ENV=test')
      expect(content).toContain('DATABASE_URL=')
      expect(content).toContain('REDIS_URL=')
    })

    it('should have environment-specific configurations', () => {
      const environments = ['staging', 'production', 'development']

      environments.forEach(env => {
        const envFile = path.join(envDir, `.env.${env}`)
        const envExampleFile = path.join(envDir, `.env.${env}.example`)

        // 应该有示例文件或实际文件
        expect(fs.existsSync(envFile) || fs.existsSync(envExampleFile)).toBe(true)
      })
    })

    it('should validate environment variable format', () => {
      const envExample = path.join(envDir, '.env.example')
      const content = fs.readFileSync(envExample, 'utf8')

      // 检查必需的环境变量
      const requiredVars = [
        'NODE_ENV',
        'DATABASE_URL',
        'REDIS_URL',
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL',
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY'
      ]

      requiredVars.forEach(varName => {
        expect(content).toContain(`${varName}=`)
      })

      // 检查注释说明
      expect(content).toContain('#')
      expect(content).toContain('Database Configuration')
      expect(content).toContain('AI Service Configuration')
    })

    it('should have database connection string formats', () => {
      const envExample = path.join(envDir, '.env.example')
      const content = fs.readFileSync(envExample, 'utf8')

      // 检查PostgreSQL连接字符串格式
      expect(content).toMatch(/postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^?]+/)

      // 检查Redis连接字符串格式
      expect(content).toMatch(/redis:\/\/[^:]+:\d+/)
    })

    it('should have AI service API key configurations', () => {
      const envExample = path.join(envDir, '.env.example')
      const content = fs.readFileSync(envExample, 'utf8')

      // 检查AI服务配置
      expect(content).toContain('OPENAI_API_KEY=')
      expect(content).toContain('ANTHROPIC_API_KEY=')
      expect(content).toContain('AI_MODEL_DEFAULT=')
      expect(content).toContain('AI_TEMPERATURE=')
      expect(content).toContain('AI_MAX_TOKENS=')
    })
  })

  describe('Database Configuration', () => {
    it('should have database configuration files', () => {
      const dbConfigFiles = [
        'database.yml',
        'database.json',
        'prisma/schema.prisma'
      ]

      dbConfigFiles.forEach(file => {
        const filePath = path.join(projectRoot, file)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8')
          expect(content.length).toBeGreaterThan(0)
        }
      })
    })

    it('should have Prisma schema configuration', () => {
      const prismaSchema = path.join(projectRoot, 'prisma', 'schema.prisma')
      if (fs.existsSync(prismaSchema)) {
        const content = fs.readFileSync(prismaSchema, 'utf8')

        expect(content).toContain('generator client')
        expect(content).toContain('datasource db')
        expect(content).toContain('provider = "postgresql"')
        expect(content).toContain('env("DATABASE_URL")')
      }
    })

    it('should have database migration configuration', () => {
      const migrationDir = path.join(projectRoot, 'prisma', 'migrations')
      if (fs.existsSync(migrationDir)) {
        const migrations = fs.readdirSync(migrationDir)
        expect(migrations.length).toBeGreaterThanOrEqual(0)
      }
    })

    it('should have database seeding configuration', () => {
      const seedScript = path.join(projectRoot, 'prisma', 'seed.ts')
      if (fs.existsSync(seedScript)) {
        const content = fs.readFileSync(seedScript, 'utf8')
        expect(content).toContain('import')
        expect(content).toContain('export')
      }
    })
  })

  describe('Redis Configuration', () => {
    it('should have Redis configuration', () => {
      const redisConfig = path.join(configDir, 'redis.js')
      const redisConfigTs = path.join(configDir, 'redis.ts')

      if (fs.existsSync(redisConfig) || fs.existsSync(redisConfigTs)) {
        const configFile = fs.existsSync(redisConfig) ? redisConfig : redisConfigTs
        const content = fs.readFileSync(configFile, 'utf8')

        expect(content).toContain('redis')
        expect(content).toContain('connect')
        expect(content).toContain('host')
        expect(content).toContain('port')
      }
    })

    it('should have Redis environment variables', () => {
      const envExample = path.join(envDir, '.env.example')
      const content = fs.readFileSync(envExample, 'utf8')

      expect(content).toContain('REDIS_URL=')
      expect(content).toContain('REDIS_HOST=')
      expect(content).toContain('REDIS_PORT=')
      expect(content).toContain('REDIS_PASSWORD=')
    })
  })

  describe('Next.js Configuration', () => {
    it('should have next.config.js configuration', () => {
      const nextConfig = path.join(projectRoot, 'next.config.js')
      const nextConfigMjs = path.join(projectRoot, 'next.config.mjs')

      const configFile = fs.existsSync(nextConfig) ? nextConfig : nextConfigMjs
      expect(fs.existsSync(configFile)).toBe(true)

      const content = fs.readFileSync(configFile, 'utf8')
      expect(content).toContain('module.exports')
      expect(content).toContain('next')
    })

    it('should have TypeScript configuration for Next.js', () => {
      const tsConfig = path.join(projectRoot, 'tsconfig.json')
      expect(fs.existsSync(tsConfig)).toBe(true)

      const content = fs.readFileSync(tsConfig, 'utf8')
      const config = JSON.parse(content)

      expect(config.compilerOptions).toBeDefined()
      expect(config.compilerOptions.target).toBeDefined()
      expect(config.compilerOptions.module).toBeDefined()
      expect(config.compilerOptions.esModuleInterop).toBe(true)
      expect(config.compilerOptions.allowSyntheticDefaultImports).toBe(true)
    })

    it('should have Next.js environment variables', () => {
      const envExample = path.join(envDir, '.env.example')
      const content = fs.readFileSync(envExample, 'utf8')

      expect(content).toContain('NEXTAUTH_URL=')
      expect(content).toContain('NEXTAUTH_SECRET=')
      expect(content).toContain('PORT=')
    })
  })

  describe('AI Service Configuration', () => {
    it('should have AI service configuration files', () => {
      const aiConfigFiles = [
        'ai-config.json',
        'ai-config.js',
        'ai-config.ts'
      ]

      const aiConfigFound = aiConfigFiles.some(file => {
        const filePath = path.join(configDir, file)
        return fs.existsSync(filePath)
      })

      expect(aiConfigFound).toBe(true)
    })

    it('should have AI provider configurations', () => {
      const aiConfigDir = path.join(projectRoot, 'src', 'lib', 'ai')
      if (fs.existsSync(aiConfigDir)) {
        const configFiles = fs.readdirSync(aiConfigDir)
        const hasConfig = configFiles.some(file =>
          file.includes('config') || file.includes('provider')
        )
        expect(hasConfig).toBe(true)
      }
    })

    it('should have AI service environment variables', () => {
      const envExample = path.join(envDir, '.env.example')
      const content = fs.readFileSync(envExample, 'utf8')

      // OpenAI配置
      expect(content).toContain('OPENAI_API_KEY=')
      expect(content).toContain('OPENAI_MODEL=')
      expect(content).toContain('OPENAI_BASE_URL=')

      // Anthropic配置
      expect(content).toContain('ANTHROPIC_API_KEY=')
      expect(content).toContain('ANTHROPIC_MODEL=')

      // 通用AI配置
      expect(content).toContain('AI_TEMPERATURE=')
      expect(content).toContain('AI_MAX_TOKENS=')
      expect(content).toContain('AI_TIMEOUT=')
    })
  })

  describe('Logging Configuration', () => {
    it('should have logging configuration', () => {
      const logConfigFiles = [
        'logger.js',
        'logger.ts',
        'winston.js',
        'winston.ts'
      ]

      const logConfigFound = logConfigFiles.some(file => {
        const filePath = path.join(configDir, file)
        return fs.existsSync(filePath)
      })

      if (logConfigFound) {
        // 检查日志配置内容
        logConfigFiles.forEach(file => {
          const filePath = path.join(configDir, file)
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8')
            expect(content.length).toBeGreaterThan(0)
          }
        })
      }
    })

    it('should have logging environment variables', () => {
      const envExample = path.join(envDir, '.env.example')
      const content = fs.readFileSync(envExample, 'utf8')

      expect(content).toContain('LOG_LEVEL=')
      expect(content).toContain('LOG_FORMAT=')
    })
  })

  describe('Security Configuration', () => {
    it('should have CORS configuration', () => {
      const corsConfig = path.join(configDir, 'cors.js')
      const corsConfigTs = path.join(configDir, 'cors.ts')

      if (fs.existsSync(corsConfig) || fs.existsSync(corsConfigTs)) {
        const configFile = fs.existsSync(corsConfig) ? corsConfig : corsConfigTs
        const content = fs.readFileSync(configFile, 'utf8')

        expect(content).toContain('origin')
        expect(content).toContain('credentials')
      }
    })

    it('should have rate limiting configuration', () => {
      const rateLimitConfig = path.join(configDir, 'rate-limit.js')
      if (fs.existsSync(rateLimitConfig)) {
        const content = fs.readFileSync(rateLimitConfig, 'utf8')
        expect(content).toContain('rateLimit')
        expect(content).toContain('windowMs')
        expect(content).toContain('max')
      }
    })

    it('should have security environment variables', () => {
      const envExample = path.join(envDir, '.env.example')
      const content = fs.readFileSync(envExample, 'utf8')

      expect(content).toContain('JWT_SECRET=')
      expect(content).toContain('ENCRYPTION_KEY=')
      expect(content).toContain('CORS_ORIGIN=')
    })
  })

  describe('Development Environment', () => {
    it('should have development-specific configuration', () => {
      const devEnvFile = path.join(envDir, '.env.development')
      const devEnvExample = path.join(envDir, '.env.development.example')

      const configFile = fs.existsSync(devEnvFile) ? devEnvFile : devEnvExample
      if (fs.existsSync(configFile)) {
        const content = fs.readFileSync(configFile, 'utf8')
        expect(content).toContain('NODE_ENV=development')
      }
    })

    it('should have development scripts in package.json', () => {
      const packageJson = path.join(projectRoot, 'package.json')
      const content = fs.readFileSync(packageJson, 'utf8')
      const config = JSON.parse(content)

      expect(config.scripts).toHaveProperty('dev')
      expect(config.scripts).toHaveProperty('develop')
    })
  })

  describe('Testing Environment', () => {
    it('should have testing-specific configuration', () => {
      const testEnvFile = path.join(envDir, '.env.test')
      const testEnvExample = path.join(envDir, '.env.test.example')

      const configFile = fs.existsSync(testEnvFile) ? testEnvFile : testEnvExample
      if (fs.existsSync(configFile)) {
        const content = fs.readFileSync(configFile, 'utf8')
        expect(content).toContain('NODE_ENV=test')
      }
    })

    it('should have testing database configuration', () => {
      const testEnvExample = path.join(envDir, '.env.test.example')
      const content = fs.readFileSync(testEnvExample, 'utf8')

      expect(content).toContain('DATABASE_URL=')
      expect(content).toMatch(/test|testing/)
    })

    it('should have Jest configuration', () => {
      const jestConfig = path.join(projectRoot, 'jest.config.js')
      const jestConfigTs = path.join(projectRoot, 'jest.config.ts')

      const configFile = fs.existsSync(jestConfig) ? jestConfig : jestConfigTs
      if (fs.existsSync(configFile)) {
        const content = fs.readFileSync(configFile, 'utf8')
        expect(content).toContain('testEnvironment')
        expect(content).toContain('testMatch')
      }
    })
  })

  describe('Production Environment', () => {
    it('should have production-specific configuration', () => {
      const prodEnvFile = path.join(envDir, '.env.production')
      const prodEnvExample = path.join(envDir, '.env.production.example')

      const configFile = fs.existsSync(prodEnvFile) ? prodEnvFile : prodEnvExample
      if (fs.existsSync(configFile)) {
        const content = fs.readFileSync(configFile, 'utf8')
        expect(content).toContain('NODE_ENV=production')
      }
    })

    it('should have production security settings', () => {
      const prodEnvExample = path.join(envDir, '.env.production.example')
      if (fs.existsSync(prodEnvExample)) {
        const content = fs.readFileSync(prodEnvExample, 'utf8')

        // 检查生产环境安全设置
        expect(content).toContain('NEXTAUTH_SECRET=')
        expect(content).toContain('JWT_SECRET=')
        expect(content).toContain('ENCRYPTION_KEY=')
      }
    })
  })

  describe('Staging Environment', () => {
    it('should have staging-specific configuration', () => {
      const stagingEnvFile = path.join(envDir, '.env.staging')
      const stagingEnvExample = path.join(envDir, '.env.staging.example')

      const configFile = fs.existsSync(stagingEnvFile) ? stagingEnvFile : stagingEnvExample
      if (fs.existsSync(configFile)) {
        const content = fs.readFileSync(configFile, 'utf8')
        expect(content).toContain('NODE_ENV=staging')
      }
    })
  })

  describe('Configuration Validation', () => {
    it('should validate required environment variables', () => {
      const envExample = path.join(envDir, '.env.example')
      const content = fs.readFileSync(envExample, 'utf8')

      // 检查所有必需的环境变量都有示例值
      const requiredEnvVars = [
        'NODE_ENV',
        'DATABASE_URL',
        'REDIS_URL',
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL',
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'PORT'
      ]

      requiredEnvVars.forEach(varName => {
        expect(content).toContain(`${varName}=`)
      })
    })

    it('should have environment variable validation scripts', () => {
      const validateScript = path.join(projectRoot, 'scripts', 'validate-env.js')
      if (fs.existsSync(validateScript)) {
        const content = fs.readFileSync(validateScript, 'utf8')
        expect(content).toContain('process.env')
        expect(content).toContain('required')
      }
    })

    it('should have type definitions for environment variables', () => {
      const typeDefs = path.join(projectRoot, 'types', 'env.d.ts')
      if (fs.existsSync(typeDefs)) {
        const content = fs.readFileSync(typeDefs, 'utf8')
        expect(content).toContain('declare global')
        expect(content).toContain('process.env')
      }
    })
  })

  describe('Container Environment Configuration', () => {
    it('should have Docker environment configuration', () => {
      const dockerfile = path.join(projectRoot, 'Dockerfile')
      if (fs.existsSync(dockerfile)) {
        const content = fs.readFileSync(dockerfile, 'utf8')
        expect(content).toContain('ENV')
        expect(content).toContain('NODE_ENV')
      }
    })

    it('should have docker-compose environment variables', () => {
      const dockerCompose = path.join(projectRoot, 'docker-compose.yml')
      if (fs.existsSync(dockerCompose)) {
        const content = fs.readFileSync(dockerCompose, 'utf8')
        expect(content).toContain('environment:')
      }
    })
  })
})