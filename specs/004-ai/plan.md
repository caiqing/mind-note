# Implementation Plan: AI内容分析集成

**Branch**: `004-ai` | **Date**: 2025-10-25 | **Spec**: [link](./spec.md) **Input**: Feature
specification from AI内容分析集成 - 实现文本嵌入、自动分类和标签提取功能

**Note**: This template is filled in by the `/speckit.plan` command. See
`.specify/templates/commands/plan.md` for the execution workflow.

## Summary

基于AI原生开发原则，本功能将为MindNote智能笔记应用集成多模型AI分析能力，实现自动文本摘要、智能分类、标签提取和向量化存储。核心技术栈采用Next.js
15 + React 19 + TypeScript，PostgreSQL + pgvector作为向量存储，Vercel AI
SDK统一多模型接口。系统将支持OpenAI
GPT、Claude、DeepSeek、Qwen、Kimi、GLM等多种AI模型，并通过智能触发机制实现内容变化时的自动分析。

## Technical Context

**Language/Version**: TypeScript 5.7+ (Next.js 15 + React 19) **Primary Dependencies**: Vercel AI
SDK, OpenAI SDK, Anthropic SDK, pgvector, Prisma ORM **Storage**: PostgreSQL 15+ with pgvector
extension for vector embeddings **Testing**: Vitest + React Testing Library + Playwright
E2E, 单元测试覆盖率>90% **Target Platform**: Web (Vercel deployment) with global CDN support
**Project Type**: Full-stack web application with AI-native architecture **Performance Goals**:
API响应<100ms, AI功能响应<3秒, 支持1万并发用户 **Constraints**: 系统可用性>99.9%,
AI分析成本控制在$0.01/笔记以内
**Scale/Scope**: 支持1万并发用户，100万+笔记向量存储，20+种内容分类，多AI模型集成

## Functional Requirements Technical Mapping

| FR ID      | 功能描述           | 技术栈                             | 核心组件                           | 实现文件                                                                     |
| ---------- | ------------------ | ---------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| **FR-001** | 自动内容摘要生成   | Vercel AI SDK + OpenAI GPT-4 Turbo | Summarizer, PromptTemplates        | `src/lib/ai/summarizer.ts`, `src/lib/ai/prompt-templates.ts`                 |
| **FR-002** | 多AI模型集成       | Vercel AI SDK + 适配器模式         | ModelRouter, AIProviders           | `src/lib/ai/providers/*`, `src/lib/ai/model-router.ts`                       |
| **FR-003** | 智能标签提取       | OpenAI Embeddings + 余弦相似度     | TagExtractor, SimilarityCalculator | `src/lib/ai/tag-extractor.ts`, `src/lib/ai/similarity-calculator.ts`         |
| **FR-004** | 自动内容分类       | 少样本学习 + 分类prompt工程        | Classifier, CategoryDefinitions    | `src/lib/ai/classifier.ts`, `src/lib/ai/category-definitions.ts`             |
| **FR-005** | 向量化语义搜索     | OpenAI Embeddings + pgvector       | EmbeddingGenerator, VectorSearch   | `src/lib/ai/embedding-generator.ts`, `src/lib/vector/search.ts`              |
| **FR-006** | AI分析结果编辑界面 | React + 差异对比显示               | AnalysisReview, DiffViewer         | `src/components/ai/analysis-review.tsx`, `src/components/ai/diff-viewer.tsx` |
| **FR-007** | 优雅降级机制       | 断路器模式 + 本地规则引擎          | CircuitBreaker, FallbackEngine     | `src/lib/ai/circuit-breaker.ts`, `src/lib/ai/fallback-engine.ts`             |
| **FR-008** | 结果重新处理       | 异步任务队列 + 增量更新            | Reprocessor, TaskQueue             | `src/lib/ai/reprocessor.ts`, `src/lib/ai/task-queue.ts`                      |
| **FR-009** | 成本控制与速率限制 | 令牌桶算法 + Redis计数器           | RateLimiter, BudgetManager         | `src/lib/ai/rate-limiter.ts`, `src/lib/ai/budget-manager.ts`                 |
| **FR-010** | 质量监控日志       | 结构化日志 + ELK Stack             | Logger, QualityMonitor             | `src/lib/ai/logger.ts`, `src/lib/ai/quality-monitor.ts`                      |

### 技术架构决策理由

1. **Vercel AI SDK选择**: 提供统一的AI模型接口，简化多模型集成复杂性，符合FR-002需求
2. **OpenAI GPT-4 Turbo**: 在摘要质量和成本之间达到最佳平衡，满足FR-001的质量要求
3. **pgvector向量存储**: 与PostgreSQL深度集成，支持复杂向量查询，完美支持FR-005
4. **断路器模式**: 确保AI服务故障时系统可用性，满足FR-007的降级要求
5. **异步任务队列**: 支持大规模AI分析任务处理，符合FR-008的重处理需求
6. **令牌桶算法**: 精确控制API调用频率和成本，实现FR-009的智能成本控制

## Functional Requirements Technical Mapping

| FR ID | 功能描述 | 技术栈 | 核心组件 | 实现文件 |
|-------|----------|--------|----------|----------|
| **FR-001** | 自动内容摘要生成 | Vercel AI SDK + OpenAI GPT-4 Turbo | Summarizer, PromptTemplates | `src/lib/ai/summarizer.ts`, `src/lib/ai/prompt-templates.ts` |
| **FR-002** | 多AI模型集成 | Vercel AI SDK + 适配器模式 | ModelRouter, AIProviders | `src/lib/ai/providers/*`, `src/lib/ai/model-router.ts` |
| **FR-003** | 智能标签提取 | OpenAI Embeddings + 余弦相似度 | TagExtractor, SimilarityCalculator | `src/lib/ai/tag-extractor.ts`, `src/lib/ai/similarity-calculator.ts` |
| **FR-004** | 自动内容分类 | 少样本学习 + 分类prompt工程 | Classifier, CategoryDefinitions | `src/lib/ai/classifier.ts`, `src/lib/ai/category-definitions.ts` |
| **FR-005** | 向量化语义搜索 | OpenAI Embeddings + pgvector | EmbeddingGenerator, VectorSearch | `src/lib/ai/embedding-generator.ts`, `src/lib/vector/search.ts` |
| **FR-006** | AI分析结果编辑界面 | React + 差异对比显示 | AnalysisReview, DiffViewer | `src/components/ai/analysis-review.tsx`, `src/components/ai/diff-viewer.tsx` |
| **FR-007** | 优雅降级机制 | 断路器模式 + 本地规则引擎 | CircuitBreaker, FallbackEngine | `src/lib/ai/circuit-breaker.ts`, `src/lib/ai/fallback-engine.ts` |
| **FR-008** | 结果重新处理 | 异步任务队列 + 增量更新 | Reprocessor, TaskQueue | `src/lib/ai/reprocessor.ts`, `src/lib/ai/task-queue.ts` |
| **FR-009** | 成本控制与速率限制 | 令牌桶算法 + Redis计数器 | RateLimiter, BudgetManager | `src/lib/ai/rate-limiter.ts`, `src/lib/ai/budget-manager.ts` |
| **FR-010** | 质量监控日志 | 结构化日志 + ELK Stack | Logger, QualityMonitor | `src/lib/ai/logger.ts`, `src/lib/ai/quality-monitor.ts` |

### 技术架构决策理由

1. **Vercel AI SDK选择**: 提供统一的AI模型接口，简化多模型集成复杂性，符合FR-002需求
2. **OpenAI GPT-4 Turbo**: 在摘要质量和成本之间达到最佳平衡，满足FR-001的质量要求
3. **pgvector向量存储**: 与PostgreSQL深度集成，支持复杂向量查询，完美支持FR-005
4. **断路器模式**: 确保AI服务故障时系统可用性，满足FR-007的降级要求
5. **异步任务队列**: 支持大规模AI分析任务处理，符合FR-008的重处理需求
6. **令牌桶算法**: 精确控制API调用频率和成本，实现FR-009的智能成本控制

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real directories captured
above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |

## Progress Tracking

### Phase 0: Research ✅ COMPLETED

- [x] AI模型集成研究 - 完成6种主流模型对比分析
- [x] 向量存储方案研究 - 确定PostgreSQL + pgvector方案
- [x] 智能触发策略研究 - 确定基于内容变化阈值的触发机制
- [x] 成本控制策略研究 - 制定智能预算分配策略
- [x] 技术风险评估 - 识别并制定缓解措施

**输出**: `research.md` - 完整的技术研究报告

### Phase 1: Design ✅ COMPLETED

- [x] 数据模型设计 - 完成6个核心实体设计
- [x] 数据库Schema设计 - 完成表结构和索引设计
- [x] API契约设计 - 完成7个主要API端点设计
- [x] AI提供商配置设计 - 完成多模型集成配置
- [x] 项目结构设计 - 确定Next.js全栈架构

**输出**:

- `data-model.md` - 完整的数据模型设计
- `contracts/` - API契约和配置文档
- `quickstart.md` - 开发快速开始指南

### Phase 2: Implementation Planning ⏳ PENDING

- [ ] 任务分解和优先级排序
- [ ] 开发里程碑定义
- [ ] 测试策略制定
- [ ] 部署计划制定

**输出**: `tasks.md` - 详细的开发任务列表

### 总体进度

- **完成度**: 67% (Phase 0 + Phase 1 完成)
- **下一阶段**: 执行 `/speckit.tasks` 生成详细任务列表
- **预计完成时间**: Phase 2 预计需要2-3小时

## 项目结构

### Documentation (this feature)

```text
specs/004-ai/
├── plan.md              # Implementation plan (✅ Completed)
├── research.md          # Technical research (✅ Completed)
├── data-model.md        # Data model design (✅ Completed)
├── quickstart.md        # Development guide (✅ Completed)
├── contracts/           # API contracts (✅ Completed)
│   ├── ai-analysis-api.md
│   └── ai-provider-config.md
└── tasks.md             # Development tasks (⏳ Pending)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── ai/
│   │   ├── services/     # AI服务实现
│   │   ├── providers/    # AI提供商集成
│   │   └── config/       # AI配置管理
│   ├── vector/           # 向量存储服务
│   └── database/         # 数据库服务
├── components/
│   └── ai/              # AI功能组件
└── app/
    └── api/
        └── v1/
            └── ai/      # AI API路由
```
