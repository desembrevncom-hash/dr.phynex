/** @param {Record<string,string|undefined>} source @param {{runDir:string,dockerConfig:string}} context */
export function systemTestEnvironment(source, context) {
  /** @type {Record<string,string> & {NODE_ENV:'test'}} */
  const out = {
    NODE_ENV: 'test',
    NODE_OPTIONS: '--max-old-space-size=2048',
    DOCKER_HOST:
      process.platform === 'win32'
        ? 'npipe:////./pipe/docker_engine'
        : 'unix:///var/run/docker.sock',
    DOCKER_CONFIG: context.dockerConfig,
    B5_TEST_RUN_DIR: context.runDir,
    B5_TEST_DOCKER_CONFIG: context.dockerConfig,
  }
  for (const key of ['SystemRoot', 'WINDIR', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'LANG'])
    if (source[key]) out[key] = source[key]
  return out
}
/** @param {Record<string,string|undefined>} source @param {{runDir:string,dockerConfig:string}} context */
export function integrationEnvironment(source, context) {
  const out = systemTestEnvironment(source, context)
  for (const key of [
    'MIGRATION_GUARD_TEST_URL',
    'MIGRATION_GUARD_TEST_CONTAINER',
    'B5_TEST_RESOURCES_FILE',
  ])
    if (source[key]) out[key] = source[key]
  return out
}
/** @param {Record<string,string|undefined>} source @param {string} stateFile */
export function fixtureEnvironment(source, stateFile) {
  if (!source.B5_TEST_RUN_DIR || !source.B5_TEST_DOCKER_CONFIG)
    throw Error('Use the isolated integration launcher')
  return {
    ...systemTestEnvironment(source, {
      runDir: source.B5_TEST_RUN_DIR,
      dockerConfig: source.B5_TEST_DOCKER_CONFIG,
    }),
    B5_TEST_URL: source.MIGRATION_GUARD_TEST_URL ?? '',
    B5_TEST_CONTAINER: source.MIGRATION_GUARD_TEST_CONTAINER ?? '',
    B5_TEST_RESOURCES_FILE: source.B5_TEST_RESOURCES_FILE ?? '',
    B5_TEST_STATE: stateFile,
  }
}
