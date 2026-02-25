# Database migrations

The app **auto-runs** the rename migration on first request (or server start) when it detects the old schema (`restaurants` / `restaurant_id`). No manual step required; data is preserved (rename only, no deletes).

To run manually (e.g. in Vercel Postgres SQL tab), use the idempotent script:

```bash
psql $POSTGRES_URL -f src/db/migrations/001_rename_restaurant_to_organization.sql
```

The migration is safe to run multiple times and does not drop or delete any data.

**New** installations should use `schema.sql` only (it already defines `organizations` and `organization_id`).
