-- AI Support Migration for MindNote Database
-- This script adds AI-related fields and vector search capabilities to existing database

-- Enable pgvector extension for vector search capabilities
CREATE EXTENSION IF NOT EXISTS vector;

-- Add AI-related columns to existing notes table
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS content_vector BYTEA,
ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS ai_key_concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS ai_category TEXT DEFAULT 'other',
ADD COLUMN IF NOT EXISTS ai_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS ai_sentiment TEXT DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS ai_confidence DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS ai_model TEXT,
ADD COLUMN IF NOT EXISTS ai_provider TEXT,
ADD COLUMN IF NOT EXISTS ai_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_cost DECIMAL(10,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMP(3);

-- Create AI-related indexes if they don't exist
CREATE INDEX IF NOT EXISTS notes_ai_processed_ai_processed_at_idx ON notes(ai_processed, ai_processed_at);
CREATE INDEX IF NOT EXISTS notes_ai_category_idx ON notes(ai_category);
CREATE INDEX IF NOT EXISTS notes_ai_sentiment_idx ON notes(ai_sentiment);
CREATE INDEX IF NOT EXISTS notes_ai_confidence_idx ON notes(ai_confidence DESC);
CREATE INDEX IF NOT EXISTS notes_ai_processed_at_idx ON notes(ai_processed_at);

-- Create vector indexes for efficient similarity search
-- These indexes are critical for AI-powered semantic search functionality

-- HNSW index for fast approximate nearest neighbor search (default for most use cases)
CREATE INDEX IF NOT EXISTS idx_content_vector_hnsw
ON notes USING hnsw ((content_vector::vector) vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- IVFFlat index for exact search with better recall (useful for small datasets)
CREATE INDEX IF NOT EXISTS idx_content_vector_l2
ON notes USING ivfflat ((content_vector::vector) vector_l2_ops)
WITH (lists = 100);

-- Additional vector indexes for different distance metrics
CREATE INDEX IF NOT EXISTS idx_content_vector_ip
ON notes USING hnsw ((content_vector::vector) vector_ip_ops)
WITH (m = 16, ef_construction = 64);

-- Create partial indexes for better performance on AI-processed notes only
CREATE INDEX IF NOT EXISTS idx_ai_processed_vectors
ON notes USING hnsw ((content_vector::vector) vector_cosine_ops)
WHERE ai_processed = true;

-- Add comments for documentation
COMMENT ON COLUMN notes.content_vector IS 'Vector embedding of note content for semantic search (pgvector)';
COMMENT ON COLUMN notes.ai_processed IS 'Flag indicating if AI analysis has been completed';
COMMENT ON COLUMN notes.ai_summary IS 'AI-generated summary of the note content';
COMMENT ON COLUMN notes.ai_keywords IS 'AI-extracted keywords from the note';
COMMENT ON COLUMN notes.ai_key_concepts IS 'AI-identified key concepts in the note';
COMMENT ON COLUMN notes.ai_category IS 'AI-categorized topic classification';
COMMENT ON COLUMN notes.ai_tags IS 'AI-generated tags for the note';
COMMENT ON COLUMN notes.ai_sentiment IS 'AI-analyzed sentiment (positive/neutral/negative)';
COMMENT ON COLUMN notes.ai_confidence IS 'AI confidence score for analysis (0.0-1.0)';
COMMENT ON COLUMN notes.ai_model IS 'AI model used for analysis';
COMMENT ON COLUMN notes.ai_provider IS 'AI service provider used';
COMMENT ON COLUMN notes.ai_tokens IS 'Total tokens used for AI analysis';
COMMENT ON COLUMN notes.ai_cost IS 'Cost incurred for AI analysis in USD';
COMMENT ON COLUMN notes.ai_processed_at IS 'Timestamp when AI analysis was completed';

-- Create AI-related tables if they don't exist
CREATE TABLE IF NOT EXISTS ai_processing_logs (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    processing_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    processing_time_ms INTEGER,
    cost DECIMAL(10,6),
    status TEXT DEFAULT 'PROCESSING',
    error_message TEXT,
    result JSONB,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for AI processing logs
CREATE INDEX IF NOT EXISTS ai_processing_logs_note_id_idx ON ai_processing_logs(note_id);
CREATE INDEX IF NOT EXISTS ai_processing_logs_user_id_idx ON ai_processing_logs(user_id);
CREATE INDEX IF NOT EXISTS ai_processing_logs_processing_type_idx ON ai_processing_logs(processing_type);
CREATE INDEX IF NOT EXISTS ai_processing_logs_provider_status_idx ON ai_processing_logs(provider, status);
CREATE INDEX IF NOT EXISTS ai_processing_logs_created_at_idx ON ai_processing_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_processing_logs_status_created_at_idx ON ai_processing_logs(status, created_at DESC);

-- Add indexes for user feedback
CREATE INDEX IF NOT EXISTS user_feedback_note_id_feedback_type_idx ON user_feedback(note_id, feedback_type);
CREATE INDEX IF NOT EXISTS user_feedback_user_id_idx ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS user_feedback_feedback_type_rating_idx ON user_feedback(feedback_type, rating DESC);
CREATE INDEX IF NOT EXISTS user_feedback_created_at_idx ON user_feedback(created_at DESC);

-- Success notification
DO $$
BEGIN
    RAISE NOTICE 'AI support migration completed successfully!';
    RAISE NOTICE 'Vector indexes created for semantic search.';
    RAISE NOTICE 'AI fields added to notes table.';
    RAISE NOTICE 'Processing logs and feedback tables created.';
END $$;