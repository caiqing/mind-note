-- Initialize PostgreSQL with pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create additional indexes for development
CREATE INDEX IF NOT EXISTS idx_notes_title_search ON notes USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_notes_content_search ON notes USING gin(to_tsvector('english', content));

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mindnote;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mindnote;