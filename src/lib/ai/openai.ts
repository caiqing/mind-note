/**
 * OpenAI API Integration
 *
 * Core OpenAI service for text analysis and content processing
 */

import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Add configuration for production
  maxRetries: 3,
  timeout: 30000, // 30 seconds
})

export interface CategorySuggestion {
  categoryId: string
  categoryName: string
  confidence: number
  reason: string
}

export interface TagSuggestion {
  tagId?: string
  tagName: string
  confidence: number
  color?: string
}

export interface ContentSummary {
  summary: string
  keyPoints: string[]
  estimatedReadingTime: number
}

export interface AIProcessingResult {
  categories: CategorySuggestion[]
  tags: TagSuggestion[]
  summary?: ContentSummary
  processingTime: number
  tokensUsed: {
    input: number
    output: number
  }
}

/**
 * Analyze content and provide AI-powered suggestions
 */
export async function analyzeContent(
  content: string,
  options: {
    includeCategories?: boolean
    includeTags?: boolean
    includeSummary?: boolean
    existingCategories?: Array<{ id: string; name: string }>
    existingTags?: Array<{ id: string; name: string; color?: string }>
  } = {}
): Promise<AIProcessingResult> {
  const startTime = Date.now()
  const {
    includeCategories = true,
    includeTags = true,
    includeSummary = false,
    existingCategories = [],
    existingTags = []
  } = options

  try {
    const results: AIProcessingResult = {
      categories: [],
      tags: [],
      summary: undefined,
      processingTime: 0,
      tokensUsed: { input: 0, output: 0 }
    }

    // Prepare system prompt based on requested features
    let systemPrompt = '你是一个智能笔记助手，帮助用户分析和整理笔记内容。'

    if (includeCategories) {
      systemPrompt += `
对于分类建议，请基于笔记内容推荐最合适的分类。
现有分类：${existingCategories.map(c => c.name).join(', ') || '无'}
请以JSON格式返回分类建议，包括：
- categoryId: 现有分类ID（如匹配），或"new"表示新建
- categoryName: 分类名称
- confidence: 置信度(0-1)
- reason: 推荐理由`
    }

    if (includeTags) {
      systemPrompt += `
对于标签建议，请基于笔记内容生成5-10个相关标签。
现有标签：${existingTags.map(t => t.name).join(', ') || '无'}
请以JSON格式返回标签建议，包括：
- tagId: 现有标签ID（如匹配），或留空表示新建
- tagName: 标签名称
- confidence: 置信度(0-1)`
    }

    if (includeSummary) {
      systemPrompt += `
对于内容摘要，请生成简洁的摘要(100字以内)和关键要点(3-5个)。`
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `请分析以下笔记内容：\n\n${content.substring(0, 4000)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    })

    const tokensUsed = {
      input: response.usage?.prompt_tokens || 0,
      output: response.usage?.completion_tokens || 0
    }

    // Parse the response
    const analysisResult = JSON.parse(response.choices[0].message.content || '{}')

    // Process categories
    if (includeCategories && analysisResult.categories) {
      results.categories = analysisResult.categories.map((cat: any) => ({
        categoryId: cat.categoryId || 'new',
        categoryName: cat.categoryName,
        confidence: Math.min(Math.max(cat.confidence || 0, 0), 1),
        reason: cat.reason || ''
      }))
    }

    // Process tags
    if (includeTags && analysisResult.tags) {
      results.tags = analysisResult.tags.map((tag: any) => ({
        tagId: tag.tagId || undefined,
        tagName: tag.tagName,
        confidence: Math.min(Math.max(tag.confidence || 0, 0), 1),
        color: tag.color || generateTagColor()
      }))
    }

    // Process summary
    if (includeSummary && analysisResult.summary) {
      results.summary = {
        summary: analysisResult.summary.text || '',
        keyPoints: analysisResult.summary.keyPoints || [],
        estimatedReadingTime: analysisResult.summary.estimatedReadingTime || 1
      }
    }

    results.processingTime = Date.now() - startTime
    results.tokensUsed = tokensUsed

    return results

  } catch (error) {
    console.error('AI analysis error:', error)

    // Return fallback result
    return {
      categories: [],
      tags: extractBasicTags(content),
      summary: undefined,
      processingTime: Date.now() - startTime,
      tokensUsed: { input: 0, output: 0 }
    }
  }
}

/**
 * Generate a random color for new tags
 */
function generateTagColor(): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * Fallback function to extract basic tags from content
 */
function extractBasicTags(content: string): TagSuggestion[] {
  const words = content.toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)

  // Count word frequency
  const wordCount: { [key: string]: number } = {}
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1
  })

  // Get top words as tags
  const topWords = Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word, count]) => ({
      tagName: word,
      confidence: Math.min(count / words.length * 2, 0.8),
      color: generateTagColor()
    }))

  return topWords
}

/**
 * Batch process multiple notes
 */
export async function batchAnalyzeNotes(
  notes: Array<{ id: string; content: string }>,
  options: {
    batchSize?: number
    delayBetweenBatches?: number
  } = {}
): Promise<Array<{ noteId: string; result: AIProcessingResult | null; error?: string }>> {
  const {
    batchSize = 5,
    delayBetweenBatches = 1000
  } = options

  const results: Array<{ noteId: string; result: AIProcessingResult | null; error?: string }> = []

  for (let i = 0; i < notes.length; i += batchSize) {
    const batch = notes.slice(i, i + batchSize)

    const batchPromises = batch.map(async (note) => {
      try {
        const result = await analyzeContent(note.content)
        return { noteId: note.id, result }
      } catch (error) {
        return {
          noteId: note.id,
          result: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // Add delay between batches to avoid rate limiting
    if (i + batchSize < notes.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
    }
  }

  return results
}

/**
 * Health check for OpenAI API
 */
export async function checkOpenAIHealth(): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: 'Hello, this is a health check.'
        }
      ],
      max_tokens: 5
    })

    return !!response.choices[0]?.message?.content
  } catch (error) {
    console.error('OpenAI health check failed:', error)
    return false
  }
}

export default openai