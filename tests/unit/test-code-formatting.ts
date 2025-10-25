/**
 * Unit test for code formatting
 * 测试代码格式化的单元测试
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { formatCode, lintCode, getQualityMetrics } from '../../src/lib/dev/code-quality'

describe('Code Formatting Unit Tests', () => {
  beforeAll(() => {
    // 确保测试环境配置
    process.env.NODE_ENV = 'test'
  })

  describe('formatCode', () => {
    it('should format JavaScript code properly', async () => {
      const unformattedJs = `
const x=1;const y=2;
function test(){return x+y;}
      `.trim()

      const result = await formatCode(unformattedJs, 'javascript')

      expect(result.success).toBe(true)
      expect(result.formattedCode).toContain('const x = 1')
      expect(result.formattedCode).toContain('const y = 2')
      expect(result.formattedCode).toContain('function test() {')
      expect(result.formattedCode).toContain('return x + y')
    })

    it('should format TypeScript code properly', async () => {
      const unformattedTs = `
interface User{name:string;age:number;}
function greet(user:User){return \`Hello,\${user.name}!\`;}
      `.trim()

      const result = await formatCode(unformattedTs, 'typescript')

      expect(result.success).toBe(true)
      expect(result.formattedCode).toContain('interface User {')
      expect(result.formattedCode).toContain('name: string')
      expect(result.formattedCode).toContain('age: number')
      expect(result.formattedCode).toContain('function greet(user: User) {')
    })

    it('should handle JSON formatting', async () => {
      const unformattedJson = `{"name":"John","age":30,"city":"New York"}`

      const result = await formatCode(unformattedJson, 'json')

      expect(result.success).toBe(true)
      expect(result.formattedCode).toContain('{')
      expect(result.formattedCode).toContain('"name": "John"')
      expect(result.formattedCode).toContain('"age": 30')
      expect(result.formattedCode).toContain('"city": "New York"')
    })

    it('should return original code for unsupported languages', async () => {
      const code = 'some code in unsupported language'

      const result = await formatCode(code, 'unknown-language')

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Unsupported language: unknown-language')
    })

    it('should handle empty code gracefully', async () => {
      const result = await formatCode('', 'typescript')

      expect(result.success).toBe(true)
      expect(result.formattedCode).toBe('')
    })
  })

  describe('lintCode', () => {
    it('should detect ESLint issues in JavaScript', async () => {
      const problematicJs = `
var x = 1;
console.log(x);
unusedVar = "test";
      `.trim()

      const result = await lintCode(problematicJs, 'javascript')

      expect(result.success).toBe(true)
      expect(result.issues.length).toBeGreaterThan(0)

      // 检查是否检测到no-var问题
      const varIssue = result.issues.find(issue => issue.ruleId === 'no-var')
      expect(varIssue).toBeDefined()
      expect(varIssue?.severity).toBe('error')

      // 检查是否检测到未使用变量问题
      const unusedIssue = result.issues.find(issue =>
        issue.ruleId === 'no-unused-vars' || issue.ruleId === 'no-undef'
      )
      expect(unusedIssue).toBeDefined()
    })

    it('should detect TypeScript specific issues', async () => {
      const problematicTs = `
function test(param: any) {
  return param.toString();
}
      `.trim()

      const result = await lintCode(problematicTs, 'typescript')

      expect(result.success).toBe(true)
      expect(result.issues.length).toBeGreaterThan(0)

      // 检查是否检测到any类型问题
      const anyIssue = result.issues.find(issue =>
        issue.message.includes('any') || issue.ruleId === '@typescript-eslint/no-explicit-any'
      )
      expect(anyIssue).toBeDefined()
    })

    it('should return no issues for clean code', async () => {
      const cleanJs = `
const x = 1;
const y = 2;

function add(a, b) {
  return a + b;
}

const result = add(x, y);
console.log(result);
      `.trim()

      const result = await lintCode(cleanJs, 'javascript')

      expect(result.success).toBe(true)
      expect(result.issues.length).toBe(0)
    })

    it('should provide detailed issue information', async () => {
      const problematicJs = 'var x = 1;'

      const result = await lintCode(problematicJs, 'javascript')

      expect(result.issues[0]).toHaveProperty('line')
      expect(result.issues[0]).toHaveProperty('column')
      expect(result.issues[0]).toHaveProperty('message')
      expect(result.issues[0]).toHaveProperty('ruleId')
      expect(result.issues[0]).toHaveProperty('severity')
      expect(typeof result.issues[0].line).toBe('number')
      expect(typeof result.issues[0].column).toBe('number')
    })
  })

  describe('getQualityMetrics', () => {
    it('should return comprehensive quality metrics', async () => {
      const code = `
const x = 1;
function test() { return x; }
      `.trim()

      const metrics = await getQualityMetrics(code, 'typescript')

      expect(metrics).toHaveProperty('qualityScore')
      expect(metrics).toHaveProperty('eslintErrors')
      expect(metrics).toHaveProperty('prettierIssues')
      expect(metrics).toHaveProperty('typeScriptErrors')
      expect(metrics).toHaveProperty('maintainabilityIndex')
      expect(metrics).toHaveProperty('complexity')

      expect(typeof metrics.qualityScore).toBe('number')
      expect(metrics.qualityScore).toBeGreaterThanOrEqual(0)
      expect(metrics.qualityScore).toBeLessThanOrEqual(100)

      expect(typeof metrics.eslintErrors).toBe('number')
      expect(typeof metrics.prettierIssues).toBe('number')
      expect(typeof metrics.typeScriptErrors).toBe('number')
    })

    it('should calculate quality score correctly', async () => {
      const perfectCode = `
const name = "MindNote";
const version = "1.0.0";

function greet(userName: string) {
  return \`Hello, \${userName}! Welcome to \${name} v\${version}\`;
}

export { greet };
      `.trim()

      const metrics = await getQualityMetrics(perfectCode, 'typescript')

      // 高质量代码应该有高分数
      expect(metrics.qualityScore).toBeGreaterThan(80)
      expect(metrics.eslintErrors).toBe(0)
      expect(metrics.typeScriptErrors).toBe(0)
    })

    it('should penalize code quality issues appropriately', async () => {
      const poorCode = 'var x=1;function test(){return x;}'

      const metrics = await getQualityMetrics(poorCode, 'javascript')

      // 低质量代码应该有较低分数
      expect(metrics.qualityScore).toBeLessThan(80)
      expect(metrics.eslintErrors + metrics.prettierIssues).toBeGreaterThan(0)
    })
  })
})