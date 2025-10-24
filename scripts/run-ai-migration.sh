#!/bin/bash

# AI Support Migration Script for MindNote
# This script runs the database migration for AI functionality

set -e  # Exit on any error

echo "🚀 Starting AI support migration for MindNote database..."

# Check if PostgreSQL is running
echo "📋 Checking PostgreSQL connection..."
if ! pg_isready -h localhost -p 5432 -U mindnote; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL and try again."
    exit 1
fi

echo "✅ PostgreSQL is ready."

# Check if we have the necessary environment variables
echo "📋 Checking environment variables..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set. Please check your .env file."
    exit 1
fi

echo "✅ Environment variables are configured."

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Create backup of current database (optional but recommended)
read -p "🔄 Do you want to create a backup before migration? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BACKUP_FILE="mindnote_backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "📦 Creating backup: $BACKUP_FILE"
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    echo "✅ Backup created successfully."
fi

# Run the migration
echo "🔄 Running AI support migration..."
psql "$DATABASE_URL" -f "$(dirname "$0")/migrate-ai-support.sql"

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

# Run health check
echo "🔍 Running database health check..."
psql "$DATABASE_URL" -f "$(dirname "$0")/database-health-check.sql"

# Generate Prisma client
echo "🔄 Regenerating Prisma client..."
if [ -f "package.json" ] && command -v npx &> /dev/null; then
    npx prisma generate
    echo "✅ Prisma client regenerated."
else
    echo "⚠️  Could not regenerate Prisma client. Please run 'npx prisma generate' manually."
fi

echo ""
echo "🎉 AI support migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Test the AI functionality in your application"
echo "2. Run the database health check script periodically: psql \$DATABASE_URL -f scripts/database-health-check.sql"
echo "3. Monitor AI processing logs and user feedback tables"
echo ""
echo "📚 For more information, see:"
echo "- Migration script: scripts/migrate-ai-support.sql"
echo "- Health check: scripts/database-health-check.sql"
echo "- AI configuration: src/lib/ai/"