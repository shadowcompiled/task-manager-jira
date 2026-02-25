-- Migration: rename restaurants -> organizations, restaurant_id -> organization_id
-- Run on existing DBs that were created with schema.sql (restaurants).
-- New installs should use schema.sql which already defines organizations.

-- Rename table
ALTER TABLE IF EXISTS restaurants RENAME TO organizations;

-- Users
ALTER TABLE users RENAME COLUMN restaurant_id TO organization_id;

-- Tasks
ALTER TABLE tasks RENAME COLUMN restaurant_id TO organization_id;

-- Statuses
ALTER TABLE statuses RENAME COLUMN restaurant_id TO organization_id;

-- Tags
ALTER TABLE tags RENAME COLUMN restaurant_id TO organization_id;

-- Index (drop old, create new if needed)
DROP INDEX IF EXISTS idx_tasks_restaurant_id;
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
