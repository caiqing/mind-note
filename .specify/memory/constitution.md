<!--
Sync Impact Report:
Version change: 0.0.0 → 1.0.0 (Major: Initial constitution creation)
Modified principles: N/A (new document)
Added sections: All sections (new document)
Removed sections: N/A
Templates requiring updates:
✅ .specify/templates/spec-template.md (validated - aligns with principles)
✅ .specify/templates/plan-template.md (validated - constitution check included)
✅ .specify/templates/tasks-template.md (validated - TDD principle reflected)
⚠ .claude/commands/*.md (pending review for generic agent guidance)
Follow-up TODOs: N/A (all placeholders filled)
-->

# MindNote Constitution

## Core Principles

### I. AI-Native Development (AI原生开发)

AI集成不是可选项，而是核心架构要求。所有功能设计必须以AI为第一优先级，确保AI能力深度融入产品核心体验，而非后期附加功能。具体要求：每个功能必须考虑AI增强的可能性；数据模型必须支持机器学习和语义分析；API设计必须预留AI服务集成接口；用户交互必须支持智能对话和辅助。

**理由**:
MindNote的竞争优势在于AI驱动的智能体验，只有AI原生开发才能确保产品的核心价值主张得到充分实现。

### II. Specification-Driven Development (规格驱动开发)

所有功能开发必须从详细的功能规格说明开始，使用Specify框架确保需求的完整性、一致性和可追溯性。禁止直接编码实现，必须遵循：规格先行→设计审查→任务分解→测试先行→实现验证的严格流程。每个功能必须有独立的用户故事、验收标准和成功指标。

**理由**: 规格驱动开发确保产品质量、减少返工、提高开发效率，特别是在复杂的AI功能开发中至关重要。

### III. Test-First Engineering (测试先行工程)

严格遵循TDD（测试驱动开发）原则，所有功能实现前必须先编写失败的测试用例。包括：单元测试覆盖率>90%，集成测试覆盖所有API接口，E2E测试覆盖主要用户流程。AI功能必须有专门的测试策略，包括模型性能测试、响应时间测试和结果质量评估。

**理由**: AI系统的复杂性和不确定性要求更严格的测试保障，确保产品质量和用户体验的稳定性。

### IV. Observability & Performance First (可观测性与性能优先)

系统必须具备完整的可观测性，包括：结构化日志、性能监控、错误追踪和用户行为分析。所有AI功能必须满足明确的性能指标：API响应<100ms，AI功能响应<3秒，支持1万并发用户。系统可用性>99.9%，具备自动扩缩容能力。

**理由**: AI应用的性能直接影响用户体验，可观测性是确保系统稳定运行和持续优化的基础。

### V. Documentation-Code Synchronization (文档代码同步)

设计文档与代码实现必须保持严格同步，任何代码变更都必须同步更新相关文档。包括：API文档、架构设计、数据模型、部署指南等。使用自动化工具确保文档一致性，定期进行跨文档一致性检查。

**理由**: 在快速迭代的AI项目中，文档与代码的脱节会导致开发效率下降和系统维护困难。

## Architecture & Technology Standards

### Technology Stack Requirements

- **前端**: Next.js 15 + React 19 + TypeScript (AI原生支持)
- **数据库**: PostgreSQL + Apache AGE + pgvector (混合关系图谱)
- **AI集成**: Vercel AI SDK (多模型统一接口)
- **部署**: Vercel + Railway + Cloudflare (全球CDN)

### Data & Privacy Standards

- 用户数据必须AES-256加密存储
- 遵循GDPR隐私合规要求
- 支持用户数据导出和删除
- 完整的操作审计日志

### Security Requirements

- 多层安全防护（网络+应用+数据）
- 基于角色的细粒度权限控制
- 端到端加密传输
- 定期安全评估和漏洞扫描

## Development Workflow Standards

### Specify Framework Compliance

所有功能开发必须严格遵循Specify框架：

1. `/speckit.specify` - 创建功能规格说明
2. `/speckit.clarify` - 澄清需求和假设
3. `/speckit.plan` - 制定详细实现计划
4. `/speckit.tasks` - 生成具体开发任务
5. `/speckit.analyze` - 跨文档一致性检查

### AI Collaboration Standards

复杂问题分析必须使用AI协作系统：

- 架构设计：`/collaborate visual` 可视化设计
- 深度分析：`/collaborate first-principles` 第一性原理分析
- 创意激发：`/collaborate creative` 头脑风暴
- 知识学习：`/collaborate feynman` 费曼学习法

### Quality Gates

- 代码覆盖率>90%
- 所有PR必须通过代码审查
- 性能测试必须达标
- 安全扫描无高危漏洞
- 文档完整性检查通过

## Governance

### Constitution Supremacy

本章程优先于所有其他开发实践和规范。在发生冲突时，以本章程为准。

### Amendment Procedure

- 任何章程修改需要提出详细的修改建议
- 必须包含修改理由、影响分析和实施计划
- 需要项目维护者投票通过（>2/3多数）
- 修改后必须更新所有相关模板和文档

### Versioning Policy

- 主版本号：重大原则变更或向后不兼容修改
- 次版本号：新增原则或重要内容扩展
- 修订版本号：澄清说明、文字修改、格式优化

### Compliance Review

- 每个PR必须验证章程合规性
- 定期进行章程执行情况审查
- 违反章程的实践必须有充分的理由说明
- 复杂性增加必须通过章程审查批准

### Enforcement

- 违反章程的代码不能合并到主分支
- 章程合规性是代码审查的必要条件
- 严重违反章程的情况可能导致分支被重置

**Version**: 1.0.0 | **Ratified**: 2025-10-23 | **Last Amended**: 2025-10-23
