-- OmniVault PostgreSQL Schema
-- Run this in your Supabase SQL editor to create the required tables.
-- Supabase provides auth.users automatically; these tables extend it.

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: users
-- Stores application users. Email is unique and a password hash is kept
-- so the app controls its own auth (independent of Supabase Auth).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT        NOT NULL UNIQUE,
    password_hash   TEXT        NOT NULL,
    gemini_api_key  TEXT        -- nullable: set later via the settings page
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: documents
-- One document per uploaded file. Tracks processing lifecycle and stores
-- the final knowledge-graph JSON produced by the AI worker.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT        NOT NULL DEFAULT 'UPLOADED',
    -- Status values: UPLOADED | PROCESSING | COMPLETED | FAILED
    error_message   TEXT,       -- populated when status = 'FAILED'
    graph_data      JSONB,      -- populated when status = 'COMPLETED'
    created_at      TIMESTAMP   NOT NULL DEFAULT now()
);

-- Index for fast per-user document listing
CREATE INDEX IF NOT EXISTS documents_owner_id_idx ON documents(owner_id);
