/**
 * Owner tool: create the volume anchor for one approved target, ONCE. It prints the anchor ID; the
 * owner records it as `anchorId` in the trusted target catalog (outside the state volume). The
 * executor never creates, edits or adopts an ID.
 *
 * It refuses when: the state directory does not exist (the owner provisions the volume), an anchor is
 * already there (exclusive create), a state file already exists, or the catalog target already has an
 * `anchorId`. Replacing an anchor is NOT done by this tool: it needs an owner reconciliation of the
 * migration history, the state file and the database first (see the real-run plan), after which the
 * old anchor and state are moved away by hand and the catalog ID is changed by the owner.
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseTarget } from './lib/migration-guard'
import { stateIdentity } from './lib/migration-state'
import { createAnchor } from './lib/state-store'

const [targetsFile, name] = process.argv.slice(2)
try {
  if (!targetsFile || !name) throw new Error('usage: migration-anchor <targets.json> <target>')
  const json = await readFile(path.resolve(targetsFile), 'utf8')
  const target = parseTarget(json, name)
  if ((target as { anchorId?: unknown }).anchorId !== undefined)
    throw new Error('The catalog already has an anchorId; replacing it needs owner reconciliation')
  const dir = path.dirname(target.stateFile)
  if (!existsSync(dir)) throw new Error('State directory must be provisioned first')
  if (existsSync(target.stateFile))
    throw new Error('A state file already exists; this is not a first run')
  const a = await createAnchor(dir, stateIdentity(target))
  console.log('Anchor created for target ' + name + '. Record this anchorId in the catalog:')
  console.log(a.anchorId)
} catch (e) {
  console.error('Anchor not created: ' + (e instanceof Error ? e.message : 'error'))
  process.exitCode = 2
}
