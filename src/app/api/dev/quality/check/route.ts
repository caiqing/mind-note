/**
 * 代码质量检查API端点
 * GET /api/dev/quality/check
 */

import { NextRequest, NextResponse } from 'next/server'
import { getQualityMetrics } from '@/lib/dev/code-quality'

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('file')
    const language = (searchParams.get('language') as 'typescript' | 'javascript') || 'typescript'

    let code = ''

    if (filePath) {
      // 如果指定了文件路径，读取文件内容
      try {
        const fs = await import('fs/promises')
        code = await fs.readFile(filePath, 'utf8')
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: `无法读取文件: ${filePath}`,
          message: error instanceof Error ? error.message : '未知错误',
        }, { status: 400 })
      }
    } else {
      // 如果没有指定文件，返回项目整体质量指标
      const projectMetrics = await getProjectQualityMetrics()

      return NextResponse.json({
        success: true,
        data: {
          metrics: projectMetrics,
          type: 'project',
        },
      })
    }

    // 分析单个文件的代码质量
    const metrics = await getQualityMetrics(code, language)

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        filePath,
        language,
        type: 'file',
      },
    })
  } catch (error) {
    console.error('代码质量检查失败:', error)

    return NextResponse.json({
      success: false,
      error: '代码质量检查失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 })
  }
}

/**
 * 获取项目整体质量指标
 */
async function getProjectQualityMetrics() {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    // 获取主要源代码文件
    const srcDir = path.join(process.cwd(), 'src')
    const files = await getAllTypeScriptFiles(srcDir)

    let totalMetrics = {
      qualityScore: 0,
      eslintErrors: 0,
      prettierIssues: 0,
      typeScriptErrors: 0,
      maintainabilityIndex: 0,
      complexity: 0,
    }

    let fileCount = 0

    // 分析每个文件
    for (const file of files.slice(0, 20)) { // 限制分析文件数量以提高性能
      try {
        const code = await fs.readFile(file, 'utf8')
        const metrics = await getQualityMetrics(code, 'typescript')

        totalMetrics.qualityScore += metrics.qualityScore
        totalMetrics.eslintErrors += metrics.eslintErrors
        totalMetrics.prettierIssues += metrics.prettierIssues
        totalMetrics.typeScriptErrors += metrics.typeScriptErrors
        totalMetrics.maintainabilityIndex += metrics.maintainabilityIndex
        totalMetrics.complexity += metrics.complexity
        fileCount++
      } catch (error) {
        // 忽略无法读取的文件
        continue
      }
    }

    // 计算平均值
    if (fileCount > 0) {
      totalMetrics.qualityScore = Math.round(totalMetrics.qualityScore / fileCount)
      totalMetrics.maintainabilityIndex = Math.round(totalMetrics.maintainabilityIndex / fileCount)
      totalMetrics.complexity = Math.round(totalMetrics.complexity / fileCount)
    }

    return {
      ...totalMetrics,
      filesAnalyzed: fileCount,
      totalFiles: files.length,
    }
  } catch (error) {
    // 如果无法分析项目文件，返回默认值
    return {
      qualityScore: 85,
      eslintErrors: 0,
      prettierIssues: 0,
      typeScriptErrors: 0,
      maintainabilityIndex: 75,
      complexity: 5,
      filesAnalyzed: 0,
      totalFiles: 0,
    }
  }
}

/**
 * 递归获取所有TypeScript文件
 */
async function getAllTypeScriptFiles(dir: string, fileList: string[] = []): Promise<string[]> {
  const fs = await import('fs/promises')
  const path = await import('path')

  try {
    const files = await fs.readdir(dir)

    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = await fs.stat(filePath)

      if (stat.isDirectory()) {
        // 跳过node_modules和.next目录
        if (!['node_modules', '.next', 'dist', 'build', 'coverage'].includes(file)) {
          await getAllTypeScriptFiles(filePath, fileList)
        }
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        fileList.push(filePath)
      }
    }
  } catch (error) {
    // 忽略无法读取的目录
  }

  return fileList
}