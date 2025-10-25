/**
 * Tag Cloud Hook
 *
 * Custom hook for managing tag cloud data and interactions
 */

import { useState, useEffect, useMemo, useCallback } from 'react'

interface TagData {
  name: string
  count: number
  color: string
  category?: string
  description?: string
  createdAt: string
  lastUsed?: string
}

interface UseTagCloudOptions {
  maxTags?: number
  refreshInterval?: number
  autoRefresh?: boolean
  includeStats?: boolean
}

interface UseTagCloudReturn {
  // Data
  tags: TagData[]
  isLoading: boolean
  error: Error | null

  // Stats
  totalTags: number
  totalNotes: number
  averageUsage: number
  categories: string[]

  // Actions
  refreshData: () => void
  createTag: (tagData: Partial<TagData>) => Promise<TagData | null>
  updateTag: (tagName: string, tagData: Partial<TagData>) => Promise<TagData | null>
  deleteTag: (tagName: string) => Promise<boolean>

  // Utilities
  clearError: () => void
  searchTags: (query: string) => TagData[]
  getPopularTags: (limit?: number) => TagData[]
  getRecentTags: (limit?: number) => TagData[]
}

export function useTagCloud({
  maxTags = 100,
  refreshInterval = 30000,
  autoRefresh = true,
  includeStats = true
}: UseTagCloudOptions = {}): UseTagCloudReturn {
  const [tags, setTags] = useState<TagData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch tags from API
  const fetchTags = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/tags?includeStats=${includeStats}&limit=${maxTags}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        const tagData: TagData[] = result.data.map((tag: any) => ({
          name: tag.name,
          count: tag.usageCount || 0,
          color: tag.color || '#6B7280',
          category: tag.category || undefined,
          description: tag.description || undefined,
          createdAt: tag.createdAt,
          lastUsed: tag.lastUsed || undefined
        }))
        setTags(tagData)
      } else {
        throw new Error(result.error || 'Failed to fetch tags')
      }
    } catch (err) {
      console.error('Error fetching tags:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch tags'))
    } finally {
      setIsLoading(false)
    }
  }, [maxTags, includeStats])

  // Initialize data
  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchTags()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchTags, refreshInterval, autoRefresh])

  // Computed stats
  const totalTags = tags.length
  const totalNotes = tags.reduce((sum, tag) => sum + tag.count, 0)
  const averageUsage = totalTags > 0 ? Math.round(totalNotes / totalTags) : 0
  const categories = useMemo(() => {
    return Array.from(new Set(tags.map(tag => tag.category).filter(Boolean))) as string[]
  }, [tags])

  // Create new tag
  const createTag = useCallback(async (tagData: Partial<TagData>): Promise<TagData | null> => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tagData.name?.trim(),
          color: tagData.color || '#6B7280',
          category: tagData.category || 'general',
          description: tagData.description?.trim() || undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const newTag: TagData = {
          name: result.data.name,
          count: result.data.usageCount || 0,
          color: result.data.color,
          category: result.data.category,
          description: result.data.description,
          createdAt: result.data.createdAt,
          lastUsed: result.data.lastUsed
        }

        setTags(prev => [...prev, newTag])
        return newTag
      } else {
        throw new Error(result.error || 'Failed to create tag')
      }
    } catch (err) {
      console.error('Error creating tag:', err)
      setError(err instanceof Error ? err : new Error('Failed to create tag'))
      return null
    }
  }, [])

  // Update existing tag
  const updateTag = useCallback(async (tagName: string, tagData: Partial<TagData>): Promise<TagData | null> => {
    try {
      // Find the tag ID from name (this would ideally come from the API)
      const existingTag = tags.find(t => t.name === tagName)
      if (!existingTag) {
        throw new Error('Tag not found')
      }

      const response = await fetch(`/api/tags/${existingTag.name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tagData.name?.trim() || tagName,
          color: tagData.color || existingTag.color,
          category: tagData.category || existingTag.category,
          description: tagData.description?.trim() || existingTag.description,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const updatedTag: TagData = {
          name: result.data.name,
          count: result.data.usageCount || existingTag.count,
          color: result.data.color,
          category: result.data.category,
          description: result.data.description,
          createdAt: existingTag.createdAt,
          lastUsed: result.data.lastUsed || existingTag.lastUsed
        }

        setTags(prev =>
          prev.map(tag =>
            tag.name === tagName ? updatedTag : tag
          )
        )
        return updatedTag
      } else {
        throw new Error(result.error || 'Failed to update tag')
      }
    } catch (err) {
      console.error('Error updating tag:', err)
      setError(err instanceof Error ? err : new Error('Failed to update tag'))
      return null
    }
  }, [tags])

  // Delete tag
  const deleteTag = useCallback(async (tagName: string): Promise<boolean> => {
    try {
      const existingTag = tags.find(t => t.name === tagName)
      if (!existingTag) {
        throw new Error('Tag not found')
      }

      const response = await fetch(`/api/tags/${existingTag.name}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        setTags(prev => prev.filter(tag => tag.name !== tagName))
        return true
      } else {
        throw new Error(result.error || 'Failed to delete tag')
      }
    } catch (err) {
      console.error('Error deleting tag:', err)
      setError(err instanceof Error ? err : new Error('Failed to delete tag'))
      return false
    }
  }, [tags])

  // Search tags
  const searchTags = useCallback((query: string): TagData[] => {
    if (!query.trim()) return tags

    const lowercaseQuery = query.toLowerCase()
    return tags.filter(tag =>
      tag.name.toLowerCase().includes(lowercaseQuery) ||
      tag.description?.toLowerCase().includes(lowercaseQuery) ||
      tag.category?.toLowerCase().includes(lowercaseQuery)
    )
  }, [tags])

  // Get popular tags
  const getPopularTags = useCallback((limit = 10): TagData[] => {
    return [...tags]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }, [tags])

  // Get recent tags
  const getRecentTags = useCallback((limit = 10): TagData[] => {
    return [...tags]
      .sort((a, b) => {
        const aTime = new Date(a.lastUsed || a.createdAt).getTime()
        const bTime = new Date(b.lastUsed || b.createdAt).getTime()
        return bTime - aTime
      })
      .slice(0, limit)
  }, [tags])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // Data
    tags,
    isLoading,
    error,

    // Stats
    totalTags,
    totalNotes,
    averageUsage,
    categories,

    // Actions
    refreshData: fetchTags,
    createTag,
    updateTag,
    deleteTag,

    // Utilities
    clearError,
    searchTags,
    getPopularTags,
    getRecentTags
  }
}