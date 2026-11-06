import type { Field } from 'payload'

import { locales } from '@/i18n/locales'
import { readApprovals, sharedRevision } from '@/lib/banner-revision'

const L = (vi: string, ko: string, en: string) => ({ vi, ko, en })

/**
 * Server-owned map { ko?, en?, vi? } → shared banner revision each language approved.
 * Written only by hooks/guardHomeBannerApproval.ts (client values are replaced). Non-localized on
 * purpose: Payload publishes non-localized fields from the draft, so the approvals of every
 * language travel together with the shared settings they cover.
 */
export const bannerApprovalsField: Field = {
  name: 'bannerApprovals',
  type: 'json',
  admin: { hidden: true },
}

const stateLabel = {
  approved: L('đã duyệt cấu hình hiện tại', '현재 설정 승인됨', 'approved for current settings'),
  missing: L('cần duyệt lại', '재승인 필요', 'needs approval'),
}

/** Read-only, not stored: which languages approved the CURRENT shared banner settings. */
export const bannerApprovalStatusField: Field = {
  name: 'bannerApprovalStatus',
  type: 'text',
  virtual: true,
  label: L(
    'Duyệt cấu hình banner dùng chung',
    '공통 배너 설정 승인',
    'Shared banner settings approval',
  ),
  admin: {
    position: 'sidebar',
    readOnly: true,
    description: L(
      'Ảnh, loại visual, đích CTA và màu dùng chung cho mọi ngôn ngữ. Mỗi lần đổi, mọi ngôn ngữ phải duyệt lại (lưu nháp với Approved, không kèm thay đổi khác) trước khi xuất bản.',
      '이미지, 비주얼 유형, CTA, 색상은 모든 언어 공통입니다. 변경할 때마다 모든 언어를 다시 승인해야 게시할 수 있습니다.',
      'Images, visual type, CTA target and colours are shared by every language. After each change every language must be approved again (draft save with Approved, no other edits) before publishing.',
    ),
  },
  hooks: {
    afterRead: [
      ({ data, req }) => {
        const approvals = readApprovals(data?.bannerApprovals)
        const current = sharedRevision(data?.banners)
        const lang =
          req?.i18n?.language === 'ko' ? 'ko' : req?.i18n?.language === 'en' ? 'en' : 'vi'
        return `${current.slice(0, 8)} · ${locales
          .map(
            (l) =>
              `${l.toUpperCase()}: ${stateLabel[approvals[l] === current ? 'approved' : 'missing'][lang]}`,
          )
          .join(' · ')}`
      },
    ],
  },
}
