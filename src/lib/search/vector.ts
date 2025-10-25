/**
 * Vector Search Service
 *
 * Handles semantic search using pgvector and embeddings
 */

import { PrismaClient } from '@prisma/client'
import logger from '@/lib/utils/logger'
import { analyzeContent } from '@/lib/ai/openai'
import { getCachedEmbedding, cacheEmbedding } from './cache'

export interface VectorSearchResult {
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
  similarity: number
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  isArchived: boolean
}

export interface VectorSearchOptions {
  queryEmbedding: number[]
  userId: string
  limit?: number
  threshold?: number
  categoryId?: string
  tagIds?: string[]
  isFavorite?: boolean
  isArchived?: boolean
  includeContent?: boolean
}

export interface SimilarityResult {
  noteId: string
  similarity: number
  metadata?: any
}

/**
 * Generate text embedding using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Check cache first
  const cachedEmbedding = getCachedEmbedding(text)
  if (cachedEmbedding) {
    logger.debug('Embedding cache hit', { textLength: text.length })
    return cachedEmbedding
  }

  try {
    const result = await analyzeContent(text, {
      includeCategories: false,
      includeTags: false,
      includeSummary: false
    })

    // For now, return a mock embedding
    // In production, this would use the actual embedding from OpenAI
    const embedding = generateMockEmbedding(text)

    // Cache the embedding
    cacheEmbedding(text, embedding)

    return embedding

  } catch (error) {
    logger.error('Embedding generation error:', error)
    const fallbackEmbedding = generateMockEmbedding(text)
    // Cache even the fallback embedding to avoid repeated failures
    cacheEmbedding(text, fallbackEmbedding, 5 * 60 * 1000) // 5 minutes TTL for fallback
    return fallbackEmbedding
  }
}

/**
 * Generate mock embedding (fallback solution)
 */
function generateMockEmbedding(text: string): number[] {
  // This is a simple hash-based embedding for demo purposes
  // In production, replace with actual OpenAI embeddings

  const words = text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0)

  // Create a simple 1536-dimensional vector (matching OpenAI's embedding size)
  const embedding = new Array(1536).fill(0)

  // Use word hashes to create a simple embedding
  words.forEach((word, index) => {
    if (index >= 1536) return

    const hash = hashString(word)
    for (let i = 0; i < Math.min(8, 1536 - index); i++) {
      embedding[index + i] = (hash % 1000) / 1000
    }
  })

  return embedding
}

/**
 * Simple string hash function
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Find similar notes using vector search
 */
export async function findSimilarNotes(
  prisma: PrismaClient,
  options: VectorSearchOptions
): Promise<VectorSearchResult[]> {
  const startTime = Date.now()
  const {
    queryEmbedding,
    userId,
    limit = 10,
    threshold = 0.5,
    categoryId,
    tagIds,
    isFavorite,
    isArchived,
    includeContent = true
  } = options

  try {
    // Build where conditions
    const whereConditions: any[] = [
      { userId },
      { embedding: { not: null } }
    ]

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

    // Use vector similarity search
    // Note: This would use pgvector's <=> operator in production
    // For now, we'll use a similarity calculation approach

    // First, get candidate notes
    const candidateNotes = await prisma.note.findMany({
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
      take: limit * 3, // Get more candidates for filtering
      orderBy: { updatedAt: 'desc' }
    })

    // Calculate similarity for each candidate
    const similarNotes: VectorSearchResult[] = []

    for (const note of candidateNotes) {
      if (!note.embedding) continue

      const similarity = calculateCosineSimilarity(queryEmbedding, note.embedding)

      if (similarity >= threshold) {
        const contentSnippet = generateContentSnippet(note.content)

        similarNotes.push({
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
          similarity,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
          isFavorite: note.isFavorite,
          isArchived: note.isArchived
        })
      }
    }

    // Sort by similarity and take top results
    similarNotes.sort((a, b) => b.similarity - a.similarity)
    const finalResults = similarNotes.slice(0, limit)

    const searchTime = Date.now() - startTime

    // Log vector search for monitoring
    logger.info(`Vector search completed for user ${userId}`, {
      resultsCount: finalResults.length,
      threshold,
      searchTime,
      candidateCount: candidateNotes.length
    })

    return finalResults

  } catch (error) {
    logger.error('Vector search error:', error)
    throw new Error(`向量搜索失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Batch generate embeddings for multiple notes
 */
export async function batchGenerateEmbeddings(
  contents: string[],
  batchSize: number = 5
): Promise<number[][]> {
  const embeddings: number[][] = []

  for (let i = 0; i < contents.length; i += batchSize) {
    const batch = contents.slice(i, i + batchSize)

    const batchEmbeddings = await Promise.all(
      batch.map(content => generateEmbedding(content))
    )

    embeddings.push(...batchEmbeddings)

    // Add delay to avoid rate limiting
    if (i + batchSize < contents.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return embeddings
}

/**
 * Update note embedding in database
 */
export async function updateNoteEmbedding(
  prisma: PrismaClient,
  noteId: string,
  embedding: number[]
): Promise<void> {
  try {
    await prisma.note.update({
      where: { id: noteId },
      data: { embedding }
    })

    logger.info(`Updated embedding for note ${noteId}`)
  } catch (error) {
    logger.error(`Failed to update embedding for note ${noteId}:`, error)
    throw error
  }
}

/**
 * Find related notes based on content similarity
 */
export async function findRelatedNotes(
  prisma: PrismaClient,
  noteId: string,
  userId: string,
  limit: number = 5
): Promise<VectorSearchResult[]> {
  try {
    // Get the target note
    const targetNote = await prisma.note.findUnique({
      where: { id: noteId, userId },
      select: { content: true, embedding: true }
    })

    if (!targetNote || !targetNote.embedding) {
      return []
    }

    // Find similar notes
    const similarNotes = await findSimilarNotes(prisma, {
      queryEmbedding: targetNote.embedding,
      userId,
      limit,
      threshold: 0.3,
      isArchived: false
    })

    // Exclude the target note itself
    return similarNotes.filter(note => note.id !== noteId)

  } catch (error) {
    logger.error(`Failed to find related notes for ${noteId}:`, error)
    return []
  }
}

/**
 * Get embedding statistics
 */
export async function getEmbeddingStats(
  prisma: PrismaClient,
  userId: string
): Promise<{
  totalNotes: number
  notesWithEmbedding: number
  embeddingCoverage: number
  lastUpdated: Date | null
}> {
  try {
    const [totalNotes, notesWithEmbedding] = await Promise.all([
      prisma.note.count({ where: { userId } }),
      prisma.note.count({
        where: {
          userId,
          embedding: { not: null }
        }
      })
    ])

    const embeddingCoverage = totalNotes > 0 ? (notesWithEmbedding / totalNotes) * 100 : 0

    const lastUpdatedNote = await prisma.note.findFirst({
      where: {
        userId,
        embedding: { not: null }
      },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true }
    })

    return {
      totalNotes,
      notesWithEmbedding,
      embeddingCoverage,
      lastUpdated: lastUpdatedNote?.updatedAt || null
    }

  } catch (error) {
    logger.error('Failed to get embedding stats:', error)
    return {
      totalNotes: 0,
      notesWithEmbedding: 0,
      embeddingCoverage: 0,
      lastUpdated: null
    }
  }
}

/**
 * Generate content snippet for search results
 */
function generateContentSnippet(content: string, maxLength: number = 200): string {
  if (content.length <= maxLength) return content

  return content.substring(0, maxLength) + '...'
}

export default {
  findSimilarNotes,
  findRelatedNotes,
  batchGenerateEmbeddings,
  updateNoteEmbedding,
  generateEmbedding,
  calculateCosineSimilarity,
  getEmbeddingStats
}