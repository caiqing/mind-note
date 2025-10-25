/**
 * Note Filter Hook
 *
 * Custom hook for filtering notes with categories, tags, and search functionality
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { NoteWithRelations, NoteListFilters, PaginatedNotes } from '@/types/note'
import { Category } from '@/types/note'
import { FilterOptions } from '@/components/filter/note-filter'

interface UseNoteFilterOptions {
  initialFilters?: Partial<FilterOptions>
  pageSize?: number
  autoRefresh?: boolean
}

interface UseNoteFilterReturn {
  // Data
  notes: NoteWithRelations[]
  categories: Category[]
  availableTags: Array<{ name: string; count: number }>
  isLoading: boolean
  error: Error | null

  // Pagination
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean

  // Filters
  filters: FilterOptions
  activeFilterCount: number

  // Actions
  setFilters: (filters: FilterOptions) => void
  updateFilter: (key: keyof FilterOptions, value: any) => void
  resetFilters: () => void
  refreshData: () => void
  loadNextPage: () => void
  loadPreviousPage: () => void
  goToPage: (page: number) => void

  // Utilities
  clearError: () => void
}

export function useNoteFilter({
  initialFilters = {},
  pageSize = 12,
  autoRefresh = true
}: UseNoteFilterOptions = {}): UseNoteFilterReturn {
  // State
  const [notes, setNotes] = useState<NoteWithRelations[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [availableTags, setAvailableTags] = useState<Array<{ name: string; count: number }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Filters with defaults
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    categoryId: null,
    tags: [],
    dateRange: {
      start: null,
      end: null
    },
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    ...initialFilters
  })

  // Calculate pagination info
  const hasNextPage = useMemo(() => currentPage < totalPages, [currentPage, totalPages])
  const hasPreviousPage = useMemo(() => currentPage > 1, [currentPage])
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.categoryId) count++
    if (filters.tags.length > 0) count++
    if (filters.dateRange.start || filters.dateRange.end) count++
    if (filters.sortBy !== 'updatedAt' || filters.sortOrder !== 'desc') count++
    return count
  }, [filters])

  // Convert filters to API format
  const convertToApiFilters = useCallback((filterOptions: FilterOptions): NoteListFilters => {
    return {
      search: filterOptions.search || undefined,
      categoryId: filterOptions.categoryId || undefined,
      tags: filterOptions.tags.length > 0 ? filterOptions.tags : undefined,
      dateRange: (filterOptions.dateRange.start || filterOptions.dateRange.end) ? {
        start: filterOptions.dateRange.start || undefined,
        end: filterOptions.dateRange.end || undefined
      } : undefined,
      sortBy: filterOptions.sortBy,
      sortOrder: filterOptions.sortOrder,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize
    }
  }, [currentPage, pageSize])

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const apiFilters = convertToApiFilters(filters)
      const response = await fetch('/api/notes?' + new URLSearchParams(
        Object.entries(apiFilters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object') {
              Object.entries(value).forEach(([subKey, subValue]) => {
                if (subValue !== undefined && subValue !== null) {
                  acc[`${key}.${subKey}`] = subValue.toString()
                }
              })
            } else {
              acc[key] = value.toString()
            }
          }
          return acc
        }, {} as Record<string, string>)
      ))

      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        setNotes(result.data.notes)
        setTotalCount(result.data.total)
        setTotalPages(Math.ceil(result.data.total / pageSize))
      } else {
        throw new Error(result.error || 'Failed to fetch notes')
      }
    } catch (err) {
      console.error('Error fetching notes:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch notes'))
      setNotes([])
      setTotalCount(0)
      setTotalPages(0)
    } finally {
      setIsLoading(false)
    }
  }, [filters, convertToApiFilters, pageSize])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories?includeStats=true')

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        setCategories(result.data)
      } else {
        console.error('Failed to fetch categories:', result.error)
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }, [])

  // Fetch available tags
  const fetchAvailableTags = useCallback(async () => {
    try {
      const response = await fetch('/api/tags?includeStats=true')

      if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        const tagData = result.data.map((tag: any) => ({
          name: tag.name,
          count: tag.usageCount || 0
        }))
        setAvailableTags(tagData)
      } else {
        console.error('Failed to fetch tags:', result.error)
      }
    } catch (err) {
      console.error('Error fetching tags:', err)
    }
  }, [])

  // Initialize data
  useEffect(() => {
    fetchCategories()
    fetchAvailableTags()
  }, [fetchCategories, fetchAvailableTags])

  // Fetch notes when filters or page changes
  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchNotes()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [fetchNotes, autoRefresh])

  // Actions
  const setFiltersHandler = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }, [])

  const updateFilterHandler = useCallback((key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setCurrentPage(1) // Reset to first page when filters change
  }, [])

  const resetFiltersHandler = useCallback(() => {
    setFilters({
      search: '',
      categoryId: null,
      tags: [],
      dateRange: {
        start: null,
        end: null
      },
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      ...initialFilters
    })
    setCurrentPage(1)
  }, [initialFilters])

  const refreshDataHandler = useCallback(() => {
    fetchNotes()
    fetchCategories()
    fetchAvailableTags()
  }, [fetchNotes, fetchCategories, fetchAvailableTags])

  const loadNextPageHandler = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasNextPage])

  const loadPreviousPageHandler = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1)
    }
  }, [hasPreviousPage])

  const goToPageHandler = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }, [totalPages])

  const clearErrorHandler = useCallback(() => {
    setError(null)
  }, [])

  return {
    // Data
    notes,
    categories,
    availableTags,
    isLoading,
    error,

    // Pagination
    currentPage,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,

    // Filters
    filters,
    activeFilterCount,

    // Actions
    setFilters: setFiltersHandler,
    updateFilter: updateFilterHandler,
    resetFilters: resetFiltersHandler,
    refreshData: refreshDataHandler,
    loadNextPage: loadNextPageHandler,
    loadPreviousPage: loadPreviousPageHandler,
    goToPage: goToPageHandler,

    // Utilities
    clearError: clearErrorHandler
  }
}