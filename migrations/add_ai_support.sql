-- Enable pgvector extension for vector search capabilities
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('SEMANTIC', 'REFERENCE', 'SIMILAR', 'RELATED');

-- CreateEnum
CREATE TYPE "ProcessingType" AS ENUM ('SUMMARIZATION', 'CLASSIFICATION', 'EMBEDDING', 'RELATIONSHIP');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('SUMMARY_QUALITY', 'CLASSIFICATION', 'RELATIONSHIP');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "ai_preferences" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "content_vector" BYTEA,
    "ai_processed" BOOLEAN NOT NULL DEFAULT false,
    "ai_summary" TEXT,
    "ai_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ai_key_concepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ai_category" TEXT NOT NULL DEFAULT 'other',
    "ai_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ai_sentiment" TEXT NOT NULL DEFAULT 'neutral',
    "ai_confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ai_model" TEXT,
    "ai_provider" TEXT,
    "ai_tokens" INTEGER NOT NULL DEFAULT 0,
    "ai_cost" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "category_id" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "NoteStatus" NOT NULL DEFAULT 'DRAFT',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ai_processed_at" TIMESTAMP(3),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "created_by" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "parent_id" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_tags" (
    "note_id" TEXT NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "note_tags_pkey" PRIMARY KEY ("note_id","tag_id")
);

-- CreateTable
CREATE TABLE "note_relationships" (
    "id" TEXT NOT NULL,
    "source_note_id" TEXT NOT NULL,
    "target_note_id" TEXT NOT NULL,
    "relationship_type" "RelationshipType" NOT NULL,
    "strength_score" DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_processing_logs" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "processing_type" "ProcessingType" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "processing_time_ms" INTEGER,
    "cost" DECIMAL(10,6),
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PROCESSING',
    "error_message" TEXT,
    "result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "feedback_type" "FeedbackType" NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "notes_user_id_created_at_idx" ON "notes"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notes_status_idx" ON "notes"("status");

-- CreateIndex
CREATE INDEX "notes_category_id_idx" ON "notes"("category_id");

-- CreateIndex
CREATE INDEX "notes_content_hash_idx" ON "notes"("content_hash");

-- CreateIndex
CREATE INDEX "notes_ai_processed_ai_processed_at_idx" ON "notes"("ai_processed", "ai_processed_at");

-- CreateIndex
CREATE INDEX "notes_is_public_status_idx" ON "notes"("is_public", "status");

-- CreateIndex
CREATE INDEX "notes_view_count_idx" ON "notes"("view_count" DESC);

-- CreateIndex
CREATE INDEX "notes_ai_processed_at_idx" ON "notes"("ai_processed_at");

-- CreateIndex
CREATE INDEX "notes_ai_category_idx" ON "notes"("ai_category");

-- CreateIndex
CREATE INDEX "notes_ai_sentiment_idx" ON "notes"("ai_sentiment");

-- CreateIndex
CREATE INDEX "notes_ai_confidence_idx" ON "notes"("ai_confidence" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tags_usage_count_idx" ON "tags"("usage_count" DESC);

-- CreateIndex
CREATE INDEX "tags_category_idx" ON "tags"("category");

-- CreateIndex
CREATE INDEX "tags_created_by_idx" ON "tags"("created_by");

-- CreateIndex
CREATE INDEX "tags_created_at_idx" ON "tags"("created_at");

-- CreateIndex
CREATE INDEX "tags_created_by_usage_count_idx" ON "tags"("created_by", "usage_count" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_parent_id_sort_order_idx" ON "categories"("parent_id", "sort_order");

-- CreateIndex
CREATE INDEX "categories_created_by_idx" ON "categories"("created_by");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_created_at_idx" ON "categories"("created_at");

-- CreateIndex
CREATE INDEX "note_tags_note_id_idx" ON "note_tags"("note_id");

-- CreateIndex
CREATE INDEX "note_tags_tag_id_idx" ON "note_tags"("tag_id");

-- CreateIndex
CREATE INDEX "note_tags_note_id_tag_id_idx" ON "note_tags"("note_id", "tag_id");

-- CreateIndex
CREATE INDEX "note_relationships_source_note_id_idx" ON "note_relationships"("source_note_id");

-- CreateIndex
CREATE INDEX "note_relationships_target_note_id_idx" ON "note_relationships"("target_note_id");

-- CreateIndex
CREATE INDEX "note_relationships_relationship_type_strength_score_idx" ON "note_relationships"("relationship_type", "strength_score" DESC);

-- CreateIndex
CREATE INDEX "note_relationships_ai_generated_relationship_type_idx" ON "note_relationships"("ai_generated", "relationship_type");

-- CreateIndex
CREATE INDEX "note_relationships_created_at_idx" ON "note_relationships"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "note_relationships_source_note_id_target_note_id_relationsh_key" ON "note_relationships"("source_note_id", "target_note_id", "relationship_type");

-- CreateIndex
CREATE INDEX "ai_processing_logs_note_id_idx" ON "ai_processing_logs"("note_id");

-- CreateIndex
CREATE INDEX "ai_processing_logs_user_id_idx" ON "ai_processing_logs"("user_id");

-- CreateIndex
CREATE INDEX "ai_processing_logs_processing_type_idx" ON "ai_processing_logs"("processing_type");

-- CreateIndex
CREATE INDEX "ai_processing_logs_provider_status_idx" ON "ai_processing_logs"("provider", "status");

-- CreateIndex
CREATE INDEX "ai_processing_logs_created_at_idx" ON "ai_processing_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_processing_logs_status_created_at_idx" ON "ai_processing_logs"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "user_feedback_note_id_feedback_type_idx" ON "user_feedback"("note_id", "feedback_type");

-- CreateIndex
CREATE INDEX "user_feedback_user_id_idx" ON "user_feedback"("user_id");

-- CreateIndex
CREATE INDEX "user_feedback_feedback_type_rating_idx" ON "user_feedback"("feedback_type", "rating" DESC);

-- CreateIndex
CREATE INDEX "user_feedback_created_at_idx" ON "user_feedback"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_relationships" ADD CONSTRAINT "note_relationships_source_note_id_fkey" FOREIGN KEY ("source_note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_relationships" ADD CONSTRAINT "note_relationships_target_note_id_fkey" FOREIGN KEY ("target_note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_processing_logs" ADD CONSTRAINT "ai_processing_logs_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_processing_logs" ADD CONSTRAINT "ai_processing_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create vector indexes for efficient similarity search
-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX "idx_content_vector_hnsw" ON "notes" USING hnsw ("content_vector" vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- IVFFlat index for exact search with better recall
CREATE INDEX "idx_content_vector_l2" ON "notes" USING ivfflat ("content_vector" vector_l2_ops) WITH (lists = 100);

-- Additional vector indexes for different distance metrics
CREATE INDEX "idx_content_vector_ip" ON "notes" USING hnsw ("content_vector" vector_ip_ops) WITH (m = 16, ef_construction = 64);

-- Create partial indexes for better performance on AI-processed notes
CREATE INDEX "idx_ai_processed_vectors" ON "notes" USING hnsw ("content_vector" vector_cosine_ops) WHERE "ai_processed" = true;

