# AI Provider Configuration Contract

**Branch**: 004-ai | **Date**: 2025-10-25 | **Spec**: [link](../spec.md)

## 配置概述

AI服务提供商配置定义了如何集成和管理多个AI模型，包括认证、限流、成本控制和故障转移机制。

## 配置结构

### 基础配置

```typescript
interface AIProviderConfig {
  providers: ProviderConfig[]
  fallbackRules: FallbackRule[]
  globalSettings: GlobalSettings
}
```

### Provider配置

```typescript
interface ProviderConfig {
  // 基础信息
  id: string                      // 唯一标识符
  name: string                    // 提供商名称 (OpenAI, Claude等)
  type: 'openai' | 'anthropic' | 'custom'
  description?: string             // 描述信息

  // 连接配置
  endpoint?: string               // API端点 (可选，使用默认值)
  apikey: string                  // API密钥 (加密存储)
  version: string                  // API版本
  timeout: number                 // 请求超时时间 (ms)
  retryAttempts: number           // 重试次数

  // 模型配置
  models: ModelConfig[]
  defaultModel: string             // 默认模型ID

  // 限制配置
  limits: {
    rateLimit: number              // 每分钟请求数
    dailyLimit: number             // 每日请求数
    costLimit: number              // 每小时成本限制
    maxTokens: number              // 单次请求最大token数
  }

  // 优先级设置
  priority: number                 // 优先级权重 (1-10)
  isEnabled: boolean              // 是否启用
  fallbackEnabled: boolean         // 是否启用故障转移

  // 质量控制
  quality: {
    minAccuracy: number            // 最低准确率要求
    minSuccessRate: number         // 最低成功率要求
    maxResponseTime: number        // 最大响应时间要求
  }

  // 监控配置
  monitoring: {
    healthCheckInterval: number    // 健康检查间隔 (秒)
    metricsEnabled: boolean        // 是否启用指标收集
    alertingEnabled: boolean       // 是否启用告警
  }

  // 元数据
  metadata?: {
    website?: string
    documentation?: string
    supportContact?: string
    pricing?: PricingInfo
  }
}
```

### Model配置

```typescript
interface ModelConfig {
  id: string                      // 模型唯一标识
  name: string                    // 模型名称
  version: string                 // 模型版本
  description?: string             // 描述

  // 能力配置
  capabilities: ModelCapabilities
  supportedTasks: AnalysisType[]   // 支持的分析类型

  // 性能配置
  performance: {
    maxTokens: number              // 最大token数
    contextWindow: number          // 上下文窗口大小
    avgResponseTime: number        // 平均响应时间 (ms)
    accuracy: number               // 准确率 (0-1)
  }

  // 成本配置
  pricing: {
    inputTokenPrice: number        // 输入token价格 (每1K tokens)
    outputTokenPrice: number       // 输出token价格 (每1K tokens)
    currency: string               // 货币单位
  }

  // 使用限制
  limits: {
    rateLimit: number              // 每分钟请求限制
    dailyLimit: number             // 每日请求限制
    maxConcurrency: number         // 最大并发数
  }

  // 质量要求
  quality: {
    minAccuracy: number            // 最低准确率
    minRelevance: number           // 最低相关性
    maxLatency: number             // 最大延迟
  }

  // 启用状态
  isEnabled: boolean
  isExperimental: boolean          // 是否为实验性模型
}

interface ModelCapabilities {
  textGeneration: boolean          // 文本生成
  textAnalysis: boolean            // 文本分析
  summarization: boolean           // 摘要生成
  classification: boolean          // 文本分类
  sentimentAnalysis: boolean       // 情感分析
  keywordExtraction: boolean       // 关键词提取
  translation: boolean             // 翻译
  codeGeneration: boolean          // 代码生成
}

type AnalysisType =
  | 'summary'
  | 'classification'
  | 'tags'
  | 'sentiment'
  | 'key_concepts'
  | 'embedding'
  | 'full_analysis'
```

### 故障转移规则

```typescript
interface FallbackRule {
  id: string
  name: string
  description?: string

  // 触发条件
  triggers: FallbackTrigger[]

  // 转移目标
  targets: FallbackTarget[]

  // 执行配置
  execution: {
    maxRetries: number             // 最大重试次数
    retryDelay: number             // 重试延迟 (ms)
    enablePartialFallback: boolean // 部分功能转移
  }

  // 条件
  conditions: {
    timeWindow?: TimeWindow        // 生效时间窗口
    userRoles?: string[]           // 用户角色限制
    requestTypes?: AnalysisType[]  // 请求类型限制
  }

  // 状态
  isEnabled: boolean
  priority: number
}

interface FallbackTrigger {
  type: 'error_rate' | 'response_time' | 'cost_limit' | 'availability'
  threshold: number
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  duration?: number                // 持续时间 (秒)
}

interface FallbackTarget {
  providerId: string
  modelId?: string
  priority: number
  capabilities?: string[]         // 必须具备的能力
}

interface TimeWindow {
  start: string                    // HH:mm
  end: string                      // HH:mm
  timezone?: string                // 时区
  days?: number[]                  // 星期几 (0=Sunday)
}
```

### 全局设置

```typescript
interface GlobalSettings {
  // 默认配置
  defaultProvider: string          // 默认提供商
  defaultModel: string              // 默认模型
  defaultTimeout: number            // 默认超时时间

  // 成本控制
  costControl: {
    userDailyBudget: number         // 用户每日预算
    userMonthlyBudget: number       // 用户每月预算
    systemDailyBudget: number       // 系统每日预算
    currency: string                // 货币单位

    // 成本预警
    alerts: {
      budgetThreshold: number       // 预算使用率预警阈值
      overspendAction: 'stop' | 'downgrade' | 'notify'
    }
  }

  // 性能控制
  performance: {
    maxConcurrency: number         // 最大并发数
    queueTimeout: number            // 队列超时时间
    circuitBreaker: {
      failureThreshold: number      // 失败阈值
      recoveryTimeout: number       // 恢复超时时间
      halfOpenMaxCalls: number      // 半开状态最大调用数
    }
  }

  // 质量控制
  quality: {
    minSuccessRate: number          // 最低成功率
    maxResponseTime: number         // 最大响应时间
    enableQualityMonitoring: boolean
  }

  // 监控配置
  monitoring: {
    metricsInterval: number         // 指标收集间隔
    healthCheckInterval: number     // 健康检查间隔
    retentionPeriod: number         // 数据保留期 (天)
    alerting: {
      enabled: boolean
      channels: AlertChannel[]
    }
  }

  // 缓存配置
  cache: {
    enabled: boolean
    ttl: number                     // 缓存时间 (秒)
    maxSize: number                 // 最大缓存条目数
    strategy: 'lru' | 'lfu' | 'fifo'
  }
}

interface AlertChannel {
  type: 'email' | 'webhook' | 'slack' | 'teams'
  config: Record<string, any>
  filters: {
    severity?: ('low' | 'medium' | 'high' | 'critical')[]
    categories?: string[]
  }
}
```

## 配置示例

### OpenAI配置示例

```json
{
  "id": "openai-primary",
  "name": "OpenAI",
  "type": "openai",
  "endpoint": "https://api.openai.com/v1",
  "apikey": "sk-...encrypted...",
  "version": "2024-01-01",
  "timeout": 30000,
  "retryAttempts": 3,
  "models": [
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "version": "2024-05-13",
      "capabilities": {
        "textGeneration": true,
        "textAnalysis": true,
        "summarization": true,
        "classification": true,
        "sentimentAnalysis": true,
        "keywordExtraction": true
      },
      "supportedTasks": ["summary", "classification", "tags", "sentiment", "key_concepts"],
      "performance": {
        "maxTokens": 128000,
        "contextWindow": 128000,
        "avgResponseTime": 2000,
        "accuracy": 0.95
      },
      "pricing": {
        "inputTokenPrice": 0.005,
        "outputTokenPrice": 0.015,
        "currency": "USD"
      },
      "limits": {
        "rateLimit": 60,
        "dailyLimit": 1000,
        "maxConcurrency": 10
      },
      "quality": {
        "minAccuracy": 0.85,
        "minRelevance": 0.80,
        "maxLatency": 5000
      },
      "isEnabled": true,
      "isExperimental": false
    }
  ],
  "defaultModel": "gpt-4o",
  "limits": {
    "rateLimit": 60,
    "dailyLimit": 1000,
    "costLimit": 10.0,
    "maxTokens": 4096
  },
  "priority": 9,
  "isEnabled": true,
  "fallbackEnabled": true,
  "quality": {
    "minAccuracy": 0.90,
    "minSuccessRate": 0.95,
    "maxResponseTime": 10000
  },
  "monitoring": {
    "healthCheckInterval": 60,
    "metricsEnabled": true,
    "alertingEnabled": true
  }
}
```

### 故障转移规则示例

```json
{
  "id": "openai-to-claude",
  "name": "OpenAI故障转移到Claude",
  "description": "当OpenAI服务异常时自动切换到Claude",
  "triggers": [
    {
      "type": "error_rate",
      "threshold": 0.1,
      "operator": "gte",
      "duration": 60
    },
    {
      "type": "response_time",
      "threshold": 10000,
      "operator": "gt",
      "duration": 30
    }
  ],
  "targets": [
    {
      "providerId": "anthropic-primary",
      "modelId": "claude-3-5-sonnet",
      "priority": 1,
      "capabilities": ["summarization", "classification", "sentiment"]
    }
  ],
  "execution": {
    "maxRetries": 2,
    "retryDelay": 1000,
    "enablePartialFallback": true
  },
  "conditions": {
    "userRoles": ["user", "premium", "enterprise"],
    "requestTypes": ["summary", "classification", "sentiment"]
  },
  "isEnabled": true,
  "priority": 1
}
```

## 配置管理API

### 获取配置

**GET** `/api/v1/ai/config`

获取当前AI配置信息。

### 更新配置

**PUT** `/api/v1/ai/config/:providerId`

更新指定提供商的配置。

### 测试连接

**POST** `/api/v1/ai/config/:providerId/test`

测试提供商连接是否正常。

### 获取使用统计

**GET** `/api/v1/ai/stats`

获取AI使用统计信息。

## 安全考虑

### API密钥管理

- 使用AES-256加密存储API密钥
- 定期轮换API密钥
- 限制API密钥权限范围
- 监控API密钥使用情况

### 访问控制

- 基于角色的访问控制
- 审计日志记录
- 敏感操作需要二次验证
- 网络访问限制

### 数据保护

- 传输过程中使用TLS加密
- 敏感数据脱敏处理
- 数据最小化原则
- 定期安全审计

## 监控指标

### 关键指标

- **可用性**: 服务可用率 > 99.9%
- **响应时间**: P95 < 5秒
- **成功率**: > 99%
- **成本控制**: 预算超支率 < 1%

### 告警规则

- 服务不可用超过1分钟
- 错误率超过5%
- 响应时间超过10秒
- 成本超过预算80%

## 验证规则

### 配置验证

- API密钥格式验证
- 端点URL格式验证
- 模型ID唯一性验证
- 优先级范围验证

### 运行时验证

- 配置完整性检查
- 依赖关系验证
- 资源限制验证
- 权限范围验证