// AI功能相关类型定义

export interface AnalysisOptions {
  type: 'summary' | 'classification' | 'tags' | 'sentiment' | 'full'
  force?: boolean
  model?: string
  priority?: 'low' | 'normal' | 'high'
  fallbackEnabled?: boolean
}

// 摘要相关类型定义
export interface SummaryOptions {
  maxLength?: number
  language?: 'zh' | 'en' | 'auto'
  style?: 'concise' | 'detailed' | 'bullet' | 'paragraph'
  includeKeyPoints?: boolean
  targetAudience?: 'general' | 'technical' | 'executive'
  customPrompt?: string
}

export interface SummaryQuality {
  clarity: number        // 清晰度 0-1
  completeness: number   // 完整性 0-1
  conciseness: number    // 简洁性 0-1
  relevance: number      // 相关性 0-1
  overall: number        // 总体质量 0-1
}

export interface SummaryResult {
  text: string
  keyPoints: string[]
  quality: SummaryQuality
  provider: string
  metadata: {
    originalLength: number
    summaryLength: number
    compressionRatio: number
    processingTime: number
    estimatedCost: number
    options: SummaryOptions
  }
}

export interface AIProvider {
  id: string
  name: string
  type: 'openai' | 'anthropic' | 'custom'
  apiKey: string
  endpoint?: string
  models: AIModel[]
  defaultModel: string
  priority: number
  isEnabled: boolean
  fallbackEnabled: boolean
}

export interface AIModel {
  id: string
  name: string
  version: string
  capabilities: ModelCapabilities
  maxTokens: number
  costPerToken: number
  avgResponseTime: number
  accuracy: number
  isEnabled: boolean
}

export interface ModelCapabilities {
  textGeneration: boolean
  textAnalysis: boolean
  summarization: boolean
  classification: boolean
  sentimentAnalysis: boolean
  keywordExtraction: boolean
}

export interface AnalysisResult {
  summary?: string
  sentiment?: {
    type: 'positive' | 'negative' | 'neutral'
    confidence: number
    score: number
  }
  categories?: Array<{
    id: string
    name: string
    confidence: number
  }>
  tags?: Array<{
    id: string
    name: string
    confidence: number
    suggested: boolean
  }>
  keyConcepts?: string[]
  model: string
  processingTime: number
  tokenCount: number
  cost: number
}

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type AnalysisType = 'summary' | 'classification' | 'tags' | 'sentiment' | 'key_concepts' | 'embedding' | 'full_analysis'