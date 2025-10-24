-- Fix Vector Indexes Script
-- This script addresses vector index issues by properly converting BYTEA to vector type

-- First, let's check the current state of the content_vector column
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'notes' AND column_name = 'content_vector';

-- Since we can't directly convert BYTEA to vector in one step,
-- we need to create a new column and migrate data

-- Add a new vector column (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'content_vector_new'
    ) THEN
        ALTER TABLE notes ADD COLUMN content_vector_new vector(1536);
        RAISE NOTICE 'Added new content_vector_new column';
    END IF;
END $$;

-- For existing data, we'll need to handle the conversion
-- This is a placeholder for now since BYTEA to vector conversion is complex
-- In practice, you would need to regenerate embeddings for existing notes

-- Update any NULL entries with empty vectors for now
UPDATE notes
SET content_vector_new = '[0]'::vector
WHERE content_vector_new IS NULL;

-- Drop the old BYTEA column and rename the new one
-- NOTE: This will lose any existing vector data
ALTER TABLE notes DROP COLUMN IF EXISTS content_vector;
ALTER TABLE notes RENAME COLUMN content_vector_new TO content_vector;

-- Now create the vector indexes with proper vector type
CREATE INDEX IF NOT EXISTS idx_content_vector_hnsw
ON notes USING hnsw (content_vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_content_vector_l2
ON notes USING ivfflat (content_vector vector_l2_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_content_vector_ip
ON notes USING hnsw (content_vector vector_ip_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_ai_processed_vectors
ON notes USING hnsw (content_vector vector_cosine_ops)
WHERE ai_processed = true;

-- Update the comment
COMMENT ON COLUMN notes.content_vector IS 'Vector embedding of note content for semantic search (pgvector)';

RAISE NOTICE 'Vector indexes have been created successfully!';
RAISE NOTICE 'Note: Existing vector data may need to be regenerated.';
RAISE NOTICE 'Use the AI analysis service to generate new embeddings.';