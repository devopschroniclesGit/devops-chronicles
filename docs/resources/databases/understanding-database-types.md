---
title: Understanding Database Types
description: How to choose the right database for your workload — relational, document, key-value, time-series, and graph databases compared with real use cases.
tags: [databases, architecture, fundamentals]
---

# Understanding Database Types

A complex application rarely uses just one database. Different workloads have fundamentally different access patterns, and picking the wrong database type creates performance problems that are expensive to fix after the fact.

This guide covers the main database categories, what problems each solves, and how to decide which to use.

## Relational Databases (SQL)

**Examples:** PostgreSQL, MySQL, SQLite

**Data model:** Tables with rows and columns. Relationships between tables enforced by foreign keys. Schema defined upfront.

**What they are good at:**
- Complex queries joining multiple tables
- Transactions that must be atomic (all succeed or all fail)
- Data integrity enforced at the database level
- Reporting and analytics on structured data

**Example use case:** An e-commerce order system. An order has a customer, line items, a shipping address, and a payment. All of this is related, the relationships matter, and you cannot have an order without a valid customer ID.

```sql
-- This query is natural in a relational database
SELECT
  o.id,
  c.name,
  c.email,
  SUM(oi.quantity * oi.unit_price) as total
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, c.name, c.email
ORDER BY total DESC;
```

**When not to use:**
- Storing millions of heterogeneous documents with varying fields
- High-velocity time-series data (metrics, sensor readings)
- Simple key-value lookups where a full relational engine is unnecessary overhead

---

## Document Databases (NoSQL)

**Examples:** MongoDB, CouchDB, DynamoDB (in document mode)

**Data model:** JSON-like documents, grouped into collections. No fixed schema — each document can have different fields.

**What they are good at:**
- Content where the structure varies between records
- Rapid iteration when the schema is still evolving
- Hierarchical data that maps naturally to JSON
- Horizontal scaling across many servers

**Example use case:** A product catalogue where different product types (laptops, clothing, food) have completely different attributes. A laptop has RAM and CPU specs; clothing has size and colour; food has ingredients and expiry dates. Forcing these into a relational table means either many null columns or a complex EAV (entity-attribute-value) pattern.

```json
// Each product document has whatever fields make sense for that product
{
  "_id": "prod_001",
  "type": "laptop",
  "name": "ThinkPad X1",
  "price": 1299.99,
  "specs": {
    "ram_gb": 16,
    "cpu": "Intel i7-1260P",
    "storage_gb": 512,
    "display_inches": 14
  }
}
```

**When not to use:**
- When data relationships are complex and you need to join across collections frequently — this is expensive in document databases
- When data integrity and ACID transactions are critical

---

## Key-Value Stores

**Examples:** Redis, Memcached, DynamoDB (in key-value mode)

**Data model:** A simple dictionary — a key maps to a value. The database does not know or care what the value contains.

**What they are good at:**
- Caching — storing the result of expensive database queries or API calls
- Session storage — mapping a session token to user data
- Rate limiting — tracking how many requests a user has made
- Pub/sub messaging

**Example use case:** Caching the result of a complex database query. The query takes 800ms. Cache the result in Redis with a 60-second TTL. For the next 60 seconds, the result is served from memory in under 1ms.

```python
import redis
import json

cache = redis.Redis(host='localhost', port=6379)

def get_user_dashboard(user_id: str) -> dict:
    cache_key = f"dashboard:{user_id}"

    # Check cache first
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    # Cache miss — fetch from database (slow)
    data = fetch_dashboard_from_db(user_id)

    # Store in cache for 60 seconds
    cache.setex(cache_key, 60, json.dumps(data))

    return data
```

**When not to use:**
- As a primary database — key-value stores are not designed for complex queries or relationships
- When you need to search across values, not just look up by key

---

## Time-Series Databases

**Examples:** InfluxDB, TimescaleDB, Prometheus (with its own storage)

**Data model:** Data points indexed by timestamp. Optimised for write-heavy workloads where you are continuously appending measurements.

**What they are good at:**
- Infrastructure metrics (CPU, memory, disk over time)
- Application performance monitoring
- IoT sensor data
- Financial tick data

**Why not just use PostgreSQL?** You can, and TimescaleDB is built on top of PostgreSQL. But a purpose-built time-series database handles the specific access patterns much better — queries like "average CPU over the last 5 minutes grouped into 30-second buckets" are first-class operations.

```sql
-- InfluxDB query syntax
SELECT mean("cpu_usage")
FROM "system_metrics"
WHERE time >= now() - 1h
GROUP BY time(5m), "host"
```

**When not to use:**
- When the time dimension is not the primary way you query your data
- For general-purpose application data

---

## How To Choose

Answer these questions in order:

**1. Do you need ACID transactions across multiple records?**
If yes → Relational (PostgreSQL is almost always the right default)

**2. Is your schema highly variable or evolving rapidly?**
If yes → Document store (MongoDB)

**3. Is your primary access pattern a simple key lookup?**
If yes → Key-value store (Redis, but probably as a cache layer on top of another DB)

**4. Is your data fundamentally time-ordered measurements?**
If yes → Time-series (InfluxDB or TimescaleDB)

**5. Is your data a network of relationships (social graphs, recommendation engines)?**
If yes → Graph database (Neo4j)

## A Realistic Production Stack

Most production systems use multiple databases:

```
┌─────────────────────────────────────────────┐
│             Application                      │
└──────┬──────────┬──────────────┬────────────┘
       │          │              │
       ▼          ▼              ▼
  PostgreSQL    Redis        InfluxDB
  (primary     (caching,    (metrics,
   data)        sessions)    monitoring)
```

This is not over-engineering — each database is doing the job it was designed for.
