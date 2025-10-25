/**
 * 代码检查API端点
 * POST /api/dev/quality/lint
 */

import { NextRequest, NextResponse } from 'next/server'
import { lintCode } from '@/lib/dev/code-quality'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { code, language = 'typescript' } = body

    if (!code) {
      return NextResponse.json({
        success: false,
        error: '缺少必需的参数: code',
      }, { status: 400 })
    }

    if (typeof code !== 'string') {
      return NextResponse.json({
        success: false,
        error: '参数code必须是字符串类型',
      }, { status: 400 })
    }

    const validLanguages = ['typescript', 'javascript']
    if (!validLanguages.includes(language)) {
      return NextResponse.json({
        success: false,
        error: `不支持的语言: ${language}`,
        supportedLanguages: validLanguages,
      }, { status: 400 })
    }

    const result = await lintCode(code, language as any)

    if (result.success) {
      // 统计问题类型
      const errors = result.issues.filter(issue => issue.severity === 'error')
      const warnings = result.issues.filter(issue => issue.severity === 'warning')
      const info = result.issues.filter(issue => issue.severity === 'info')

      return NextResponse.json({
        success: true,
        data: {
          issues: result.issues,
          summary: {
            total: result.issues.length,
            errors: errors.length,
            warnings: warnings.length,
            info: info.length,
          },
          language,
          codeLength: code.length,
        },
      })
    } else {
      return NextResponse.json({
        success: false,
        error: '代码检查失败',
        details: result.errors,
      }, { status: 400 })
    }
  } catch (error) {
    console.error('代码检查API错误:', error)

    return NextResponse.json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 })
  }
}