/**
 * 代码格式化API端点
 * POST /api/dev/quality/format
 */

import { NextRequest, NextResponse } from 'next/server'
import { formatCode } from '@/lib/dev/code-quality'

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

    const validLanguages = ['typescript', 'javascript', 'json', 'css', 'html']
    if (!validLanguages.includes(language)) {
      return NextResponse.json({
        success: false,
        error: `不支持的语言: ${language}`,
        supportedLanguages: validLanguages,
      }, { status: 400 })
    }

    const result = await formatCode(code, language as any)

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          formattedCode: result.formattedCode,
          language,
          originalLength: code.length,
          formattedLength: result.formattedCode?.length || 0,
        },
      })
    } else {
      return NextResponse.json({
        success: false,
        error: '代码格式化失败',
        details: result.errors,
      }, { status: 400 })
    }
  } catch (error) {
    console.error('代码格式化API错误:', error)

    return NextResponse.json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 })
  }
}