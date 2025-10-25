/**
 * Note Types
 *
 * Type definitions for note-related data structures
 */

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

export interface NoteFilter {
  search?: string
  categoryId?: number | null
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  sortBy?: 'updatedAt' | 'createdAt' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface NoteListItem {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  category?: {
    id: number
    name: string
    color: string
  }
  tags: string[]
  excerpt?: string
}

export interface NoteStats {
  total: number
  thisWeek: number
  thisMonth: number
  byCategory: Array<{
    categoryId: number
    categoryName: string
    count: number
  }>
  byTag: Array<{
    tag: string
    count: number
  }>
}
