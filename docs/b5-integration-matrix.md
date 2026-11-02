# B5 — harness corrections; I1–I12 NOT EXECUTED

Baseline: `5a167e19387c645c7479bcbdbb56db76db2b23d2`.
This checkpoint is **ready for harness review only**. It is neither integration PASS nor permission
for a business migration. Production executor, SQL grammar, dependency, migration and approved
manifest remain unchanged. Atomic state and volume anchor remain real-migration blockers.

## Explicit disposable resource approval

Use an owner-approved JSON file outside Git, shaped like
[resources.example.json](../tests/guard/resources.example.json). Example IDs are deliberately
invalid placeholders. The declaration lists the exact container ID, every loopback port mapping,
every named-volume mount (name, destination, read-only flag), and every network attachment
(name and full ID). No resource is created, labelled, repaired or removed by the harness.

Before connecting and before destructive operations, enforce:

- Exact approved running container ID and disposable label; only the declared database
  `drphynex_migration_guard_test`, marker `drphynex:migration-guard-test:disposable-v1` and limited role.
- Check **all** port bindings, including other container ports. Any public/wildcard binding fails,
  even if another mapping is valid. The complete binding set must equal the declaration.
- No bind mounts. Every volume mount must equal the declaration. Volumes require local driver,
  local scope, no driver options, disposable label and no other container user (including stopped
  containers). Owner must still verify the provenance/content of every approved resource.
- Every network name/ID must equal the declaration; host/container network modes fail. Network
  inspect must show internal bridge, disposable label and no other attached container.
- Live SQL identity must match the approved container's psql identity: database OID/name/marker,
  role, server port and postmaster start time. Normalize only host /32 or /128 masks; reject subnets
  or mismatched server addresses. Missing tool/auth/permission/identity always fails closed.

Every DROP SCHEMA and backend termination rechecks proof. Only the public schema in that exact
disposable database may be reset. No down migration, DB/role deletion, Docker stop/rm or volume/network
removal exists. A terminated backend must be the unique guard actor blocked by this controller.

## Clean entry point and retained evidence

When separately approved to run (NOT in the current preparation/review), use:

`node tests/guard/run-integration.mjs`

Explicit inputs: MIGRATION_GUARD_TEST_URL, MIGRATION_GUARD_TEST_CONTAINER (full approved ID),
B5_TEST_RESOURCES_FILE (absolute approved JSON path). There is no .env discovery: integration config
sets envDir:false. Existing package scripts are unchanged; the bare Vitest entry does not establish
the launcher context and must not be used as a substitute.

The launcher creates its own temp run directory and empty Docker config; it forwards only explicit
test variables and minimal system paths (SystemRoot/WINDIR/PATH/PATHEXT/TEMP/TMP/LANG). Heap is fixed
2048 MiB. Real DATABASE_URL, AWS/SMTP credentials, HOME/USERPROFILE, NODE_OPTIONS imports, remote Docker
context/host/config are not inherited. Docker is pinned to the local Windows pipe or Unix socket.
The process-death child receives an independently filtered test-only environment. Sentinel tests
check these boundaries without reading real secrets or spawning a child.

Raw child output is suppressed because an unexpected reporter error could include a credential.
The test-only safe reporter retains only I-number and pass/fail/skip/unknown in results.json in the
owned run directory. No raw title/error/SQL is copied. State artifacts stay under a unique case-
subdirectory there. They are retained, never automatically deleted. Launcher deadline is 1 hour;
it requests stop on its own child and bounds force-stop handling. Forced termination is an uncertain
cleanup event: verify owned workers/backend state manually, never infer successful completion or
rerun automatically. It does not terminate unrelated processes or containers.

I6 cleanup registers only the child returned by its own fork, recognizes exitCode **or signalCode**,
checks again after listener registration, shares a bounded wait and is idempotent. Already-exited
children are never killed or waited for a second event. No global PID kill operation exists.

## Observation, bounds and stopping

The controller holds ACCESS EXCLUSIVE on b5_gate in a transaction while the actor executes ALTER
TABLE. Before **each** poll it calls pg_stat_clear_snapshot(), then requires exact DDL/database/role/
application_name and its own PID in pg_blocking_pids. See
[PostgreSQL 17 §27.2.2](https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-STATS-VIEWS).
Polling remains 5s; a failed observation is an error, not a reason to extend the timeout.

Controller connection/statement/query timeouts: 5s/5s/6s; Docker identity/list commands 10s,
dump/listing 15s; owned-child wait 5s. Executor's existing statement/lock/idle limits stay 60s/10s/60s.
One worker, serial files, bail=1, retry=0. Overall test/hook limits remain 240s/60s. First failed
expectation stops the run; subscenarios reset independently, never retry a failed expectation.

## Matrix and assertions

Every started scenario checks relevant DB effect/history/state and deliberate next-invocation
behavior. Such an invocation is an assertion, not an automatic retry. Failed/uncertain latches
must refuse before further actor queries; successful repeat must be a no-op with unchanged history
and state. Preflight failures remain refusals without starting a transaction, not invented latches.

| ID | Mechanism | Required evidence in prepared code |
| --- | --- | --- |
| I1 | Five real migrations | Ordered names/batch=1, key tables/storage columns, COMPLETE/last committed phase, repeat no BEGIN/COMMIT/history/state changes. |
| I2 | Later ALTER fails | m1 retained, FAILED/last m1 committed, missing next SQL/effect, one attempt per statement, restart refused. |
| I3 | Controller blocks actor | Fresh exact lock wait; competitor denied, controller release permits all history and SQL effects, COMPLETE and repeat no-op. |
| I4 | Terminate exact actor | m1 history retained, UNCERTAIN, blocked ALTER rolled back, no next SQL/effect, restart refused. |
| I5 | AbortSignal during block | Same history/state/effect/restart checks as I4, without killing an unrelated backend. |
| I6 | Kill registered child | Correct bounded/idempotent cleanup, advisory lock eventually released, m1 history and real RUNNING/committed marker retained, no next effect, restart refuses unchanged state/history. |
| I7 | Deferred FK at COMMIT | Server rejection, aborted xid on independent controller, no history or next SQL/effect, FAILED/commit-sent, restart refused. |
| I8 | Adapter throws after q(COMMIT) resolves | Explicit **after-ack adapter simulation**, not transport loss; independent committed xid/m1 history, UNCERTAIN/commit-sent, no next SQL/effect, restart refused. |
| I9 | Inject state write errors | Shared live/memory assertion: exact ordered history/batch; persisted file marker identity/plan/step/outcome/phase/xid; independently queried xid outcomes and committed table effects; SQL/COMMIT counts; refused restart with identical marker/history/effects/xids and no actor queries. COMPLETE failure requires both committed steps. Not a disk-power-loss test. |
| I10 | Malformed actual history | Reject before BEGIN; preserve full original id/name/batch rows, no state or SQL effect, deliberate second call still rejects. |
| I11 | Bad backup and failure/invalid-state preflight | Zero actor connections, unchanged marker/history, no next effect; second invocation still refuses without side effects. |
| I12 | **Transport cuts COMMIT response** | Proxy sees frontend Q COMMIT and backend C COMMIT; withholds all response frames (including ReadyForQuery), closes client, actor UNCERTAIN; independent direct connection verifies exact xid committed and m1 history; no next SQL/effect, restart refused. |

I7–I8 plans that exceed production grammar remain confined to test harness. Production CLI has no
import/flag/env switch for them. I12 uses the ordinary production-valid plan, with a test-only
connection adapter to a proxy; production executor/driver/CLI have not been altered.

## I12 transport: implemented, NOT proven against PostgreSQL yet

The proxy is created only when I12's connect callback runs after explicit identity verification.
It owns one exclusive ephemeral 127.0.0.1 listener and one upstream connection to the approved
loopback endpoint. It only supports plaintext PostgreSQL v3, one actor and simple-query COMMIT;
it refuses TLS negotiation rather than disabling TLS on another target. Test lab must explicitly
allow plaintext on this isolated local route. It is not a general PG proxy or a Neon failover test.

Bounded protocol parsing uses complete frames, 1 MiB frame and 2 MiB buffering/backpressure limits.
All backend bytes after forwarding COMMIT are held; only observing the server's CommandComplete
COMMIT provides server-side evidence. Neither that tag nor ReadyForQuery is delivered to pg client.
Evidence contains counters/booleans only; no credentials or SQL packets are logged or persisted.
Idle sockets are bounded at 15s, proxy lifetime 30s, close 5s. It destroys only sockets/listener it owns.

Pure-memory tests exercise every frontend/backend split, rejection/error/oversize cases, and absence
of raw sentinel data in evidence. **They do not prove real sockets, authentication, server commit,
client loss detection or independent xid visibility.** I12 must still be reviewed and executed on
approved disposable PostgreSQL before any transport PASS claim.

## Real migration remains blocked

Atomic state replacement and an owner-provisioned volume anchor are not implemented in production.
A missing/empty mount can lose the latch; corrupted JSON refusing is not equivalent to preserving it.
Also pending: actual I1–I12 execution, approved backup/restore rehearsal, business-data upgrade checks,
Neon TLS/role/marker/search_path/xid diagnostics/failover fencing, durable shared state, one CI executor
and operational restrictions on raw Payload migration tools. No down migration is the default recovery.

This revision executed typecheck/lint/unit/diff only. No Docker command, socket listener, PostgreSQL,
integration, migration, build, push, deploy or cloud operation was run. Self-check is not independent review.

## I9 persisted evidence correction

Only I9 assertions and their memory sensitivity tests changed after checkpoint 39d36a1.
The failing write value is captured separately; assertions read last-state.json after executor error
handling and compare it with the fixture state. A failed write is never treated as persisted.

| Injected write | Last persisted marker after catch | History / SQL effect | Independent xid |
| --- | --- | --- | --- |
| RUNNING/commit-preparing, m1 | FAILED/commit-preparing, m1 | Empty history; first and next tables absent | m1 aborted |
| RUNNING/commit-sent, m1 | FAILED/commit-preparing, m1 | Empty history; first and next tables absent; no COMMIT sent | m1 aborted |
| RUNNING/committed, m1 | STATE_FAILED/committed, m1 | m1 batch=1; first table present, next absent | m1 committed |
| COMPLETE/committed, m2 | STATE_FAILED/committed, m2 | m1 then m2, batch=1; both tables present | Both distinct xids committed |

The catch writes above are not targeted by the injection. For send-intent failure the executor has
not advanced its in-memory phase, hence the final marker is commit-preparing. All branches require
version=2, correct identity/plan/step/xid and zero additional actor queries or changed evidence on
refused restart. Non-COMPLETE branches reject any execution of the next SQL, including one rolled
back with no table effect. Shared-helper memory tests mutate identity/plan/step/outcome/phase/xid,
history names/order/batch, effects, query trace and restart evidence; they do not prove PostgreSQL
behavior. Docker/PostgreSQL/integration remain NOT EXECUTED. Atomic state and volume anchor remain
real-migration blockers, unchanged by this assertion-only checkpoint.

Verification of this assertion-only revision: TypeScript noEmit/incremental=false PASS; ESLint
max-warnings=0 PASS; 450/450 pure-memory unit tests across 13 files PASS (88 new I9 sensitivity
cases), serial one worker, heap 2048 MiB, config:false/envDir:false. No integration was run.
