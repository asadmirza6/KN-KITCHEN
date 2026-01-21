---
name: Neon PostgreSQL
description: Best practices for Neon serverless PostgreSQL including connection pooling, environment configs, and production-safe queries
scope: mandatory
applies_to: backend
---

# Neon PostgreSQL

**Status**: MANDATORY - All database operations MUST follow these Neon-specific patterns

## Overview

Neon is a serverless PostgreSQL platform providing managed PostgreSQL with automatic scaling, branching, and connection pooling. KN KITCHEN uses Neon as its database layer.

**Key Neon Characteristics:**
- Serverless architecture (scales to zero)
- Built-in connection pooling
- Database branching (instant copies for dev/testing)
- Autosuspend when idle (cold start considerations)
- Connection limits per tier

## Core Principles

1. **Connection Pooling Required**: Always use pooled connections in production
2. **Environment Isolation**: Separate databases/branches for dev/staging/prod
3. **Query Efficiency**: Serverless billing favors efficient queries
4. **Cold Start Awareness**: First request after idle may have latency
5. **Connection Limits**: Respect tier-based connection limits

## 1. Connection Pooling Awareness

Neon provides two connection modes: **Direct** and **Pooled**. Use the correct mode for each environment.

### Connection Modes

**Direct Connection:**
- Format: `postgresql://user:pass@host/db`
- Use case: Development, migrations, admin tasks
- Pros: Full PostgreSQL feature support
- Cons: Limited concurrent connections (default: 100)

**Pooled Connection (PgBouncer):**
- Format: `postgresql://user:pass@host/db?sslmode=require&pgbouncer=true`
- Use case: Production applications
- Pros: Thousands of concurrent connections
- Cons: Some PostgreSQL features not supported (prepared statements, LISTEN/NOTIFY)

### Connection String Configuration

```python
# ✅ CORRECT: Environment-aware connection configuration
# backend/src/config.py
from pydantic import BaseSettings, PostgresDsn
from functools import lru_cache
import os

class Settings(BaseSettings):
    """Application settings with Neon database config"""

    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")

    # Neon connection strings
    database_url: PostgresDsn = os.getenv("DATABASE_URL")
    database_url_pooled: PostgresDsn = os.getenv("DATABASE_URL_POOLED")

    # Connection pool settings
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_timeout: int = 30
    db_pool_recycle: int = 3600  # Recycle connections after 1 hour

    # Query timeout
    statement_timeout: int = 30000  # 30 seconds in milliseconds

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton"""
    return Settings()
```

### Database Engine Setup

```python
# ✅ CORRECT: Production-ready engine configuration
# backend/src/database.py
from sqlmodel import create_engine, Session
from sqlalchemy.pool import NullPool, QueuePool
from typing import Generator
from .config import get_settings

settings = get_settings()

def get_database_url() -> str:
    """Get appropriate database URL based on environment"""
    if settings.environment == "production":
        # Use pooled connection in production
        return settings.database_url_pooled
    elif settings.environment == "migration":
        # Use direct connection for migrations
        return settings.database_url
    else:
        # Development can use direct connection
        return settings.database_url

# Create engine with appropriate pooling
if settings.environment == "production":
    # Production: Use connection pooling
    engine = create_engine(
        get_database_url(),
        echo=False,  # Disable query logging in production
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
        pool_pre_ping=True,  # Verify connections before using
        pool_recycle=settings.db_pool_recycle,
        connect_args={
            "sslmode": "require",
            "options": f"-c statement_timeout={settings.statement_timeout}"
        }
    )
elif settings.environment == "test":
    # Test: No pooling (clean slate per test)
    engine = create_engine(
        get_database_url(),
        echo=False,
        poolclass=NullPool  # Disable pooling for tests
    )
else:
    # Development: Small pool for local work
    engine = create_engine(
        get_database_url(),
        echo=True,  # Log queries in development
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True
    )

def get_session() -> Generator[Session, None, None]:
    """Database session dependency"""
    with Session(engine) as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
```

### Connection Pool Best Practices

```python
# ✅ CORRECT: Pool size calculation
# Formula: pool_size = (max_concurrent_requests / avg_request_duration) * safety_factor

# Example for 100 concurrent users, 200ms avg query time:
# pool_size = (100 / 5 requests/sec) / (1 / 0.2 sec) = 4 connections
# Add safety factor: 4 * 2.5 = 10 connections

# Neon Free Tier: Max 100 direct connections
# Neon Pro Tier: Max 1000 pooled connections

# Conservative production config:
POOL_SIZE = 10  # Active connections
MAX_OVERFLOW = 20  # Additional connections under load
# Total possible: 30 connections

# If you exceed limits, you'll see:
# sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) connection pool exhausted
```

### Pooling Limitations (PgBouncer)

```python
# ❌ NOT SUPPORTED with pooled connections:
# - Prepared statements (auto-disabled by SQLAlchemy)
# - LISTEN/NOTIFY (use Redis for pub/sub instead)
# - Advisory locks (use application-level locking)
# - SET variables persisting across transactions
# - Temporary tables (use CTEs or subqueries instead)

# ✅ WORKAROUND: Use direct connection for special cases
from sqlmodel import create_engine

# Separate engine for admin tasks
direct_engine = create_engine(
    settings.database_url,  # Direct connection
    poolclass=NullPool
)

def run_admin_query():
    """Admin task requiring direct connection"""
    with Session(direct_engine) as session:
        # Can use features not supported by PgBouncer
        session.execute(text("LISTEN channel_name"))
```

## 2. Environment-Based Configurations

Neon supports **database branching** for environment isolation. Use separate branches for dev/staging/prod.

### Environment Strategy

```
Production Branch (main)
    ↓
Staging Branch (staging) - Created from main
    ↓
Development Branch (dev) - Created from staging
    ↓
Feature Branches (feature-xyz) - Created from dev
```

### Environment Variables

```bash
# ✅ CORRECT: Environment-specific .env files

# .env.production
ENVIRONMENT=production
DATABASE_URL=postgresql://user:pass@ep-prod-123.us-east-1.aws.neon.tech/main
DATABASE_URL_POOLED=postgresql://user:pass@ep-prod-123.us-east-1.aws.neon.tech/main?pgbouncer=true&sslmode=require
STATEMENT_TIMEOUT=30000  # 30 seconds
POOL_SIZE=20
MAX_OVERFLOW=30

# .env.staging
ENVIRONMENT=staging
DATABASE_URL=postgresql://user:pass@ep-staging-456.us-east-1.aws.neon.tech/staging
DATABASE_URL_POOLED=postgresql://user:pass@ep-staging-456.us-east-1.aws.neon.tech/staging?pgbouncer=true&sslmode=require
STATEMENT_TIMEOUT=60000  # 60 seconds (more lenient)
POOL_SIZE=10
MAX_OVERFLOW=10

# .env.development
ENVIRONMENT=development
DATABASE_URL=postgresql://user:pass@ep-dev-789.us-east-1.aws.neon.tech/dev
STATEMENT_TIMEOUT=120000  # 2 minutes (debugging)
POOL_SIZE=5
MAX_OVERFLOW=5

# .env.test
ENVIRONMENT=test
DATABASE_URL=postgresql://user:pass@ep-test-999.us-east-1.aws.neon.tech/test
# No pooling for tests
```

### Branch Management

```bash
# Create development branch from production
neon branches create --name dev --parent main

# Create feature branch from development
neon branches create --name feature-orders --parent dev

# Reset feature branch to match dev (fresh start)
neon branches reset feature-orders --parent dev

# Delete feature branch after merge
neon branches delete feature-orders
```

### Migration Strategy

```python
# ✅ CORRECT: Run migrations on direct connection
# backend/scripts/migrate.py
import os
from alembic import command
from alembic.config import Config

def run_migrations(environment: str):
    """Run Alembic migrations on specified environment"""
    # Force direct connection for migrations
    os.environ["ENVIRONMENT"] = "migration"

    # Load environment config
    if environment == "production":
        os.environ["DATABASE_URL"] = os.getenv("PROD_DATABASE_URL")
    elif environment == "staging":
        os.environ["DATABASE_URL"] = os.getenv("STAGING_DATABASE_URL")
    else:
        os.environ["DATABASE_URL"] = os.getenv("DEV_DATABASE_URL")

    # Run migrations
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")

# Usage:
# python migrate.py --env production
```

## 3. Production-Safe Queries

Neon bills based on compute time. Efficient queries reduce costs and improve performance.

### Query Timeouts

```python
# ✅ CORRECT: Set statement timeout globally
# backend/src/database.py

# Set at connection level (recommended)
engine = create_engine(
    database_url,
    connect_args={
        "options": "-c statement_timeout=30000"  # 30 seconds
    }
)

# Or set per-session
from sqlalchemy import text

def get_session_with_timeout(timeout_ms: int = 30000):
    """Session with custom timeout"""
    with Session(engine) as session:
        session.execute(text(f"SET statement_timeout = {timeout_ms}"))
        yield session

# Or set per-query (for long-running reports)
def run_long_report(session: Session):
    """Increase timeout for specific query"""
    session.execute(text("SET LOCAL statement_timeout = 120000"))  # 2 minutes
    # Run long query
    result = session.execute(text("SELECT ..."))
    return result
```

### Efficient Query Patterns

```python
# ✅ CORRECT: Efficient pagination
from sqlmodel import select

def get_orders_paginated(
    skip: int = 0,
    limit: int = 100,
    session: Session
):
    """Efficient pagination with index usage"""
    statement = (
        select(Order)
        .where(Order.deleted_at.is_(None))  # Indexed column
        .order_by(Order.created_at.desc())  # Indexed column
        .offset(skip)
        .limit(limit)
    )
    return session.exec(statement).all()

# ❌ WRONG: Loading all records without limit
def get_all_orders(session: Session):
    """Dangerous - could load millions of rows"""
    return session.exec(select(Order)).all()  # No limit!
```

### Avoiding Full Table Scans

```python
# ✅ CORRECT: Use indexed columns in WHERE clauses
def get_recent_confirmed_orders(session: Session):
    """Uses composite index: (status, created_at)"""
    statement = (
        select(Order)
        .where(Order.status == "confirmed")  # Indexed
        .where(Order.created_at >= date.today() - timedelta(days=30))  # Indexed
        .order_by(Order.created_at.desc())
        .limit(100)
    )
    return session.exec(statement).all()

# ❌ WRONG: Filter on non-indexed column
def search_orders_by_notes(search_term: str, session: Session):
    """Full table scan - notes column not indexed"""
    statement = select(Order).where(Order.notes.contains(search_term))
    return session.exec(statement).all()
    # Use full-text search or ElasticSearch for text search instead

# ✅ CORRECT: Add full-text search index for text columns
from sqlalchemy import Index, text

class Order(SQLModel, table=True):
    __table_args__ = (
        # Full-text search index (PostgreSQL)
        Index(
            "ix_orders_notes_fulltext",
            text("to_tsvector('english', notes)"),
            postgresql_using="gin"
        ),
    )
```

### Aggregation Queries

```python
# ✅ CORRECT: Efficient aggregations with indexes
from sqlalchemy import func

def get_sales_summary(start_date: date, end_date: date, session: Session):
    """Aggregation using indexed columns"""
    result = session.exec(
        select(
            func.count(Order.id).label("order_count"),
            func.sum(Order.total).label("total_revenue")
        )
        .where(Order.status == "confirmed")  # Indexed
        .where(Order.created_at >= start_date)  # Indexed
        .where(Order.created_at <= end_date)
    ).one()

    return {
        "order_count": result.order_count,
        "total_revenue": result.total_revenue
    }

# ❌ WRONG: Loading all records to aggregate in Python
def get_sales_summary_bad(session: Session):
    """Inefficient - loads all data into memory"""
    orders = session.exec(select(Order)).all()  # Loads everything!
    total_revenue = sum(o.total for o in orders)  # Python aggregation
    return total_revenue
```

### Bulk Operations

```python
# ✅ CORRECT: Batch inserts
def create_bulk_orders(order_data_list: List[dict], session: Session):
    """Efficient bulk insert"""
    orders = [Order(**data) for data in order_data_list]
    session.bulk_save_objects(orders)
    session.commit()
    # Single transaction, one network round-trip

# ❌ WRONG: Individual inserts in loop
def create_bulk_orders_bad(order_data_list: List[dict], session: Session):
    """Inefficient - N inserts"""
    for data in order_data_list:
        order = Order(**data)
        session.add(order)
        session.commit()  # Don't commit in loop!
    # N transactions, N network round-trips
```

### Connection Monitoring

```python
# ✅ CORRECT: Monitor connection pool health
import logging
from sqlalchemy import event

logger = logging.getLogger(__name__)

@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Log new connections"""
    logger.info("New database connection established")

@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Log connection checkout from pool"""
    logger.debug("Connection checked out from pool")

@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_conn, connection_record):
    """Log connection return to pool"""
    logger.debug("Connection returned to pool")

# Monitor pool status
def get_pool_status():
    """Get current pool metrics"""
    pool = engine.pool
    return {
        "size": pool.size(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
        "max_overflow": pool._max_overflow
    }
```

## Cold Start Considerations

Neon databases auto-suspend after inactivity. The first request after idle has higher latency.

### Cold Start Mitigation

```python
# ✅ CORRECT: Health check with keep-alive
# backend/src/main.py
from fastapi import FastAPI, BackgroundTasks
import asyncio

app = FastAPI()

# Keep database warm with periodic ping
async def keep_database_warm():
    """Ping database every 4 minutes to prevent auto-suspend"""
    while True:
        try:
            with Session(engine) as session:
                session.execute(text("SELECT 1"))
            await asyncio.sleep(240)  # 4 minutes
        except Exception as e:
            logger.error(f"Keep-alive failed: {e}")
            await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    """Start keep-alive task"""
    if settings.environment == "production":
        asyncio.create_task(keep_database_warm())

# Simple health check
@app.get("/health")
async def health_check(session: Session = Depends(get_session)):
    """Health check with database ping"""
    try:
        session.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
```

### Pre-warming on Deploy

```bash
# ✅ CORRECT: Warm database after deployment
# scripts/post-deploy.sh
#!/bin/bash

echo "Warming database connection..."
curl -f https://api.kn-kitchen.com/health || exit 1

echo "Running test query..."
curl -f https://api.kn-kitchen.com/api/orders?limit=1 || exit 1

echo "Database warmed successfully"
```

## Backup and Recovery

Neon provides automatic backups. Understand the recovery process.

### Point-in-Time Recovery

```bash
# Create branch from specific timestamp (within retention period)
neon branches create \
  --name restore-20260115 \
  --parent main \
  --timestamp "2026-01-15T10:30:00Z"

# Test recovery on separate branch
neon branches create --name recovery-test --parent restore-20260115

# If recovery looks good, promote to main
# (Manual process - requires care with production data)
```

### Manual Backups

```bash
# ✅ CORRECT: Periodic pg_dump for extra safety
# scripts/backup.sh
#!/bin/bash

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/kn_kitchen_$TIMESTAMP.sql.gz"

mkdir -p $BACKUP_DIR

# Dump database (use direct connection)
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

# Upload to S3 or similar
aws s3 cp "$BACKUP_FILE" s3://kn-kitchen-backups/

# Keep last 30 days locally
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

## Security Best Practices

```python
# ✅ CORRECT: Secure connection configuration
engine = create_engine(
    database_url,
    connect_args={
        "sslmode": "require",  # Force SSL
        "sslrootcert": "/path/to/ca-certificate.crt",  # Verify server cert
        "connect_timeout": 10  # Connection timeout
    }
)

# Environment variables for secrets (never commit)
# .env (gitignored)
DATABASE_URL=postgresql://user:password@host/db

# Use secrets management in production
import os
from aws_secretsmanager import get_secret

def get_database_url():
    """Fetch database URL from secrets manager"""
    if settings.environment == "production":
        secret = get_secret("prod/database/url")
        return secret["DATABASE_URL"]
    return os.getenv("DATABASE_URL")
```

## Monitoring and Observability

```python
# ✅ CORRECT: Query performance monitoring
from sqlalchemy import event
import time

@event.listens_for(engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log slow queries"""
    conn.info.setdefault("query_start_time", []).append(time.time())

@event.listens_for(engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log query execution time"""
    total_time = time.time() - conn.info["query_start_time"].pop()

    if total_time > 1.0:  # Log queries over 1 second
        logger.warning(
            f"Slow query ({total_time:.2f}s): {statement[:100]}",
            extra={"duration": total_time, "query": statement}
        )
```

## Best Practices Checklist

Before deploying database code:

- [ ] **Pooled Connection**: Using `DATABASE_URL_POOLED` in production
- [ ] **Pool Size**: Configured based on expected load (not excessive)
- [ ] **Statement Timeout**: Set to prevent runaway queries (30s default)
- [ ] **Environment Isolation**: Separate branches/databases for dev/staging/prod
- [ ] **SSL Required**: `sslmode=require` in connection string
- [ ] **Indexed Queries**: WHERE/ORDER BY clauses use indexed columns
- [ ] **Pagination**: All list endpoints use LIMIT/OFFSET
- [ ] **No Full Scans**: Avoiding queries without indexed WHERE clauses
- [ ] **Bulk Operations**: Using batch inserts/updates, not loops
- [ ] **Timeouts Set**: Query timeouts prevent hanging requests
- [ ] **Monitoring**: Query performance logging enabled
- [ ] **Backups**: Automated or manual backup strategy in place

## Common Issues and Solutions

### Issue: Connection Pool Exhausted

```
sqlalchemy.exc.TimeoutError: QueuePool limit of size X overflow Y reached
```

**Solution:**
```python
# Increase pool size or investigate connection leaks
engine = create_engine(
    database_url,
    pool_size=20,  # Increase
    max_overflow=30,  # Increase
    pool_timeout=60  # Wait longer
)

# Or find leaking connections
# Ensure sessions are properly closed (use context manager)
```

### Issue: Statement Timeout

```
sqlalchemy.exc.OperationalError: canceling statement due to statement timeout
```

**Solution:**
```python
# Optimize query or increase timeout for specific query
session.execute(text("SET LOCAL statement_timeout = 60000"))  # 60s
# Or add index to speed up query
# Or use background job for long-running tasks
```

### Issue: Cold Start Latency

```
First request after idle: 2-3 seconds
Subsequent requests: 50-100ms
```

**Solution:**
```python
# Implement keep-alive ping (see above)
# Or accept cold starts for low-traffic apps
# Or upgrade to Neon tier with faster cold starts
```

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (Technical Stack)
- SQLModel ORM: `.claude/skills/sqlmodel-orm.md` (Query optimization)
- FastAPI Backend: `.claude/skills/fastapi-backend.md` (Session management)

---

**Remember**: Neon's serverless architecture requires connection pooling awareness, efficient queries, and proper timeout configuration. Follow these patterns to ensure reliable, cost-effective database operations.
