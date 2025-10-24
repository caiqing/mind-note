# 数据库管理 API 文档

## 概述

MindNote 数据库管理 API 提供了全面的数据库配置、监控和管理功能，支持连接池管理、健康检查、向量搜索等核心功能。

## 基础信息

- **基础URL**: `/api/dev`
- **认证方式**: Bearer Token
- **数据格式**: JSON
- **API版本**: v1

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2024-10-24T20:00:00.000Z"
}
```

### 错误响应

```json
{
  "success": false,
  "message": "操作失败",
  "error": {
    "code": "ERROR_CODE",
    "message": "详细错误信息",
    "details": { ... }
  },
  "timestamp": "2024-10-24T20:00:00.000Z"
}
```

## 数据库设置 API

### 获取数据库设置状态

**GET** `/api/dev/database?action=setup`

获取数据库的当前设置状态，包括连接状态、连接池配置、环境信息等。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "status": "connected",
    "health": {
      "isHealthy": true,
      "status": "connected",
      "lastCheck": "2024-10-24T20:00:00.000Z",
      "reconnects": 0
    },
    "pool": {
      "currentConfig": {
        "minConnections": 2,
        "maxConnections": 10,
        "connectionTimeoutMs": 5000,
        "idleTimeoutMs": 30000
      },
      "metrics": {
        "totalConnections": 10,
        "activeConnections": 3,
        "idleConnections": 7,
        "utilizationRate": 0.3
      }
    },
    "configuration": {
      "url": "***configured***",
      "provider": "postgresql",
      "client": "prisma"
    },
    "environment": "development"
  },
  "message": "数据库设置状态获取成功",
  "timestamp": "2024-10-24T20:00:00.000Z"
}
```

### 获取数据库状态

**GET** `/api/dev/database?action=status`

获取数据库的详细状态信息，包括连接状态、池状态、性能指标和建议。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "isHealthy": true,
    "connectionStatus": "connected",
    "poolStatus": {
      "utilizationRate": 0.3,
      "totalConnections": 10,
      "recommendations": []
    },
    "databaseInfo": {
      "url": "***configured***",
      "version": "PostgreSQL 15.4",
      "size": "125MB"
    },
    "performance": {
      "avgResponseTime": 45.2,
      "totalQueries": 1250,
      "errorRate": 0.008
    },
    "recommendations": [
      "数据库运行状态良好"
    ]
  },
  "timestamp": "2024-10-24T20:00:00.000Z"
}
```

### 获取数据库信息

**GET** `/api/dev/database?action=info`

获取数据库的详细信息，包括版本、表结构、性能指标等。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "version": "PostgreSQL 15.4",
    "tables": [
      {
        "name": "users",
        "rows": 3,
        "size": "2.1MB",
        "indexSize": "512KB"
      },
      {
        "name": "notes",
        "rows": 45,
        "size": "8.7MB",
        "indexSize": "1.2MB"
      }
    ],
    "stats": {
      "totalConnections": 10,
      "activeConnections": 3,
      "avgResponseTime": 45.2,
      "totalQueries": 1250
    },
    "poolConfig": {
      "minConnections": 2,
      "maxConnections": 10,
      "connectionTimeoutMs": 5000
    }
  },
  "message": "数据库信息获取成功",
  "timestamp": "2024-10-24T20:00:00.000Z"
}
```

### 数据库维护操作

**POST** `/api/dev/database`

执行数据库维护操作，包括重新连接、重置连接池、清理缓存等。

#### 请求体

```json
{
  "action": "reconnect"
}
```

#### 支持的操作

- `reconnect`: 重新连接数据库
- `reset_pool`: 重置连接池配置
- `clear_cache`: 清理缓存
- `optimize`: 优化数据库配置
- `test_connection`: 测试数据库连接

#### 响应示例

```json
{
  "success": true,
  "message": "数据库重新连接成功",
  "data": {
    "action": "reconnect",
    "result": {
      "connected": true,
      "testPassed": true
    },
    "duration": 250
  },
  "timestamp": "2024-10-24T20:00:00.000Z"
}
```

## 连接池管理 API

### 获取连接池配置

**GET** `/api/dev/database/pool?action=config`

获取当前连接池配置和统计信息。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "currentConfig": {
      "minConnections": 2,
      "maxConnections": 10,
      "connectionTimeoutMs": 5000,
      "idleTimeoutMs": 30000,
      "maxLifetimeMs": 300000,
      "healthCheckIntervalMs": 10000,
      "enableMetrics": true
    },
    "environment": "development",
    "metrics": {
      "totalConnections": 10,
      "activeConnections": 3,
      "idleConnections": 7,
      "utilizationRate": 0.3
    },
    "recommendations": [],
    "lastOptimization": null
  },
  "message": "连接池配置获取成功",
  "timestamp": "2024-10-24T20:00:00.000Z"
}
```

### 获取连接池性能指标

**GET** `/api/dev/database/pool?action=metrics`

获取连接池的实时性能指标和趋势数据。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "currentConfig": {
      "minConnections": 2,
      "maxConnections": 10
    },
    "realTimeStats": {
      "totalConnections": 10,
      "activeConnections": 3,
      "idleConnections": 7,
      "errorCount": 1,
      "totalQueries": 1250,
      "avgResponseTime": 45.2
    },
    "trends": {
      "connectionUtilization": [
        {
          "timestamp": "2024-10-24T19:50:00.000Z",
          "value": 0.3
        },
        {
          "timestamp": "2024-10-24T19:55:00.000Z",
          "value": 0.4
        }
      ],
      "responseTime": [
        {
          "timestamp": "2024-10-24T19:50:00.000Z",
          "value": 42.1
        }
      ],
      "errorRate": [
        {
          "timestamp": "2024-10-24T19:50:00.000Z",
          "value": 0.008
        }
      ]
    },
    "performanceInsights": [
      "连接池使用率正常",
      "查询响应时间良好"
    ]
  },
  "timestamp": "2024-10-24T20:00:00.000Z"
}
```

### 更新连接池配置

**POST** `/api/dev/database/pool`

更新连接池配置参数。

#### 请求体

```json
{
  "action": "update",
  "config": {
    "maxConnections": 15,
    "connectionTimeoutMs": 8000
  }
}
```

#### 响应示例

```json
{
  "success": true,
  "message": "连接池配置更新成功",
  "data": {
    "updatedConfig": {
      "minConnections": 2,
      "maxConnections": 15,
      "connectionTimeoutMs": 8000
    }
  },
  "timestamp": "2024-10-24T20:00:00.000Z"
}
```

### 连接池优化

**POST** `/api/dev/database/pool`

基于工作负载数据自动优化连接池配置。

#### 请求体

```json
{
  "action": "optimize",
  "workloadMetrics": {
    "avgConnections": 16,
    "peakConnections": 22,
    "avgResponseTime": 300,
    "errorRate": 0.02,
    "throughput": 100
  },
  "autoApply": false
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "currentConfig": {
      "maxConnections": 10,
      "connectionTimeoutMs": 5000
    },
    "recommendedConfig": {
      "maxConnections": 25,
      "connectionTimeoutMs": 8000
    },
    "improvements": [
      "将最大连接数从 10 增加到 25 以应对高负载",
      "增加连接超时时间以快速识别问题连接"
    ],
    "performanceGain": {
      "expectedThroughputIncrease": 15,
      "expectedLatencyDecrease": 20,
      "resourceUtilizationChange": 25.0
    },
    "riskAssessment": {
      "level": "low",
      "factors": []
    },
    "applied": false
  },
  "message": "连接池优化建议生成成功",
  "timestamp": "2024-10-24T20:00:00.000Z"
}
```

## 健康检查 API

### 综合健康检查

**GET** `/api/dev/health`

执行全面的数据库健康检查，包括连接、性能、扩展、安全等组件。

#### 查询参数

- `detailed`: 是否返回详细信息 (默认: false)
- `component`: 检查特定组件 (可选)

#### 响应示例

```json
{
  "success": true,
  "data": {
    "overall": {
      "status": "healthy",
      "score": 85,
      "message": "整体健康状态良好",
      "lastCheck": "2024-10-24T20:00:00.000Z",
      "responseTime": 45
    },
    "components": {
      "connection": {
        "status": "healthy",
        "score": 90,
        "message": "连接健康状态: healthy",
        "checks": [
          {
            "name": "database_connection",
            "status": "pass",
            "message": "数据库连接正常",
            "value": "connected"
          }
        ]
      },
      "pool": {
        "status": "warning",
        "score": 75,
        "message": "连接池健康状态: warning",
        "checks": [
          {
            "name": "pool_utilization",
            "status": "warn",
            "message": "连接池使用率: 80%",
            "value": 0.8,
            "threshold": { "warn": 0.8, "fail": 0.95 }
          }
        ]
      },
      "performance": {
        "status": "healthy",
        "score": 88,
        "message": "性能健康状态: healthy"
      },
      "extensions": {
        "status": "healthy",
        "score": 95,
        "message": "扩展健康状态: healthy"
      },
      "security": {
        "status": "healthy",
        "score": 92,
        "message": "安全健康状态: healthy"
      }
    },
    "metrics": {
      "uptime": 86400,
      "responseTime": 45,
      "throughput": 1250,
      "errorRate": 0.008,
      "connectionUtilization": 0.3
    },
    "recommendations": [
      {
        "type": "performance",
        "priority": "medium",
        "title": "连接池使用率偏高",
        "description": "当前连接池使用率为 80%",
        "action": "监控连接池使用情况，准备扩容",
        "impact": "提升查询性能，改善用户体验"
      }
    ],
    "alerts": [
      {
        "level": "warning",
        "title": "连接池组件需要关注",
        "message": "连接池健康得分为 75/100",
        "timestamp": "2024-10-24T20:00:00.000Z",
        "component": "pool",
        "actionable": true
      }
    ]
  },
  "timestamp": "2024-10-24T20:00:00.000Z"
}
```

### 组件健康检查

**GET** `/api/dev/health?component={component}`

检查特定组件的健康状态。

#### 支持的组件

- `connection`: 连接状态
- `pool`: 连接池状态
- `performance`: 性能指标
- `extensions`: 扩展状态
- `security`: 安全状态

#### 响应示例

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "score": 90,
    "message": "连接健康状态: healthy",
    "details": {
      "reconnectCount": 0,
      "lastConnect": "2024-10-24T19:00:00.000Z",
      "avgConnectTime": 120
    },
    "checks": [
      {
        "name": "database_connection",
        "status": "pass",
        "message": "数据库连接正常",
        "value": "connected",
        "threshold": "connected"
      }
    ]
  },
  "timestamp": "2024-10-24T20:00:00.000Z"
}
```

## 错误代码

### 数据库相关错误

| 错误代码 | HTTP状态码 | 说明 |
|---------|-----------|------|
| `CONNECTION_ERROR` | 500 | 数据库连接失败 |
| `POOL_ERROR` | 500 | 连接池操作失败 |
| `HEALTH_CHECK_ERROR` | 500 | 健康检查失败 |
| `CONFIG_ERROR` | 400 | 配置参数无效 |
| `OPTIMIZATION_ERROR` | 500 | 优化操作失败 |
| `RESET_ERROR` | 500 | 重置操作失败 |
| `CLEANUP_ERROR` | 500 | 清理操作失败 |

### 请求相关错误

| 错误代码 | HTTP状态码 | 说明 |
|---------|-----------|------|
| `INVALID_ACTION` | 400 | 不支持的操作 |
| `INVALID_REQUEST` | 400 | 请求参数无效 |
| `MISSING_PARAMETER` | 400 | 缺少必需参数 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |

## 使用示例

### JavaScript/TypeScript

```typescript
// 检查数据库状态
const checkDatabaseStatus = async () => {
  try {
    const response = await fetch('/api/dev/database?action=status');
    const data = await response.json();

    if (data.success) {
      console.log('数据库状态:', data.data);
      return data.data;
    } else {
      console.error('检查失败:', data.error);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
};

// 优化连接池
const optimizeConnectionPool = async (metrics: any) => {
  try {
    const response = await fetch('/api/dev/database/pool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'optimize',
        workloadMetrics: metrics,
        autoApply: true
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('优化结果:', data.data);
      return data.data;
    }
  } catch (error) {
    console.error('优化失败:', error);
  }
};

// 健康检查
const performHealthCheck = async () => {
  try {
    const response = await fetch('/api/dev/health?detailed=true');
    const data = await response.json();

    if (data.success) {
      const health = data.data;
      console.log('健康评分:', health.overall.score);
      console.log('组件状态:', health.components);

      // 处理建议
      health.recommendations.forEach(rec => {
        console.log(`${rec.title}: ${rec.description}`);
      });

      return health;
    }
  } catch (error) {
    console.error('健康检查失败:', error);
  }
};
```

### cURL

```bash
# 检查数据库状态
curl -X GET "http://localhost:3000/api/dev/database?action=status" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 优化连接池
curl -X POST "http://localhost:3000/api/dev/database/pool" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "optimize",
    "workloadMetrics": {
      "avgConnections": 16,
      "peakConnections": 22,
      "avgResponseTime": 300,
      "errorRate": 0.02,
      "throughput": 100
    },
    "autoApply": false
  }'

# 健康检查
curl -X GET "http://localhost:3000/api/dev/health?detailed=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 监控和告警

### 关键指标

1. **连接池使用率**: 建议保持在 80% 以下
2. **平均响应时间**: 建议小于 200ms
3. **错误率**: 建议小于 1%
4. **健康评分**: 建议保持在 80 分以上

### 告警阈值

```json
{
  "connectionPool": {
    "utilization": {
      "warning": 0.8,
      "critical": 0.95
    },
    "responseTime": {
      "warning": 200,
      "critical": 500
    },
    "errorRate": {
      "warning": 0.01,
      "critical": 0.05
    }
  },
  "healthScore": {
    "warning": 70,
    "critical": 50
  }
}
```

## 更新日志

### v1.0.0 (2024-10-24)
- 初始版本发布
- 支持数据库状态查询
- 支持连接池管理
- 支持健康检查
- 支持向量搜索配置

---

本文档最后更新时间: 2024年10月24日