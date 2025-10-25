/**
 * Auto Save Hook
 *
 * Custom hook for managing auto-save functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNoteApi } from '@/hooks/use-note-api'
import { CreateNoteInput, UpdateNoteInput, NoteWithRelations } from '@/types/note'

export interface UseAutoSaveOptions {
  noteId?: string | null
  initialTitle?: string
  initialContent?: string
  initialCategoryId?: number | null
  initialTags?: string[]
  autoSaveDelay?: number
  onSave?: (note: NoteWithRelations) => void
  onError?: (error: Error) => void
}

export interface AutoSaveState {
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: Date | null
  status: 'idle' | 'saving' | 'saved' | 'error'
  error: Error | null
}

export function useAutoSave(options: UseAutoSaveOptions = {}) {
  const {
    noteId,
    initialTitle = '',
    initialContent = '',
    initialCategoryId = null,
    initialTags = [],
    autoSaveDelay = 2000,
    onSave,
    onError
  } = options

  const { createNote, updateNote, isLoading: apiLoading } = useNoteApi({
    onSuccess: (message) => {
      console.log('Auto-save success:', message)
    },
    onError: (error) => {
      console.error('Auto-save error:', error)
      setState(prev => ({
        ...prev,
        status: 'error',
        error
      }))
      onError?.(error)
    }
  })

  // State
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [categoryId, setCategoryId] = useState<number | null>(initialCategoryId)
  const [tags, setTags] = useState<string[]>(initialTags)
  
  const [state, setState] = useState<AutoSaveState>({
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
    status: 'idle',
    error: null
  })

  // Refs for debouncing and tracking changes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedDataRef = useRef<{
    title: string
    content: string
    categoryId: number | null
    tags: string[]
  } | null>(null)

  // Check if data has changed
  const hasChanged = useCallback(() => {
    if (!lastSavedDataRef.current) {
      return title !== initialTitle || content !== initialContent || 
             categoryId !== initialCategoryId || 
             JSON.stringify(tags) !== JSON.stringify(initialTags)
    }
    
    const lastSaved = lastSavedDataRef.current
    return title !== lastSaved.title || 
           content !== lastSaved.content ||
           categoryId !== lastSaved.categoryId ||
           JSON.stringify(tags) !== JSON.stringify(lastSaved.tags)
  }, [title, content, categoryId, tags, initialTitle, initialContent, initialCategoryId, initialTags])

  // Save function
  const save = useCallback(async () => {
    if (!hasChanged() || state.isSaving) {
      return
    }

    setState(prev => ({
      ...prev,
      isSaving: true,
      status: 'saving',
      error: null
    }))

    try {
      const noteData = noteId 
        ? {
            title: title.trim() || '无标题笔记',
            content: content.trim(),
            categoryId,
            tags
          } as UpdateNoteInput
        : {
            title: title.trim() || '无标题笔记',
            content: content.trim(),
            categoryId,
            tags,
            isPublic: false
          } as CreateNoteInput

      const savedNote = noteId 
        ? await updateNote(noteId, noteData)
        : await createNote(noteData)

      if (savedNote) {
        lastSavedDataRef.current = {
          title: title.trim() || '无标题笔记',
          content: content.trim(),
          categoryId,
          tags
        }

        setState(prev => ({
          ...prev,
          isDirty: false,
          isSaving: false,
          lastSavedAt: new Date(),
          status: 'saved',
          error: null
        }))

        onSave?.(savedNote)
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Auto-save failed')
      setState(prev => ({
        ...prev,
        isSaving: false,
        status: 'error',
        error: err
      }))
      onError?.(err)
    }
  }, [noteId, title, content, categoryId, tags, hasChanged, state.isSaving, createNote, updateNote, onSave, onError])

  // Debounced auto-save
  useEffect(() => {
    if (hasChanged()) {
      setState(prev => ({
        ...prev,
        isDirty: true
      }))

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        save()
      }, autoSaveDelay)
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [title, content, categoryId, tags, hasChanged, save, autoSaveDelay])

  // Manual save function
  const manualSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    return save()
  }, [save])

  // Reset function
  const reset = useCallback(() => {
    setTitle(initialTitle)
    setContent(initialContent)
    setCategoryId(initialCategoryId)
    setTags(initialTags)
    setState({
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      status: 'idle',
      error: null
    })
    lastSavedDataRef.current = null
  }, [initialTitle, initialContent, initialCategoryId, initialTags])

  // Update functions
  const updateTitle = useCallback((newTitle: string) => {
    setTitle(newTitle)
  }, [])

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  const updateCategoryId = useCallback((newCategoryId: number | null) => {
    setCategoryId(newCategoryId)
  }, [])

  const updateTags = useCallback((newTags: string[]) => {
    setTags(newTags)
  }, [])

  // Initialize last saved data
  useEffect(() => {
    lastSavedDataRef.current = {
      title: initialTitle,
      content: initialContent,
      categoryId: initialCategoryId,
      tags: initialTags
    }
  }, [noteId]) // Only initialize when noteId changes

  return {
    // State
    title,
    content,
    categoryId,
    tags,
    state,
    
    // Update functions
    setTitle: updateTitle,
    setContent: updateContent,
    setCategoryId: updateCategoryId,
    setTags: updateTags,
    
    // Actions
    save: manualSave,
    reset,
    
    // Computed values
    isDirty: state.isDirty,
    isSaving: state.isSaving || apiLoading,
    canSave: hasChanged(),
    lastSavedAt: state.lastSavedAt,
    saveStatus: state.status,
    error: state.error
  }
}
