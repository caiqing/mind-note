<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.0.1 (patch release for path reference corrections)
- Modified principles: N/A (no principle changes)
- Added sections: N/A (no new sections)
- Removed sections: N/A (no sections removed)
- Templates requiring updates: ✅ plan-template.md (path references fixed), ✅ spec-template.md (AI integration aligned), ✅ tasks-template.md (MindNote-specific tasks aligned)
- Command files updated: ✅ speckit.plan.md, ✅ speckit.analyze.md, ✅ speckit.constitution.md (all path references corrected)
- Follow-up TODOs: N/A (all path references now consistent)
-->

# MindNote Constitution

## Core Principles

### I. AI-First Development
All features MUST prioritize AI integration from the initial design phase. AI capabilities are not add-ons but core architectural concerns. System designs MUST include: AI model integration points, data preparation for AI processing, fallback mechanisms when AI services are unavailable, and explicit AI decision transparency for users. Rationale: MindNote's value proposition is AI-driven intelligence, not traditional note storage.

### II. Specification-Driven Engineering
Every feature MUST start with a complete specification document created via `/speckit.specify`. Specifications MUST include prioritized user stories, measurable success criteria, and explicit acceptance scenarios. Implementation MUST NOT begin until specification is approved and all clarification questions are resolved. Rationale: Complex AI features require thorough upfront analysis to avoid architectural rework.

### III. Test-First with AI Validation
TDD is mandatory for all code. Additionally, AI-dependent features MUST include AI-specific validation: test data for AI model training, mock AI services for unit testing, integration tests with real AI endpoints, and user acceptance testing focused on AI output quality. Red-Green-Refactor cycle MUST be followed with explicit AI behavior verification. Rationale: AI outputs are non-deterministic; rigorous testing ensures reliability.

### IV. Data Intelligence Integration
All data structures MUST support AI analysis capabilities. Note entities MUST include metadata fields for AI processing, content tagging, relationship tracking, and version history. Data models MUST support: vector embeddings for semantic search, graph structures for relationship mapping, and audit trails for AI decisions. Rationale: AI features require richly structured data to function effectively.

### V. Observability & AI Performance
All AI interactions MUST be observable and measurable. System MUST log: AI model performance metrics, processing latency, quality scores, user satisfaction feedback, and cost tracking. Performance targets: AI responses <3 seconds, relationship analysis <10 seconds for 10k notes, podcast generation <30 seconds. Rationale: AI performance directly impacts user experience and operational costs.

## AI Integration Requirements

### Model Architecture
- Primary AI services: Claude API for text analysis, OpenAI embeddings for semantic search
- Fallback strategy: Local caching + simplified algorithms when external AI unavailable
- Rate limiting: Intelligent batching and queuing to manage API costs
- Data privacy: User content encryption + optional local processing mode

### Content Processing Pipeline
- Automatic categorization and tagging within 5 seconds of note creation
- Relationship analysis runs every 24 hours or on-demand
- Summary generation limited to 100 words with configurable extraction rules
- Podcast generation supports multiple voice models with user customization

## Development Workflow

### Feature Development Process
1. `/speckit.specify` creates comprehensive feature specification
2. `/speckit.clarify` resolves all technical ambiguities
3. `/speckit.plan` produces technical design and data models
4. `/speckit.tasks` generates prioritized implementation tasks
5. `/speckit.implement` executes tasks with continuous validation
6. `/speckit.analyze` ensures cross-document consistency

### AI Collaboration Integration
- Complex technical problems MUST use `/collaborate first-principles`
- Architecture design MUST use `/collaborate visual` for diagram documentation
- User experience questions MUST use `/collaborate progressive` for stakeholder communication
- All collaboration sessions MUST be saved with `/save` for knowledge retention

## Performance Standards

### Latency Requirements
- Note creation and auto-tagging: <2 seconds
- Search across 10k notes: <3 seconds
- Relationship graph visualization: <5 seconds
- AI conversation response: <3 seconds
- Podcast generation (5-minute content): <30 seconds

### Scalability Targets
- Single user: 50k notes without performance degradation
- Relationship analysis: Efficient processing of 100k+ note connections
- Concurrent AI conversations: 100 simultaneous users
- Audio storage: 1000 hours of podcast content per user

## Quality Assurance

### Testing Requirements
- Unit test coverage: >90% for all business logic
- Integration test coverage: 100% of AI service interactions
- Performance testing: All latency targets verified under load
- User acceptance testing: AI output quality rated >4/5 by test users

### Code Review Standards
- All PRs MUST verify constitution compliance
- AI-related changes MUST include performance impact analysis
- Data model changes MUST validate AI processing compatibility
- Security reviews MUST consider AI privacy implications

## Governance

This constitution supersedes all other development practices and guidelines. Amendments require:

1. **Documentation**: Proposed changes with rationale and impact analysis
2. **Review**: Minimum 48-hour review period with stakeholder feedback
3. **Approval**: Majority approval from core development team
4. **Migration Plan**: Explicit steps for updating existing features and documentation
5. **Version Bump**: Semantic versioning applied based on change impact

All pull requests and code reviews MUST verify compliance with constitution principles. Complexity increases beyond standard patterns MUST be explicitly justified in the Constitution Check section of implementation plans. Use `CLAUDE.md` for runtime development guidance and AI collaboration best practices.

**Version**: 1.0.1 | **Ratified**: 2025-10-22 | **Last Amended**: 2025-10-22