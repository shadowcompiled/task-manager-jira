-- Migration: rename restaurants -> organizations, restaurant_id -> organization_id
-- Safe to run multiple times (idempotent). Does NOT delete or drop any data.
-- Run on existing DBs that were created with the old schema (restaurants).
-- New installs should use schema.sql which already defines organizations.

DO $$
BEGIN
  -- Only rename table if old table exists (and new one doesn't)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'restaurants')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    ALTER TABLE restaurants RENAME TO organizations;
    RAISE NOTICE 'Renamed table restaurants to organizations';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'restaurant_id') THEN
    ALTER TABLE users RENAME COLUMN restaurant_id TO organization_id;
    RAISE NOTICE 'Renamed users.restaurant_id to organization_id';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'restaurant_id') THEN
    ALTER TABLE tasks RENAME COLUMN restaurant_id TO organization_id;
    RAISE NOTICE 'Renamed tasks.restaurant_id to organization_id';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'statuses' AND column_name = 'restaurant_id') THEN
    ALTER TABLE statuses RENAME COLUMN restaurant_id TO organization_id;
    RAISE NOTICE 'Renamed statuses.restaurant_id to organization_id';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'restaurant_id') THEN
    ALTER TABLE tags RENAME COLUMN restaurant_id TO organization_id;
    RAISE NOTICE 'Renamed tags.restaurant_id to organization_id';
  END IF;
END $$;

DROP INDEX IF EXISTS idx_tasks_restaurant_id;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'organization_id') THEN
    CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
  END IF;
END $$;
