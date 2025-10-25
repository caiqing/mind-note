// AI提供商配置

import { AIProvider, AIModel, ModelCapabilities } from '@/lib/ai/types'
import { aiConfig } from './index'

export const aiProviders: Record<string, AIProvider> = {
  openai: {
    id: 'openai-primary',
    name: 'OpenAI',
    type: 'openai',
    apiKey: aiConfig.providers.openai.apiKey,
    endpoint: aiConfig.providers.openai.baseUrl,
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        version: '2024-05-13',
        capabilities: {
          textGeneration: true,
          textAnalysis: true,
          summarization: true,
          classification: true,
          sentimentAnalysis: true,
          keywordExtraction: true
        },
        maxTokens: 128000,
        costPerToken: 0.00001,
        avgResponseTime: 2000,
        accuracy: 0.95,
        isEnabled: true
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        version: '2024-04-09',
        capabilities: {
          textGeneration: true,
          textAnalysis: true,
          summarization: true,
          classification: true,
          sentimentAnalysis: true,
          keywordExtraction: true
        },
        maxTokens: 128000,
        costPerToken: 0.00001,
        avgResponseTime: 3000,
        accuracy: 0.94,
        isEnabled: true
      },
      {
        id: 'text-embedding-3-small',
        name: 'Text Embedding 3 Small',
        version: '2024-01-01',
        capabilities: {
          textGeneration: false,
          textAnalysis: false,
          summarization: false,
          classification: false,
          sentimentAnalysis: false,
          keywordExtraction: false
        },
        maxTokens: 8192,
        costPerToken: 0.00000002,
        avgResponseTime: 500,
        accuracy: 0.98,
        isEnabled: true
      }
    ],
    defaultModel: 'gpt-4o',
    priority: 9,
    isEnabled: true,
    fallbackEnabled: true
  },
  anthropic: {
    id: 'anthropic-primary',
    name: 'Anthropic',
    type: 'anthropic',
    apiKey: aiConfig.providers.anthropic.apiKey,
    endpoint: aiConfig.providers.anthropic.baseUrl,
    models: [
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        version: '20241022',
        capabilities: {
          textGeneration: true,
          textAnalysis: true,
          summarization: true,
          classification: true,
          sentimentAnalysis: true,
          keywordExtraction: true
        },
        maxTokens: 200000,
        costPerToken: 0.000003,
        avgResponseTime: 2500,
        accuracy: 0.96,
        isEnabled: true
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        version: '20240229',
        capabilities: {
          textGeneration: true,
          textAnalysis: true,
          summarization: true,
          classification: true,
          sentimentAnalysis: true,
          keywordExtraction: true
        },
        maxTokens: 200000,
        costPerToken: 0.000015,
        avgResponseTime: 4000,
        accuracy: 0.97,
        isEnabled: false // 默认禁用，成本较高
      }
    ],
    defaultModel: 'claude-3-5-sonnet',
    priority: 8,
    isEnabled: true,
    fallbackEnabled: true
  }
}

// 根据优先级获取可用的提供商
export function getAvailableProviders(): AIProvider[] {
  return Object.values(aiProviders)
    .filter(provider => provider.isEnabled && provider.apiKey)
    .sort((a, b) => b.priority - a.priority)
}

// 获取默认提供商
export function getDefaultProvider(): AIProvider | null {
  const defaultProviderId = aiConfig.settings.defaultProvider
  const provider = aiProviders[defaultProviderId]

  if (provider && provider.isEnabled && provider.apiKey) {
    return provider
  }

  // 如果默认提供商不可用，返回第一个可用的
  const availableProviders = getAvailableProviders()
  return availableProviders.length > 0 ? availableProviders[0] : null
}

// 根据模型ID获取提供商
export function getProviderByModel(modelId: string): AIProvider | null {
  for (const provider of Object.values(aiProviders)) {
    if (provider.models.some(model => model.id === modelId && model.isEnabled)) {
      return provider
    }
  }
  return null
}

// 获取模型信息
export function getModelInfo(modelId: string): AIModel | null {
  for (const provider of Object.values(aiProviders)) {
    const model = provider.models.find(m => m.id === modelId)
    if (model) {
      return model
    }
  }
  return null
}