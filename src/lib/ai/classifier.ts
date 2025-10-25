/**
 * AI Content Classifier
 *
 * Specialized service for automatic content categorization
 */

import { analyzeContent, CategorySuggestion } from './openai'

export interface ClassificationOptions {
  existingCategories?: Array<{ id: string; name: string }>
  confidenceThreshold?: number
  maxSuggestions?: number
}

export interface ClassificationResult {
  primaryCategory: CategorySuggestion | null
  alternativeCategories: CategorySuggestion[]
  uncategorized: boolean
  reasoning: string
}

/**
 * Classify note content into categories
 */
export async function classifyContent(
  content: string,
  options: ClassificationOptions = {}
): Promise<ClassificationResult> {
  const {
    existingCategories = [],
    confidenceThreshold = 0.6,
    maxSuggestions = 3
  } = options

  // Default categories if none provided
  const defaultCategories = [
    { id: '1', name: '工作' },
    { id: '2', name: '学习' },
    { id: '3', name: '生活' },
    { id: '4', name: '项目' },
    { id: '5', name: '创意' },
    { id: '6', name: '技术' },
    { id: '7', name: '会议' },
    { id: '8', name: '个人' }
  ]

  const categories = existingCategories.length > 0 ? existingCategories : defaultCategories

  try {
    const result = await analyzeContent(content, {
      includeCategories: true,
      includeTags: false,
      includeSummary: false,
      existingCategories: categories
    })

    // Filter and sort categories by confidence
    const validCategories = result.categories
      .filter(cat => cat.confidence >= confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions)

    if (validCategories.length === 0) {
      return {
        primaryCategory: null,
        alternativeCategories: [],
        uncategorized: true,
        reasoning: '未能确定合适的分类，建议手动选择'
      }
    }

    const primaryCategory = validCategories[0]
    const alternativeCategories = validCategories.slice(1)

    // Generate reasoning
    const reasoning = generateClassificationReasoning(primaryCategory, alternativeCategories)

    return {
      primaryCategory,
      alternativeCategories,
      uncategorized: false,
      reasoning
    }

  } catch (error) {
    console.error('Classification error:', error)

    return {
      primaryCategory: null,
      alternativeCategories: [],
      uncategorized: true,
      reasoning: '分类处理失败，请稍后重试'
    }
  }
}

/**
 * Generate human-readable reasoning for classification
 */
function generateClassificationReasoning(
  primary: CategorySuggestion,
  alternatives: CategorySuggestion[]
): string {
  let reasoning = `推荐分类为"${primary.categoryName}"（置信度：${(primary.confidence * 100).toFixed(1)}%）`

  if (primary.reason) {
    reasoning += `，因为${primary.reason}`
  }

  if (alternatives.length > 0) {
    reasoning += `\n其他可能的分类：${alternatives.map(alt =>
      `${alt.categoryName}（${(alt.confidence * 100).toFixed(1)}%）`
    ).join('、')}`
  }

  return reasoning
}

/**
 * Batch classify multiple notes
 */
export async function batchClassifyNotes(
  notes: Array<{ id: string; content: string; existingCategories?: Array<{ id: string; name: string }> }>,
  options: ClassificationOptions & { batchSize?: number } = {}
): Promise<Array<{ noteId: string; result: ClassificationResult; error?: string }>> {
  const { batchSize = 5, ...classificationOptions } = options

  const results: Array<{ noteId: string; result: ClassificationResult; error?: string }> = []

  for (let i = 0; i < notes.length; i += batchSize) {
    const batch = notes.slice(i, i + batchSize)

    const batchPromises = batch.map(async (note) => {
      try {
        const result = await classifyContent(note.content, {
          ...classificationOptions,
          existingCategories: note.existingCategories
        })
        return { noteId: note.id, result }
      } catch (error) {
        return {
          noteId: note.id,
          result: {
            primaryCategory: null,
            alternativeCategories: [],
            uncategorized: true,
            reasoning: '分类处理失败'
          },
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // Add delay to avoid rate limiting
    if (i + batchSize < notes.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

/**
 * Update classification based on user feedback
 */
export function updateClassificationFromFeedback(
  originalResult: ClassificationResult,
  selectedCategoryId: string,
  selectedCategoryName: string
): ClassificationResult {
  // Find the selected category in alternatives or create new
  const selectedAlternative = originalResult.alternativeCategories.find(
    cat => cat.categoryId === selectedCategoryId || cat.categoryName === selectedCategoryName
  )

  const newPrimary: CategorySuggestion = selectedAlternative || {
    categoryId: selectedCategoryId,
    categoryName: selectedCategoryName,
    confidence: 1.0, // User selection has highest confidence
    reason: '用户手动选择'
  }

  // Move original primary to alternatives if it exists
  const alternatives = originalResult.primaryCategory
    ? [originalResult.primaryCategory, ...originalResult.alternativeCategories.filter(
        cat => cat.categoryId !== selectedCategoryId && cat.categoryName !== selectedCategoryName
      )]
    : originalResult.alternativeCategories.filter(
        cat => cat.categoryId !== selectedCategoryId && cat.categoryName !== selectedCategoryName
      )

  return {
    primaryCategory: newPrimary,
    alternativeCategories: alternatives,
    uncategorized: false,
    reasoning: `根据用户反馈，已将分类更新为"${selectedCategoryName}"`
  }
}

/**
 * Get category statistics for analysis
 */
export interface CategoryStats {
  categoryId: string
  categoryName: string
  count: number
  averageConfidence: number
  lastUsed: Date
}

export async function getCategoryStats(
  classifications: Array<{
    categoryId: string
    categoryName: string
    confidence: number
    createdAt: Date
  }>
): Promise<CategoryStats[]> {
  const statsMap = new Map<string, CategoryStats>()

  classifications.forEach(classification => {
    const existing = statsMap.get(classification.categoryId)

    if (existing) {
      existing.count += 1
      existing.averageConfidence = (existing.averageConfidence + classification.confidence) / 2
      if (classification.createdAt > existing.lastUsed) {
        existing.lastUsed = classification.createdAt
      }
    } else {
      statsMap.set(classification.categoryId, {
        categoryId: classification.categoryId,
        categoryName: classification.categoryName,
        count: 1,
        averageConfidence: classification.confidence,
        lastUsed: classification.createdAt
      })
    }
  })

  return Array.from(statsMap.values())
    .sort((a, b) => b.count - a.count)
}

export default {
  classifyContent,
  batchClassifyNotes,
  updateClassificationFromFeedback,
  getCategoryStats
}