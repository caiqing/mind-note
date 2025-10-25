/**
 * Contract test for code quality API endpoints
 * 测试代码质量API端点的契约测试
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import { app } from '../../src/app'

describe('Code Quality API Contract Tests', () => {
  beforeAll(async () => {
    // 确保开发环境配置已加载
    process.env.NODE_ENV = 'development'
  })

  describe('GET /api/dev/quality/check', () => {
    it('should return code quality metrics', async () => {
      const response = await request(app)
        .get('/api/dev/quality/check')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('metrics')
      expect(response.body.data.metrics).toHaveProperty('eslintErrors')
      expect(response.body.data.metrics).toHaveProperty('prettierIssues')
      expect(response.body.data.metrics).toHaveProperty('typeScriptErrors')
      expect(response.body.data.metrics).toHaveProperty('testCoverage')
    })

    it('should return valid quality score (0-100)', async () => {
      const response = await request(app)
        .get('/api/dev/quality/check')
        .expect(200)

      const score = response.body.data.metrics.qualityScore
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })
  })

  describe('POST /api/dev/quality/format', () => {
    it('should format provided code', async () => {
      const unformattedCode = `
const x=1;const y=2;
function test(){return x+y;}
      `.trim()

      const response = await request(app)
        .post('/api/dev/quality/format')
        .send({ code: unformattedCode, language: 'typescript' })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('formattedCode')
      expect(response.body.data.formattedCode).not.toBe(unformattedCode)
      expect(response.body.data.formattedCode).toContain('const x = 1')
      expect(response.body.data.formattedCode).toContain('const y = 2')
    })

    it('should handle invalid TypeScript code gracefully', async () => {
      const invalidCode = 'const x = ; invalid syntax'

      const response = await request(app)
        .post('/api/dev/quality/format')
        .send({ code: invalidCode, language: 'typescript' })
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body.data).toHaveProperty('errors')
      expect(Array.isArray(response.body.data.errors)).toBe(true)
    })
  })

  describe('POST /api/dev/quality/lint', () => {
    it('should lint provided code and return issues', async () => {
      const problematicCode = `
var x = 1;
console.log(x);
      `.trim()

      const response = await request(app)
        .post('/api/dev/quality/lint')
        .send({ code: problematicCode, language: 'typescript' })
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('issues')
      expect(Array.isArray(response.body.data.issues)).toBe(true)

      // 应该检测到使用var而不是let/const的问题
      const varIssues = response.body.data.issues.filter(
        (issue: any) => issue.ruleId === 'no-var'
      )
      expect(varIssues.length).toBeGreaterThan(0)
    })
  })

  afterAll(async () => {
    // 清理资源
  })
})