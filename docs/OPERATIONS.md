# Operations

Backup, restore, and maintenance procedures.

---

## Backup

### Database (pg_dump)

```bash
# Full backup (custom format, compressed)
pg_dump \
  --host=<HOST> \
  --port=5432 \
  --username=<USER> \
  --dbname=narail_school \
  --format=custom \
  --file=narail_school_$(date +%Y%m%d_%H%M%S).dump

# SQL-only backup (plain text, can be read and grepped)
pg_dump \
  --host=<HOST> \
  --port=5432 \
  --username=<USER> \
  --dbname=narail_school \
  --format=plain \
  --file=narail_school_$(date +%Y%m%d_%H%M%S).sql
```

### Uploaded files

The `uploads/` directory holds all uploaded images and documents. Back it up alongside the database.

```bash
tar -czf uploads_$(date +%Y%m%d_%H%M%S).tar.gz uploads/
```

### Schedule

| What | Frequency | Retention |
|---|---|---|
| Database dump | Daily | 30 days |
| Upload directory | Daily | 30 days |
| Off-site copy | Weekly | 90 days |

---

## Restore

### Test a restore (required before trusting backups)

```bash
# 1. Create a throwaway database
createdb --host=<HOST> --username=<USER> narail_school_restore_test

# 2. Restore the custom-format dump
pg_restore \
  --host=<HOST> \
  --port=5432 \
  --username=<USER> \
  --dbname=narail_school_restore_test \
  --no-owner \
  --no-privileges \
  narail_school_20261118_120000.dump

# 3. Verify row counts
psql --host=<HOST> --dbname=narail_school_restore_test \
  -c "SELECT 'users' AS t, count(*) FROM users
      UNION ALL SELECT 'audit_log', count(*) FROM audit_log
      UNION ALL SELECT 'fees', count(*) FROM fees;"

# 4. Drop the test database
dropdb --host=<HOST> --username=<USER> narail_school_restore_test
```

### Restore to production

```bash
# 1. Stop the application
# 2. Drop and recreate the database (or restore into it)
pg_restore \
  --host=<HOST> \
  --port=5432 \
  --username=<USER> \
  --dbname=narail_school \
  --clean \
  --no-owner \
  --no-privileges \
  narail_school_20261118_120000.dump

# 3. Restore uploads
tar -xzf uploads_20261118_120000.tar.gz

# 4. Start the application
```

> [!CAUTION]
> `--clean` drops existing objects before restoring. This is destructive. Always test with a throwaway database first.

---

## Environment variables

All variables are validated at startup (`src/server/env.ts`). The app will not start if a required variable is missing or invalid.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `AUTH_SECRET` | Yes (prod) | At least 32 random characters for NextAuth session signing |
| `AUTH_URL` | Yes (prod) | The public URL of the site (e.g. `https://school.example.com`) |
| `NEXT_PUBLIC_API_BASE_URL` | No | API base URL (defaults to same origin) |
| `NODE_ENV` | Auto | `production` for deploys; `development` for local |
| `ADMIN_RESET_LOGIN` | Script only | Login ID for `admin:reset-password` |
| `ADMIN_RESET_PASSWORD` | Script only | New password for `admin:reset-password` |
| `ALLOW_NON_LOCAL_DB` | Script only | Set to `1` to allow destructive scripts on non-localhost databases |

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run dev` | Development server |
| `npm run db:migrate` | Apply pending Prisma migrations |
| `npm run db:seed` | Demo seed (refuses in production) |
| `npm run seed:prod` | Production seed: Admin + classes only |
| `npm run db:reset` | Full reset (refuses in production) |
| `npm run admin:reset-password -- --confirm` | Reset admin password |
| `npm run db:check` | Verify database connectivity |

---

## First deploy checklist

1. Set a **strong database password** (not the development default).
2. Generate a random `AUTH_SECRET` of at least 32 characters (`openssl rand -base64 32`).
3. Set `AUTH_URL` to the public HTTPS URL.
4. Run `npm run db:migrate` to apply all migrations.
5. Run `npm run seed:prod` to create the Admin account and base structure.
6. Set the Admin password via `ADMIN_RESET_PASSWORD` env var and run `npm run admin:reset-password -- --confirm`.
7. Ensure the site is served over **HTTPS** (Strict-Transport-Security is set).
8. Set up **daily backups** (database + uploads).
9. Test a backup restore on a throwaway database.
10. Confirm `NODE_ENV=production` so destructive scripts and demo seeds are blocked.
