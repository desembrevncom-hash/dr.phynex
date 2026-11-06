import {
  APIError,
  type CollectionBeforeOperationHook,
  type GlobalBeforeOperationHook,
} from 'payload'

/** Payload restores whole snapshots, not one locale; global draft restore writes main. */
export const blockContentRestore: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (operation === 'restoreVersion') {
    throw new APIError(
      'Không cho khôi phục phiên bản: bản chụp toàn bộ tài liệu không thể khôi phục an toàn thành bản nháp. Hãy chép văn bản lịch sử đã xem xét sang bản nháp mới, rồi duyệt và xuất bản từng ngôn ngữ.',
      409,
      null,
      true,
    )
  }
  return args
}
export const blockGlobalRestore = blockContentRestore as unknown as GlobalBeforeOperationHook
