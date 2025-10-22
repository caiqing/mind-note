import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import { app } from '@/app' // 假设有一个app实例

describe('Development Environment Health Check', () => {
  beforeAll(async () => {
    // 确保测试环境已启动
  })

  afterAll(async () => {
    // 清理测试环境
  })

  describe('API Health Endpoint', () => {
    it('should return 200 for health check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'healthy')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('services')
    })

    it('should check database connection', async () => {
      const response = await request(app)
        .get('/api/health/database')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'healthy')
      expect(response.body).toHaveProperty('responseTime')
    })

    it('should check Redis connection', async () => {
      const response = await request(app)
        .get('/api/health/redis')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'healthy')
    })

    it('should check AI services availability', async () => {
      const response = await request(app)
        .get('/api/health/ai')
        .expect(200)

      expect(response.body).toHaveProperty('services')
      expect(response.body.services).toHaveProperty('ollama')
      expect(response.body.services).toHaveProperty('openai')
    })
  })

  describe('Environment Validation', () => {
    it('should validate required environment variables', async () => {
      const response = await request(app)
        .get('/api/health/environment')
        .expect(200)

      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('missing')
      expect(Array.isArray(response.body.missing)).toBe(true)
    })

    it('should check development environment setup', async () => {
      const response = await request(app)
        .get('/api/health/setup')
        .expect(200)

      expect(response.body).toHaveProperty('nodeVersion')
      expect(response.body).toHaveProperty('nextVersion')
      expect(response.body).toHaveProperty('prismaVersion')
    })
  })

  describe('Service Dependencies', () => {
    it('should verify PostgreSQL connection', async () => {
      const response = await request(app)
        .get('/api/health/postgres')
        .expect(200)

      expect(response.body).toHaveProperty('connected', true)
      expect(response.body).toHaveProperty('version')
    })

    it('should verify Redis functionality', async () => {
      const response = await request(app)
        .get('/api/health/redis-test')
        .expect(200)

      expect(response.body).toHaveProperty('readWrite', true)
      expect(response.body).toHaveProperty('responseTime')
    })

    it('should verify Ollama service', async () => {
      const response = await request(app)
        .get('/api/health/ollama')
        .expect(200)

      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('models')
    })
  })

  describe('Performance Checks', () => {
    it('should respond within acceptable time limits', async () => {
      const start = Date.now()
      await request(app).get('/api/health')
      const responseTime = Date.now() - start

      expect(responseTime).toBeLessThan(100) // 100ms max
    })

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/api/health')
      )

      const responses = await Promise.all(requests)

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })
})