// Database types based on Prisma schema
export interface User {
  id: string
  email: string
  username: string
  passwordHash: string
  fullName?: string
  avatarUrl?: string
  emailVerified: boolean
  aiPreferences: Record<string, any>
  settings: Record<string, any>
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

export interface Note {
  id: string
  userId: string
  title: string
  content: string
  contentHash: string
  contentVector?: Uint8Array | null
  categoryId?: number | null
  tags: string[]
  metadata: Record<string, any>
  aiProcessed: boolean
  aiSummary?: string | null
  aiKeywords: string[]
  version: number
  status: NoteStatus
  isPublic: boolean
  viewCount: number
  createdAt: Date
  updatedAt: Date
  aiProcessedAt?: Date | null
}

export interface Category {
  id: number
  name: string
  description?: string
  icon?: string
  color: string
  parentId?: number | null
  sortOrder: number
  createdBy?: string | null
  createdAt: Date
}

export interface Tag {
  id: number
  name: string
  color: string
  category: string
  description?: string
  createdBy?: string | null
  usageCount: number
  createdAt: Date
}

export interface NoteTag {
  noteId: string
  tagId: number
}

export interface NoteRelationship {
  id: string
  sourceNoteId: string
  targetNoteId: string
  relationshipType: RelationshipType
  strengthScore: number
  aiGenerated: boolean
  metadata: Record<string, any>
  createdAt: Date
}

export interface AiProcessingLog {
  id: string
  noteId: string
  userId: string
  processingType: ProcessingType
  provider: string
  model: string
  inputTokens?: number
  outputTokens?: number
  processingTime?: number
  cost?: number
  status: ProcessingStatus
  errorMessage?: string
  result?: Record<string, any>
  createdAt: Date
}

export interface UserFeedback {
  id: string
  userId: string
  noteId: string
  feedbackType: FeedbackType
  rating: number
  comment?: string
  createdAt: Date
}

export interface SystemConfig {
  key: string
  value: Record<string, any>
  description?: string
  updatedBy?: string | null
  updatedAt: Date
}

// Enums
export enum NoteStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum RelationshipType {
  SEMANTIC = 'SEMANTIC',
  REFERENCE = 'REFERENCE',
  SIMILAR = 'SIMILAR',
  RELATED = 'RELATED',
}

export enum ProcessingType {
  SUMMARIZATION = 'SUMMARIZATION',
  CLASSIFICATION = 'CLASSIFICATION',
  EMBEDDING = 'EMBEDDING',
  RELATIONSHIP = 'RELATIONSHIP',
}

export enum ProcessingStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum FeedbackType {
  SUMMARY_QUALITY = 'SUMMARY_QUALITY',
  CLASSIFICATION = 'CLASSIFICATION',
  RELATIONSHIP = 'RELATIONSHIP',
}

// API types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
}

export interface Session {
  user: AuthUser
  expires: string
}

// Form types
export interface CreateNoteForm {
  title: string
  content: string
  categoryId?: number
  tags?: string[]
  status?: NoteStatus
  isPublic?: boolean
}

export interface UpdateNoteForm {
  title?: string
  content?: string
  categoryId?: number
  tags?: string[]
  status?: NoteStatus
  isPublic?: boolean
}

export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  email: string
  username: string
  password: string
  fullName?: string
}

// Search types
export interface SearchFilters {
  query?: string
  categoryId?: number
  tags?: string[]
  status?: NoteStatus
  dateFrom?: Date
  dateTo?: Date
  isPublic?: boolean
}

export interface SearchResult {
  notes: Note[]
  total: number
  facets: {
    categories: Array<{ id: number; name: string; count: number }>
    tags: Array<{ name: string; count: number }>
    status: Array<{ status: NoteStatus; count: number }>
  }
}

// AI types
export interface AIRequest {
  type: 'summarization' | 'classification' | 'embedding' | 'relationship'
  content: string
  context?: Record<string, any>
}

export interface AIResponse {
  success: boolean
  data?: any
  error?: string
  metadata?: {
    provider: string
    model: string
    inputTokens?: number
    outputTokens?: number
    processingTime?: number
    cost?: number
  }
}

// Export all types
export type {
  User as PrismaUser,
  Note as PrismaNote,
  Category as PrismaCategory,
  Tag as PrismaTag,
  NoteTag as PrismaNoteTag,
  NoteRelationship as PrismaNoteRelationship,
  AiProcessingLog as PrismaAiProcessingLog,
  UserFeedback as PrismaUserFeedback,
  SystemConfig as PrismaSystemConfig,
} from '@prisma/client'