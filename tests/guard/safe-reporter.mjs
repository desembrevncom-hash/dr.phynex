import { writeFileSync } from 'node:fs'
import path from 'node:path'
/** @param {Array<{name?:string,type?:string,result?:{state?:string},tasks?:unknown[]}>} files */
export function safeResults(files) {
  /** @type {{id:string,status:string}[]} */ const results = []
  const visit = (task) => {
    const id = /^I(?:1[0-2]|[1-9])\b/.exec(task.name ?? '')?.[0]
    if (task.type === 'test' && id)
      results.push({
        id,
        status: ['pass', 'fail', 'skip', 'todo'].includes(task.result?.state)
          ? task.result.state
          : 'unknown',
      })
    for (const child of task.tasks ?? []) visit(child)
  }
  for (const file of files) visit(file)
  return results
}
/** @param {{id:string,status:string}[]} results */
export function allCasesPassed(results) {
  return (
    Array.isArray(results) &&
    results.length === 12 &&
    new Set(results.map((r) => r.id)).size === 12 &&
    Array.from({ length: 12 }, (_, i) => 'I' + (i + 1)).every((id) =>
      results.some((r) => r.id === id && r.status === 'pass'),
    )
  )
}
export default class SafeReporter {
  onFinished(files) {
    if (process.env.B5_TEST_RUN_DIR)
      writeFileSync(
        path.join(process.env.B5_TEST_RUN_DIR, 'results.json'),
        JSON.stringify(safeResults(files ?? []), null, 2) + '\n',
        { mode: 0o600 },
      )
  }
}
