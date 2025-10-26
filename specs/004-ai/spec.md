# Feature Specification: AI内容分析集成

**Feature Branch**: `004-ai` **Created**: 2025-01-25 **Status**: Draft **Input**:
AI内容分析集成 - 实现文本嵌入、自动分类和标签提取功能

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 智能文本分析 (Priority: P1)

当笔记内容变化超过阈值时，系统能够智能触发自动分析，提取关键信息，包括语义理解、情感分析、关键概念识别，并生成内容摘要。

**Why this priority**: 这是MindNote的AI原生核心价值，是实现智能笔记管理和知识关联的基础功能。

**Independent
Test**: 可以通过创建测试笔记独立验证AI分析结果，包括生成的摘要质量和提取的关键概念准确性。

**Acceptance Scenarios**:

1. **Given** 用户输入了新的笔记内容，**When** 保存笔记时，**Then** 系统自动生成内容摘要和关键概念
2. **Given** 用户修改了已有笔记内容，**When** 重新分析时，**Then** 系统更新相关的AI分析结果
3. **Given** 笔记内容为空或过短，**When** 尝试分析时，**Then** 系统给出适当的提示而不进行强制分析

---

### User Story 2 - 自动内容分类 (Priority: P1)

基于笔记内容的语义分析，系统能够自动将笔记分配到最合适的20+种内容分类中，如技术文档、学习笔记、会议记录、创意想法等。

**Why this
priority**: 自动分类帮助用户快速组织大量笔记，提高信息检索效率，是智能知识管理的核心功能。

**Independent Test**: 可以通过测试不同类型的内容样本，验证分类准确性和分类建议的质量。

**Acceptance Scenarios**:

1. **Given** 用户创建了技术类笔记内容，**When** AI分析时，**Then** 系统建议技术相关的分类标签
2. **Given** 用户创建了个人反思类笔记，**When** AI分析时，**Then** 系统建议个人成长或思考相关的分类
3. **Given** 笔记内容混合多种类型，**When** 分类时，**Then**
   系统能够识别主要类型并给出合适的权重分配

---

### User Story 3 - 智能标签生成 (Priority: P1)

基于笔记内容的关键词提取和概念识别，系统能够自动生成3-5个相关标签，用户可以编辑、删除或自定义标签。

**Why this priority**: 智能标签系统是实现笔记关联和知识图谱的基础，极大提升信息组织效率。

**Independent Test**: 可以通过验证生成标签的相关性和准确性来独立测试此功能。

**Acceptance Scenarios**:

1. **Given** 笔记包含React相关技术内容，**When** 标签生成时，**Then** 系统自动生成["react",
   "javascript", "frontend"]等相关标签
2. **Given** 用户不满意自动生成的标签，**When** 用户编辑标签时，**Then**
   系统允许用户修改并保留用户偏好
3. **Given** 笔记内容涉及多个领域，**When** 标签生成时，**Then** 系统提供跨领域的标签组合

---

### User Story 4 - 向量化存储 (Priority: P1)

将笔记内容转换为高维向量嵌入，存储在支持向量搜索的数据库中，为后续的相似度计算和关系发现奠定基础。

**Why this priority**: 向量化是实现语义搜索和笔记关系发现的技术基础，是AI功能的核心支撑。

**Independent Test**: 可以通过验证向量生成和存储的完整性、检索准确性来独立测试此功能。

**Acceptance Scenarios**:

1. **Given** 用户保存了新的笔记内容，**When** 处理时，**Then** 系统生成对应的向量嵌入并持久化存储
2. **Given** 用户更新了笔记内容，**When** 重新处理时，**Then** 系统更新对应的向量嵌入
3. **Given** 需要查找相似笔记，**When** 向量搜索时，**Then** 系统能够基于向量相似度返回相关笔记

---

### User Story 5 - AI分析结果展示 (Priority: P2)

在笔记界面中优雅地展示AI分析结果，包括摘要、分类标签、关键概念，并提供交互式的编辑和确认功能。

**Why this priority**: 用户需要能够理解和控制AI的分析结果，确保AI功能真正服务于用户需求。

**Independent Test**: 可以通过验证UI界面的交互性和信息展示效果来独立测试此功能。

**Acceptance Scenarios**:

1. **Given** AI分析完成，**When** 展示结果时，**Then** 用户界面清晰显示摘要、分类和标签
2. **Given** 用户想要修改AI建议，**When** 点击编辑时，**Then** 系统提供便捷的编辑界面
3. **Given** AI分析结果不理想，**When** 用户重新分析时，**Then** 系统提供重新分析的选项

### Edge Cases

**AI服务相关的边界情况**:

- 当AI API服务不可用或超时时，系统应该优雅降级，提供基础功能并明确告知用户当前状态
- 当内容过短（少于10个字符）时，系统应该跳过AI分析并给出适当提示
- 当内容过长（超过8000字符）时，系统应该分段处理或提示用户精简内容

**内容处理边界情况**:

- 当内容包含非文本字符（如纯代码、特殊符号）时，系统应该过滤并提取可分析部分
- 当内容包含多语言混合时，系统应该识别主语言并相应处理
- 当用户重复保存相同内容时，系统应该避免重复的AI分析请求

**性能和成本控制**:

- 当AI分析成本过高时，系统应该有预算控制机制
- 当分析请求过于频繁时，系统应该有速率限制保护
- 当存储空间不足时，系统应该清理旧的向量数据

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST 自动分析笔记内容的语义并生成摘要（不超过100字）
  - **技术实现**: Vercel AI SDK + OpenAI GPT-4 Turbo + 自定义摘要prompt工程
  - **核心组件**: `src/lib/ai/summarizer.ts`, `src/lib/ai/prompt-templates.ts`
  - **数据结构**: 摘要结果存储在AIAnalysis表，包含token使用量和质量评分
  - **触发机制**: 内容变化超过30%或长度超过100字时自动触发
  - **缓存策略**: 相同内容摘要缓存24小时，减少重复API调用

- **FR-002**: System MUST 支持多种AI模型集成，包括OpenAI
  GPT、Claude、DeepSeek、Qwen、Kimi、GLM、自定义模型、ollama等
  - **技术实现**: Vercel AI SDK统一接口 + 适配器模式 + 环境配置管理
  - **核心组件**: `src/lib/ai/providers/`, `src/lib/ai/model-router.ts`
  - **配置管理**: `src/lib/ai/config.ts` 统一管理API密钥和模型参数
  - **降级策略**: 主模型不可用时自动切换到备用模型
  - **成本优化**: 根据任务复杂度智能选择最适合的模型

- **FR-003**: System MUST 自动提取3-5个相关标签，准确率 > 85%（基于标签相关性的语义相似度计算）
  - **技术实现**: OpenAI Embeddings + 余弦相似度计算 + 标签候选库匹配
  - **核心组件**: `src/lib/ai/tag-extractor.ts`, `src/lib/ai/similarity-calculator.ts`
  - **算法流程**: 文本向量化 → 与现有标签库计算相似度 → 过滤低相关性标签 → 返回Top 5
  - **质量保证**: 用户反馈机制持续优化标签提取准确性
  - **本地缓存**: 常用标签向量本地缓存，提升响应速度

- **FR-004**: System MUST 支持20+种预定义内容分类的自动识别
  - **技术实现**: 少样本学习 + 分类prompt工程 + 置信度阈值过滤
  - **核心组件**: `src/lib/ai/classifier.ts`, `src/lib/ai/category-definitions.ts`
  - **分类体系**: 技术文档、学习笔记、会议记录、创意想法、项目管理等20+类别
  - **置信度机制**: 分类结果包含置信度分数，低于阈值则建议人工分类
  - **持续学习**: 用户纠正反馈用于优化分类模型

- **FR-005**: System MUST 将文本内容转换为向量嵌入用于语义搜索（使用PostgreSQL + pgvector扩展）
  - **技术实现**: OpenAI text-embedding-3-small + pgvector向量存储 + 向量索引优化
  - **核心组件**: `src/lib/ai/embedding-generator.ts`, `src/lib/vector/search.ts`
  - **数据库设计**: embeddings表使用1536维向量，创建IVFFlat索引提升查询性能
  - **批量处理**: 支持向量化批量生成，降低API调用成本
  - **增量更新**: 内容变化时仅重新计算受影响的向量

- **FR-006**: System MUST 提供AI分析结果的编辑和确认界面
  - **技术实现**: React组件 + 差异对比显示 + 一键确认功能
  - **核心组件**: `src/components/ai/analysis-review.tsx`, `src/components/ai/diff-viewer.tsx`
  - **用户体验**: 高亮显示AI建议的变更，支持部分接受和修改
  - **版本控制**: 保留AI分析历史版本，支持回滚和对比
  - **快捷操作**: 提供键盘快捷键快速确认或拒绝建议

- **FR-007**: System MUST 在AI服务不可用时优雅降级
  - **技术实现**: 断路器模式 + 本地规则引擎 + 缓存降级方案
  - **核心组件**: `src/lib/ai/circuit-breaker.ts`, `src/lib/ai/fallback-engine.ts`
  - **降级策略**: AI摘要 → 关键词提取；AI分类 → 基于规则的分类；AI标签 → 关键词匹配
  - **健康检查**: 实时监控AI服务状态，自动切换降级模式
  - **用户通知**: 清晰提示用户当前使用降级模式

- **FR-008**: System MUST 支持AI分析结果的重新处理和更新
  - **技术实现**: 异步任务队列 + 增量更新机制 + 批量重处理
  - **核心组件**: `src/lib/ai/reprocessor.ts`, `src/lib/ai/task-queue.ts`
  - **触发条件**: 模型升级、用户反馈、定期质量检查
  - **优先级管理**: 重要内容优先处理，避免系统过载
  - **进度通知**: 实时显示重处理进度，支持暂停和恢复

- **FR-009**: System MUST 实现AI请求的速率限制和成本控制（智能控制：根据内容重要性动态分配预算）
  - **技术实现**: 令牌桶算法 + Redis计数器 + 动态预算分配
  - **核心组件**: `src/lib/ai/rate-limiter.ts`, `src/lib/ai/budget-manager.ts`
  - **成本策略**: 根据用户等级、内容重要性、时间优先级动态分配预算
  - **监控告警**: 成本超限实时告警，自动调整处理策略
  - **使用报告**: 详细的成本使用报告和分析

- **FR-010**: System MUST 记录AI分析日志用于质量监控
  - **技术实现**: 结构化日志 + ELK Stack集成 + 质量指标计算
  - **核心组件**: `src/lib/ai/logger.ts`, `src/lib/ai/quality-monitor.ts`
  - **日志内容**: 请求响应时间、token使用量、成本、用户反馈、错误信息
  - **质量指标**: 自动计算摘要质量、分类准确率、标签相关性等KPI
  - **分析报告**: 定期生成AI服务质量报告，支持趋势分析

### Key Entities

- **AIAnalysis**: 笔记的AI分析结果，包含摘要、分类、标签、关键概念、向量嵌入
- **EmbeddingVector**: 笔记内容的向量表示，用于语义相似度计算
- **ContentCategory**: 预定义的内容分类体系，包含分类名称、描述、颜色标识
- **Tag**: 用户和AI生成的标签系统，支持层级关系和权重
- **AnalysisLog**: AI分析操作的详细日志，包含请求时间、成本、结果质量
- **AIProvider**: AI服务提供商配置，包含API密钥、模型设置、限制规则

## Clarifications

### Session 2025-10-25

- Q: AI模型集成优先级和策略是什么？ → A: 支持OpenAI
  GPT、Claude、DeepSeek、Qwen、Kimi、GLM、自定义模型、ollama等多种模型
- Q: 标签准确率测试标准是什么？ → A: 基于标签相关性的语义相似度计算
- Q: 向量存储方案是什么？ → A: PostgreSQL + pgvector扩展
- Q: AI分析触发时机是什么？ → A: 智能触发：内容变化超过阈值时自动分析
- Q: 成本控制策略是什么？ → A: 智能控制：根据内容重要性动态分配预算

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: AI分析响应时间 < 3秒（90%的请求）
- **SC-002**: 自动分类准确率 > 85%（基于人工标注样本验证）
- **SC-003**: 标签提取相关性 > 90%（用户满意度调查）
- **SC-004**: 摘要生成质量评分 > 4.0/5.0（用户评分）
- **SC-005**: 向量搜索召回率 > 95%（相似笔记发现测试）
- **SC-006**: 系统可用性 > 99.5%（AI服务降级后）
- **SC-007**: AI分析成本控制在 $0.01/笔记以内
- **SC-008**: 90%的用户在首次使用后认为AI功能有价值
- **SC-009**: 用户编辑AI建议的比例 < 30%（表明AI建议质量高）
- **SC-010**: 支持并发AI分析请求数 > 1000/分钟

## Constitution Compliance Check

### I. AI-Native Development ✅

- ✅ AI集成是核心功能，不是附加功能
- ✅ 数据模型支持向量嵌入和语义分析
- ✅ API设计预留了多AI服务接口
- ✅ 用户交互支持智能对话和辅助

### II. Specification-Driven Development ✅

- ✅ 使用Specify框架创建详细功能规格
- ✅ 包含完整的用户故事和验收标准
- ✅ 定义了明确的成功指标
- ✅ 独立可测试的功能模块

### III. Test-First Engineering ✅

- ✅ 每个用户故事都有独立测试方案
- ✅ 包含边界情况和错误处理测试
- ✅ 定义了可量化的质量指标
- ✅ AI功能有专门的测试策略

### IV. Observability & Performance First ✅

- ✅ AI功能响应时间 < 3秒
- ✅ 包含完整的日志记录（AnalysisLog）
- ✅ 性能监控和成本控制机制
- ✅ 优雅降级和错误处理

### V. Documentation-Code Synchronization ✅

- ✅ 详细的规格说明文档
- ✅ 数据模型和API接口定义
- ✅ 用户体验和技术实现文档
- ✅ 可观测性和监控方案
