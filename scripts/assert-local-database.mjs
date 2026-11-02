// Retained as a fail-closed compatibility shim. No independent env loader or CLI gate.
console.error(
  'This old gate is disabled. Use npm run migrate with an approved Local target, backup and guarded executor.',
)
process.exit(2)
