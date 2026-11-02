# B5 — I1–I12 prepared, NOT EXECUTED

Checkpoint: **B5 prepared for isolated integration — not approved for real migration**.
This matrix is preparation and self-check evidence, not an independent review or PostgreSQL PASS.

## Isolation and stop conditions

- A separately approved disposable PostgreSQL container and volume only; no business DB, uploads,
  production credentials, real cloud service or host-data mount. No provisioning is performed by tests.
- Exact database `drphynex_migration_guard_test`, database comment marker
  `drphynex:migration-guard-test:disposable-v1`, limited role without superuser/createdb/createrole/
  replication/bypassrls. The test role must not own other databases or business resources.
- Container running with label `com.drphynex.migration-guard-test=disposable-v1`, port 5432 mapped
  to the exact URL port on loopback. Docker network addresses and live server host address are
  normalized (inet text may have /32 or /128). Subnets are not accepted as server hosts.
- Identity from the URL connection must match read-only psql inside that exact container:
  database OID/name/marker, role, server port and postmaster start time. Fail closed on missing
  tooling, permission, auth, label, mapping or identity. Do not relax checks to make tests pass.
- Before every DROP SCHEMA or backend termination, verify that live proof again. A backend may
  only be terminated when it is uniquely identified as the guard actor blocked on this controller.
- Authorized reset scope: **public schema inside that one marked disposable database only**.
  Process cleanup: only the child returned by the fixture's own fork. No server/container cleanup
  command, database/role deletion or volume removal exists in the test suite.
- Generated files stay in the unique `drphynex-b5-correction-*` temp directory returned by mkdtemp.
  They are retained as evidence. Deleting it, the container or volume requires a separate approved
  cleanup using verified exact paths/IDs; never enumerate unrelated resources for deletion.
- One worker, serial files, bail=1, retry=0. First failed expectation/identity ends the run; no
  automatic rerun or remediation. Some cases contain different subscenarios, each reset and
  verified independently; they are not retries after a failed expectation.

## Observation and time limits

The controller retains ACCESS EXCLUSIVE on b5_gate in a transaction while the guard actor tries
the approved ALTER TABLE. PostgreSQL caches current-query snapshots inside a transaction too.
Each observation first calls `pg_stat_clear_snapshot()`; then pg_stat_activity must show the exact
DDL, database, role, application_name, lock wait and controller PID in pg_blocking_pids.
See [PostgreSQL 17 §27.2.2](https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-STATS-VIEWS).
This corrects the cached observation; increasing timeout is not a correction.

Observation deadline remains 5 seconds. Controller connection timeout 5s, statement timeout 5s,
query timeout 6s; Docker identity commands 10s, dump/listing 15s; waiting for owned child exit 5s.
The executor retains statement/lock/idle transaction timeouts 60s/10s/60s. Overall test/hook limits
remain 240s/60s. A failed bounded observation stops the test, not an invitation to wait longer.

## Matrix

| ID | Prepared scenario | Evidence required when authorized to execute |
| --- | --- | --- |
| I1 | All five real, LF-pinned migrations on a fresh schema | Correct history count/order, successful executor and state. This is schema execution evidence, not a business-data upgrade test. |
| I2 | Earlier migration commits, later ALTER references missing table | Earlier row remains, later transaction fails, FAILED latch refuses next automatic invocation. |
| I3 | Approved ALTER blocked by controller | Fresh snapshot proves exact blocked actor; competitor cannot acquire advisory lock; releasing controller lets run complete. |
| I4 | Terminate that exact verified backend | UNCERTAIN, no next migration, latch refuses restart. |
| I5 | AbortSignal while exact approved DDL is blocked | Executor closes, UNCERTAIN, no next migration. |
| I6 | Kill owned executor child after real lock wait is observed | Backend eventually releases lock, no next migration; actual state file blocks restart. Not a power-loss/disk-durability proof. |
| I7 | Deferred FK violation at COMMIT | Real server rejects COMMIT, xid aborted, history absent; FAILED only with matching evidence. |
| I8 | Real COMMIT, then acknowledgement masked by test adapter | xid committed and history present, runner UNCERTAIN, no retry. This simulates lost acknowledgement at the adapter, not a real network outage/failover. |
| I9 | Inject write-state failure at preparing, send intent, committed, COMPLETE | Fresh schema per subscenario; aborted xid before COMMIT, committed xid after ack; appropriate FAILED or STATE_FAILED latch. Injected I/O is not disk-full/power-loss validation. |
| I10 | Wrong prefix, negative id, null/NaN/fractional batch in actual history | Refuse before BEGIN; no state or history repair. Positive non-contiguous IDs also have unit coverage. |
| I11 | Backup checksum mismatch / archive rejected | Executor connection never opens. Valid archive listing is exercised elsewhere; no restore rehearsal is manufactured. |
| I12 | RUNNING/FAILED/UNCERTAIN/STATE_FAILED, unversioned and wrong identity markers | Refuse before connecting; never clear or convert marker automatically. |

I7–I8 construct an immutable **test-only plan in tests/guard/fixture-support.ts** to exercise executor
semantics not expressible by production grammar. The production CLI has no import, flag or env
switch for this constructor. Unit coverage proves deferred-constraint SQL fails production grammar.
Other scenarios use the same production buildPlan/SQL validator as the real CLI.

## What this matrix does not approve

Even 12/12 future PASS is not permission to migrate a business database. Still required:

- Atomic state replacement (temp file/fsync/rename/directory fsync where supported) and a
  separately owner-provisioned volume anchor checked before connecting. These are **not yet
  implemented**; missing/empty mounts can otherwise lose the previous latch. Current truncated
  JSON fails closed, but losing the whole file/volume is a separate risk.
- Independently verified backup and restore rehearsal of the exact target/artifact; business-data
  upgrade checks and a deliberate recovery decision. Down migrations are not the default recovery.
- Neon/direct endpoint validation: verify-full/TLS, limited role, marker/branch identity,
  search_path, pg_xact_status/pg_current_xact_id visibility, single writable primary and failover
  fencing. None is proved by local mocks or by Docker PostgreSQL.
- One CI migration executor, durable shared state, manual approval and owner reconciliation after
  every failed/uncertain run. Restrict credentials so raw `payload migrate:*` cannot bypass the
  approved operational workflow. Owners holding arbitrary shell/credentials cannot be sandboxed.

No integration, Docker test, PostgreSQL connection, migration, restore or cloud operation was
executed while preparing this checkpoint.
