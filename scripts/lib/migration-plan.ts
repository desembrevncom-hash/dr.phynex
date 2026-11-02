import { createHash } from 'node:crypto'
import ts from 'typescript'

import { validateMigrationSql } from './sql-guard'

export type MigrationStep = {
  filename: string
  sha256: string
  name: string
  statements: readonly string[]
}
export type MigrationPlan = { digest: string; steps: readonly MigrationStep[] }
export const hash = (text: string | Buffer) => createHash('sha256').update(text).digest('hex')

/** No migration module is imported. Only reviewed, literal db.execute(sql`...`) is supported. */
export function literalMigration(source: string): string[] {
  const ast = ts.createSourceFile(
    'migration.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  let up: ts.FunctionDeclaration | undefined
  for (const node of ast.statements) {
    if (ts.isImportDeclaration(node)) {
      if (
        !ts.isStringLiteral(node.moduleSpecifier) ||
        node.moduleSpecifier.text !== '@payloadcms/db-postgres' ||
        !node.importClause?.namedBindings ||
        !ts.isNamedImports(node.importClause.namedBindings) ||
        node.importClause.namedBindings.elements.some(
          (e) =>
            e.propertyName || !['sql', 'MigrateUpArgs', 'MigrateDownArgs'].includes(e.name.text),
        )
      ) {
        throw new Error('Only generated SQL migrations are supported')
      }
    } else if (ts.isFunctionDeclaration(node) && ['up', 'down'].includes(node.name?.text ?? '')) {
      if (node.name?.text === 'up') {
        if (up) throw new Error('Duplicate up function')
        up = node
      }
    } else throw new Error('Executable migration module code is forbidden')
  }
  if (!up?.body || !up.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
    throw new Error('Missing exported up function')
  const statements = up.body.statements.map((node) => {
    if (!ts.isExpressionStatement(node) || !ts.isAwaitExpression(node.expression))
      throw new Error('Only awaited SQL is supported')
    const call = node.expression.expression
    if (
      !ts.isCallExpression(call) ||
      !ts.isPropertyAccessExpression(call.expression) ||
      call.expression.expression.getText(ast) !== 'db' ||
      call.expression.name.text !== 'execute' ||
      call.arguments.length !== 1
    )
      throw new Error('Only db.execute is supported')
    const argument = call.arguments[0]
    if (
      !ts.isTaggedTemplateExpression(argument) ||
      argument.tag.getText(ast) !== 'sql' ||
      !ts.isNoSubstitutionTemplateLiteral(argument.template)
    )
      throw new Error('Dynamic SQL is forbidden')
    const sql = argument.template.text
    // Lexer + strict statement grammar, independent of comments, layout or statement position.
    // The SQL is not modified. See sql-guard.ts for what this does not cover.
    validateMigrationSql(sql)
    return sql
  })
  if (!statements.length) throw new Error('Empty migration')
  return statements
}

/** Same directory discovery as Payload 3.92.1; exact filenames, order and bytes must be approved. */
export function buildPlan(
  files: string[],
  sources: Record<string, string>,
  approval: string,
): MigrationPlan {
  const manifest = JSON.parse(approval) as {
    version: number
    files: { filename: string; sha256: string }[]
  }
  if (manifest.version !== 1 || !Array.isArray(manifest.files) || !manifest.files.length)
    throw new Error('Missing approved migration set')
  const discovered = files
    .filter(
      (f) => (f.endsWith('.ts') || f.endsWith('.js')) && !['index.ts', 'index.js'].includes(f),
    )
    .sort()
  if (JSON.stringify(discovered) !== JSON.stringify(manifest.files.map((f) => f.filename)))
    throw new Error('Migration discovery differs from approval')
  const names = new Set<string>()
  const steps = manifest.files.map(({ filename, sha256 }) => {
    if (
      !/^[a-zA-Z0-9_-]+\.(ts|js)$/.test(filename) ||
      !/^[a-f0-9]{64}$/.test(sha256) ||
      hash(sources[filename] ?? '') !== sha256
    )
      throw new Error('Migration fingerprint mismatch')
    const name = filename.split('.')[0]
    if (names.has(name)) throw new Error('Duplicate migration basename')
    names.add(name)
    return Object.freeze({
      filename,
      sha256,
      name,
      statements: Object.freeze(literalMigration(sources[filename])),
    })
  })
  return Object.freeze({
    steps: Object.freeze(steps),
    digest: hash(JSON.stringify(manifest.files)),
  })
}
