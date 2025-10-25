// AI配置管理API

import { NextRequest, NextResponse } from 'next/server'
import { aiProviders, getDefaultProvider, getAvailableProviders } from '@/lib/ai/config/providers'
import { validateAIConfig } from '@/lib/ai/config'
import { logger } from '@/lib/ai/services'

export async function GET(request: NextRequest) {
  try {
    logger.info('获取AI配置请求')

    const configValidation = validateAIConfig()
    const availableProviders = getAvailableProviders()
    const defaultProvider = getDefaultProvider()

    const config = {
      isValid: configValidation.isValid,
      errors: configValidation.errors,
      providers: Object.values(aiProviders).map(provider => ({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        isEnabled: provider.isEnabled,
        fallbackEnabled: provider.fallbackEnabled,
        priority: provider.priority,
        defaultModel: provider.defaultModel,
        models: provider.models.map(model => ({
          id: model.id,
          name: model.name,
          capabilities: model.capabilities,
          maxTokens: model.maxTokens,
          avgResponseTime: model.avgResponseTime,
          accuracy: model.accuracy,
          isEnabled: model.isEnabled
        }))
      })),
      availableProviders: availableProviders.map(p => p.id),
      defaultProvider: defaultProvider?.id || null,
      settings: {
        defaultProvider: require('@/lib/ai/config').aiConfig.settings.defaultProvider,
        defaultModel: require('@/lib/ai/config').aiConfig.settings.defaultModel,
        fallbackEnabled: require('@/lib/ai/config').aiConfig.settings.fallbackEnabled,
        userDailyBudget: require('@/lib/ai/config').aiConfig.settings.userDailyBudget,
        embeddingModel: require('@/lib/ai/config').aiConfig.settings.embeddingModel,
        similarityThreshold: require('@/lib/ai/config').aiConfig.settings.similarityThreshold
      }
    }

    logger.info('AI配置获取成功', {
      isValid: config.isValid,
      providersCount: config.providers.length,
      availableProvidersCount: config.availableProviders.length
    })

    return NextResponse.json(config)

  } catch (error) {
    logger.error('获取AI配置失败', { error: error.message })

    return NextResponse.json({
      success: false,
      error: {
        code: 'CONFIG_FETCH_FAILED',
        message: 'Failed to fetch AI configuration'
      }
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { providerId, config: providerConfig } = body

    logger.info('更新AI提供商配置请求', { providerId })

    if (!providerId || !providerConfig) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Provider ID and config are required'
        }
      }, { status: 400 })
    }

    const provider = aiProviders[providerId]
    if (!provider) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PROVIDER_NOT_FOUND',
          message: `AI provider not found: ${providerId}`
        }
      }, { status: 404 })
    }

    // 这里应该更新配置到数据库或配置文件
    // 由于这是一个演示，我们只返回成功响应

    logger.info('AI提供商配置更新成功', { providerId })

    return NextResponse.json({
      success: true,
      message: 'AI provider configuration updated successfully',
      provider: {
        id: providerId,
        config: providerConfig
      }
    })

  } catch (error) {
    logger.error('更新AI配置失败', { error: error.message })

    return NextResponse.json({
      success: false,
      error: {
        code: 'CONFIG_UPDATE_FAILED',
        message: 'Failed to update AI configuration'
      }
    }, { status: 500 })
  }
}