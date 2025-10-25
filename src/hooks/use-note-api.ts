/**
 * Note API Hook
 *
 * Custom hook for managing note API operations
 */

import { useState, useCallback } from 'react'

export interface NoteWithRelations {
  id: string
  title: string
  content: string
  categoryId?: number | null
  tags: string[]
  createdAt: string
  updatedAt: string
  category?: {
    id: number
    name: string
    color: string
  }
}

export interface CreateNoteInput {
  title: string
  content: string
  categoryId?: number | null
  tags?: string[]
  isPublic?: boolean
}

export interface UpdateNoteInput {
  title?: string
  content?: string
  categoryId?: number | null
  tags?: string[]
}

export interface UseNoteApiOptions {
  onSuccess?: (message: string) => void
  onError?: (error: Error) => void
}

export function useNoteApi(options: UseNoteApiOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createNote = useCallback(async (noteData: CreateNoteInput): Promise<NoteWithRelations | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noteData),
      })

      if (!response.ok) {
        throw new Error(`Failed to create note: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        options.onSuccess?.('Note created successfully')
        return result.data
      } else {
        throw new Error(result.error || 'Failed to create note')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create note')
      setError(error)
      options.onError?.(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [options])

  const updateNote = useCallback(async (id: string, noteData: UpdateNoteInput): Promise<NoteWithRelations | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noteData),
      })

      if (!response.ok) {
        throw new Error(`Failed to update note: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        options.onSuccess?.('Note updated successfully')
        return result.data
      } else {
        throw new Error(result.error || 'Failed to update note')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update note')
      setError(error)
      options.onError?.(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [options])

  const getNote = useCallback(async (id: string): Promise<NoteWithRelations | null> => {
    try {
      const response = await fetch(`/api/notes/${id}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch note: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error || 'Failed to fetch note')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch note'))
      return null
    }
  }, [])

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete note: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        options.onSuccess?.('Note deleted successfully')
        return true
      } else {
        throw new Error(result.error || 'Failed to delete note')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete note'))
      options.onError?.(err)
      return false
    }
  }, [options])

  return {
    createNote,
    updateNote,
    getNote,
    deleteNote,
    isLoading,
    error,
    clearError: () => setError(null)
  }
}