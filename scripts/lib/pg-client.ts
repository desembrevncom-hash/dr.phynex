import pg from 'pg'
import type { DbClient, DirectUrl } from './migration-guard'
/** All SQL uses this one session, including the session lock and each transaction. No pool. */
export async function connectPg(config: DirectUrl): Promise<DbClient> {
  const client = new pg.Client({
    ...config,
    options: '-c search_path=public',
    client_encoding: 'UTF8',
    application_name: 'drphynex-migrate-guard',
    connectionTimeoutMillis: 15000,
    statement_timeout: 60000,
    lock_timeout: 10000,
    idle_in_transaction_session_timeout: 60000,
    keepAlive: true,
  })
  const listeners: ((e: Error) => void)[] = []
  let stopped = false,
    closing = false
  client.on('error', (e) => {
    stopped = true
    listeners.forEach((f) => f(e))
  })
  client.on('end', () => {
    if (!closing) {
      stopped = true
      listeners.forEach((f) => f(new Error('session ended')))
    }
  })
  await client.connect()
  return {
    query: async (sql, params) => {
      if (stopped) throw new Error('Session stopped')
      const r = await client.query(sql, params)
      // A multi-statement simple query yields an array of results; only single results carry a tag.
      return Array.isArray(r) ? { rows: [] } : { rows: r.rows ?? [], command: r.command }
    },
    onError: (f) => listeners.push(f),
    abort: () => {
      stopped = true
      closing = true
      void client.end().catch(() => {})
    },
    end: async () => {
      stopped = true
      closing = true
      await client.end()
    },
  }
}
