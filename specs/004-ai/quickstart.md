# AI内容分析集成 - Quick Start Guide

**Branch**: 004-ai | **Date**: 2025-10-25 | **Spec**: [link](../spec.md)

## 快速开始

本指南将帮助您快速设置和使用AI内容分析功能。

## 前置条件

### 系统要求

- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- Redis 7+ (可选，用于缓存)
- OpenAI API key 或其他AI服务API密钥

### 依赖包

```bash
npm install @ai-sdk/openai @ai-sdk/anthropic pgvector prisma @prisma/client
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

## 环境配置

### 1. 数据库设置

```bash
# 启用pgvector扩展
psql -d mindnote_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 运行数据库迁移
npx prisma migrate dev
npx prisma generate
```

### 2. 环境变量配置

创建 `.env.local` 文件：

```bash
# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/mindnote_dev"

# AI服务配置
OPENAI_API_KEY="sk-your-openai-key"
ANTHROPIC_API_KEY="sk-ant-your-claude-key"

# AI模型配置
AI_DEFAULT_PROVIDER="openai"
AI_DEFAULT_MODEL="gpt-4o"
AI_FALLBACK_ENABLED="true"

# 成本控制
AI_USER_DAILY_BUDGET="1.0"
AI_SYSTEM_DAILY_BUDGET="100.0"

# Redis配置 (可选)
REDIS_URL="redis://localhost:6379"

# 应用配置
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. AI提供商配置

```typescript
// src/lib/ai/config/providers.ts
export const aiProviders = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    models: {
      'gpt-4o': {
        maxTokens: 128000,
        costPerToken: { input: 0.005, output: 0.015 }
      }
    }
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    models: {
      'claude-3-5-sonnet': {
        maxTokens: 200000,
        costPerToken: { input: 0.003, output: 0.015 }
      }
    }
  }
};
```

## 核心功能实现

### 1. AI分析服务

```typescript
// src/lib/ai/services/analysis-service.ts
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

export class AIAnalysisService {
  async analyzeNote(noteId: string, options: AnalysisOptions) {
    const note = await this.getNote(noteId);
    const provider = this.selectProvider(options);

    try {
      const result = await this.performAnalysis(note, provider);
      await this.saveAnalysisResult(noteId, result);
      return result;
    } catch (error) {
      if (options.fallbackEnabled) {
        return this.fallbackAnalysis(note, options);
      }
      throw error;
    }
  }

  private async performAnalysis(note: Note, provider: AIProvider) {
    switch (provider.type) {
      case 'openai':
        return this.analyzeWithOpenAI(note, provider);
      case 'anthropic':
        return this.analyzeWithAnthropic(note, provider);
      default:
        throw new Error(`Unsupported provider: ${provider.type}`);
    }
  }
}
```

### 2. 向量存储服务

```typescript
// src/lib/vector/vector-service.ts
import { PrismaClient } from '@prisma/client';

export class VectorService {
  private prisma = new PrismaClient();

  async generateEmbedding(text: string, model: string = 'text-embedding-3-small') {
    const response = await openai.embeddings.create({
      model,
      input: text,
    });

    return response.data[0].embedding;
  }

  async storeVector(noteId: string, embedding: number[]) {
    return this.prisma.embeddingVector.create({
      data: {
        noteId,
        embedding,
        model: 'text-embedding-3-small',
        dimensions: embedding.length,
        checksum: this.calculateChecksum(embedding),
      },
    });
  }

  async findSimilarVectors(queryEmbedding: number[], threshold = 0.7) {
    return this.prisma.$queryRaw`
      SELECT
        note_id,
        title,
        summary,
        1 - (embedding <=> ${queryEmbedding}) as similarity
      FROM embedding_vectors ev
      JOIN notes n ON ev.note_id = n.id
      WHERE 1 - (embedding <=> ${queryEmbedding}) > ${threshold}
      ORDER BY similarity DESC
      LIMIT 10
    `;
  }
}
```

### 3. 智能触发服务

```typescript
// src/lib/ai/services/trigger-service.ts
export class TriggerService {
  async shouldAnalyze(noteId: string): Promise<boolean> {
    const note = await this.getNote(noteId);
    const lastAnalysis = await this.getLastAnalysis(noteId);

    if (!lastAnalysis) {
      return note.content.length >= 50; // 最小内容长度
    }

    const contentChange = this.calculateContentChange(note, lastAnalysis);
    const timeSinceLastAnalysis = Date.now() - lastAnalysis.createdAt.getTime();

    return (
      contentChange > 0.3 || // 内容变化超过30%
      timeSinceLastAnalysis > 24 * 60 * 60 * 1000 // 超过24小时
    );
  }

  private calculateContentChange(note: Note, lastAnalysis: AIAnalysis): number {
    const currentHash = this.hashContent(note.content);
    const previousHash = lastAnalysis.contentHash;

    if (currentHash === previousHash) {
      return 0;
    }

    // 使用文本相似度算法计算变化率
    return this.textSimilarity(note.content, lastAnalysis.originalContent);
  }
}
```

## API路由实现

### 1. 分析API

```typescript
// src/app/api/v1/ai/analyze/note/[noteId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AIAnalysisService } from '@/lib/ai/services/analysis-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { noteId: string } }
) {
  try {
    const { analysisType, options } = await request.json();
    const service = new AIAnalysisService();

    const result = await service.analyzeNote(params.noteId, {
      type: analysisType,
      ...options,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYSIS_FAILED',
          message: error.message
        }
      },
      { status: 500 }
    );
  }
}
```

### 2. 相似笔记搜索API

```typescript
// src/app/api/v1/ai/search/similar/[noteId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { VectorService } from '@/lib/vector/vector-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { noteId: string } }
) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const threshold = parseFloat(searchParams.get('threshold') || '0.7');

  try {
    const vectorService = new VectorService();
    const note = await vectorService.getNote(params.noteId);
    const embedding = await vectorService.generateEmbedding(note.content);

    const results = await vectorService.findSimilarVectors(embedding, threshold);

    return NextResponse.json({
      success: true,
      data: {
        query: { noteId: params.noteId, threshold },
        results: results.slice(0, limit)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
```

## 前端组件实现

### 1. AI分析面板

```typescript
// src/components/ai/ai-analysis-panel.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AIAnalysisPanelProps {
  noteId: string;
}

export function AIAnalysisPanel({ noteId }: AIAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/v1/ai/analyze/note/${noteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisType: 'full' }),
      });

      const result = await response.json();
      if (result.success) {
        setAnalysis(result.data);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          AI分析结果
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            size="sm"
          >
            {isAnalyzing ? '分析中...' : '重新分析'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {analysis ? (
          <div className="space-y-4">
            {/* 摘要 */}
            {analysis.summary && (
              <div>
                <h4 className="font-semibold mb-2">摘要</h4>
                <p className="text-sm text-gray-600">{analysis.summary}</p>
              </div>
            )}

            {/* 情感分析 */}
            {analysis.sentiment && (
              <div>
                <h4 className="font-semibold mb-2">情感分析</h4>
                <Badge variant={analysis.sentiment.type}>
                  {analysis.sentiment.type} ({Math.round(analysis.sentiment.confidence * 100)}%)
                </Badge>
              </div>
            )}

            {/* 分类 */}
            {analysis.categories && analysis.categories.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">分类</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.categories.map((category) => (
                    <Badge key={category.id} variant="outline">
                      {category.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 标签 */}
            {analysis.tags && analysis.tags.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">推荐标签</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={tag.suggested ? "default" : "secondary"}
                    >
                      {tag.tagName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            暂无AI分析结果，点击"重新分析"开始
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### 2. 相似笔记推荐

```typescript
// src/components/ai/similar-notes.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface SimilarNotesProps {
  noteId: string;
}

export function SimilarNotes({ noteId }: SimilarNotesProps) {
  const [similarNotes, setSimilarNotes] = useState<SimilarNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSimilarNotes = async () => {
      try {
        const response = await fetch(`/api/v1/ai/search/similar/${noteId}`);
        const result = await response.json();

        if (result.success) {
          setSimilarNotes(result.data.results);
        }
      } catch (error) {
        console.error('Failed to fetch similar notes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimilarNotes();
  }, [noteId]);

  if (isLoading) {
    return <div>加载相似笔记中...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>相似笔记</CardTitle>
      </CardHeader>
      <CardContent>
        {similarNotes.length > 0 ? (
          <div className="space-y-3">
            {similarNotes.map((note) => (
              <div key={note.noteId} className="border rounded p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/notes/${note.noteId}`}
                      className="font-medium hover:underline"
                    >
                      {note.title}
                    </Link>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {note.summary}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        相似度: {Math.round(note.similarity * 100)}%
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            暂无相似笔记
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

## 测试

### 1. 单元测试

```typescript
// src/lib/ai/__tests__/analysis-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIAnalysisService } from '../services/analysis-service';

describe('AIAnalysisService', () => {
  let service: AIAnalysisService;

  beforeEach(() => {
    service = new AIAnalysisService();
  });

  it('should analyze note successfully', async () => {
    const mockNote = {
      id: 'test-note-id',
      content: 'This is a test note about AI technology.',
      title: 'AI Test Note'
    };

    vi.spyOn(service, 'getNote').mockResolvedValue(mockNote);
    vi.spyOn(service, 'performAnalysis').mockResolvedValue({
      summary: 'A test note discussing AI technology.',
      sentiment: { type: 'neutral', confidence: 0.8 },
      categories: [{ id: 'tech', name: 'Technology', confidence: 0.9 }]
    });

    const result = await service.analyzeNote('test-note-id', {
      type: 'full'
    });

    expect(result).toBeDefined();
    expect(result.summary).toBe('A test note discussing AI technology.');
    expect(result.sentiment.type).toBe('neutral');
  });

  it('should fallback when primary provider fails', async () => {
    // 实现fallback测试
  });
});
```

### 2. 集成测试

```typescript
// tests/integration/ai-analysis.test.ts
import { describe, it, expect } from 'vitest';
import { setupApp } from '../helpers/test-setup';

describe('AI Analysis Integration', () => {
  it('should perform end-to-end analysis', async () => {
    const app = await setupApp();

    // 创建测试笔记
    const noteResponse = await app.request('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Note',
        content: 'This is a comprehensive test note about artificial intelligence and its applications in modern technology.'
      })
    });

    const note = await noteResponse.json();

    // 执行AI分析
    const analysisResponse = await app.request(`/api/v1/ai/analyze/note/${note.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysisType: 'full' })
    });

    const analysis = await analysisResponse.json();

    expect(analysis.success).toBe(true);
    expect(analysis.data.summary).toBeDefined();
    expect(analysis.data.categories).toBeDefined();
  });
});
```

## 部署注意事项

### 1. 环境变量

确保生产环境设置正确的环境变量：

```bash
# 生产环境必须设置
OPENAI_API_KEY=your-production-key
ANTHROPIC_API_KEY=your-production-key
DATABASE_URL=your-production-db-url
AI_DEFAULT_MODEL=gpt-4o
NEXTAUTH_SECRET=your-production-secret
```

### 2. 数据库优化

```sql
-- 创建向量索引
CREATE INDEX CONCURRENTLY idx_embedding_vectors_embedding
ON embedding_vectors
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 分析表索引
CREATE INDEX CONCURRENTLY idx_ai_analysis_note_created
ON ai_analysis(note_id, created_at DESC);
```

### 3. 监控设置

```typescript
// src/lib/monitoring/metrics.ts
import { createPrometheusMetrics } from './prometheus';

export const aiMetrics = createPrometheusMetrics({
  analysisRequests: 'ai_analysis_requests_total',
  analysisDuration: 'ai_analysis_duration_seconds',
  analysisCost: 'ai_analysis_cost_usd',
  errorRate: 'ai_analysis_error_rate'
});
```

## 故障排除

### 常见问题

1. **API密钥错误**
   ```
   Error: Invalid API key
   ```
   解决方案：检查环境变量配置，确保API密钥正确

2. **向量搜索性能慢**
   ```
   Query timeout: vector similarity search
   ```
   解决方案：优化向量索引，考虑分区策略

3. **成本超限**
   ```
   Error: Insufficient budget for analysis
   ```
   解决方案：检查预算配置，调整模型选择

### 调试工具

```typescript
// src/lib/ai/debug/debug-tools.ts
export class DebugTools {
  static async testProviderConnection(providerId: string) {
    // 测试提供商连接
  }

  static async validateVectorIndex() {
    // 验证向量索引
  }

  static async checkBudgetUsage(userId: string) {
    // 检查预算使用情况
  }
}
```

这个快速开始指南涵盖了AI内容分析功能的主要实现步骤。根据实际需求，您可能需要调整某些配置或实现细节。