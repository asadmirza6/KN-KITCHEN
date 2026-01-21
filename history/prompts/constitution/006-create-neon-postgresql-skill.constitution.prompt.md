---
id: 006
title: Create Neon PostgreSQL Skill
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: manual
labels: ["skill", "neon", "postgresql", "database", "serverless"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/neon-postgresql.md
tests:
  - None
---

## Prompt

Create a skill named "Neon PostgreSQL".

Includes:
- Connection pooling awareness
- Environment-based configs
- Production-safe queries

Create at:
.claude/skills/neon-postgresql.md

## Response snapshot

Created mandatory Neon PostgreSQL skill at `.claude/skills/neon-postgresql.md`.

The skill defines best practices for using Neon's serverless PostgreSQL platform:

**Core Principles:**
1. Connection Pooling Required - Always use pooled connections in production
2. Environment Isolation - Separate databases/branches for dev/staging/prod
3. Query Efficiency - Serverless billing favors efficient queries
4. Cold Start Awareness - First request after idle may have latency
5. Connection Limits - Respect tier-based connection limits

**1. Connection Pooling Awareness:**

**Connection Modes:**
- **Direct**: `postgresql://...` - Development, migrations, admin tasks (limit: 100 concurrent)
- **Pooled (PgBouncer)**: `postgresql://...?pgbouncer=true` - Production apps (limit: 1000s concurrent)

**Engine Configuration:**
- Production: Pooled connection with `pool_size=10`, `max_overflow=20`
- Development: Direct connection with `pool_size=5`, `echo=True`
- Test: `NullPool` (no pooling, clean slate per test)
- Migration: Direct connection (full PostgreSQL features)

**Pool Settings:**
- `pool_pre_ping=True`: Verify connections before use
- `pool_recycle=3600`: Recycle connections after 1 hour
- `pool_timeout=30`: Wait 30s for available connection

**PgBouncer Limitations:**
- Not supported: Prepared statements, LISTEN/NOTIFY, advisory locks, SET variables
- Workaround: Use direct connection for admin tasks requiring these features

**2. Environment-Based Configurations:**

**Branch Strategy:**
```
Production (main)
  ↓
Staging (staging)
  ↓
Development (dev)
  ↓
Feature Branches (feature-xyz)
```

**Environment Variables:**
- `ENVIRONMENT`: development | staging | production | test | migration
- `DATABASE_URL`: Direct connection string
- `DATABASE_URL_POOLED`: Pooled connection string (production)
- `STATEMENT_TIMEOUT`: Query timeout in milliseconds (30000 default)
- `POOL_SIZE`: Active connections
- `MAX_OVERFLOW`: Additional connections under load

**Migration Strategy:**
- Force `ENVIRONMENT=migration` to use direct connection
- Run Alembic migrations with `DATABASE_URL` (not pooled)
- Separate environment configs for prod/staging/dev

**3. Production-Safe Queries:**

**Query Timeouts:**
- Global: `statement_timeout=30000` (30 seconds) in connect_args
- Per-session: `SET statement_timeout = X`
- Per-query: `SET LOCAL statement_timeout = X` for long reports

**Efficient Patterns:**
- Pagination: Always use `LIMIT`/`OFFSET` with indexed `ORDER BY`
- Avoid full table scans: Filter on indexed columns
- Bulk operations: `bulk_save_objects()` instead of loops
- Aggregations: Use SQL `SUM()`/`COUNT()` not Python loops

**Avoiding Full Scans:**
- Use indexed columns in `WHERE` clauses
- Composite indexes for multi-column filters
- Full-text search indexes for text columns (GIN index with `to_tsvector`)

**Connection Monitoring:**
- Event listeners for connect/checkout/checkin
- Log slow queries (>1 second)
- Monitor pool status (size, checked_out, overflow)

**Cold Start Mitigation:**
- Neon auto-suspends after inactivity (5 minutes)
- Keep-alive: Ping database every 4 minutes to prevent suspension
- Health check endpoint with database ping
- Pre-warm on deployment with test queries

**Backup and Recovery:**
- Neon automatic backups with point-in-time recovery
- Create branch from specific timestamp for recovery
- Manual `pg_dump` backups for extra safety
- Upload backups to S3, retain 30 days

**Security:**
- `sslmode=require`: Force SSL connections
- `sslrootcert`: Verify server certificate
- `connect_timeout=10`: Connection timeout
- Secrets management (AWS Secrets Manager) in production

**Monitoring:**
- Before/after cursor execute events
- Log slow queries (>1s) with duration
- Track query patterns and performance

**Best Practices Checklist:**
- [ ] Pooled connection in production (`DATABASE_URL_POOLED`)
- [ ] Pool size configured for expected load
- [ ] Statement timeout set (30s default)
- [ ] Environment isolation (separate branches)
- [ ] SSL required (`sslmode=require`)
- [ ] Queries use indexed columns
- [ ] Pagination on all list endpoints
- [ ] No full table scans
- [ ] Bulk operations for multiple records
- [ ] Query timeouts configured
- [ ] Performance monitoring enabled
- [ ] Backup strategy in place

**Common Issues:**
- Connection pool exhausted: Increase pool size or fix leaks
- Statement timeout: Optimize query or increase timeout
- Cold start latency: Implement keep-alive ping

## Outcome

- ✅ Impact: Established Neon-specific database patterns ensuring efficient connection management, proper environment isolation, and production-safe query execution for serverless PostgreSQL
- 🧪 Tests: None (infrastructure guidelines)
- 📁 Files: Created .claude/skills/neon-postgresql.md (582 lines)
- 🔁 Next prompts: Reference during database configuration, validate connection pooling in production deployment
- 🧠 Reflection: Skill addresses Neon's unique serverless characteristics (connection pooling, cold starts, branching) that differ from traditional PostgreSQL deployments

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Will be validated during database configuration and production deployment
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test connection pooling configuration and cold start mitigation in staging environment
