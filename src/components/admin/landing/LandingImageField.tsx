'use client'

import { UploadField, useDocumentDrawer, useField, useListDrawer } from '@payloadcms/ui'
import type { UploadFieldClientProps } from 'payload'
import { useCallback } from 'react'

import { useImageReleased } from './blockStatus'

/**
 * A landing block image: the standard Payload upload field (thumbnail, upload a new file or pick
 * one from the Media library, Media permissions unchanged) plus explicit "Thay ảnh" and "Gỡ ảnh"
 * actions and whether visitors may see the file. Shared by KO/EN/VI.
 */
export function LandingImageField(props: UploadFieldClientProps) {
  const { path: pathFromProps, readOnly, field } = props
  const { value, setValue } = useField<unknown>({ potentiallyStalePath: pathFromProps })
  const [ListDrawer, , { openDrawer: openList, closeDrawer: closeList }] = useListDrawer({ collectionSlugs: ['media'], uploads: true })
  const [CreateDrawer, , { openDrawer: openCreate, closeDrawer: closeCreate }] = useDocumentDrawer({ collectionSlug: 'media' })
  const released = useImageReleased(value)
  const has = value !== null && value !== undefined && value !== ''
  const canEdit = !readOnly && field?.admin?.readOnly !== true

  const pick = useCallback(
    ({ doc }: { doc: { id?: unknown } }) => {
      if (doc?.id !== undefined) setValue(doc.id)
      closeList()
    },
    [closeList, setValue],
  )
  const created = useCallback(
    ({ doc }: { doc: { id?: unknown } }) => {
      if (doc?.id !== undefined) setValue(doc.id)
      closeCreate()
    },
    [closeCreate, setValue],
  )

  return (
    <div className="dx-lp-image">
      <UploadField {...props} />
      {has ? (
        <p className={`dx-lp-image__release ${released === false ? 'dx-lp--missing' : released ? 'dx-lp--ok' : ''}`}>
          {released === false
            ? 'Ảnh riêng tư: chỉ hiện trong xem trước của nhân sự; khách không thấy cho tới khi ảnh được duyệt công khai trong Media.'
            : released
              ? 'Ảnh đã được phép công khai.'
              : 'Đang kiểm tra quyền công khai của ảnh…'}
        </p>
      ) : null}
      {has && canEdit ? (
        <div className="dx-lp-image__actions" role="group" aria-label="Thay hoặc gỡ ảnh">
          <span>Thay ảnh:</span>
          <button type="button" className="dx-lp-btn" onClick={openCreate}>
            Tải ảnh mới
          </button>
          <button type="button" className="dx-lp-btn" onClick={openList}>
            Chọn từ thư viện
          </button>
          <button type="button" className="dx-lp-btn dx-lp-btn--danger" onClick={() => setValue(null)}>
            Gỡ ảnh
          </button>
        </div>
      ) : null}
      <ListDrawer onSelect={pick} />
      <CreateDrawer onSave={created} />
    </div>
  )
}
