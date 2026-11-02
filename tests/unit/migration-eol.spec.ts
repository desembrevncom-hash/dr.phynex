import { readFileSync, readdirSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, it, expect } from 'vitest'
import { buildPlan, literalMigration } from '../../scripts/lib/migration-plan'
import { testOnlyPlan, DEFERRED_SQL } from '../guard/fixture-support'

/** Execute actual transpiled up() against a mock tag/db, never import the real adapter. */
async function upSql(source: string) {
  const exported: { up?: (args: unknown) => Promise<void> } = {},
    calls: string[] = []
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  runInNewContext(
    js,
    {
      exports: exported,
      require: (name: string) => {
        expect(name).toBe('@payloadcms/db-postgres')
        return {
          sql: (strings: TemplateStringsArray, ...args: unknown[]) => {
            expect(args).toHaveLength(0)
            return strings.join('')
          },
        }
      },
    },
    { timeout: 1000 },
  )
  await exported.up!({
    db: {
      execute: async (sql: string) => {
        calls.push(sql)
      },
    },
    payload: {},
    req: {},
  })
  return calls
}
describe('migration byte policy and actual up() SQL (mock only)', () => {
  it('pins LF source bytes and produces identical up SQL with either source line ending', async () => {
    const files = readdirSync('src/migrations'),
      sources = Object.fromEntries(
        files
          .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
          .map((f) => [f, readFileSync('src/migrations/' + f, 'utf8')]),
      )
    const plan = buildPlan(files, sources, readFileSync('deploy/migrations.approved.json', 'utf8'))
    expect(readFileSync('.gitattributes', 'utf8')).toContain('src/migrations/*.ts text eol=lf')
    for (const step of plan.steps) {
      const source = sources[step.filename]
      expect(source).not.toContain('\r')
      expect(await upSql(source)).toEqual(step.statements)
      expect(await upSql(source.replace(/\n/g, '\r\n'))).toEqual(step.statements)
      expect(() =>
        buildPlan(
          files,
          { ...sources, [step.filename]: source.replace(/\n/g, '\r\n') },
          readFileSync('deploy/migrations.approved.json', 'utf8'),
        ),
      ).toThrow()
    }
  })
  it('test-only deferred constraints do not pass production migration grammar', () => {
    const source =
      'import {sql} from "@payloadcms/db-postgres";export async function up({db}){await db.execute(sql`' +
      DEFERRED_SQL +
      '`)}'
    expect(() => literalMigration(source)).toThrow()
    expect(testOnlyPlan([DEFERRED_SQL]).steps[0].statements).toEqual([DEFERRED_SQL])
    expect(readFileSync('scripts/migrate-guarded.ts', 'utf8')).not.toContain('testOnlyPlan')
  })
})
