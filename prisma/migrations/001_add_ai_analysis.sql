-- 启用pgvector扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建AI分析结果表
CREATE TABLE IF NOT EXISTS ai_analysis (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    summary TEXT,
    sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    key_concepts TEXT[] DEFAULT '{}',
    categories JSONB DEFAULT '{}',
    tags JSONB DEFAULT '{}',
    ai_provider_id TEXT NOT NULL,
    model_version TEXT,
    confidence DECIMAL(3,2) DEFAULT 0,
    processing_time INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建向量嵌入表
CREATE TABLE IF NOT EXISTS embedding_vectors (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    embedding bytea,
    model TEXT DEFAULT 'text-embedding-3-small',
    dimensions INTEGER DEFAULT 1536,
    checksum TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建内容分类表
CREATE TABLE IF NOT EXISTS content_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    icon TEXT,
    parent_id TEXT,
    level INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    note_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建分析日志表
CREATE TABLE IF NOT EXISTS analysis_logs (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ai_provider_id TEXT NOT NULL,
    model_version TEXT,
    request_type TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost DECIMAL(10,6) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    response_time INTEGER,
    processing_time INTEGER,
    success BOOLEAN DEFAULT FALSE,
    error_code TEXT,
    error_message TEXT,
    quality JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建AI服务提供商表
CREATE TABLE IF NOT EXISTS ai_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    api_key_encrypted TEXT NOT NULL,
    endpoint TEXT,
    default_model TEXT,
    rate_limit INTEGER DEFAULT 60,
    cost_limit DECIMAL(10,4) DEFAULT 1.0,
    max_tokens INTEGER DEFAULT 4096,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    fallback_enabled BOOLEAN DEFAULT TRUE,
    total_requests BIGINT DEFAULT 0,
    total_cost DECIMAL(12,6) DEFAULT 0,
    success_rate DECIMAL(5,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
-- AI分析表索引
CREATE INDEX IF NOT EXISTS idx_ai_analysis_user_id ON ai_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_status ON ai_analysis(status);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_created_at ON ai_analysis(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_provider_id ON ai_analysis(ai_provider_id);

-- 向量嵌入表索引
CREATE INDEX IF NOT EXISTS idx_embedding_vectors_user_id ON embedding_vectors(user_id);
CREATE INDEX IF NOT EXISTS idx_embedding_vectors_created_at ON embedding_vectors(created_at);
CREATE INDEX IF NOT EXISTS idx_embedding_vectors_checksum ON embedding_vectors(checksum);

-- 内容分类表索引
CREATE INDEX IF NOT EXISTS idx_content_categories_parent_id ON content_categories(parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_content_categories_is_active ON content_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_content_categories_note_count ON content_categories(note_count DESC);

-- 分析日志表索引
CREATE INDEX IF NOT EXISTS idx_analysis_logs_user_id ON analysis_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_created_at ON analysis_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_success ON analysis_logs(success);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_provider_id ON analysis_logs(ai_provider_id);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_request_type ON analysis_logs(request_type);

-- AI提供商表索引
CREATE INDEX IF NOT EXISTS idx_ai_providers_is_active_priority ON ai_providers(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_ai_providers_success_rate ON ai_providers(success_rate DESC);

-- 创建向量索引（用于相似度搜索）
CREATE INDEX IF NOT EXISTS idx_embedding_vectors_embedding
ON embedding_vectors
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 插入默认AI提供商配置
INSERT INTO ai_providers (id, name, api_key_encrypted, default_model, priority, is_active)
VALUES
  ('openai-primary', 'OpenAI', 'encrypted_placeholder', 'gpt-4o', 9, TRUE),
  ('anthropic-primary', 'Anthropic', 'encrypted_placeholder', 'claude-3-5-sonnet', 8, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 插入默认内容分类
INSERT INTO content_categories (id, name, description, color, icon, level, sort_order, is_active)
VALUES
  ('tech', '技术', '技术相关内容', '#3B82F6', 'cpu', 1, 1, TRUE),
  ('work', '工作', '工作相关内容', '#10B981', 'briefcase', 1, 2, TRUE),
  ('personal', '个人', '个人生活记录', '#F59E0B', 'user', 1, 3, TRUE),
  ('study', '学习', '学习笔记和资料', '#8B5CF6', 'book', 1, 4, TRUE),
  ('idea', '想法', '创意和灵感', '#EC4899', 'lightbulb', 1, 5, TRUE),
  ('health', '健康', '健康相关内容', '#EF4444', 'heart', 1, 6, TRUE),
  ('finance', '财务', '财务和投资', '#059669', 'dollar-sign', 1, 7, TRUE),
  ('travel', '旅行', '旅行计划和记录', '#7C3AED', 'plane', 1, 8, TRUE),
  ('food', '美食', '美食和食谱', '#DC2626', 'utensils', 1, 9, TRUE),
  ('entertainment', '娱乐', '娱乐和休闲', '#EA580C', 'tv', 1, 10, TRUE)
ON CONFLICT (id) DO NOTHING;