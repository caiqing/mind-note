# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

**版本**: v1.0.1 | **更新日期**: 2025-10-22

## AI协作指导原则

### 核心思维方法

- **第一性原理思维**：透过现象看本质，回归问题本源
- **渐进式沟通**：由易到难，先用通俗易懂的类比法举例，再逐步过渡到深入洞见
- **结构化表达**：运用SMART、RIDE、PREP、5W2H、PDCA等方法说明关键问题
- **可视化呈现**：整合思维导图、架构图、类图、时序图、流程图、状态图、实体关系图、甘特图、饼图、用户旅程图、象限图、需求图、时间线、数据包图、看板图、雷达图、GitGraph图、ZenUML图、Sankey图、C4
  Diagrams、XY Chart、Block Diagrams等Mermaid图表进行讲解
- **需求描述**：使用EARS语法简明、清晰地描述软件需求
- **持续学习**：充满好奇心，基于已有知识体系联网搜索最新权威性资料，进行启发性联想，结合实际案例探索与分析，不断提升思想深度及维度

### 12个AI协作范式

1. **双向费曼学习法**：像和AI互相提问、解释，检验自己是否真正理解知识
2. **工具扩展**：用AI自动化重复性任务，比如整理表格、生成报告
3. **智能图示**：让AI帮你画思维导图、流程图，把抽象问题变得直观
4. **记忆脑**：AI帮你存储、检索知识，像随身携带的"第二大脑"
5. **精准表达**：用AI优化你的语言表达，让沟通更高效
6. **批判性思考**：和AI辩论，发现盲点，提升思辨能力
7. **创意激发**：AI参与头脑风暴，提出你没想到的点子
8. **流程优化**：让AI分析并优化你的工作流程
9. **个性化学习**：AI根据你的兴趣和短板，定制学习路径
10. **情绪陪伴**：AI能识别你的情绪，提供适当反馈和建议
11. **跨界融合**：AI帮你把不同领域的知识串联起来，产生新洞见
12. **持续进化**：通过和AI不断互动，持续提升自己的能力边界

### 如何激活特定的协作范式

使用以下触发短语来让AI采用特定的协作方式：

- "请用第一性原理来分析..." - 激活第一性原理思维
- "用渐进式方式解释，从简单的类比开始..." - 激活渐进式沟通
- "请用可视化方式呈现，画个流程图/架构图..." - 激活可视化呈现
- "我们用双向费曼学习法，你问我答..." - 激活双向费曼学习法
- "请用SMART框架来分析这个问题..." - 激活结构化表达
- "帮我批判性地思考这个方案..." - 激活批判性思考

### 回复结构标准

每个重要回复都应包含：

1. **★ Insight**：2-3个关键教育性要点
2. **核心内容**：使用适当的协作范式呈现
3. **实践示例**：结合具体案例或代码示例
4. **总结**：用PREP方法（Point-Reason-Example-Point）收尾

### 文档命名与存储规范

为确保文档管理的统一性和可维护性，所有交互过程中产生的报告文档必须遵循以下规范：

#### 报告文档命名规则

- **文件命名**：全部使用小写字母，单词间用连字符(-)分隔
- **文件格式**：`docs/reports/主题描述-report.md`
- **日期格式**：可选前缀 `YYYYMMDD-主题描述-report.md`

#### 标准报告类型

- `analysis-report.md` - 分析报告
- `migration-test-report.md` - 迁移测试报告
- `feature-analysis-report.md` - 功能分析报告
- `system-review-report.md` - 系统审查报告
- `performance-report.md` - 性能分析报告
- `security-assessment-report.md` - 安全评估报告
- `code-review-report.md` - 代码审查报告
- `architecture-analysis-report.md` - 架构分析报告
- `user-research-report.md` - 用户研究报告
- `technical-investigation-report.md` - 技术调研报告

#### 文档目录结构

```text
docs/
├── reports/                 # 所有报告文档统一存储目录
│   ├── analysis-report.md
│   ├── migration-test-report.md
│   ├── 20251008-feature-analysis-report.md
│   └── technical-investigation-report.md
├── collaboration/           # AI协作会话记录
│   ├── index.md
│   └── yyyy-mm-dd-session-topic.md
└── README.md               # 文档索引说明
```

## 项目概述

这是一个智能笔记应用项目 -
**MindNote**，是一个基于Specify框架的项目模板，用于规范化的功能开发流程。项目使用了一套完整的开发工作流，从功能规格说明到实现计划再到任务执行。

### 核心功能描述

MindNote 是一个智能笔记应用，支持：

- 随手记录各种类型的信息
- 系统自动归类打标签进行内容标注
- 后台定期对所有笔记进行关联性分析
- 通过关系图谱展现笔记关联关系
- 每个笔记节点以摘要卡片形式展现（不超过100字）
- 附上色彩区分度高且美观的内容分类标签
- 提供相关笔记对话功能
- 基于相关笔记内容与AI进行讨论
- AI启用联网搜索Deep Research功能搜集整理最新相关资料
- 一键基于相关对话报告生成在线播客
- 播客设置：图标、背景、时长、对话任务形象、主播音频角色、音色等
- 生成的播客音频支持一键分享为云链接

## 核心工具与命令

### 功能开发工作流命令

- `/speckit.specify [功能描述]` - 创建新功能分支和规格说明文档
  - 执行 `.specify/scripts/bash/create-new-feature.sh`
  - 生成格式为 `[###-feature-name]` 的分支
  - 在 `specs/[###-feature-name]/` 目录下创建规格说明模板

- `/speckit.clarify` - 针对功能规格中的不明确之处提出澄清问题
  - 用于完善功能规格，减少实现过程中的返工

- `/speckit.plan [实现细节]` - 基于功能规格创建实现计划
  - 执行 `.specify/scripts/bash/setup-plan.sh`
  - 生成研究文档、数据模型、API契约等设计文档
  - 需要先完成clarify阶段（如果有不明确之处）

- `/speckit.tasks` - 基于实现计划生成具体的开发任务
  - 创建依赖有序的任务列表
  - 按照TDD原则组织任务（测试先行）

- `/speckit.analyze` - 跨文档一致性分析和质量检查
- `/speckit.implement` - 执行实现计划中的所有任务
- `/speckit.constitution` - 创建或更新项目章程文档
- `/save` - 保存当前协作会话，生成结构化文档并更新索引

### 增强版协作命令系统

推荐使用增强版命令替代原生命令，获得更好的协作体验：

```bash
# 增强版命令（推荐）
./.specify/optimization/enhanced-collaboration.sh start <范式> <主题>
./.specify/optimization/enhanced-collaboration.sh save
./.specify/optimization/enhanced-collaboration.sh health

# 原生命令（兼容）
/collaborate <范式> <主题>
/save
```

### 重要脚本

- `.specify/scripts/bash/create-new-feature.sh` - 创建新功能分支和规格文档
- `.specify/scripts/bash/setup-plan.sh` - 设置实现计划环境
- `.specify/scripts/bash/update-agent-context.sh` - 更新AI助手上下文文件
- `.specify/scripts/bash/collaboration-session-automation.sh` - AI协作会话自动化管理
- `.specify/scripts/bash/collaboration-quick-start.sh` - 协作会话快速启动器
- `.specify/scripts/bash/update-collaboration-index.py` - 协作会话索引更新工具
- `.specify/optimization/enhanced-collaboration.sh` - 增强版AI协作系统

### 系统健康检查

定期运行系统健康检查确保最佳性能：

```bash
./.specify/optimization/enhanced-collaboration.sh health
```

### 错误诊断工具

遇到问题时使用智能错误诊断：

```bash
./.specify/optimization/error-handler.sh analyze "错误信息"
./.specify/optimization/error-handler.sh auto-fix
```

### 内容完整性验证

验证重要内容的完整性：

```bash
./.specify/optimization/content-validator.sh batch-validate
```

## 项目架构

### 目录结构

```
.specify/
├── memory/           # 项目章程和长期记忆
│   └── constitution.md
├── scripts/          # 自动化脚本
│   └── bash/
├── optimization/     # 增强版协作系统工具
│   ├── enhanced-collaboration.sh
│   ├── content-validator.sh
│   ├── error-handler.sh
│   └── improved-content-handler.sh
└── templates/        # 文档模板
    ├── spec-template.md
    ├── plan-template.md
    ├── tasks-template.md
    └── agent-file-template.md

.claude/
├── commands/         # Claude Code 斜杠命令定义
│   ├── ai.collab.md
│   ├── specify.md
│   ├── clarify.md
│   ├── plan.md
│   ├── tasks.md
│   ├── analyze.md
│   ├── implement.md
│   ├── constitution.md
│   └── save.md
├── scripts/          # 状态栏脚本
└── settings.local.json

specs/               # 功能规格和实现文档（动态生成）
└── [###-feature-name]/
    ├── spec.md       # 功能规格说明
    ├── plan.md       # 实现计划
    ├── research.md   # 研究文档
    ├── data-model.md # 数据模型
    ├── quickstart.md # 快速开始指南
    ├── contracts/    # API契约
    └── tasks.md      # 开发任务列表

docs/
├── collaboration/    # AI协作会话记录
│   ├── index.md      # 协作会话索引
│   ├── YYYYMMDD-主题描述.md  # 具体的协作会话记录
│   └── README.md     # 协作会话说明文档
├── reports/          # 分析报告存放目录
│   └── [主题描述]-report.md
├── ai-collaboration-guide.md  # AI协作实践指南
└── CHANGELOG.md      # 项目变更日志
```

### 开发流程原则

1. **规格驱动** - 所有功能从详细的规格说明开始
2. **测试先行** - 遵循TDD原则，先写失败的测试再实现
3. **契约优先** - 先定义API契约和数据模型
4. **文档同步** - 设计文档与代码实现保持同步
5. **章程合规** - 所有实现必须符合项目章程要求

## 文档模板系统

### 规格说明模板 (spec-template.md)

- 用户场景和测试用例
- 功能需求（FR-001格式）
- 关键实体定义
- 审查检查清单

### 实现计划模板 (plan-template.md)

- 技术上下文分析
- 章程合规检查
- 分阶段实施策略
- 项目结构设计

### 任务列表模板 (tasks-template.md)

- 依赖关系图
- 并行执行标记 [P]
- TDD任务组织
- 验证检查清单

## AI协作系统

### 协作会话管理

- **启动协作**：使用 `/collaborate [范式] [主题]` 开始AI协作会话
- **保存会话**：使用 `/save` 保存当前协作会话为结构化文档
- **自动化记录**：AI自动记录讨论内容、关键洞察和产出成果
- **索引管理**：自动生成和维护协作会话索引，便于查阅

### 协作范式

支持12种AI协作范式，适用于不同场景：

- first-principles - 第一性原理思维分析
- progressive - 渐进式沟通（从类比到深入）
- visual - 可视化呈现（图表和流程图）
- creative - 创意激发头脑风暴
- critical - 批判性思考分析
- feynman - 双向费曼学习法
- smart - SMART结构化表达
- optimize - 流程优化建议
- ears - EARS需求描述方法
- evolve - 持续进化反馈
- fusion - 跨界知识融合
- learning - 个性化学习路径

### 协作文档结构

每个协作会话生成标准化的Markdown文档，包含：

- 会话元信息（ID、时间、范式、主题）
- 范式说明和协作方式
- 完整的讨论内容记录
- 关键洞察和核心发现
- 产出成果和具体交付物
- 行动要点和后续任务
- 结构化的知识总结

### 增强版协作特性

- **🛡️ 内容完整性保障** - Mermaid图表、代码块100%保护
- **🔧 智能错误处理** - 自动诊断和修复系统问题
- **⚡ 一键式操作** - 简化用户操作流程
- **📊 详细反馈** - 完整的操作状态和统计信息

## 开发最佳实践

### 功能开发

1. 始终从 `/speckit.specify` 开始新功能
2. 在技术实现不明确时使用 `/speckit.clarify`
3. 使用 `/speckit.plan` 进行详细设计规划
4. 通过 `/speckit.tasks` 获得具体开发任务
5. 定期运行 `/speckit.analyze` 检查一致性

### AI协作开发

1. 复杂问题分析：使用 `/collaborate first-principles` 进行深度分析
2. 架构设计讨论：使用 `/collaborate visual` 进行可视化设计
3. 创意头脑风暴：使用 `/collaborate creative` 激发创新想法
4. 知识学习掌握：使用 `/collaborate feynman` 进行教学相长
5. 完成后使用 `/save` 保存协作成果

### 文档管理

- 所有功能文档存储在 `specs/` 目录下
- AI协作文档存储在 `docs/collaboration/` 目录下
- 分析报告存储在 `docs/reports/` 目录下
- 使用版本化的分支命名 `[###-feature-name]`
- 保持设计文档与实现的同步
- 及时更新项目章程
- 使用 `/save` 保存AI协作成果

### 质量保证

- 每个功能都有完整的规格说明
- 实现前必须先通过测试阶段
- 遵循项目的核心开发原则
- 定期进行跨文档一致性检查
- 使用增强版协作系统确保内容完整性

## 项目技术栈

当前项目处于规划阶段，技术栈尚未确定。建议的技术方向：

- **前端框架**：React/Vue.js + TypeScript
- **后端框架**：Node.js/Python FastAPI
- **数据库**：PostgreSQL/MongoDB（主数据） + Redis（缓存）
- **AI集成**：Claude API/GPT API + 向量数据库
- **音频处理**：FFmpeg + Web Speech API
- **文件存储**：AWS S3/阿里云OSS
- **容器化**：Docker + Kubernetes
- **CI/CD**：GitHub Actions/GitLab CI

## 常见问题解答

### Q: 如何开始一个新的功能开发？

A: 使用 `/speckit.specify [功能描述]` 命令开始新功能，系统会自动创建分支和规格文档。

### Q: AI协作系统如何使用？

A: 使用 `/collaborate [范式] [主题]` 启动协作，完成后使用 `/save` 保存会话。

### Q: 如何确保内容完整性？

A: 使用增强版协作系统 `./.specify/optimization/enhanced-collaboration.sh`
可以确保Mermaid图表和代码块的完整性。

### Q: 项目章程在哪里定义？

A: 项目章程位于 `.specify/memory/constitution.md`，使用 `/speckit.constitution` 命令更新。

### Q: 如何查看之前的协作会话？

A: 所有协作会话保存在 `docs/collaboration/` 目录下，查看 `index.md` 索引文件。

### Q: 遇到系统问题怎么办？

A: 运行 `./.specify/optimization/error-handler.sh analyze "错误信息"` 进行智能诊断。

## 重要提醒

### 项目状态

**⚠️ 早期规划阶段** - 项目目前处于概念设计和架构规划阶段，具体的技术实现将在开发过程中逐步确定。

### 开发前必读

1. **先运行章程检查** - 开始任何开发前，请先阅读 `.specify/memory/constitution.md` 了解开发原则
2. **使用Specify工作流** - 所有功能开发必须通过 `/speckit.specify` 开始
3. **AI协作优先** - 复杂问题建议使用 `/collaborate first-principles` 进行深度分析

### 关键约束

- 所有功能必须遵循章程中的5大核心原则
- AI集成不是可选项，而是核心架构要求
- 必须使用规格驱动的开发流程
- 文档与代码必须保持同步

---

**注意**: 这个项目目前处于早期规划阶段，具体的技术实现细节将在后续的开发过程中逐步确定和完善。
