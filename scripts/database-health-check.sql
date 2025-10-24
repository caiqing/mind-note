-- Database Health Check Script for AI Support
-- This script verifies that all AI-related database components are properly configured

-- Check if pgvector extension is installed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE NOTICE '✓ pgvector extension is installed';
    ELSE
        RAISE NOTICE '✗ pgvector extension is NOT installed';
    END IF;
END $$;

-- Check if AI columns exist in notes table
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check each AI column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'content_vector'
    ) INTO column_exists;

    IF column_exists THEN
        RAISE NOTICE '✓ content_vector column exists';
    ELSE
        RAISE NOTICE '✗ content_vector column is missing';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'ai_processed'
    ) INTO column_exists;

    IF column_exists THEN
        RAISE NOTICE '✓ ai_processed column exists';
    ELSE
        RAISE NOTICE '✗ ai_processed column is missing';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notes' AND column_name = 'ai_summary'
    ) INTO column_exists;

    IF column_exists THEN
        RAISE NOTICE '✓ ai_summary column exists';
    ELSE
        RAISE NOTICE '✗ ai_summary column is missing';
    END IF;
END $$;

-- Check if AI indexes exist
DO $$
DECLARE
    index_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'notes' AND indexname = 'idx_content_vector_hnsw'
    ) INTO index_exists;

    IF index_exists THEN
        RAISE NOTICE '✓ HNSW vector index exists';
    ELSE
        RAISE NOTICE '✗ HNSW vector index is missing';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'notes' AND indexname = 'idx_content_vector_l2'
    ) INTO index_exists;

    IF index_exists THEN
        RAISE NOTICE '✓ IVFFlat vector index exists';
    ELSE
        RAISE NOTICE '✗ IVFFlat vector index is missing';
    END IF;
END $$;

-- Check if AI tables exist
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'ai_processing_logs'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE NOTICE '✓ ai_processing_logs table exists';
    ELSE
        RAISE NOTICE '✗ ai_processing_logs table is missing';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'user_feedback'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE NOTICE '✓ user_feedback table exists';
    ELSE
        RAISE NOTICE '✗ user_feedback table is missing';
    END IF;
END $$;

-- Check current data statistics
DO $$
DECLARE
    total_notes INTEGER;
    processed_notes INTEGER;
    vector_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_notes FROM notes;
    SELECT COUNT(*) INTO processed_notes FROM notes WHERE ai_processed = true;
    SELECT COUNT(*) INTO vector_count FROM notes WHERE content_vector IS NOT NULL;

    RAISE NOTICE 'Database Statistics:';
    RAISE NOTICE '- Total notes: %', total_notes;
    RAISE NOTICE '- AI processed notes: %', processed_notes;
    RAISE NOTICE '- Notes with vectors: %', vector_count;

    IF total_notes > 0 THEN
        RAISE NOTICE '- Processing rate: %%', (processed_notes::FLOAT / total_notes * 100)::NUMERIC(5,2);
        RAISE NOTICE '- Vector coverage: %%', (vector_count::FLOAT / total_notes * 100)::NUMERIC(5,2);
    END IF;
END $$;

-- Test vector functionality (if possible)
DO $$
DECLARE
    test_vector BYTEA := ARRAY[0.1, 0.2, 0.3, 0.4, 0.5]::REAL[];
BEGIN
    -- Test vector casting
    BEGIN
        PERFORM test_vector::vector;
        RAISE NOTICE '✓ Vector type casting works';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ Vector type casting failed: %', SQLERRM;
    END;
END $$;

-- Check database size and performance metrics
DO $$
DECLARE
    db_size TEXT;
    notes_size TEXT;
    indexes_size TEXT;
BEGIN
    SELECT pg_size_pretty(pg_database_size(current_database())) INTO db_size;
    SELECT pg_size_pretty(pg_total_relation_size('notes')) INTO notes_size;
    SELECT pg_size_pretty(pg_total_relation_size('notes') - pg_relation_size('notes')) INTO indexes_size;

    RAISE NOTICE 'Storage Information:';
    RAISE NOTICE '- Total database size: %', db_size;
    RAISE NOTICE '- Notes table size: %', notes_size;
    RAISE NOTICE '- Notes indexes size: %', indexes_size;
END $$;

-- Final health check summary
RAISE NOTICE '';
RAISE NOTICE '=== AI Database Health Check Complete ===';
RAISE NOTICE 'Review any items marked with ✗ and address them manually.';
RAISE NOTICE 'Run this script after making changes to verify everything is working.';