import {
  APIError,
  type CollectionBeforeOperationHook,
  type GlobalBeforeOperationHook,
} from 'payload'

/** Payload restores whole snapshots, not one locale; global draft restore writes main. */
export const blockContentRestore: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (operation === 'restoreVersion') {
    throw new APIError(
      'Restore is disabled: whole-document snapshots cannot safely restore as a draft. Copy reviewed historical text into a new draft, then approve and publish each locale.',
      409,
      null,
      true,
    )
  }
  return args
}
export const blockGlobalRestore = blockContentRestore as unknown as GlobalBeforeOperationHook
