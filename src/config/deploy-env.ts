/**
 * Settings a deployed build cannot run without. On Vercel a missing value fails the build with a
 * clear message instead of shipping a site that breaks on the first request (no placeholder or
 * dummy credentials are substituted). Local development keeps its .env defaults.
 * This validator never connects to the database. It does not prove that every framework build
 * path is read-only; verify builds in an isolated snapshot with read-only test credentials.
 */
export function assertDeploymentEnv(env: Record<string, string | undefined>) {
  if (env.PAYLOAD_DROP_DATABASE && env.PAYLOAD_DROP_DATABASE !== 'false') {
    throw new Error('Destructive database startup flags are forbidden.')
  }
  if (!env.VERCEL) return
  const missing = ['DATABASE_URL', 'PAYLOAD_SECRET', 'NEXT_PUBLIC_SERVER_URL'].filter(
    (name) => !env[name]?.trim(),
  )
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s) for this deployment: ${missing.join(', ')}.`,
    )
  }
  let origin: URL
  try {
    origin = new URL(env.NEXT_PUBLIC_SERVER_URL!)
  } catch {
    throw new Error('NEXT_PUBLIC_SERVER_URL must be an absolute https:// origin.')
  }
  if (origin.protocol !== 'https:')
    throw new Error('NEXT_PUBLIC_SERVER_URL must use https:// on Vercel.')
  const database = new URL(env.DATABASE_URL!)
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection.')
  }
}
