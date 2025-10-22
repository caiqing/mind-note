# Data Model Design

**Feature**: 项目基础设施搭建和开发环境配置
**Branch**: 001-dev-env-setup
**Created**: 2025-10-22
**Status**: Design Complete

---

## Overview

本文档定义了MindNote项目基础设施开发环境的数据模型设计。设计遵循MindNote章程的AI-First开发原则，支持向量嵌入、关系映射、AI处理元数据等核心功能。数据模型采用PostgreSQL + pgvector + Redis的混合架构，支持从1到50+用户的弹性扩展。

---

## Database Architecture

### 1. PostgreSQL Schema Design

#### 1.1 Core Tables

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    ai_preferences JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- 笔记表
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- 内容哈希，用于去重和变更检测
    content_vector vector(1536), -- pgvector向量嵌入
    category_id INTEGER REFERENCES categories(id),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}', -- AI处理元数据
    ai_processed BOOLEAN DEFAULT FALSE,
    ai_summary TEXT, -- AI生成的摘要（<100字）
    ai_keywords TEXT[],
    version INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    is_public BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    ai_processed_at TIMESTAMP
);

-- 标签表
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280', -- 十六进制颜色
    category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    created_by UUID REFERENCES users(id),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 分类表
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#6B7280',
    parent_id INTEGER REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 笔记标签关联表
CREATE TABLE note_tags (
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

-- 用户笔记关系表
CREATE TABLE note_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- 'semantic', 'reference', 'similar', 'related'
    strength_score DECIMAL(3,2) CHECK (strength_score >= 0 AND strength_score <= 1),
    ai_generated BOOLEAN DEFAULT FALSE, -- AI自动生成的关系
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_note_id, target_note_id, relationship_type)
);

-- AI处理记录表
CREATE TABLE ai_processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    processing_type VARCHAR(50) NOT NULL, -- 'summarization', 'classification', 'embedding', 'relationship'
    provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'ollama'
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    processing_time_ms INTEGER,
    cost DECIMAL(10,6), -- 处理成本
    status VARCHAR(20) DEFAULT 'processing', -- processing, completed, failed
    error_message TEXT,
    result JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 用户反馈表
CREATE TABLE user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    feedback_type VARCHAR(50) NOT NULL, -- 'summary_quality', 'classification', 'relationship'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 系统配置表
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.2 Indexes for Performance

```sql
-- 向量搜索索引
CREATE INDEX CONCURRENTLY notes_content_vector_idx
ON notes USING ivfflat (content_vector vector_cosine_ops)
WITH (lists = 1000);

-- 用户查询优化
CREATE INDEX notes_user_id_created_at_idx ON notes(user_id, created_at DESC);
CREATE INDEX notes_status_idx ON notes(status);
CREATE INDEX notes_category_id_idx ON notes(category_id);

-- 全文搜索索引（PostgreSQL 15+）
CREATE INDEX notes_content_fts_idx ON notes USING gin(to_tsvector('english', content || ' ' || title));

-- 关系查询优化
CREATE INDEX note_relationships_source_idx ON note_relationships(source_note_id);
CREATE INDEX note_relationships_target_idx ON note_relationships(target_note_id);
CREATE INDEX note_relationships_type_strength_idx ON note_relationships(relationship_type, strength_score DESC);

-- 标签查询优化
CREATE INDEX note_tags_note_id_idx ON note_tags(note_id);
CREATE INDEX note_tags_tag_id_idx ON note_tags(tag_id);

-- AI处理日志查询
CREATE INDEX ai_processing_logs_note_id_idx ON ai_processing_logs(note_id);
CREATE INDEX ai_processing_logs_created_at_idx ON ai_processing_logs(created_at DESC);
```

### 2. Redis Data Structure

#### 2.1 Cache Keys Structure

```typescript
// Redis Key命名规范
interface RedisKeys {
  // 用户会话缓存
  userSession: (userId: string) => `session:user:${userId}`;

  // AI对话历史缓存
  aiConversation: (conversationId: string) => `ai:conversation:${conversationId}`;

  // 向量嵌入缓存
  vectorEmbedding: (contentHash: string) => `embedding:${contentHash}`;

  // 查询结果缓存
  searchResults: (queryHash: string) => `search:${queryHash}`;

  // 热门笔记缓存
  popularNotes: () => 'cache:popular:notes';

  // 用户偏好缓存
  userPreferences: (userId: string) => `cache:user:${userId}:preferences`;

  // API限流计数
  rateLimit: (userId: string, endpoint: string) => `rate:${userId}:${endpoint}`;
}
```

#### 2.2 Cache Data Structures

```typescript
// 用户会话数据
interface UserSessionCache {
  userId: string;
  email: string;
  username: string;
  permissions: string[];
  lastActivity: number;
  preferences: UserPreferences;
}

// AI对话历史
interface AIConversationCache {
  conversationId: string;
  userId: string;
  messages: AIMessage[];
  context: ConversationContext;
  summary: string;
  lastUpdated: number;
}

// 向量嵌入缓存
interface VectorEmbeddingCache {
  contentHash: string;
  embedding: number[];
  model: string;
  provider: string;
  createdAt: number;
}

// 搜索结果缓存
interface SearchResultsCache {
  queryHash: string;
  results: SearchResult[];
  totalCount: number;
  executionTime: number;
  cachedAt: number;
  expiresAt: number;
}
```

### 3. AI Service Data Models

#### 3.1 AI Request/Response Models

```typescript
// AI服务请求模型
interface AIRequest {
  provider: 'openai' | 'anthropic' | 'ollama';
  model: string;
  prompt: string;
  context?: string[];
  temperature?: number;
  maxTokens?: number;
  userId: string;
  requestId: string;
}

// AI服务响应模型
interface AIResponse {
  requestId: string;
  provider: string;
  model: string;
  content: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  responseTime: number;
  cost: number;
  success: boolean;
  error?: string;
  metadata: Record<string, any>;
}

// 向量嵌入请求
interface EmbeddingRequest {
  texts: string[];
  model: string;
  provider: string;
  dimensions: number;
}

// 向量嵌入响应
interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
```

#### 3.2 AI Processing Metadata

```typescript
// AI处理元数据
interface AIProcessingMetadata {
  processingType: 'summarization' | 'classification' | 'embedding' | 'relationship';
  provider: string;
  model: string;
  version: string;
  parameters: Record<string, any>;
  confidence?: number;
  alternatives?: AlternativeResult[];
  processingTime: number;
  cost: number;
}

// 替代结果
interface AlternativeResult {
  content: string;
  confidence: number;
  reason: string;
}
```

### 4. Data Validation Schemas

#### 4.1 Input Validation

```typescript
// 笔记创建验证
import { z } from 'zod';

const CreateNoteSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(100000),
  category_id: z.number().positive().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  metadata: z.record(z.any()).optional(),
  is_public: z.boolean().default(false)
});

// 用户注册验证
const CreateUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(100),
  full_name: z.string().min(1).max(255).optional()
});

// AI服务配置验证
const AIServiceConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'ollama']),
  model: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().max(8192).optional()
});
```

#### 4.2 Data Integrity Constraints

```sql
-- 数据完整性约束
ALTER TABLE notes ADD CONSTRAINT notes_content_not_empty CHECK (LENGTH(TRIM(content)) > 0);
ALTER TABLE notes ADD CONSTRAINT notes_title_not_empty CHECK (LENGTH(TRIM(title)) > 0);
ALTER TABLE note_relationships ADD CONSTRAINT no_self_reference CHECK (source_note_id != target_note_id);

-- 业务逻辑约束
ALTER TABLE users ADD CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE note_relationships ADD CONSTRAINT valid_strength CHECK (strength_score >= 0 AND strength_score <= 1);

-- 触发器：自动更新时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5. Data Migration Strategy

#### 5.1 Version Control

```sql
-- 版本控制表
CREATE TABLE schema_versions (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    checksum VARCHAR(64) NOT NULL
);

-- 初始化版本
INSERT INTO schema_versions (version, description, checksum)
VALUES (1, 'Initial schema for development environment', SHA256('initial_schema'));
```

#### 5.2 Migration Scripts

```typescript
// prisma/migrations/001_initial_schema.sql
-- 初始数据库结构创建
-- 包含所有基础表的创建语句

// prisma/migrations/002_add_vector_support.sql
-- 添加pgvector扩展支持
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE notes ADD COLUMN content_vector vector(1536);

// prisma/migrations/003_add_ai_integration.sql
-- 添加AI集成相关表
-- 包含ai_processing_logs表和user_feedback表
```

### 6. Performance Optimization

#### 6.1 Partitioning Strategy

```sql
-- 用户数据分区（按用户ID哈希）
CREATE TABLE notes_partitioned (
    LIKE notes INCLUDING ALL
) PARTITION BY HASH (user_id);

-- 创建分区
CREATE TABLE notes_partition_0 PARTITION OF notes_partitioned FOR VALUES WITH (modulus 4, remainder 0);
CREATE TABLE notes_partition_1 PARTITION OF notes_partitioned FOR VALUES WITH (modulus 4, remainder 1);
CREATE TABLE notes_partition_2 PARTITION OF notes_partitioned FOR VALUES WITH (modulus 4, remainder 2);
CREATE TABLE notes_partition_3 PARTITION OF notes_partitioned FOR VALUES WITH (modulus 4, remainder 3);
```

#### 6.2 Materialized Views

```sql
-- 热门笔记视图
CREATE MATERIALIZED VIEW popular_notes AS
SELECT
    n.id,
    n.title,
    n.ai_summary,
    n.view_count,
    n.created_at,
    u.username
FROM notes n
JOIN users u ON n.user_id = u.id
WHERE n.status = 'published'
ORDER BY n.view_count DESC, n.created_at DESC;

-- 刷新策略
CREATE OR REPLACE FUNCTION refresh_popular_notes()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW popular_notes;
END;
$$ LANGUAGE plpgsql;
```

---

## Implementation Guidelines

### 1. Database Connection Management

```typescript
// lib/db/connection.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### 2. AI Service Integration

```typescript
// lib/ai/service.ts
export class AIService {
  async processNote(noteId: string): Promise<AIProcessingResult> {
    const startTime = Date.now();

    try {
      const note = await prisma.notes.findUnique({ where: { id: noteId } });
      if (!note) throw new Error('Note not found');

      // 生成摘要
      const summary = await this.generateSummary(note.content);

      // 生成向量嵌入
      const embedding = await this.generateEmbedding(note.content);

      // 分类和标签
      const classification = await this.classifyContent(note.content);

      // 保存处理结果
      await this.saveAIProcessingResults(noteId, {
        summary,
        embedding,
        classification,
        processingTime: Date.now() - startTime
      });

      return { success: true };
    } catch (error) {
      console.error('AI processing failed:', error);
      return { success: false, error: error.message };
    }
  }
}
```

### 3. Cache Management

```typescript
// lib/cache/redis.ts
import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

---

## Data Model Status

**Status**: ✅ Design Complete
**Database**: PostgreSQL 15 + pgvector + Redis 7
**AI Integration**: Local (Ollama) + Cloud (OpenAI/Anthropic)
**Scaling**: Supports 1-50+ users
**Compliance**: Ready for GDPR implementation

**Next Steps**:
1. Create API contracts documentation
2. Generate quickstart guide
3. Implement task list for development

---

*Data model design supports AI-First development principles with vector search, relationship mapping, and comprehensive AI processing metadata.*