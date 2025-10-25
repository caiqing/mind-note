/**
 * Full Text Search Service
 *
 * Handles PostgreSQL full-text search functionality with Chinese support
 */

import { PrismaClient } from '@prisma/client'
import logger from '@/lib/utils/logger'

export interface SearchResult {
  id: string
  title: string
  content: string
  contentSnippet: string
  category?: {
    id: string
    name: string
    color: string
  }
  tags: Array<{
    id: string
    name: string
    color: string
  }>
  score: number
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  isArchived: boolean
}

export interface SearchOptions {
  query: string
  userId: string
  limit?: number
  offset?: number
  categoryId?: string
  tagIds?: string[]
  isFavorite?: boolean
  isArchived?: boolean
  sortBy?: 'relevance' | 'created' | 'updated' | 'title'
  sortOrder?: 'asc' | 'desc'
  includeContent?: boolean
}

export interface SearchStats {
  totalResults: number
  searchTime: number
  queryTerms: string[]
  matchedFields: string[]
}

/**
 * Parse search query into individual terms
 */
function parseSearchQuery(query: string): string[] {
  // Remove special characters and split into terms
  const cleanQuery = query
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
    .trim()

  if (!cleanQuery) return []

  // Split by spaces and filter out empty strings
  return cleanQuery
    .split(/\s+/)
    .filter(term => term.length >= 2)
    .filter((term, index, array) => array.indexOf(term) === index) // Remove duplicates
}

/**
 * Generate search vector for PostgreSQL
 */
function generateSearchVector(terms: string[]): string {
  return terms
    .map(term => term + ':*') // Use prefix matching for partial matches
    .join(' & ')
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(text: string, terms: string[], maxLength: number = 200): string {
  if (!terms.length) return text.substring(0, maxLength)

  let highlightedText = text

  // Create regex patterns for highlighting
  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi')
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>')
  })

  return highlightedText
}

/**
 * Generate content snippet around matched terms
 */
export function generateContentSnippet(
  content: string,
  terms: string[],
  snippetLength: number = 200
): string {
  if (!terms.length) return content.substring(0, snippetLength) + (content.length > snippetLength ? '...' : '')

  // Find the first occurrence of any search term
  const lowerContent = content.toLowerCase()
  let bestIndex = -1
  let bestTerm = ''

  terms.forEach(term => {
    const index = lowerContent.indexOf(term.toLowerCase())
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index
      bestTerm = term
    }
  })

  if (bestIndex === -1) {
    // No matches found, return beginning of content
    return content.substring(0, snippetLength) + (content.length > snippetLength ? '...' : '')
  }

  // Calculate snippet boundaries
  const start = Math.max(0, bestIndex - 50)
  const end = Math.min(content.length, bestIndex + bestTerm.length + snippetLength - 50)

  let snippet = content.substring(start, end)

  // Add ellipsis if truncated
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'

  return snippet
}

/**
 * Perform full-text search
 */
export async function searchNotes(
  prisma: PrismaClient,
  options: SearchOptions
): Promise<{ results: SearchResult[]; stats: SearchStats }> {
  const startTime = Date.now()
  const {
    query,
    userId,
    limit = 20,
    offset = 0,
    categoryId,
    tagIds,
    isFavorite,
    isArchived,
    sortBy = 'relevance',
    sortOrder = 'desc',
    includeContent = true
  } = options

  try {
    // Parse search query
    const terms = parseSearchQuery(query)
    const searchVector = generateSearchVector(terms)

    // Build where conditions
    const whereConditions: any[] = [
      { userId }
    ]

    if (searchVector) {
      whereConditions.push({
        OR: [
          { searchVector: { search: searchVector } },
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } }
        ]
      })
    }

    if (categoryId) {
      whereConditions.push({ categoryId })
    }

    if (tagIds && tagIds.length > 0) {
      whereConditions.push({
        tags: {
          some: {
            tagId: { in: tagIds }
          }
        }
      })
    }

    if (isFavorite !== undefined) {
      whereConditions.push({ isFavorite })
    }

    if (isArchived !== undefined) {
      whereConditions.push({ isArchived })
    }

    // Build order by clause
    let orderBy: any = {}
    switch (sortBy) {
      case 'relevance':
        if (searchVector) {
          orderBy = {
            _relevance: sortOrder
          }
        } else {
          orderBy = {
            updatedAt: sortOrder
          }
        }
        break
      case 'created':
        orderBy = { createdAt: sortOrder }
        break
      case 'updated':
        orderBy = { updatedAt: sortOrder }
        break
      case 'title':
        orderBy = { title: sortOrder }
        break
    }

    // Execute search
    const [notes, totalCount] = await Promise.all([
      prisma.note.findMany({
        where: {
          AND: whereConditions
        },
        include: {
          category: true,
          tags: {
            include: {
              tag: true
            }
          }
        },
        orderBy,
        take: limit,
        skip: offset
      }),
      prisma.note.count({
        where: {
          AND: whereConditions
        }
      })
    ])

    // Transform results
    const results: SearchResult[] = notes.map((note, index) => {
      const score = searchVector ? calculateRelevanceScore(note, terms) : 1.0
      const contentSnippet = generateContentSnippet(note.content, terms)

      return {
        id: note.id,
        title: note.title,
        content: note.content,
        contentSnippet,
        category: note.category ? {
          id: note.category.id,
          name: note.category.name,
          color: note.category.color || '#3B82F6'
        } : undefined,
        tags: note.tags.map(nt => ({
          id: nt.tag.id,
          name: nt.tag.name,
          color: nt.tag.color || '#3B82F6'
        })),
        score,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        isFavorite: note.isFavorite,
        isArchived: note.isArchived
      }
    })

    const stats: SearchStats = {
      totalResults: totalCount,
      searchTime: Date.now() - startTime,
      queryTerms: terms,
      matchedFields: searchVector ? ['title', 'content'] : []
    }

    // Log search query for monitoring
    logger.info(`Full-text search completed for user ${userId}`, {
      query,
      terms: terms.length,
      resultsCount: results.length,
      totalCount,
      searchTime: stats.searchTime
    })

    return { results, stats }

  } catch (error) {
    logger.error('Full-text search error:', error)
    throw new Error(`搜索失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * Calculate relevance score for search results
 */
function calculateRelevanceScore(note: any, terms: string[]): number {
  let score = 0

  const lowerTitle = note.title.toLowerCase()
  const lowerContent = note.content.toLowerCase()

  terms.forEach(term => {
    // Title matches get higher score
    if (lowerTitle.includes(term)) {
      score += 2
    }

    // Content matches get lower score
    if (lowerContent.includes(term)) {
      score += 1
    }

    // Exact matches get even higher score
    if (lowerTitle === term || lowerContent.includes(` ${term} `) || lowerContent.includes(` ${term}.`)) {
      score += 3
    }
  })

  return score
}

/**
 * Get search suggestions based on previous searches
 */
export async function getSearchSuggestions(
  prisma: PrismaClient,
  userId: string,
  limit: number = 10
): Promise<string[]> {
  try {
    // This would typically query a search logs table
    // For now, return common search patterns
    const commonTerms = [
      'note',
      'idea',
      'project',
      'meeting',
      'todo',
      'list',
      'plan',
      'reminder',
      'important',
      'urgent'
    ]

    return commonTerms.slice(0, limit)

  } catch (error) {
    logger.error('Get search suggestions error:', error)
    return []
  }
}

/**
 * Build search index for a note
 */
export function buildSearchIndex(content: string): string {
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
    .filter(word => word.length >= 2)
    .filter((word, index, array) => array.indexOf(word) === index)

  // Remove common stop words
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was',
    'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must',
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
    '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有',
    '看', '好', '自己', '这'
  ])

  return words
    .filter(word => !stopWords.has(word))
    .join(' ')
}

export default {
  searchNotes,
  getSearchSuggestions,
  buildSearchIndex,
  parseSearchQuery,
  highlightSearchTerms,
  generateContentSnippet
}