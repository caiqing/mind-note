# AI Analysis API Contract

**Branch**: 004-ai | **Date**: 2025-10-25 | **Spec**: [link](../spec.md)

## API Overview

AI分析API提供智能文本分析服务，包括摘要生成、情感分析、内容分类、标签提取和向量化存储。

## 基础配置

- **Base URL**: `/api/v1/ai`
- **Authentication**: Bearer Token (JWT)
- **Content-Type**: `application/json`
- **Rate Limiting**: 根据用户计划动态调整

## API Endpoints

### 1. 分析笔记内容

**POST** `/analyze/note/:noteId`

分析指定笔记的AI内容，支持部分或全量分析。

#### Request Parameters

```typescript
interface AnalyzeNoteRequest {
  analysisType: 'summary' | 'classification' | 'tags' | 'sentiment' | 'full'
  options?: {
    force?: boolean                    // 强制重新分析
    model?: string                     // 指定AI模型
    priority?: 'low' | 'normal' | 'high'
  }
}
```

#### Response

```typescript
interface AnalyzeNoteResponse {
  success: boolean
  data?: {
    analysisId: string
    status: 'pending' | 'processing' | 'completed' | 'failed'

    // 分析结果 (completed状态)
    summary?: string
    sentiment?: {
      type: 'positive' | 'negative' | 'neutral'
      confidence: number
      score: number
    }
    categories?: Array<{
      id: string
      name: string
      confidence: number
    }>
    tags?: Array<{
      id: string
      name: string
      confidence: number
      suggested: boolean
    }>
    keyConcepts?: string[]

    // 技术信息
    model: string
    processingTime: number
    tokenCount: number
    cost: number
  }
  error?: {
    code: string
    message: string
    details?: any
  }
  meta: {
    requestId: string
    timestamp: string
    version: string
  }
}
```

#### Example

```bash
curl -X POST "/api/v1/ai/analyze/note/123" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "analysisType": "full",
    "options": {
      "force": false,
      "priority": "normal"
    }
  }'
```

### 2. 获取分析状态

**GET** `/analyze/:analysisId/status`

查询AI分析任务的状态和进度。

#### Response

```typescript
interface AnalysisStatusResponse {
  analysisId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number              // 0-100
  estimatedTime?: number        // 预估剩余时间(秒)
  startedAt?: string
  completedAt?: string

  // 错误信息 (failed状态)
  error?: {
    code: string
    message: string
  }

  // 结果摘要 (completed状态)
  summary?: {
    analysisType: string
    model: string
    processingTime: number
    cost: number
  }
}
```

### 3. 批量分析

**POST** `/analyze/batch`

批量分析多个笔记，支持异步处理。

#### Request Parameters

```typescript
interface BatchAnalyzeRequest {
  noteIds: string[]
  analysisType: 'summary' | 'classification' | 'tags' | 'sentiment' | 'full'
  options?: {
    priority?: 'low' | 'normal' | 'high'
    batchSize?: number              // 并发处理数量，默认5
    continueOnError?: boolean        // 出错时是否继续处理其他笔记
  }
}
```

#### Response

```typescript
interface BatchAnalyzeResponse {
  batchId: string
  totalNotes: number
  status: 'pending' | 'processing' | 'completed' | 'failed'

  // 处理进度
  processed: number
  succeeded: number
  failed: number

  // 结果概要
  results?: Array<{
    noteId: string
    analysisId: string
    status: 'completed' | 'failed'
    error?: string
  }>

  // 元数据
  createdAt: string
  estimatedCompletion?: string
}
```

### 4. 相似笔记搜索

**GET** `/search/similar/:noteId`

基于向量相似度查找相关笔记。

#### Request Parameters

```
?limit=10&threshold=0.7&categories=tech,personal
```

- `limit`: 返回结果数量限制 (默认10，最大50)
- `threshold`: 相似度阈值 (0-1，默认0.7)
- `categories`: 过滤分类 (逗号分隔)
- `tags`: 过滤标签 (逗号分隔)

#### Response

```typescript
interface SimilarNotesResponse {
  query: {
    noteId: string
    threshold: number
    filters: {
      categories?: string[]
      tags?: string[]
    }
  }

  results: Array<{
    noteId: string
    title: string
    summary: string
    similarity: number
    categories: string[]
    tags: string[]
    updatedAt: string
  }>

  meta: {
    totalResults: number
    searchTime: number
    algorithm: string
  }
}
```

### 5. 获取分析历史

**GET** `/analyze/history`

获取用户的AI分析历史记录。

#### Request Parameters

```
?page=1&limit=20&type=summary&dateFrom=2024-01-01&dateTo=2024-12-31
```

- `page`: 页码 (默认1)
- `limit`: 每页数量 (默认20，最大100)
- `type`: 分析类型过滤
- `dateFrom`: 开始日期
- `dateTo`: 结束日期
- `status`: 状态过滤

#### Response

```typescript
interface AnalysisHistoryResponse {
  items: Array<{
    analysisId: string
    noteId: string
    noteTitle: string
    analysisType: string
    status: string
    model: string
    cost: number
    processingTime: number
    createdAt: string
  }>

  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }

  summary: {
    totalAnalyses: number
    totalCost: number
    avgProcessingTime: number
    successRate: number
  }
}
```

### 6. 获取AI模型配置

**GET** `/models`

获取可用的AI模型列表和配置信息。

#### Response

```typescript
interface ModelsResponse {
  providers: Array<{
    id: string
    name: string
    isActive: boolean
    priority: number

    models: Array<{
      id: string
      name: string
      version: string
      capabilities: string[]

      limits: {
        maxTokens: number
        rateLimit: number
        costPerToken: number
      }

      performance: {
        avgResponseTime: number
        accuracy: number
        successRate: number
      }
    }>
  }>

  userSettings: {
    preferredProvider?: string
    preferredModel?: string
    budgetLimits: {
      daily: number
      monthly: number
    }
  }
}
```

### 7. 更新分析结果

**PUT** `/analyze/:analysisId`

更新或修正AI分析结果。

#### Request Parameters

```typescript
interface UpdateAnalysisRequest {
  fields: {
    summary?: string
    categories?: Array<{
      id: string
      action: 'add' | 'remove'
    }>
    tags?: Array<{
      id: string
      action: 'add' | 'remove'
    }>
  }

  feedback?: {
    rating: number              // 1-5
    comment?: string
    issues?: string[]
  }
}
```

#### Response

```typescript
interface UpdateAnalysisResponse {
  success: boolean
  updatedFields: string[]
  analysis: {
    // 更新后的完整分析结果
  }
}
```

## 错误处理

### 标准错误格式

```typescript
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
    timestamp: string
    requestId: string
  }
}
```

### 常见错误码

| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| `INVALID_REQUEST` | 400 | 请求参数无效 |
| `UNAUTHORIZED` | 401 | 未授权访问 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOTE_NOT_FOUND` | 404 | 笔记不存在 |
| `ANALYSIS_NOT_FOUND` | 404 | 分析结果不存在 |
| `RATE_LIMIT_EXCEEDED` | 429 | 超出速率限制 |
| `QUOTA_EXCEEDED` | 429 | 超出配额限制 |
| `AI_SERVICE_ERROR` | 502 | AI服务错误 |
| `INSUFFICIENT_BUDGET` | 402 | 预算不足 |
| `PROCESSING_TIMEOUT` | 408 | 处理超时 |
| `INTERNAL_ERROR` | 500 | 内部服务器错误 |

## 速率限制

### 用户级别限制

- **免费用户**: 100次分析/天，$0.10预算
- **付费用户**: 1000次分析/天，$1.00预算
- **企业用户**: 10000次分析/天，$10.00预算

### 模型级别限制

- **GPT-4**: 10次/分钟，1000次/小时
- **Claude**: 20次/分钟，2000次/小时
- **其他模型**: 60次/分钟，5000次/小时

## 认证授权

### JWT Token Claims

```typescript
interface JWTPayload {
  sub: string          // 用户ID
  email: string
  role: 'user' | 'premium' | 'enterprise'
  permissions: string[]
  iat: number
  exp: number
}
```

### 权限要求

- **分析笔记**: `ai:analyze:note`
- **查看历史**: `ai:read:history`
- **批量分析**: `ai:analyze:batch`
- **搜索相似**: `ai:search:similar`

## 监控指标

### 关键指标

- **响应时间**: P50 < 1s, P95 < 3s, P99 < 10s
- **成功率**: > 99.5%
- **成本控制**: 预算超支率 < 1%
- **可用性**: > 99.9%

### 监控端点

**GET** `/health`

```typescript
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    aiProviders: Array<{
      name: string
      status: 'available' | 'unavailable' | 'degraded'
      responseTime: number
      lastCheck: string
    }>
    database: {
      status: 'available' | 'unavailable'
      responseTime: number
    }
  }
  metrics: {
    requestsPerSecond: number
    averageResponseTime: number
    errorRate: number
    activeAnalyses: number
  }
}
```

## 测试用例

### 单元测试覆盖

- ✅ 请求参数验证
- ✅ 响应格式验证
- ✅ 错误处理逻辑
- ✅ 权限检查
- ✅ 速率限制
- ✅ 成本控制

### 集成测试覆盖

- ✅ 端到端分析流程
- ✅ 批量处理场景
- ✅ 向量搜索功能
- ✅ 多模型切换
- ✅ 故障恢复机制

### 性能测试

- ✅ 并发处理能力
- ✅ 大批量数据处理
- ✅ 内存使用优化
- ✅ 数据库查询优化