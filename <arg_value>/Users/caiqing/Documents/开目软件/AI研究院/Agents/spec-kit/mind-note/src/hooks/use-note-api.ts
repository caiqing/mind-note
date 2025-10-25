/**
 * Note API Hook
 *
 * Custom hook for managing note API calls with optimistic updates
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { noteServiceDB } from '@/lib/services/note-service-db'
import { NoteWithRelations, CreateNoteInput, UpdateNoteInput } from '@/types/note'

interface UseNoteApiOptions {
  onError?: (error: Error) => void
  onSuccess?: (message: string) => void
}

interface UseNoteApiReturn {
  notes: NoteWithRelations[]
  loading: boolean
  error: string | null
  createNote: (data: CreateNoteInput) => Promise<NoteWithRelations | null>
  updateNote: (id: string, data: UpdateNoteInput) => Promise<NoteWithRelations | null>
  deleteNote: (id: string) => Promise<boolean>
  getNote: (id: string) => Promise<NoteWithRelations | null>
  getNotes: (filters?: any) => Promise<void>
  refreshNotes: () => Promise<void>
  total: number
  page: number
  totalPages: number
}

export function useNoteApi(options: UseNoteApiOptions = {}): UseNoteApiReturn {
  const [notes, setNotes] = useState<NoteWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  // Fetch notes list
  const getNotes = useCallback(async (filters?: any) => {
    try {
      setLoading(true)
      setError(null)

      const result = await noteServiceDB.getNotes({
        limit: 20,
        offset: (page - 1) * 20,
        ...filters
      })

      setNotes(result.notes)
      setTotal(result.total)
      setPage(result.page)
      setTotalPages(result.totalPages)

      if (options.onSuccess) {
        options.onSuccess(`获取到 ${result.notes.length} 个笔记`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取笔记失败'
      setError(errorMessage)

      if (options.onError) {
        options.onError(err as Error)
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [page, options])

  // Create note
  const createNote = useCallback(async (data: CreateNoteInput): Promise<NoteWithRelations | null> => {
    try {
      setLoading(true)
      setError(null)

      const newNote = await noteServiceDB.createNote(data)
      setNotes(prev => [newNote, ...prev])

      if (options.onSuccess) {
        options.onSuccess('笔记创建成功')
      }

      toast.success('笔记创建成功')
      return newNote
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建笔记失败'
      setError(errorMessage)

      if (options.onError) {
        options.onError(err as Error)
      }

      toast.error(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [options])

  // Update note
  const updateNote = useCallback(async (id: string, data: UpdateNoteInput): Promise<NoteWithRelations | null> => {
    try {
      setLoading(true)
      setError(null)

      const updatedNote = await noteServiceDB.updateNote(id, data)
      setNotes(prev => prev.map(note =>
        note.id === id ? updatedNote : note
      ))

      if (options.onSuccess) {
        options.onSuccess('笔记更新成功')
      }

      toast.success('笔记更新成功')
      return updatedNote
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新笔记失败'
      setError(errorMessage)

      if (options.onError) {
        options.onError(err as Error)
      }

      toast.error(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [options])

  // Delete note
  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      await noteServiceDB.deleteNote(id)
      setNotes(prev => prev.filter(note => note.id !== id))

      if (options.onSuccess) {
        options.onSuccess('笔记删除成功')
      }

      toast.success('笔记删除成功')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除笔记失败'
      setError(errorMessage)

      if (options.onError) {
        options.onError(err as Error)
      }

      toast.error(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [options])

  // Get single note
  const getNote = useCallback(async (id: string): Promise<NoteWithRelations | null> => {
    try {
      setLoading(true)
      setError(null)

      const note = await noteServiceDB.getNoteById(id)

      if (options.onSuccess && note) {
        options.onSuccess('获取笔记成功')
      }

      return note
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取笔记失败'
      setError(errorMessage)

      if (options.onError) {
        options.onError(err as Error)
      }

      toast.error(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [options])

  // Refresh notes list
  const refreshNotes = useCallback(async () => {
    await getNotes()
  }, [getNotes])

  // Initial load
  useEffect(() => {
    getNotes()
  }, [getNotes])

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    getNote,
    getNotes,
    refreshNotes,
    total,
    page,
    totalPages
  }
}

export default useNoteApi