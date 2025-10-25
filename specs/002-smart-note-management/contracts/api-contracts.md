# API Contracts: 智能笔记管理

**Branch**: `002-smart-note-management` | **Date**: 2025-10-25
**Focus**: API specifications and contracts for smart note management system

## API Overview

This document defines the complete API contracts for the smart note management system, including request/response schemas, error handling, authentication requirements, and rate limiting.

## Authentication

All API endpoints require authentication using NextAuth.js session management.

### Authentication Headers

```http
Authorization: Bearer <session_token>
Content-Type: application/json
```

### User Context

All authenticated requests include user context extracted from the session:
```typescript
interface UserContext {
  id: string;
  email: string;
  name: string;
  subscriptionPlan: 'free' | 'pro' | 'enterprise';
  monthlyAITokensUsed: number;
  monthlyAITokensLimit: number;
}
```

## Base URL Structure

```
https://api.mindnote.com/v1
```

## Response Format

### Success Response

```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Error Response

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Standard Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHORIZED` | Authentication required | 401 |
| `FORBIDDEN` | Access denied | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Invalid input data | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `AI_SERVICE_ERROR` | AI processing failed | 502 |
| `INTERNAL_ERROR` | Server error | 500 |

## API Endpoints

### 1. Notes Management

#### GET /api/notes

Retrieve paginated list of notes for the authenticated user.

**Query Parameters**:
```typescript
interface GetNotesQuery {
  page?: number;        // Default: 1
  limit?: number;       // Default: 20, Max: 100
  category?: string;    // Filter by category ID
  tags?: string[];      // Filter by tag IDs
  search?: string;      // Search query
  favorite?: boolean;   // Filter favorites only
  archived?: boolean;   // Include archived notes
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}
```

**Response**:
```typescript
interface GetNotesResponse {
  notes: Note[];
  pagination: PaginationInfo;
}

interface Note {
  id: string;
  title: string;
  content: string;
  contentPlain: string;
  categoryId?: string;
  isFavorite: boolean;
  isArchived: boolean;
  tags: Tag[];
  wordCount: number;
  readingTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
  aiProcessed: boolean;
  aiProcessingStatus: 'pending' | 'processing' | 'completed' | 'failed';
}
```

#### POST /api/notes

Create a new note.

**Request Body**:
```typescript
interface CreateNoteRequest {
  title: string;
  content: string;
  categoryId?: string;
  tagIds?: string[];
  isFavorite?: boolean;
}
```

**Response**:
```typescript
interface CreateNoteResponse {
  note: Note;
}
```

#### GET /api/notes/[id]

Retrieve a specific note by ID.

**Response**:
```typescript
interface GetNoteResponse {
  note: Note;
  versions: NoteVersion[];
}
```

#### PUT /api/notes/[id]

Update an existing note.

**Request Body**:
```typescript
interface UpdateNoteRequest {
  title?: string;
  content?: string;
  categoryId?: string;
  tagIds?: string[];
  isFavorite?: boolean;
  isArchived?: boolean;
}
```

**Response**:
```typescript
interface UpdateNoteResponse {
  note: Note;
}
```

#### DELETE /api/notes/[id]

Delete a note (soft delete).

**Response**:
```typescript
interface DeleteNoteResponse {
  success: true;
  message: string;
}
```

#### POST /api/notes/[id]/ai-process

Trigger AI processing for a note.

**Request Body**:
```typescript
interface AIProcessRequest {
  processingTypes: ('categorization' | 'tagging' | 'summary' | 'embedding')[];
  options?: {
    force?: boolean;  // Force reprocessing even if already processed
    priority?: 'low' | 'normal' | 'high';
  };
}
```

**Response**:
```typescript
interface AIProcessResponse {
  processingId: string;
  status: 'queued' | 'processing' | 'completed';
  estimatedTimeMs?: number;
}
```

#### GET /api/notes/[id]/versions

Get version history for a note.

**Query Parameters**:
```typescript
interface GetVersionsQuery {
  page?: number;
  limit?: number;
}
```

**Response**:
```typescript
interface GetVersionsResponse {
  versions: NoteVersion[];
  pagination: PaginationInfo;
}

interface NoteVersion {
  id: string;
  versionNumber: number;
  title: string;
  content: string;
  changeSummary: string;
  changeType: 'create' | 'edit' | 'ai_process' | 'restore';
  changedFields: string[];
  createdAt: string;
}
```

#### POST /api/notes/[id]/restore/[versionId]

Restore a note to a previous version.

**Response**:
```typescript
interface RestoreVersionResponse {
  note: Note;
  restoredVersion: NoteVersion;
}
```

### 2. Categories Management

#### GET /api/categories

Retrieve all categories for the authenticated user, including hierarchy.

**Response**:
```typescript
interface GetCategoriesResponse {
  categories: Category[];
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  noteCount: number;
  isSystem: boolean;
  children?: Category[];
  createdAt: string;
}
```

#### POST /api/categories

Create a new category.

**Request Body**:
```typescript
interface CreateCategoryRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
}
```

**Response**:
```typescript
interface CreateCategoryResponse {
  category: Category;
}
```

#### PUT /api/categories/[id]

Update an existing category.

**Request Body**:
```typescript
interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  sortOrder?: number;
}
```

**Response**:
```typescript
interface UpdateCategoryResponse {
  category: Category;
}
```

#### DELETE /api/categories/[id]

Delete a category (moves notes to "Uncategorized").

**Response**:
```typescript
interface DeleteCategoryResponse {
  success: true;
  message: string;
  affectedNotesCount: number;
}
```

### 3. Tags Management

#### GET /api/tags

Retrieve all tags, with usage statistics.

**Query Parameters**:
```typescript
interface GetTagsQuery {
  search?: string;
  sortBy?: 'name' | 'usage_count' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}
```

**Response**:
```typescript
interface GetTagsResponse {
  tags: Tag[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  usageCount: number;
  isSystem: boolean;
  createdAt: string;
}
```

#### POST /api/tags

Create a new tag.

**Request Body**:
```typescript
interface CreateTagRequest {
  name: string;
  color?: string;
  description?: string;
}
```

**Response**:
```typescript
interface CreateTagResponse {
  tag: Tag;
}
```

#### PUT /api/tags/[id]

Update an existing tag.

**Request Body**:
```typescript
interface UpdateTagRequest {
  name?: string;
  color?: string;
  description?: string;
}
```

**Response**:
```typescript
interface UpdateTagResponse {
  tag: Tag;
}
```

#### DELETE /api/tags/[id]

Delete a tag (removes from all notes).

**Response**:
```typescript
interface DeleteTagResponse {
  success: true;
  message: string;
  affectedNotesCount: number;
}
```

### 4. Search

#### GET /api/search

Perform full-text and vector search.

**Query Parameters**:
```typescript
interface SearchQuery {
  q: string;           // Search query
  type?: 'fulltext' | 'vector' | 'hybrid'; // Default: hybrid
  category?: string;   // Filter by category
  tags?: string[];     // Filter by tags
  dateFrom?: string;   // ISO date string
  dateTo?: string;     // ISO date string
  page?: number;
  limit?: number;
}
```

**Response**:
```typescript
interface SearchResponse {
  results: SearchResult[];
  pagination: PaginationInfo;
  suggestions?: string[];
  searchTimeMs: number;
}

interface SearchResult {
  note: Note;
  relevanceScore: number; // 0.0-1.0
  highlights: {
    title?: string[];
    content?: string[];
  };
}
```

#### GET /api/search/suggestions

Get search suggestions based on partial query.

**Query Parameters**:
```typescript
interface SuggestionsQuery {
  q: string;           // Partial search query
  limit?: number;      // Default: 5
}
```

**Response**:
```typescript
interface SuggestionsResponse {
  suggestions: string[];
}
```

### 5. AI Processing

#### GET /api/ai/status

Get AI processing status and statistics.

**Response**:
```typescript
interface AIStatusResponse {
  userLimits: {
    monthlyTokensUsed: number;
    monthlyTokensLimit: number;
    costUsed: number;
    costLimit: number;
  };
  queueStatus: {
    pendingJobs: number;
    processingJobs: number;
    averageWaitTimeMs: number;
  };
  recentProcessing: AIProcessingLog[];
}
```

#### POST /api/ai/batch-process

Batch process multiple notes.

**Request Body**:
```typescript
interface BatchProcessRequest {
  noteIds: string[];
  processingTypes: ('categorization' | 'tagging' | 'summary' | 'embedding')[];
  options?: {
    priority?: 'low' | 'normal' | 'high';
    batchSize?: number; // Default: 10
  };
}
```

**Response**:
```typescript
interface BatchProcessResponse {
  batchId: string;
  status: 'queued' | 'processing' | 'completed';
  totalNotes: number;
  processedNotes: number;
  failedNotes: number;
  estimatedTimeMs?: number;
}
```

#### GET /api/ai/batch/[batchId]

Get batch processing status.

**Response**:
```typescript
interface BatchStatusResponse {
  batchId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  results: BatchProcessResult[];
  errors: BatchProcessError[];
}
```

#### GET /api/ai/models

Get available AI models and their capabilities.

**Response**:
```typescript
interface AIModelsResponse {
  models: AIModel[];
}

interface AIModel {
  name: string;
  displayName: string;
  capabilities: ModelCapabilities;
  pricing: ModelPricing;
  limits: ModelLimits;
}
```

### 6. Analytics

#### GET /api/analytics/overview

Get user analytics overview.

**Query Parameters**:
```typescript
interface AnalyticsQuery {
  period?: '7d' | '30d' | '90d' | '1y'; // Default: 30d
}
```

**Response**:
```typescript
interface AnalyticsOverviewResponse {
  summary: {
    totalNotes: number;
    totalWords: number;
    totalReadingTime: number;
    averageNotesPerDay: number;
    favoriteNotesCount: number;
    archivedNotesCount: number;
  };
  trends: {
    dates: string[];
    notesCreated: number[];
    wordsWritten: number[];
    aiProcessingCount: number[];
  };
  topCategories: CategoryStats[];
  topTags: TagStats[];
}
```

#### GET /api/analytics/ai-usage

Get AI usage analytics.

**Response**:
```typescript
interface AIUsageResponse {
  usage: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageProcessingTime: number;
  };
  breakdown: {
    byType: ProcessingTypeStats[];
    byModel: ModelUsageStats[];
    byDay: DailyUsageStats[];
  };
  costs: {
    currentMonth: number;
    previousMonth: number;
    projectedMonth: number;
  };
}
```

## Rate Limiting

### Rate Limit Rules

| Endpoint | Rate Limit | Burst Limit |
|----------|-------------|-------------|
| Notes CRUD | 100 requests/minute | 200 requests/minute |
| Search | 60 requests/minute | 120 requests/minute |
| AI Processing | 20 requests/minute | 50 requests/minute |
| Analytics | 30 requests/minute | 60 requests/minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Error Handling

### Standard Error Format

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      field?: string;
      value?: any;
      constraint?: string;
    };
    timestamp: string;
    requestId: string;
  };
}
```

### Validation Errors

```typescript
interface ValidationError {
  code: 'VALIDATION_ERROR';
  message: 'Invalid input data';
  details: {
    field: 'title';
    value: '';
    constraint: 'Title is required and must be between 1 and 200 characters';
  };
}
```

### AI Service Errors

```typescript
interface AIServiceError {
  code: 'AI_SERVICE_ERROR';
  message: 'AI processing failed';
  details: {
    service: 'openai';
    errorType: 'rate_limit_exceeded';
    retryAfter?: number;
    suggestions: string[];
  };
}
```

## Webhooks

### Note Events

Webhooks allow external services to receive notifications about note events.

#### Webhook Events

| Event | Description | Payload |
|-------|-------------|---------|
| `note.created` | New note created | Note object |
| `note.updated` | Note content updated | Note object with changes |
| `note.deleted` | Note deleted | Note ID and deletion metadata |
| `note.ai_processed` | AI processing completed | Processing result |

#### Webhook Configuration

```typescript
interface WebhookConfig {
  url: string;
  events: string[];
  secret: string;
  active: boolean;
}
```

## SDK Types

### TypeScript SDK

```typescript
// Client initialization
const client = new MindNoteClient({
  apiKey: process.env.MINDNOTE_API_KEY,
  baseUrl: 'https://api.mindnote.com/v1'
});

// Example usage
const notes = await client.notes.list({
  search: 'machine learning',
  limit: 10
});

const note = await client.notes.create({
  title: 'ML Notes',
  content: 'Important concepts...',
  tagIds: ['ml', 'notes']
});
```

### JavaScript/Node.js SDK

```javascript
const { MindNoteClient } = require('@mindnote/sdk');

const client = new MindNoteClient({
  apiKey: process.env.MINDNOTE_API_KEY
});

// Promise-based API
client.notes.list()
  .then(notes => console.log(notes))
  .catch(error => console.error(error));
```

## Testing

### Mock Data

```typescript
// Mock note for testing
const mockNote: Note = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Test Note',
  content: 'This is a test note content.',
  contentPlain: 'This is a test note content.',
  categoryId: null,
  isFavorite: false,
  isArchived: false,
  tags: [],
  wordCount: 8,
  readingTimeMinutes: 1,
  createdAt: '2023-10-25T10:00:00Z',
  updatedAt: '2023-10-25T10:00:00Z',
  aiProcessed: true,
  aiProcessingStatus: 'completed'
};
```

### Contract Tests

```typescript
describe('Notes API', () => {
  test('should create a note', async () => {
    const response = await client.notes.create({
      title: 'Test Note',
      content: 'Test content'
    });

    expect(response.success).toBe(true);
    expect(response.data.note.title).toBe('Test Note');
  });

  test('should validate required fields', async () => {
    const response = await client.notes.create({
      title: '', // Invalid: empty title
      content: 'Test content'
    });

    expect(response.success).toBe(false);
    expect(response.error.code).toBe('VALIDATION_ERROR');
  });
});
```

## Versioning

### API Versioning Strategy

- URL versioning: `/api/v1/notes`
- Backward compatibility: Maintain support for previous versions
- Depreciation notices: 6-month deprecation period for breaking changes
- Migration guides: Provided for major version updates

### Version Headers

```http
API-Version: v1
Supported-Versions: v1
Deprecated-Versions:
```

---

**API Contracts Status**: ✅ Complete
**Date**: 2025-10-25
**Version**: 1.0.0
**Ready for Implementation**: ✅ Yes