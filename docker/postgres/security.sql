-- PostgreSQL Security Configuration
-- This script sets up security measures for the MindNote database

-- Create secure user for application with limited privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mindnote_app') THEN
        CREATE ROLE mindnote_app WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
    END IF;
END
$$;

-- Grant necessary permissions to application user
GRANT CONNECT ON DATABASE mindnote_dev TO mindnote_app;
GRANT USAGE ON SCHEMA public TO mindnote_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mindnote_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mindnote_app;

-- Enable row level security for sensitive data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users table - users can only access their own data
CREATE POLICY users_policy ON users
    FOR ALL
    TO mindnote_app
    USING (id = current_setting('app.current_user_id')::uuid);

-- Create policy for notes table - users can only access their own notes
CREATE POLICY notes_policy ON notes
    FOR ALL
    TO mindnote_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Set up audit logging
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Configure logging
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Add security indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower
ON users (lower(email));

-- Configure connection limits
ALTER USER mindnote_app WITH CONNECTION LIMIT 50;

-- Create security monitoring view
CREATE OR REPLACE VIEW security_audit AS
SELECT
    schemaname,
    tablename,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity
WHERE state != 'idle'
    AND query NOT LIKE '%pg_stat_activity%';

-- Grant access to security audit view
GRANT SELECT ON security_audit TO mindnote_app;