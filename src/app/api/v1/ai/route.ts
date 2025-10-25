// AI API路由入口

import { NextResponse } from 'next/server'
import { aiConfig } from '@/lib/ai/config'
import { logger } from '@/lib/ai/services'

export async function GET() {
  try {
    logger.info('AI API根路径访问')

    return NextResponse.json({
      message: 'AI Content Analysis API',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        health: '/api/v1/ai/health',
        config: '/api/v1/ai/config',
        stats: '/api/v1/ai/stats',
        analyze: {
          note: '/api/v1/ai/analyze/note/:noteId',
          batch: '/api/v1/ai/analyze/batch'
        },
        search: {
          similar: '/api/v1/ai/search/similar/:noteId'
        }
      },
      configuration: {
        defaultProvider: aiConfig.settings.defaultProvider,
        defaultModel: aiConfig.settings.defaultModel,
        fallbackEnabled: aiConfig.settings.fallbackEnabled,
        supportedProviders: Object.keys(aiConfig.providers),
        supportedAnalysisTypes: ['summary', 'classification', 'tags', 'sentiment', 'full_analysis']
      },
      documentation: {
        readme: 'https://docs.example.com/ai-api',
        openapi: '/api/v1/ai/openapi.json'
      }
    })

  } catch (error) {
    logger.error('AI API根路径访问失败', { error: error.message })

    return NextResponse.json({
      error: {
        code: 'API_ERROR',
        message: 'Failed to fetch API information'
      }
    }, { status: 500 })
  }
}