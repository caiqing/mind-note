# Quick Start Guide: 智能笔记管理

**Branch**: `002-smart-note-management` | **Date**: 2025-10-25
**Focus**: Getting started quickly with the smart note management system implementation

## Overview

This guide provides a quick start for developers implementing the smart note management feature. It covers setup, basic implementation, and testing procedures.

## Prerequisites

### Required Software

- **Node.js**: 18.0+ (recommended: 20.x LTS)
- **npm**: 9.0+ or **pnpm**: 8.0+
- **PostgreSQL**: 16+ with pgvector extension
- **Redis**: 7.0+
- **Git**: 2.30+

### Required Accounts

- **OpenAI API**: Account with API key for GPT-4 and Embeddings
- **GitHub**: For code hosting and CI/CD
- **Vercel** (optional): For deployment

## Environment Setup

### 1. Clone Repository and Setup Branch

```bash
# Clone the repository
git clone https://github.com/your-org/mind-note.git
cd mind-note

# Create and switch to feature branch
git checkout -b 002-smart-note-management

# Install dependencies
npm install
```

### 2. Environment Variables

Create `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/mindnote"
REDIS_URL="redis://localhost:6379"

# OpenAI API
OPENAI_API_KEY="your-openai-api-key-here"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# Application
NODE_ENV="development"
LOG_LEVEL="debug"
```

### 3. Database Setup

```bash
# Start PostgreSQL and Redis (using Docker)
docker-compose up -d postgres redis

# Install pgvector extension
psql -d mindnote -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run database migrations
npx prisma migrate dev

# Seed database with initial data
npm run db:seed
```

## Project Structure

### Key Directories

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Authentication routes
│   ├── api/                # API routes
│   │   ├── notes/         # Notes API
│   │   ├── categories/    # Categories API
│   │   ├── tags/          # Tags API
│   │   ├── search/        # Search API
│   │   └── ai/            # AI processing API
│   ├── notes/             # Notes pages
│   ├── search/            # Search page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── editor/           # Rich text editor
│   ├── notes/            # Note-related components
│   └── search/           # Search components
├── lib/                  # Utility libraries
│   ├── db/               # Database utilities
│   ├── ai/               # AI service integrations
│   ├── auth/             # Authentication helpers
│   └── utils/            # General utilities
├── hooks/                # React hooks
├── types/                # TypeScript type definitions
└── styles/               # Global styles
```

## Quick Implementation

### 1. Database Schema Setup

Update `prisma/schema.prisma`:

```prisma
model Note {
  id              String    @id @default(cuid())
  title           String
  content         String
  contentPlain    String?
  userId          String
  categoryId      String?
  isFavorite      Boolean  @default(false)
  isArchived      Boolean  @default(false)
  searchVector    String?   @db.TSVector
  embedding       Vector?  @db.Vector(1536)
  wordCount       Int       @default(0)
  readingTime     Int       @default(0)
  version         Int       @default(1)
  aiProcessed     Boolean   @default(false)
  aiStatus        String    @default("pending")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  @@map("notes")
  @@index([userId, deletedAt])
  @@index([createdAt(sort: Desc)])
  @@index([isFavorite])
  @@index([searchVector])
  @@index([embedding])
}

model Category {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String   @default("#3B82F6")
  icon        String?
  userId      String
  parentId    String?
  level       Int      @default(0)
  sortOrder   Int      @default(0)
  noteCount   Int      @default(0)
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  @@map("categories")
  @@index([userId, deletedAt])
  @@index([parentId])
  @@index([level])
}

model Tag {
  id          String   @id @default(cuid())
  name        String   @unique
  color       String   @default("#3B82F6")
  description String?
  usageCount  Int      @default(0)
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("tags")
  @@index([usageCount(sort: Desc)])
}

model NoteTag {
  noteId        String
  tagId         String
  addedByAi     Boolean @default(false)
  confidenceScore Decimal?

  @@map("note_tags")
  @@id([noteId, tagId])
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  avatarUrl     String?
  emailVerified Boolean   @default(false)
  preferences   Json?
  plan          String    @default("free")
  tokensUsed    Int       @default(0)
  tokensLimit   Int       @default(10000)
  allowAi       Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("users")
}

model AIProcessingLog {
  id               String    @id @default(cuid())
  noteId           String
  userId           String
  processingType   String    // 'categorization', 'tagging', 'summary', 'embedding'
  modelName        String
  inputTokens      Int?
  outputTokens     Int?
  totalTokens      Int?
  costUsd          Decimal?
  processingTimeMs Int?
  status           String    // 'success', 'failed', 'timeout'
  result           Json?
  errorMessage     String?
  createdAt        DateTime  @default(now())

  @@map("ai_processing_logs")
  @@index([noteId])
  @@index([userId])
  @@index([processingType])
  @@index([status])
  @@index([createdAt(sort: Desc)])
}
```

### 2. Run Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migration
npx prisma migrate dev --name init_smart_notes

# Seed initial data
npm run db:seed
```

### 3. Basic Note CRUD Implementation

Create `src/app/api/notes/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createNoteSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    const notes = await prisma.note.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
        ...(searchParams.get('search') && {
          OR: [
            { title: { contains: searchParams.get('search')! } },
            { contentPlain: { contains: searchParams.get('search')! } }
          ]
        }
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip: offset,
      take: limit
    });

    const total = await prisma.note.count({
      where: {
        userId: session.user.id,
        deletedAt: null
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        notes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notes' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createNoteSchema.parse(body);

    const note = await prisma.note.create({
      data: {
        ...validatedData,
        userId: session.user.id,
        contentPlain: stripHtml(validatedData.content),
        wordCount: countWords(validatedData.content),
        readingTimeMinutes: Math.ceil(countWords(validatedData.content) / 200)
      }
    });

    // Create note-tag relationships
    if (validatedData.tagIds?.length > 0) {
      await prisma.noteTag.createMany({
        data: validatedData.tagIds.map(tagId => ({
          noteId: note.id,
          tagId
        }))
      })
    }

    return NextResponse.json({
      success: true,
      data: { note }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors[0]
          }
        },
        { status: 400 }
      );
    }

    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create note' } },
      { status: 500 }
    );
  }
}

// Helper functions
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}
```

### 4. Validation Schemas

Create `src/lib/validations.ts`:

```typescript
import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(1000000, 'Content must be less than 1MB'),
  categoryId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  isFavorite: z.boolean().optional()
});

export const updateNoteSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .optional(),
  content: z
    .string()
    .min(1)
    .max(1000000)
    .optional(),
  categoryId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional()
});
```

### 5. Basic Frontend Component

Create `src/components/notes/NoteCard.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Tag } from '@/components/ui/tag';
import { Badge } from '@/components/ui/badge';

interface NoteCardProps {
  note: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    isFavorite: boolean;
    isArchived: boolean;
    wordCount: number;
    readingTimeMinutes: number;
    category?: {
      id: string;
      name: string;
      color: string;
    };
    tags: Array<{
      id: string;
      name: string;
      color: string;
    }>;
  };
}

export function NoteCard({ note }: NoteCardProps) {
  return (
    <Link href={`/notes/${note.id}`} className="block">
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {note.title}
          </h3>
          <div className="flex items-center space-x-2">
            {note.isFavorite && (
              <Badge variant="outline" className="text-yellow-600">
                ★
              </Badge>
            )}
            {note.isArchived && (
              <Badge variant="secondary" className="text-gray-500">
                Archived
              </Badge>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-3 line-clamp-3">
          {note.content.substring(0, 200)}
          {note.content.length > 200 && '...'}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {note.category && (
            <Tag
              name={note.category.name}
              color={note.category.color}
              variant="outline"
            />
          )}
          {note.tags.slice(0, 3).map((tag) => (
            <Tag
              key={tag.id}
              name={tag.name}
              color={tag.color}
              variant="small"
            />
          ))}
          {note.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{note.tags.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>{note.wordCount} words</span>
            <span>{note.readingTimeMinutes} min read</span>
          </div>
          <time dateTime={note.updatedAt}>
            {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
          </time>
        </div>
      </div>
    </Link>
  );
}
```

### 6. Basic Page Implementation

Create `src/app/notes/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { NoteCard } from '@/components/notes/NoteCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isArchived: boolean;
  wordCount: number;
  readingTimeMinutes: number;
  category?: {
    id: string;
    name: string;
    color: string;
  };
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

export default function NotesPage() {
  const { data: session } = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    if (session) {
      fetchNotes();
    }
  }, [session, searchQuery, showFavorites]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (showFavorites) params.set('favorite', 'true');

      const response = await fetch(`/api/notes?${params}`);
      const data = await response.json();

      if (data.success) {
        setNotes(data.data.notes);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
          <p>You need to be authenticated to access your notes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">My Notes</h1>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={showFavorites ? "default" : "outline"}
              onClick={() => setShowFavorites(!showFavorites)}
            >
              ★ Favorites
            </Button>

            <Button onClick={() => window.location.href = '/notes/new'}>
              + New Note
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{notes.length} notes</span>
          {showFavorites && (
            <Badge variant="secondary">
              {notes.filter(n => n.isFavorite).length} favorites
            </Badge>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No notes found
          </h3>
          <p className="text-gray-500">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Create your first note to get started'}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => window.location.href = '/notes/new'}
              className="mt-4"
            >
              Create Note
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Testing

### 1. Unit Tests

Create `tests/unit/notes.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST, GET } from './app/api/notes/route';

// Mock NextAuth.js
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    },
    status: 'authenticated'
  })
}));

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    note: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn()
    },
    noteTag: {
      createMany: vi.fn()
    }
  }
}));

describe('/api/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return notes for authenticated user', async () => {
      const mockNotes = [
        {
          id: '1',
          title: 'Test Note',
          content: 'Test content',
          userId: 'test-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isFavorite: false,
          isArchived: false,
          wordCount: 2,
          readingTimeMinutes: 1
        }
      ];

      vi.mocked('@/lib/db').prisma.note.findMany.mockResolvedValue(mockNotes);
      vi.mocked('@/lib/db').prisma.note.count.mockResolvedValue(1);

      const request = new Request('http://localhost:3000/api/notes');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.notes).toEqual(mockNotes);
      expect(data.data.pagination.total).toBe(1);
    });
  });

  describe('POST', () => {
    it('should create a new note', async () => {
      const newNote = {
        id: '1',
        title: 'New Note',
        content: 'New content',
        userId: 'test-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
        isArchived: false,
        wordCount: 2,
        readingTimeMinutes: 1
      };

      vi.mocked('@/lib/db').prisma.note.create.mockResolvedValue(newNote);

      const requestBody = {
        title: 'New Note',
        content: 'New content'
      };

      const request = new Request('http://localhost:3000/api/notes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.note.title).toBe('New Note');
    });

    it('should validate required fields', async () => {
      const requestBody = {
        title: '', // Invalid: empty title
        content: 'Some content'
      };

      const request = new Request('http://localhost:3000/api/notes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

### 2. Integration Tests

Create `tests/integration/notes.test.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Notes Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="signin-button"]');
    await page.waitForURL('/notes');
  });

  test('should create and display a new note', async ({ page }) => {
    // Click "New Note" button
    await page.click('[data-testid="new-note-button"]');

    // Fill in note details
    await page.fill('[data-testid="note-title"]', 'Test Note');
    await page.fill('[data-testid="note-content"]', 'This is a test note content.');

    // Save note
    await page.click('[data-testid="save-button"]');

    // Wait for navigation back to notes list
    await page.waitForURL('/notes');

    // Verify note appears in list
    await expect(page.locator('text=Test Note')).toBeVisible();
    await expect(page.locator('text=This is a test note content.')).toBeVisible();
  });

  test('should search notes', async ({ page }) => {
    // Create a note first
    await page.click('[data-testid="new-note-button"]');
    await page.fill('[data-testid="note-title"]', 'Searchable Note');
    await page.fill('[data-testid="note-content"]', 'Content about machine learning.');
    await page.click('[data-testid="save-button"]');
    await page.waitForURL('/notes');

    // Search for the note
    await page.fill('[data-testid="search-input"]', 'machine learning');

    // Verify search results
    await expect(page.locator('text=Searchable Note')).toBeVisible();
    await expect(page.locator('text=Content about machine learning.')).toBeVisible();
  });

  test('should favorite and unfavorite notes', async ({ page }) => {
    // Create a note first
    await page.click('[data-testid="new-note-button"]');
    await page.fill('[data-testid="note-title"], 'Favorite Note');
    await page.fill('[data-testid="note-content"]', 'This note should be favorited.');
    await page.click('[data-testid="save-button"]');
    await page.waitForURL('/notes');

    // Mark as favorite
    await page.click('[data-testid="note-card"]:first-child [data-testid="favorite-button"]');

    // Verify favorite badge appears
    await expect(page.locator('[data-testid="note-card"]:first-child [data-testid="favorite-badge"]')).toBeVisible();

    // Filter by favorites
    await page.click('[data-testid="filter-favorites"]');

    // Verify only favorite notes show
    await expect(page.locator('text=Favorite Note')).toBeVisible();
    expect(page.locator('text=Searchable Note')).not.toBeVisible();
  });
});
```

## Development Workflow

### 1. Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Code formatting
npm run format

# Linting
npm run lint

# Database operations
npm run db:migrate    # Run migrations
npm run db:generate   # Generate Prisma client
npm run db:seed       # Seed database
npm run db:studio     # Open Prisma Studio
```

### 2. Git Workflow

```bash
# Stage changes
git add .

# Commit changes
git commit -m "feat: implement basic note CRUD functionality"

# Push to remote
git push origin 002-smart-note-management

# Create pull request
gh pr create --title "Implement Smart Note Management" --body "..."
```

### 3. Environment Management

```bash
# Development environment
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Generate environment files
npm run env:generate
```

## Common Issues and Solutions

### 1. Database Connection Issues

**Problem**: `Error: getaddrinfo ENOTFOUND`

**Solution**:
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Test connection
npx prisma db pull
```

### 2. OpenAI API Issues

**Problem**: Rate limits or API key errors

**Solution**:
```typescript
// Implement retry logic with exponential backoff
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeoutMs: 30000
});
```

### 3. TypeScript Build Errors

**Problem**: Type errors in API routes

**Solution**:
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Update types if needed
npx prisma generate
```

## Next Steps

1. **Complete Basic Implementation**: Finish the basic CRUD functionality
2. **Add Rich Text Editor**: Integrate Tiptap editor
3. **Implement AI Features**: Add categorization and tagging
4. **Build Search**: Implement full-text and vector search
5. **Add Tests**: Comprehensive testing coverage
6. **Deployment**: Prepare for production deployment

## Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Tiptap Editor Guide](https://tiptap.dev/guide/introduction)

### Tools
- [Prisma Studio](https://www.prisma.io/studio) - Database management
- [PostgreSQL](https://www.postgresql.org/docs/) - Database
- [Redis](https://redis.io/documentation) - Caching
- [Playwright](https://playwright.dev/) - E2E testing

### Community
- [Next.js Discord](https://discord.gg/nextjs)
- [Prisma Discord](https://discord.gg/prisma)
- [OpenAI Community](https://community.openai.com/)

---

**Quick Start Status**: ✅ Complete
**Date**: 2025-10-25
**Version**: 1.0.0
**Ready for Development**: ✅ Yes