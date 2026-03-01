# IceCave v2 Architecture (Draft)

> Status: working draft  
> Audience: IceCave maintainers (especially folks new to database internals)  
> Primary goal: design a high-performance JSON-native database service with atomic updates, transactions, roles, and before/after streaming.

---

## 1) Why IceCave v2 exists

IceCave v1 is a great lightweight in-memory + flat-file store, but the v2 feature set pushes us into "real database engine" territory:

- Query by JSON Schema (existing concept, keep and improve)
- Update by JSON Patch (existing concept, keep and improve)
- Atomic updates
- Multi-operation transactions
- High performance
- Role-based access control (RBAC)
- Streaming of before/after updates

Given those requirements, especially **high performance + schema-heavy filtering**, the recommended implementation language is:

## ✅ Language recommendation: **C++ (C++20/23)**

### Why C++ for this project

1. **Direct use of Sourcemeta Blaze/Core** (no FFI bridge overhead)
   - Blaze: <https://github.com/sourcemeta/blaze>
   - Core: <https://github.com/sourcemeta/core>
2. Better control over latency-critical paths (allocators, threading, cache locality)
3. Mature options for storage internals (e.g., RocksDB)
4. Fits systems-style components (WAL, LSM, MVCC, CDC streaming)

### Strong alternative

- **Rust + C++ bridge to Blaze**: safer memory model, but introduces binding complexity and potential perf overhead at boundaries.

---

## 2) Key concepts (quick glossary)

If you are new to DB internals, these are the terms that matter most:

- **WAL (Write-Ahead Log)**: append a durable log record *before* acknowledging writes.  
  Ref: <https://en.wikipedia.org/wiki/Write-ahead_logging>
- **LSM tree (Log-Structured Merge-Tree)**: write-optimized storage structure using memtables + immutable files + compaction.  
  Ref: Original paper summary: <https://oleksii.shmalko.com/biblio/oneil1996-log-struc-merge-tree-lsm-tree/>
- **SSTable**: sorted immutable table files used by LSM engines (popularized by Bigtable/LevelDB/RocksDB).  
  Ref: Bigtable paper: <https://research.google/pubs/pub27898/>
- **MVCC (Multi-Version Concurrency Control)**: keep multiple versions so readers get consistent snapshots while writers continue.  
  Ref: <https://en.wikipedia.org/wiki/Multiversion_concurrency_control>
- **Snapshot isolation**: transaction isolation where each tx reads a stable snapshot.  
  Ref: <https://en.wikipedia.org/wiki/Snapshot_isolation>
- **CDC (Change Data Capture)**: stream changes to consumers.  
  Ref: <https://en.wikipedia.org/wiki/Change_data_capture>
- **JSON Schema**: query/match documents by schema constraints.  
  Ref: <https://json-schema.org/>
- **JSON Patch (RFC 6902)**: standard patch format for document updates.  
  Ref: <https://datatracker.ietf.org/doc/html/rfc6902>
- **JSON Pointer (RFC 6901)**: pointer syntax used by JSON Patch paths.  
  Ref: <https://datatracker.ietf.org/doc/html/rfc6901>

---

## 3) High-level architecture

```text
                +-------------------------------+
                |         Client API            |
                |  HTTP/gRPC + auth token/JWT  |
                +---------------+---------------+
                                |
                                v
                +---------------+---------------+
                |     Request Router / RBAC     |
                |  role checks + policy filters |
                +---------------+---------------+
                                |
             +------------------+------------------+
             |                                     |
             v                                     v
+------------+------------+             +----------+-----------+
| Query/Update Engine     |             | Transaction Manager  |
| - JSON Schema compile   |             | - snapshots (MVCC)   |
| - plan + index pruning  |             | - OCC/conflict check |
| - JSON Patch apply      |             | - commit protocol    |
+------------+------------+             +----------+-----------+
             |                                     |
             +------------------+------------------+
                                |
                                v
                +---------------+---------------+
                |      Storage Engine (LSM)     |
                | WAL | Memtable | SSTables     |
                +---------------+---------------+
                                |
                                v
                +---------------+---------------+
                |   CDC/Streaming from commit   |
                | before/after + cursors        |
                +-------------------------------+
```

---

## 4) Core implementation choices

## 4.1 Storage layer: WAL + LSM

### Write path

1. Validate request/authz
2. Begin tx context (single-op tx for ordinary writes)
3. Append mutation intent to **WAL**
4. fsync policy (sync every write, or group commit)
5. Apply to in-memory structure (memtable / indexes)
6. Ack to client
7. Async flush to SSTables + background compaction

### Why this model

- High write throughput (mostly sequential appends)
- Good crash recovery (WAL replay)
- Mature design used by many systems

### Reference engines/designs

- RocksDB: <https://rocksdb.org/>
- LevelDB: <https://github.com/google/leveldb>
- Pebble (Go LSM inspired by RocksDB): <https://github.com/cockroachdb/pebble>
- WiredTiger architecture notes: <https://source.wiredtiger.com/>

> MVP suggestion: use an embedded proven engine first (RocksDB) so we can focus on query semantics, tx behavior, and streaming contracts.

---

## 4.2 JSON Schema query engine (Sourcemeta-first)

### Plan

- Accept schema query payload from client
- Normalize/canonicalize schema for stable cache keys
- Compile via Blaze once, cache compiled evaluator
- Use query planner to extract index-friendly predicates (e.g., const/enums/range-ish constraints)
- Candidate retrieval via indexes
- Final correctness filter via Blaze validator

### Why this split (planner + validator)

- Indexes accelerate broad scans
- Blaze guarantees standards-compliant evaluation
- Prevents subtle correctness bugs from home-grown schema logic

### Sourcemeta references

- Blaze: <https://github.com/sourcemeta/blaze>
- Core: <https://github.com/sourcemeta/core>
- Sourcemeta JSON Schema CLI: <https://github.com/sourcemeta/jsonschema>
- JSON Schema docs portal: <https://www.learnjsonschema.com/>

### Standards references

- JSON Schema drafts and vocabularies: <https://json-schema.org/specification>
- Output formats: <https://json-schema.org/draft/2020-12/json-schema-core.html#name-output-formats>

---

## 4.3 JSON Patch update engine

### Update semantics

For a matching document:

1. Load latest visible version
2. Capture **before** image
3. Apply RFC 6902 patch on copy
4. Optionally validate **after** against collection schema
5. Persist new version atomically
6. Emit before/after event

### Important edge cases

- Invalid pointer paths
- `test` op failures (must abort patch)
- Concurrent write conflicts
- Large-array patch costs

References:
- RFC 6902 JSON Patch: <https://datatracker.ietf.org/doc/html/rfc6902>
- RFC 6901 JSON Pointer: <https://datatracker.ietf.org/doc/html/rfc6901>

---

## 4.4 Atomic updates + transactions

### Transaction model (recommended starting point)

- Isolation target: **Snapshot Isolation** for read consistency
- Concurrency strategy: **optimistic** (OCC) conflict checks on commit
- Single-document updates run as implicit transactions
- Multi-document tx support with explicit begin/commit/rollback APIs

### Commit protocol (simplified)

1. Tx begins with snapshot timestamp/version
2. Reads and staged writes tracked in tx context
3. At commit, verify documents in write set not modified since snapshot
4. If conflicts: abort + return retryable error
5. If no conflicts: append `tx_commit` with all changes to WAL atomically
6. Publish commit to stream

Useful reading:
- Transaction processing concepts (classic text): <https://dl.acm.org/doi/book/10.5555/573304>
- Snapshot isolation anomalies paper: <https://www.microsoft.com/en-us/research/publication/a-critique-of-ansi-sql-isolation-levels/>

---

## 4.5 Role support (RBAC + optional row filters)

### Baseline RBAC

Roles define permissions at least at:

- database/collection scope
- operation scope (`query`, `insert`, `update`, `delete`, `tx`, `subscribe`)

### Optional advanced policy

- Role-attached row filter schemas (e.g., tenant isolation)
- Field-level filtering/masking on stream payloads

References:
- NIST RBAC model: <https://csrc.nist.gov/projects/role-based-access-control>
- Zanzibar-style relationship-based authorization (inspiration): <https://research.google/pubs/pub48190/>
- OpenFGA (practical authz engine idea): <https://openfga.dev/>

---

## 4.6 Before/after update streaming (CDC)

### Principle

Treat committed transaction log as the source of truth for change streams.

- stream is ordered by commit sequence number (LSN/offset)
- clients subscribe from `now` or a specific offset
- events are durable and replayable

### Delivery semantics

- Start with **at-least-once** delivery (simple and robust)
- Include idempotency keys (`event_id`, `tx_id`, `seq`) for consumer dedupe
- Add explicit ack + resume token/cursor

References:
- Debezium concepts (CDC patterns): <https://debezium.io/documentation/reference/stable/architecture.html>
- Kafka log/offset mental model: <https://kafka.apache.org/documentation/#design>

---

## 5) Example event format (for v2 doc + implementation target)

Below is a **concrete example format** using 3 event types:

- `tx_begin`
- `doc_update` (contains `before` + `after`)
- `tx_commit`

This keeps replay/debugging human-readable and easy to build against.

```json
{
  "event_id": "01JNW8Q9SFC4J2R8TQ8Y6D4W2T",
  "type": "tx_begin",
  "stream": "main",
  "offset": 918273,
  "tx_id": "tx_8f4cc1e8",
  "timestamp": "2026-03-01T08:00:00.123Z",
  "actor": {
    "subject": "user:lucian",
    "roles": ["admin"]
  },
  "meta": {
    "request_id": "req_4c7f",
    "isolation": "snapshot"
  }
}
```

```json
{
  "event_id": "01JNW8QAZWQ1Y8W7QQ4VQVD0GJ",
  "type": "doc_update",
  "stream": "main",
  "offset": 918274,
  "tx_id": "tx_8f4cc1e8",
  "timestamp": "2026-03-01T08:00:00.125Z",
  "collection": "pokemon",
  "doc_id": "2",
  "version_before": 41,
  "version_after": 42,
  "patch": [
    { "op": "replace", "path": "/name", "value": "Beedrill" },
    { "op": "add", "path": "/type", "value": ["bug", "poison"] }
  ],
  "before": {
    "id": 2,
    "name": "Bulbasaur"
  },
  "after": {
    "id": 2,
    "name": "Beedrill",
    "type": ["bug", "poison"]
  },
  "schema": {
    "query_id": "sha256:c8b4...",
    "validator": "sourcemeta-blaze"
  }
}
```

```json
{
  "event_id": "01JNW8QBVQQ5ZK3P2P7Y3DV1B4",
  "type": "tx_commit",
  "stream": "main",
  "offset": 918275,
  "tx_id": "tx_8f4cc1e8",
  "timestamp": "2026-03-01T08:00:00.127Z",
  "summary": {
    "writes": 1,
    "collections": ["pokemon"],
    "status": "committed"
  },
  "checksum": "xxh3:8b7d..."
}
```

### Notes on this format

- `offset` is monotonically increasing per stream
- `tx_id` ties all events together
- `before`/`after` enables downstream projections + audit trails
- `patch` is included for semantic replay/debug (optional if size-sensitive)
- `actor.roles` allows authorization audit and forensic analysis

---

## 6) Data model proposal

### Record layout (conceptual)

Each document version stores:

- `collection`
- `doc_id`
- `version`
- `commit_ts` / `offset`
- `payload` (JSON or binary)
- `deleted` tombstone flag
- `actor` metadata

### Key layout example (LSM-friendly)

- Primary: `c/<collection>/d/<doc_id>/v/<version>`
- Latest pointer: `c/<collection>/d/<doc_id>/latest -> version`
- Secondary index (path-based): `i/<collection>/<json_path>/<encoded_value>/<doc_id>`

> Keep secondary indexes minimal in MVP (e.g., exact-match paths only) and expand once perf traces justify it.

---

## 7) API surface (first pass)

### Query

`POST /v2/collections/:name/query`

```json
{
  "schema": { "type": "object", "properties": { "id": { "const": 2 } } },
  "limit": 100,
  "cursor": null,
  "consistency": "snapshot"
}
```

### Update by patch

`POST /v2/collections/:name/update`

```json
{
  "match": { "type": "object", "properties": { "id": { "const": 2 } } },
  "patch": [{ "op": "replace", "path": "/name", "value": "Beedrill" }],
  "return": "after"
}
```

### Transactions

- `POST /v2/tx/begin`
- `POST /v2/tx/:id/query`
- `POST /v2/tx/:id/update`
- `POST /v2/tx/:id/commit`
- `POST /v2/tx/:id/rollback`

### Streaming

`GET /v2/streams/main?from_offset=918000`

- server-sent events (SSE) for simplicity in MVP, then gRPC streams if needed

References:
- SSE MDN: <https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events>
- gRPC streaming guide: <https://grpc.io/docs/what-is-grpc/core-concepts/>

---

## 8) Performance strategy checklist

1. **Schema compile cache** keyed by canonical query hash
2. **Read path short-circuit** via indexes before full schema eval
3. **Batch fsync/group commit** for write-heavy workloads
4. **Shard-by-collection or hash(doc_id)** to reduce lock contention
5. **Use simdjson for parse-heavy paths** where possible
   - <https://github.com/simdjson/simdjson>
6. **Memory pooling/arenas** on hot allocations
7. **Explicit perf budget & benchmarks** per operation type

Benchmark references:
- YCSB (general key-value workload benchmark): <https://github.com/brianfrankcooper/YCSB>
- Criterion-style benchmarking concepts (language-specific variants exist)

---

## 9) Correctness/testing strategy

### Must-have test categories

- JSON Schema compliance tests (where practical)
- JSON Patch RFC behavior tests
- Transaction conflict/isolation tests
- Crash recovery tests (kill process between WAL append and memtable apply)
- Stream ordering + resume tests
- RBAC authorization unit + integration tests

### Tooling ideas

- Property-based testing for patch + rollback invariants
  - Hypothesis concept: <https://hypothesis.works/>
- Jepsen-style inspiration for consistency thinking
  - <https://jepsen.io/>

---

## 10) Suggested phased roadmap

## Phase 0 — Architecture spike (1–2 weeks)

- Decide storage base (RocksDB vs custom LSM prototype)
- Implement minimal write/read with WAL durability
- Integrate Blaze-based query evaluation in a toy path

## Phase 1 — Single-node core (2–4 weeks)

- Collections, insert/query/update/delete
- JSON Patch updates
- Basic schema compile cache
- Basic RBAC

## Phase 2 — Transactions + CDC (2–4 weeks)

- Snapshot tx manager
- Conflict detection + commit protocol
- before/after event stream with resume offset

## Phase 3 — Performance & hardening

- Index planner improvements
- Backpressure + flow control for streams
- Tuning compaction, batching, and parallelism
- Benchmarks + regression gates

---

## 11) Risks and mitigations

1. **Scope explosion** (DB engines are deceptively deep)
   - Mitigation: strict MVP boundaries + phased rollout
2. **Index/query complexity from full JSON Schema semantics**
   - Mitigation: treat Blaze as final arbiter; keep index planner conservative
3. **Streaming payload bloat from before/after blobs**
   - Mitigation: configurable projection/compression and field masks
4. **Compaction-induced latency spikes**
   - Mitigation: rate-limited compaction, write stalls, observability

---

## 12) Reference reading list (starter pack)

### JSON + schema

- JSON Schema home: <https://json-schema.org/>
- JSON Schema specs: <https://json-schema.org/specification>
- Learn JSON Schema: <https://www.learnjsonschema.com/>
- RFC 6902 JSON Patch: <https://datatracker.ietf.org/doc/html/rfc6902>
- RFC 6901 JSON Pointer: <https://datatracker.ietf.org/doc/html/rfc6901>

### Sourcemeta ecosystem

- Blaze: <https://github.com/sourcemeta/blaze>
- Core: <https://github.com/sourcemeta/core>
- JSON Schema CLI: <https://github.com/sourcemeta/jsonschema>
- Sourcemeta org: <https://github.com/sourcemeta>

### Database internals

- WAL overview: <https://en.wikipedia.org/wiki/Write-ahead_logging>
- LSM tree (paper reference): <https://oleksii.shmalko.com/biblio/oneil1996-log-struc-merge-tree-lsm-tree/>
- Bigtable paper: <https://research.google/pubs/pub27898/>
- RocksDB docs: <https://github.com/facebook/rocksdb/wiki>
- MVCC overview: <https://en.wikipedia.org/wiki/Multiversion_concurrency_control>
- Snapshot isolation: <https://en.wikipedia.org/wiki/Snapshot_isolation>

### CDC + streaming

- CDC overview: <https://en.wikipedia.org/wiki/Change_data_capture>
- Debezium architecture: <https://debezium.io/documentation/reference/stable/architecture.html>
- Kafka design: <https://kafka.apache.org/documentation/#design>

### Authorization

- NIST RBAC project: <https://csrc.nist.gov/projects/role-based-access-control>
- Zanzibar paper: <https://research.google/pubs/pub48190/>
- OpenFGA docs: <https://openfga.dev/docs>

---

## 13) Next concrete actions

1. Pick storage baseline (recommend: RocksDB-backed MVP)
2. Define canonical internal document envelope (id/version/actor/timestamps)
3. Implement a tiny `doc_update` commit log prototype with before/after payloads
4. Wire Blaze into `query` path and benchmark vs AJV baseline
5. Establish perf SLOs for:
   - p50/p95 query latency
   - patch update latency
   - tx commit latency
   - stream lag

---

If this direction looks right, next doc should be a **"v2 implementation plan"** with concrete module boundaries, classes/interfaces, and a first milestone task list.
