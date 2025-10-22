# API Contracts

**Feature**: 项目基础设施搭建和开发环境配置
**Branch**: 001-dev-env-setup
**Created**: 2025-10-22
**Status**: Contract Specification Complete

---

## Overview

本文档定义了MindNote开发环境配置的API契约。所有API遵循RESTful设计原则，使用JSON格式进行数据交换，支持OpenAPI 3.0规范。API设计注重安全性、性能和易用性，支持小型团队协作开发场景。

---

## API Base Information

- **Base URL**: `https://api.mindnote.com/v1`
- **Content-Type**: `application/json`
- **Authentication**: JWT Bearer Token
- **Rate Limiting**: 1000 requests/hour per user
- **API Version**: v1

---

## Authentication API

### 1. 用户注册

**POST** `/auth/register`

注册新用户账号。

#### Request Body

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securePassword123",
  "full_name": "John Doe"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "full_name": "John Doe",
      "email_verified": false,
      "created_at": "2025-10-22T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "Email already registered",
    "details": {
      "field": "email",
      "value": "user@example.com"
    }
  }
}
```

### 2. 用户登录

**POST** `/auth/login`

用户登录获取访问令牌。

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "full_name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2025-10-29T10:30:00Z"
  }
}
```

### 3. 刷新令牌

**POST** `/auth/refresh`

刷新访问令牌。

#### Request Headers

```
Authorization: Bearer <refresh_token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2025-10-29T10:30:00Z"
  }
}
```

---

## User Management API

### 1. 获取用户信息

**GET** `/users/me`

获取当前登录用户的详细信息。

#### Request Headers

```
Authorization: Bearer <access_token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "email_verified": true,
    "ai_preferences": {
      "default_model": "gpt-4",
      "temperature": 0.7,
      "max_tokens": 2048
    },
    "settings": {
      "theme": "dark",
      "language": "zh-CN",
      "notifications": true
    },
    "created_at": "2025-10-22T10:30:00Z",
    "last_login_at": "2025-10-22T15:45:00Z"
  }
}
```

### 2. 更新用户信息

**PUT** `/users/me`

更新用户个人信息。

#### Request Body

```json
{
  "full_name": "John Smith",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "ai_preferences": {
    "default_model": "claude-3-sonnet",
    "temperature": 0.5,
    "max_tokens": 1024
  },
  "settings": {
    "theme": "light",
    "notifications": false
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "full_name": "John Smith",
    "avatar_url": "https://example.com/new-avatar.jpg",
    "ai_preferences": {
      "default_model": "claude-3-sonnet",
      "temperature": 0.5,
      "max_tokens": 1024
    },
    "settings": {
      "theme": "light",
      "notifications": false
    },
    "updated_at": "2025-10-22T16:00:00Z"
  }
}
```

---

## Development Environment API

### 1. 环境状态检查

**GET** `/dev/status`

检查开发环境各组件的运行状态。

#### Response

```json
{
  "success": true,
  "data": {
    "database": {
      "status": "healthy",
      "connection": "established",
      "version": "PostgreSQL 15.3",
      "extensions": ["pgvector", "uuid-ossp"]
    },
    "redis": {
      "status": "healthy",
      "connection": "established",
      "version": "Redis 7.2",
      "memory_usage": "45MB/512MB"
    },
    "ai_services": {
      "local": {
        "status": "healthy",
        "provider": "ollama",
        "models_available": ["distilbert", "llama2-7b"],
        "gpu_available": true
      },
      "cloud": {
        "status": "healthy",
        "providers": {
          "openai": "connected",
          "anthropic": "connected"
        }
      }
    },
    "docker": {
      "status": "healthy",
      "containers_running": 4,
      "containers_total": 4
    }
  }
}
```

### 2. 数据库初始化

**POST** `/dev/database/setup`

初始化数据库结构和基础数据。

#### Request Body

```json
{
  "reset": false,
  "seed_data": true,
  "create_indexes": true
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "status": "completed",
    "migrations_applied": [
      "001_initial_schema",
      "002_add_vector_support",
      "003_add_ai_integration"
    ],
    "seed_data_loaded": true,
    "indexes_created": 12,
    "execution_time": 1250
  }
}
```

### 3. AI服务配置

**PUT** `/dev/ai/configure`

配置AI服务连接和默认设置。

#### Request Body

```json
{
  "local_models": {
    "enabled": true,
    "models_dir": "/app/ai-services/local/models",
    "auto_download": true
  },
  "cloud_providers": {
    "openai": {
      "enabled": true,
      "api_key": "sk-proj-...",
      "default_model": "gpt-4",
      "base_url": "https://api.openai.com/v1"
    },
    "anthropic": {
      "enabled": true,
      "api_key": "sk-ant-...",
      "default_model": "claude-3-sonnet",
      "base_url": "https://api.anthropic.com"
    }
  },
  "routing": {
    "fallback_enabled": true,
    "priority_order": ["local", "openai", "anthropic"],
    "rate_limits": {
      "local": "unlimited",
      "openai": "3500/minute",
      "anthropic": "60/minute"
    }
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "configuration_saved": true,
    "services_tested": {
      "local": "success",
      "openai": "success",
      "anthropic": "success"
    },
    "default_model": "distilbert-local"
  }
}
```

### 4. 开发工具配置

**PUT** `/dev/tools/configure`

配置开发工具链（ESLint、Prettier、测试框架等）。

#### Request Body

```json
{
  "code_quality": {
    "eslint": {
      "enabled": true,
      "rules": {
        "typescript": "strict",
        "react": "recommended",
        "import/order": "error"
      },
      "auto_fix": true
    },
    "prettier": {
      "enabled": true,
      "semi": true,
      "single_quote": true,
      "tab_width": 2
    }
  },
  "testing": {
    "unit_tests": {
      "framework": "jest",
      "coverage_threshold": 90,
      "auto_run": true
    },
    "integration_tests": {
      "framework": "supertest",
      "test_database": true
    },
    "e2e_tests": {
      "framework": "playwright",
      "headless": true,
      "parallel": true
    }
  },
  "git_hooks": {
    "pre_commit": true,
    "pre_push": true,
    "lint_staged": true
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "configuration_applied": true,
    "tools_configured": [
      "eslint",
      "prettier",
      "jest",
      "playwright",
      "husky",
      "lint-staged"
    ],
    "git_hooks_enabled": true
  }
}
```

### 5. CI/CD流水线配置

**PUT** `/dev/cicd/setup`

配置CI/CD流水线（GitHub Actions）。

#### Request Body

```json
{
  "github_actions": {
    "enabled": true,
    "workflows": {
      "ci": {
        "trigger_on": ["push", "pull_request"],
        "test_matrix": ["node_version: [18, 20]"],
        "cache_dependencies": true
      },
      "deploy": {
        "trigger_on": ["push:main"],
        "environments": ["staging", "production"],
        "auto_approve": false
      }
    }
  },
  "secrets": {
    "DATABASE_URL": "required",
    "REDIS_URL": "required",
    "OPENAI_API_KEY": "required",
    "ANTHROPIC_API_KEY": "optional"
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "github_connected": true,
    "workflows_created": [".github/workflows/ci.yml", ".github/workflows/deploy.yml"],
    "secrets_configured": ["DATABASE_URL", "REDIS_URL"],
    "webhooks_enabled": true
  }
}
```

---

## Monitoring API

### 1. 系统健康检查

**GET** `/monitoring/health`

检查系统整体健康状态。

#### Response

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-22T16:30:00Z",
    "uptime": "15 days 4 hours",
    "version": "1.0.0",
    "environment": "development",
    "services": {
      "api": "healthy",
      "database": "healthy",
      "redis": "healthy",
      "ai_services": "healthy"
    },
    "metrics": {
      "response_time_p95": "85ms",
      "error_rate": "0.1%",
      "requests_per_minute": 150
    }
  }
}
```

### 2. 性能指标

**GET** `/monitoring/metrics`

获取系统性能指标。

#### Query Parameters

- `time_range`: `1h`, `24h`, `7d`, `30d` (default: `24h`)
- `service`: `api`, `database`, `redis`, `ai` (optional)

#### Response

```json
{
  "success": true,
  "data": {
    "time_range": "24h",
    "api_metrics": {
      "total_requests": 12500,
      "average_response_time": "82ms",
      "p95_response_time": "156ms",
      "p99_response_time": "245ms",
      "error_rate": "0.08%",
      "success_rate": "99.92%"
    },
    "database_metrics": {
      "active_connections": 15,
      "query_time_p95": "45ms",
      "slow_queries": 3,
      "deadlocks": 0
    },
    "ai_metrics": {
      "total_requests": 850,
      "average_response_time": "1250ms",
      "success_rate": "98.2%",
      "cost_today": "$12.45",
      "local_model_usage": "65%"
    }
  }
}
```

### 3. 错误日志

**GET** `/monitoring/logs`

获取系统错误日志。

#### Query Parameters

- `level`: `error`, `warn`, `info`, `debug` (default: `error`)
- `limit`: Number of entries (default: 100, max: 1000)
- `since`: ISO timestamp filter (optional)

#### Response

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_123456",
        "timestamp": "2025-10-22T16:25:00Z",
        "level": "error",
        "service": "ai_service",
        "message": "OpenAI API rate limit exceeded",
        "context": {
          "request_id": "req_789",
          "user_id": "user_456",
          "model": "gpt-4"
        },
        "stack_trace": "Error: 429 Too Many Requests..."
      }
    ],
    "total_count": 1,
    "has_more": false
  }
}
```

---

## Error Response Format

所有API错误响应遵循统一格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "field_name",
      "value": "invalid_value",
      "validation_rules": ["rule1", "rule2"]
    },
    "request_id": "req_123456"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-----------|
| `UNAUTHORIZED` | 401 | 认证失败或令牌过期 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务暂时不可用 |

---

## Rate Limiting

### 请求限制

- **认证API**: 100 requests/hour per IP
- **用户API**: 1000 requests/hour per user
- **开发环境API**: 500 requests/hour
- **监控API**: 200 requests/hour

### 限制头信息

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1698614400
```

---

## API Versioning

### 版本策略

- 当前版本：v1
- 版本在URL中指定：`/v1/...`
- 向后兼容性：至少支持2个主版本
- 废弃通知：在响应头中提前3个月通知

### 版本头信息

```http
API-Version: v1
Deprecated: false
Sunset: 2026-10-22
```

---

## Testing

### 测试环境

- **测试API地址**: `https://api-staging.mindnote.com/v1`
- **测试账号**: `test@example.com` / `testpassword123`
- **测试令牌**: `test_token_...`

### 测试数据

```bash
# 创建测试用户
curl -X POST https://api-staging.mindnote.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"testpassword123","full_name":"Test User"}'
```

---

## API Contracts Status

**Status**: ✅ Specification Complete
**Base URL**: `https://api.mindnote.com/v1`
**Authentication**: JWT Bearer Token
**Documentation**: OpenAPI 3.0 specification available
**Testing**: Integration tests configured

**Next Steps**:
1. Generate quickstart guide
2. Create development task list
3. Implement API documentation website

---

*API contracts support secure, scalable development environment configuration with comprehensive monitoring and error handling.*