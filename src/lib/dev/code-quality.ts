/**
 * 代码质量工具库
 * 提供代码格式化、检查和质量评估功能
 */

import { ESLint } from 'eslint'
import { format } from 'prettier'
import * as prettierPluginTypescript from 'prettier/plugins/typescript'
import * as prettierPluginEstree from 'prettier/plugins/estree'
import { execFileNoThrow } from '@/utils/execFileNoThrow'

export interface FormatResult {
  success: boolean
  formattedCode?: string
  errors?: string[]
}

export interface LintIssue {
  line: number
  column: number
  message: string
  ruleId: string
  severity: 'error' | 'warning' | 'info'
  source?: string
}

export interface LintResult {
  success: boolean
  issues: LintIssue[]
  errors?: string[]
}

export interface QualityMetrics {
  qualityScore: number
  eslintErrors: number
  prettierIssues: number
  typeScriptErrors: number
  maintainabilityIndex: number
  complexity: number
}

/**
 * 格式化代码
 */
export async function formatCode(
  code: string,
  language: 'typescript' | 'javascript' | 'json' | 'css' | 'html' = 'typescript'
): Promise<FormatResult> {
  try {
    const parser = getParserForLanguage(language)

    const formattedCode = await format(code, {
      parser,
      plugins: [prettierPluginTypescript, prettierPluginEstree],
      semi: false,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'all',
      printWidth: 100,
      useTabs: false,
      bracketSpacing: true,
      arrowParens: 'avoid',
      endOfLine: 'lf',
    })

    return {
      success: true,
      formattedCode,
    }
  } catch (error: any) {
    return {
      success: false,
      errors: [error.message || '格式化失败'],
    }
  }
}

/**
 * 检查代码问题
 */
export async function lintCode(
  code: string,
  language: 'typescript' | 'javascript' = 'typescript'
): Promise<LintResult> {
  try {
    const eslint = new ESLint({
      baseConfig: {
        extends: [
          'eslint:recommended',
          '@typescript-eslint/recommended',
        ],
        parser: '@typescript-eslint/parser',
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
        },
        rules: {
          'no-var': 'error',
          'prefer-const': 'error',
          'no-console': 'warn',
          '@typescript-eslint/no-explicit-any': 'warn',
          '@typescript-eslint/no-unused-vars': 'error',
        },
      },
      useEslintrc: false,
    })

    const results = await eslint.lintText(code, {
      filePath: `temp.${language}`,
    })

    const issues: LintIssue[] = results[0]?.messages.map(msg => ({
      line: msg.line || 0,
      column: msg.column || 0,
      message: msg.message || '',
      ruleId: msg.ruleId || 'unknown',
      severity: msg.severity === 2 ? 'error' : msg.severity === 1 ? 'warning' : 'info',
      source: msg.source,
    })) || []

    return {
      success: true,
      issues,
    }
  } catch (error: any) {
    return {
      success: false,
      issues: [],
      errors: [error.message || '代码检查失败'],
    }
  }
}

/**
 * 获取代码质量指标
 */
export async function getQualityMetrics(
  code: string,
  language: 'typescript' | 'javascript' = 'typescript'
): Promise<QualityMetrics> {
  try {
    // 获取ESLint问题
    const lintResult = await lintCode(code, language)
    const eslintErrors = lintResult.issues.filter(issue => issue.severity === 'error').length

    // 检查格式化问题
    const formatResult = await formatCode(code, language)
    const prettierIssues = formatResult.success && formatResult.formattedCode !== code ? 0 : 1

    // TypeScript类型检查（模拟）
    const typeScriptErrors = await checkTypeScriptErrors(code, language)

    // 计算复杂度（简化版）
    const complexity = calculateComplexity(code)

    // 计算可维护性指数（简化版）
    const maintainabilityIndex = calculateMaintainabilityIndex(code, complexity)

    // 计算质量分数（0-100）
    const qualityScore = calculateQualityScore({
      eslintErrors,
      prettierIssues,
      typeScriptErrors,
      complexity,
      maintainabilityIndex,
      codeLength: code.length,
    })

    return {
      qualityScore,
      eslintErrors,
      prettierIssues,
      typeScriptErrors,
      maintainabilityIndex,
      complexity,
    }
  } catch (error) {
    // 返回最低分数
    return {
      qualityScore: 0,
      eslintErrors: 999,
      prettierIssues: 999,
      typeScriptErrors: 999,
      maintainabilityIndex: 0,
      complexity: 999,
    }
  }
}

/**
 * 获取对应语言的Prettier解析器
 */
function getParserForLanguage(language: string): string {
  const parsers = {
    typescript: 'typescript',
    javascript: 'babel',
    json: 'json',
    css: 'css',
    html: 'html',
  }
  return parsers[language as keyof typeof parsers] || 'typescript'
}

/**
 * 检查TypeScript错误（简化实现）
 */
async function checkTypeScriptErrors(code: string, language: string): Promise<number> {
  if (language !== 'typescript') return 0

  try {
    // 在实际项目中，这里会使用TypeScript编译器API
    // 这里只是一个简化的实现
    const hasTypeErrors = /any\s*[=:\[]/g.test(code)
    const hasUndefinedTypes = /:\s*undefined/g.test(code)

    return (hasTypeErrors ? 1 : 0) + (hasUndefinedTypes ? 1 : 0)
  } catch {
    return 0
  }
}

/**
 * 计算代码复杂度（简化版）
 */
function calculateComplexity(code: string): number {
  // 简化的复杂度计算，基于控制流语句数量
  const complexityKeywords = [
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'try', 'catch', '&&', '||', '?'
  ]

  let complexity = 1 // 基础复杂度

  complexityKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g')
    const matches = code.match(regex)
    if (matches) {
      complexity += matches.length
    }
  })

  return complexity
}

/**
 * 计算可维护性指数（简化版）
 */
function calculateMaintainabilityIndex(code: string, complexity: number): number {
  const linesOfCode = code.split('\n').length
  const volume = linesOfCode * Math.log2(Math.max(1, code.length))

  // 简化的可维护性指数计算
  const maintainabilityIndex = Math.max(0,
    171 - 5.2 * Math.log(volume) - 0.23 * complexity - 16.2 * Math.log(linesOfCode)
  )

  return Math.round(maintainabilityIndex)
}

/**
 * 计算质量分数
 */
function calculateQualityScore(metrics: {
  eslintErrors: number
  prettierIssues: number
  typeScriptErrors: number
  complexity: number
  maintainabilityIndex: number
  codeLength: number
}): number {
  let score = 100

  // ESLint错误扣分
  score -= metrics.eslintErrors * 10

  // 格式化问题扣分
  score -= metrics.prettierIssues * 5

  // TypeScript错误扣分
  score -= metrics.typeScriptErrors * 8

  // 复杂度过高扣分
  if (metrics.complexity > 20) {
    score -= (metrics.complexity - 20) * 2
  }

  // 可维护性指数加分/扣分
  if (metrics.maintainabilityIndex < 50) {
    score -= (50 - metrics.maintainabilityIndex) / 2
  } else if (metrics.maintainabilityIndex > 80) {
    score += Math.min(10, (metrics.maintainabilityIndex - 80) / 2)
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}