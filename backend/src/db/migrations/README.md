# Database migrations

For **existing** databases that were created with the old schema (table `restaurants`, column `restaurant_id`), run the rename migration before using the new code:

```bash
psql $POSTGRES_URL -f src/db/migrations/001_rename_restaurant_to_organization.sql
```

Or in Vercel Postgres: run the SQL from `001_rename_restaurant_to_organization.sql` in the SQL tab.

**New** installations should use `schema.sql` only (it already defines `organizations` and `organization_id`).
