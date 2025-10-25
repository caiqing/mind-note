/**
 * AI Tag Generator
 *
 * Specialized service for automatic tag generation from content
 */

import { analyzeContent, TagSuggestion } from './openai'

export interface TagGenerationOptions {
  existingTags?: Array<{ id: string; name: string; color?: string }>
  maxTags?: number
  confidenceThreshold?: number
  includeNouns?: boolean
  includeVerbs?: boolean
  includeAdjectives?: boolean
  includeConcepts?: boolean
}

export interface TagGenerationResult {
  suggestedTags: TagSuggestion[]
  reasoning: string
  processingTime: number
  tokensUsed: {
    input: number
    output: number
  }
}

/**
 * Generate tags from content using AI analysis
 */
export async function generateTags(
  content: string,
  options: TagGenerationOptions = {}
): Promise<TagGenerationResult> {
  const {
    existingTags = [],
    maxTags = 10,
    confidenceThreshold = 0.5,
    includeNouns = true,
    includeVerbs = true,
    includeAdjectives = true,
    includeConcepts = true
  } = options

  try {
    const result = await analyzeContent(content, {
      includeCategories: false,
      includeTags: true,
      includeSummary: false,
      existingTags: existingTags
    })

    // Filter and sort tags by confidence
    const validTags = result.tags
      .filter(tag => tag.confidence >= confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxTags)

    // Generate reasoning
    const reasoning = generateTagReasoning(validTags, content)

    return {
      suggestedTags: validTags,
      reasoning,
      processingTime: result.processingTime,
      tokensUsed: result.tokensUsed
    }

  } catch (error) {
    console.error('Tag generation error:', error)

    // Fallback to basic keyword extraction
    const fallbackTags = extractBasicTags(content, maxTags, existingTags)

    return {
      suggestedTags: fallbackTags,
      reasoning: '使用关键词提取生成标签',
      processingTime: Date.now() - Date.now(),
      tokensUsed: { input: 0, output: 0 }
    }
  }
}

/**
 * Generate reasoning for tag suggestions
 */
function generateTagReasoning(tags: TagSuggestion[], content: string): string {
  if (tags.length === 0) {
    return '未能从内容中提取合适的标签'
  }

  const contentLength = content.length
  const tagCount = tags.length

  let reasoning = `基于内容分析，生成了${tagCount}个标签`

  if (contentLength > 1000) {
    reasoning += '，主要识别了长文中的关键概念'
  } else if (contentLength > 500) {
    reasoning += '，识别了中等篇幅内容的核心主题'
  } else {
    reasoning += '，针对短内容提取了核心关键词'
  }

  const highConfidenceTags = tags.filter(tag => tag.confidence >= 0.8)
  if (highConfidenceTags.length > 0) {
    reasoning += `，其中${highConfidenceTags.length}个标签具有高置信度`
  }

  return reasoning
}

/**
 * Fallback function to extract basic tags from content
 */
function extractBasicTags(
  content: string,
  maxTags: number,
  existingTags: Array<{ id: string; name: string; color?: string }> = []
): TagSuggestion[] {
  // Remove HTML tags and normalize text
  const cleanText = content
    .replace(/<[^>]*>/g, ' ')
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Split into words and filter
  const words = cleanText
    .split(' ')
    .filter(word => word.length >= 2 && word.length <= 20)

  // Count word frequency
  const wordCount: { [key: string]: number } = {}
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1
  })

  // Remove words that already exist as tags
  const existingTagNames = new Set(existingTags.map(tag => tag.name.toLowerCase()))

  // Convert to tag suggestions
  const tagSuggestions: TagSuggestion[] = Object.entries(wordCount)
    .filter(([word]) => !existingTagNames.has(word))
    .map(([word, count]) => ({
      tagName: word,
      confidence: Math.min(count / words.length * 3, 0.9), // Scale confidence
      color: generateTagColor()
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxTags)

  return tagSuggestions
}

/**
 * Generate a random color for new tags
 */
function generateTagColor(): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
    '#14B8A6', '#A855F7', '#F43F5E', '#0891B2', '#059669'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * Batch generate tags for multiple notes
 */
export async function batchGenerateTags(
  notes: Array<{ id: string; content: string; existingTags?: Array<{ id: string; name: string; color?: string }> }>,
  options: TagGenerationOptions & { batchSize?: number } = {}
): Promise<Array<{ noteId: string; result: TagGenerationResult | null; error?: string }>> {
  const { batchSize = 5, ...generationOptions } = options

  const results: Array<{ noteId: string; result: TagGenerationResult | null; error?: string }> = []

  for (let i = 0; i < notes.length; i += batchSize) {
    const batch = notes.slice(i, i + batchSize)

    const batchPromises = batch.map(async (note) => {
      try {
        const result = await generateTags(note.content, {
          ...generationOptions,
          existingTags: note.existingTags
        })
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

    // Add delay to avoid rate limiting
    if (i + batchSize < notes.length) {
      await new Promise(resolve => setTimeout(resolve, 800))
    }
  }

  return results
}

/**
 * Get tag statistics for analysis
 */
export interface TagStats {
  tagName: string
  usageCount: number
  averageConfidence: number
  firstUsed: Date
  lastUsed: Date
  relatedTags: Array<{ tagName: string; coOccurrence: number }>
}

export async function getTagStats(
  tagUsages: Array<{
    tagName: string
    confidence: number
    noteId: string
    createdAt: Date
    relatedTags?: string[]
  }>
): Promise<TagStats[]> {
  const statsMap = new Map<string, TagStats>()

  tagUsages.forEach(usage => {
    const existing = statsMap.get(usage.tagName)

    if (existing) {
      existing.usageCount += 1
      existing.averageConfidence = (existing.averageConfidence + usage.confidence) / 2
      if (usage.createdAt > existing.lastUsed) {
        existing.lastUsed = usage.createdAt
      }
      if (usage.createdAt < existing.firstUsed) {
        existing.firstUsed = usage.createdAt
      }
    } else {
      statsMap.set(usage.tagName, {
        tagName: usage.tagName,
        usageCount: 1,
        averageConfidence: usage.confidence,
        firstUsed: usage.createdAt,
        lastUsed: usage.createdAt,
        relatedTags: []
      })
    }
  })

  // Calculate related tags (co-occurrence)
  tagUsages.forEach(usage => {
    const stat = statsMap.get(usage.tagName)
    if (stat && usage.relatedTags) {
      usage.relatedTags.forEach(relatedTag => {
        const existingRelated = stat.relatedTags.find(rt => rt.tagName === relatedTag)
        if (existingRelated) {
          existingRelated.coOccurrence += 1
        } else {
          stat.relatedTags.push({
            tagName: relatedTag,
            coOccurrence: 1
          })
        }
      })
    }
  })

  return Array.from(statsMap.values())
    .sort((a, b) => b.usageCount - a.usageCount)
}

/**
 * Suggest tag improvements based on usage patterns
 */
export function suggestTagImprovements(tagStats: TagStats[]): Array<{
  tagName: string
  suggestion: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}> {
  const suggestions: Array<{
    tagName: string
    suggestion: string
    reason: string
    priority: 'high' | 'medium' | 'low'
  }> = []

  tagStats.forEach(stat => {
    // Suggest merging similar tags
    if (stat.usageCount < 3 && stat.averageConfidence < 0.6) {
      suggestions.push({
        tagName: stat.tagName,
        suggestion: '考虑合并或删除此标签',
        reason: `使用频率低(${stat.usageCount}次)且置信度较低`,
        priority: 'medium'
      })
    }

    // Suggest popular tags for improvement
    if (stat.usageCount > 20) {
      suggestions.push({
        tagName: stat.tagName,
        suggestion: '创建标签变体或子标签',
        reason: '此标签使用频率很高，可以进一步细分',
        priority: 'low'
      })
    }
  })

  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })
}

export default {
  generateTags,
  batchGenerateTags,
  getTagStats,
  suggestTagImprovements
}