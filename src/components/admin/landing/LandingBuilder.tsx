'use client'

import {
  ConfirmationModal,
  DraggableSortable,
  DraggableSortableItem,
  RenderFields,
  SaveDraftButton,
  useAuth,
  useDocumentInfo,
  useField,
  useForm,
  useFormFields,
  useFormModified,
  useLocale,
  useModal,
} from '@payloadcms/ui'
import type { BlocksFieldClientProps, ClientBlock, ClientField } from 'payload'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { blockDescriptions, blockTitles, type LandingBlockType } from '@/lib/landing'

import { useBlockStatus } from './blockStatus'
import { useLandingRows, type LandingRowData } from './useLandingRows'

/**
 * Visual builder for the product landing page (Admin, tab "Landing page").
 *
 * Three panes on one screen: the block list (left), the saved-draft preview of the site (middle,
 * same /preview route and permissions as before) and the fields of the selected block (right,
 * the standard Payload fields, so Media upload/library, access and validation are unchanged).
 * Every action edits the same Payload form: nothing is written until "Lưu nháp", publishing stays
 * a separate action in the document header, and the server rules (structure approval, translator
 * limits) apply exactly as for the plain blocks field.
 */

const LOCALES = [
  ['ko', 'KO'],
  ['en', 'EN'],
  ['vi', 'VI'],
] as const
const DEVICES = [
  { id: 'phone', label: 'Điện thoại', width: 390 },
  { id: 'tablet', label: 'Máy tính bảng', width: 768 },
  { id: 'desktop', label: 'Máy tính', width: 1440 },
] as const
const ORDER: LandingBlockType[] = [
  'hero',
  'band',
  'split',
  'points',
  'ingredients',
  'details',
  'faq',
  'cta',
]
const OPEN_KEY = 'dx-lp-builder'
const PREVIEW_SOURCE = 'dx-lp-preview'
const BUILDER_SOURCE = 'dx-lp-builder'

type Perm = BlocksFieldClientProps['permissions']

/** Same resolution as Payload's own block rows (fields/Blocks/BlockRow). */
function blockPermissions(permissions: Perm, slug: string): unknown {
  if (permissions === true) return true
  const p = permissions as Record<string, unknown> | undefined
  const specific = (p?.blocks as Record<string, unknown> | undefined)?.[slug] ?? p?.blocks
  if (specific === true) return true
  const fields = (specific as { fields?: unknown } | undefined)?.fields
  if (fields) return fields
  if (p && typeof p === 'object' && !specific) {
    const restrictive = p.read === true && (!p.create || !p.update || Object.keys(p).length === 1)
    if (restrictive) return { read: true }
  }
  return fields
}

const isEditor = (user: unknown) => {
  const role = (user as { role?: string } | null)?.role
  return role === 'admin' || role === 'editor'
}

function readSession(): {
  open?: boolean
  selected?: string | null
  device?: string
  guest?: boolean
} {
  try {
    return JSON.parse(sessionStorage.getItem(OPEN_KEY) ?? '{}')
  } catch {
    return {}
  }
}
function writeSession(value: Record<string, unknown>) {
  try {
    sessionStorage.setItem(OPEN_KEY, JSON.stringify({ ...readSession(), ...value }))
  } catch {
    /* storage unavailable: the builder simply starts closed */
  }
}

function RowStatus({ data }: { data: LandingRowData | undefined }) {
  const state = useBlockStatus(data)
  return (
    <span className={`dx-lp-badge ${state.cls}`} title={state.text}>
      {state.short}
    </span>
  )
}

function SelectedStatus({ data }: { data: LandingRowData | undefined }) {
  const state = useBlockStatus(data)
  return <p className={`dx-lp-badge dx-lp-builder__status ${state.cls}`}>{state.text}</p>
}

export function LandingBuilder(props: BlocksFieldClientProps) {
  const {
    field,
    path: pathFromProps,
    permissions,
    readOnly,
    schemaPath: schemaPathFromProps,
  } = props
  const schemaPath = schemaPathFromProps ?? field.name
  const { addFieldRow, dispatchFields, moveFieldRow, removeFieldRow, setModified } = useForm()
  const {
    rows = [],
    path,
    errorPaths = [],
  } = useField({ hasRows: true, potentiallyStalePath: pathFromProps })
  const data = useLandingRows(path)
  const { user } = useAuth()
  const canStructure = !readOnly && isEditor(user)
  const { code } = useLocale()
  const lang = String(code ?? '').toUpperCase()
  const modified = useFormModified()
  const { savedDocumentData, lastUpdateTime } = useDocumentInfo()
  const slug = useFormFields(([fields]) => fields.slug?.value) as string | undefined
  const name = useFormFields(([fields]) => fields.name?.value) as string | undefined
  const { openModal, closeModal } = useModal()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [device, setDevice] = useState<(typeof DEVICES)[number]['id']>('desktop')
  const [guest, setGuest] = useState(false)
  const [adding, setAdding] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  const [announce, setAnnounce] = useState('')
  const [frameKey, setFrameKey] = useState(0)
  // What the frame reported it shows ('guest' | 'staff'), and one automatic reload on mismatch.
  const [frameReport, setFrameReport] = useState<{ src: string; view: 'guest' | 'staff' } | null>(null)
  const guestRef = useRef(false)
  const srcRef = useRef<string | null>(null)
  const retriesRef = useRef(0)
  const [narrowPane, setNarrowPane] = useState<'list' | 'preview' | 'edit'>('edit')
  const frameRef = useRef<HTMLIFrameElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageWidth, setStageWidth] = useState(800)
  const deleteSlug = `dx-lp-delete-${path}`

  const blocks = useMemo(() => {
    const map = new Map<string, ClientBlock>()
    for (const b of (field.blocks ?? []) as ClientBlock[]) map.set(b.slug, b)
    return map
  }, [field.blocks])

  // Restore the builder after a locale switch or reload (same browser tab only).
  useEffect(() => {
    // Reads browser storage once after mount (not available during server rendering).
    const s = readSession()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s.open) setOpen(true)
    if (s.selected) setSelectedId(s.selected)
    if (s.device === 'phone' || s.device === 'tablet' || s.device === 'desktop') setDevice(s.device)
    if (typeof s.guest === 'boolean') setGuest(s.guest)
  }, [])
  useEffect(
    () => writeSession({ open, selected: selectedId, device, guest }),
    [open, selectedId, device, guest],
  )

  // The chosen block, or the first one when nothing (or a removed block) is chosen.
  const chosenIndex = rows.findIndex((r) => r.id === selectedId)
  const selectedIndex = chosenIndex >= 0 ? chosenIndex : rows.length > 0 ? 0 : -1
  const selected = selectedIndex >= 0 ? rows[selectedIndex] : undefined
  const currentId = selected?.id ?? null

  // ---- structure actions (shared by KO/EN/VI; editors only, as on the server) -----------------
  const say = (text: string) => setAnnounce(text)
  const titleOf = (i: number) => blockTitles[rows[i]?.blockType as LandingBlockType] ?? 'Khối'
  const move = useCallback(
    (from: number, to: number) => {
      if (!canStructure || to < 0 || to >= rows.length || from === to) return
      moveFieldRow({ moveFromIndex: from, moveToIndex: to, path })
      say(
        `Đã chuyển "${blockTitles[rows[from]?.blockType as LandingBlockType] ?? 'Khối'}" tới vị trí ${to + 1}/${rows.length}. Chưa lưu.`,
      )
    },
    [canStructure, moveFieldRow, path, rows],
  )
  const add = (type: LandingBlockType) => {
    if (!canStructure) return
    const at = selectedIndex >= 0 ? selectedIndex + 1 : rows.length
    addFieldRow({ blockType: type, path, rowIndex: at, schemaPath })
    setAdding(false)
    // The new row gets its id synchronously in the reducer; select it on the next render.
    setTimeout(() => {
      const id = (document.querySelector(`[data-lp-row-index="${at}"]`) as HTMLElement | null)
        ?.dataset.lpRowId
      if (id) setSelectedId(id)
    }, 50)
    say(`Đã thêm khối "${blockTitles[type]}" ở vị trí ${at + 1}. Chưa lưu.`)
  }
  const duplicate = (i: number) => {
    if (!canStructure) return
    dispatchFields({ type: 'DUPLICATE_ROW', path, rowIndex: i })
    setModified(true)
    setTimeout(() => {
      const id = (document.querySelector(`[data-lp-row-index="${i + 1}"]`) as HTMLElement | null)
        ?.dataset.lpRowId
      if (id) setSelectedId(id)
    }, 50)
    say(`Đã nhân bản "${titleOf(i)}". Chưa lưu.`)
  }
  const toggleHidden = (i: number) => {
    if (!canStructure) return
    const next = data[i]?.hidden !== true
    dispatchFields({ type: 'UPDATE', path: `${path}.${i}.hidden`, value: next })
    setModified(true)
    say(`${next ? 'Đã ẩn' : 'Đã hiện lại'} "${titleOf(i)}"; nội dung được giữ nguyên. Chưa lưu.`)
  }
  const askDelete = (i: number) => {
    if (!canStructure) return
    setPendingDelete(i)
    openModal(deleteSlug)
  }
  const confirmDelete = () => {
    if (pendingDelete === null) return
    const title = titleOf(pendingDelete)
    removeFieldRow({ path, rowIndex: pendingDelete })
    setPendingDelete(null)
    closeModal(deleteSlug)
    say(`Đã xoá "${title}". Chưa lưu: bấm "Lưu nháp" để ghi, hoặc rời trang không lưu để bỏ.`)
  }

  // ---- preview (saved draft, same staff preview route as before) ------------------------------
  // The frame reloads after every save (new saved version), language or view change, or "Tải lại".
  const savedAt = String(savedDocumentData?.updatedAt ?? lastUpdateTime ?? '')
  const previewSrc = useMemo(() => {
    if (!slug || !code) return null
    const v = encodeURIComponent(`${savedAt}-${frameKey}`)
    const page = `/${code}/products/${slug}?lp=${guest ? 'guest' : 'staff'}&v=${v}`
    return `/preview?path=${encodeURIComponent(page)}`
  }, [slug, code, guest, frameKey, savedAt])

  // Keep the message handler in step with the current choice and frame (refs, no re-render).
  useEffect(() => {
    if (guestRef.current !== guest) retriesRef.current = 0
    guestRef.current = guest
    srcRef.current = previewSrc
  }, [guest, previewSrc])
  const frameView = frameReport && frameReport.src === previewSrc ? frameReport.view : null
  const frameLoading = frameView === null

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setStageWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])
  const deviceWidth = DEVICES.find((d) => d.id === device)!.width
  const scale = Math.min(1, (stageWidth - 24) / deviceWidth)

  // Clicking a block in the preview opens it here.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.source !== PREVIEW_SOURCE) return
      if (e.data.type === 'ready') {
        // The frame says which view it rendered. A guest view must carry no staff marks.
        const shown: 'guest' | 'staff' = e.data.view === 'guest' && !e.data.staffMarks ? 'guest' : 'staff'
        const wanted = guestRef.current ? 'guest' : 'staff'
        if (srcRef.current) setFrameReport({ src: srcRef.current, view: shown })
        if (shown !== wanted && retriesRef.current < 1) {
          retriesRef.current += 1
          setFrameKey((k) => k + 1)
        }
        return
      }
      if (e.data.type === 'select' && typeof e.data.id === 'string') {
        if (rows.some((r) => r.id === e.data.id)) {
          setSelectedId(e.data.id)
          setNarrowPane('edit')
        } else say('Khối này chưa có trong bản đang chỉnh (có thể đã bị xoá nhưng chưa lưu).')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [rows])
  // Selecting a block here highlights it in the preview.
  useEffect(() => {
    if (!currentId) return
    frameRef.current?.contentWindow?.postMessage(
      { source: BUILDER_SOURCE, type: 'focus', id: currentId },
      window.location.origin,
    )
  }, [currentId])

  // ---- language (the same Payload ?locale= switch, with a guard for unsaved edits) ------------
  const switchLocale = (next: string) => {
    if (next === code) return
    if (
      modified &&
      !window.confirm(
        `Có thay đổi chưa lưu ở ${lang}. Đổi sang ${next.toUpperCase()} bây giờ sẽ bỏ các thay đổi này.\n\nBấm OK để đổi và bỏ thay đổi, hoặc Huỷ để ở lại rồi bấm "Lưu nháp".`,
      )
    )
      return
    writeSession({ open: true, selected: currentId })
    const params = new URLSearchParams(searchParams?.toString())
    params.set('locale', next)
    setModified(false)
    router.push(`${pathname}?${params.toString()}`)
  }

  const close = () => setOpen(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !document.querySelector('.payload__modal-item--enterDone, .drawer--is-open')
      )
        close()
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('dx-lp-builder-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('dx-lp-builder-open')
    }
  }, [open])

  const block = selected ? blocks.get(selected.blockType ?? '') : undefined
  const rowError = (i: number) => errorPaths.some((p) => p.startsWith(`${path}.${i}.`))

  // ---- render ---------------------------------------------------------------------------------
  const summary = (
    <div className="dx-lp-entry">
      <div>
        <p className="dx-lp-entry__title">Trình dựng trực quan</p>
        <p className="dx-lp-overview__hint">
          Danh sách khối, xem trước và bảng chỉnh trên cùng một màn hình. {rows.length} khối
          {modified ? '; có thay đổi chưa lưu.' : '.'}
        </p>
      </div>
      <button type="button" className="dx-lp-btn dx-lp-btn--primary" onClick={() => setOpen(true)}>
        Mở trình dựng
      </button>
    </div>
  )

  if (!open) return summary

  // Rendered at the end of <body>: the Admin layout is offset/transformed, so a fixed overlay
  // inside it would not cover the screen. React context (form, locale, auth) is kept.
  return (
    <>
      {summary}
      {createPortal(
        <div
          className={`dx-lp-builder dx-lp-builder--${narrowPane}`}
          role="dialog"
          aria-modal="true"
          aria-label="Trình dựng landing page"
        >
          <header className="dx-lp-builder__bar">
            <div className="dx-lp-builder__title">
              <strong>Landing page</strong>
              <span>{name}</span>
            </div>
            <div className="dx-lp-builder__locales" role="group" aria-label="Ngôn ngữ đang chỉnh">
              {LOCALES.map(([l, label]) => (
                <button
                  key={l}
                  type="button"
                  className={`dx-lp-chip ${l === code ? 'dx-lp-chip--on' : ''}`}
                  aria-pressed={l === code}
                  onClick={() => switchLocale(l)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p
              className={`dx-lp-builder__save-state ${modified ? 'dx-lp--partial' : 'dx-lp--ok'}`}
              aria-live="polite"
            >
              {modified ? 'Có thay đổi chưa lưu' : 'Đã lưu nháp'}
            </p>
            <div className="dx-lp-builder__save">
              <SaveDraftButton />
            </div>
            <button type="button" className="dx-lp-btn" onClick={close}>
              Đóng trình dựng
            </button>
          </header>

          <nav className="dx-lp-builder__panes-switch" aria-label="Vùng hiển thị">
            {(
              [
                ['list', 'Danh sách khối'],
                ['preview', 'Xem trước'],
                ['edit', 'Chỉnh khối'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`dx-lp-chip ${narrowPane === id ? 'dx-lp-chip--on' : ''}`}
                aria-pressed={narrowPane === id}
                onClick={() => setNarrowPane(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* ---- left: blocks ---- */}
          <section className="dx-lp-builder__list" aria-label="Danh sách khối">
            <div className="dx-lp-builder__list-head">
              <h2>Khối ({rows.length})</h2>
              {canStructure ? (
                <button
                  type="button"
                  className="dx-lp-btn dx-lp-btn--primary"
                  aria-expanded={adding}
                  onClick={() => setAdding((v) => !v)}
                >
                  + Thêm khối
                </button>
              ) : null}
            </div>
            {!canStructure ? (
              <p className="dx-lp-overview__hint">
                Chỉ biên tập viên được thêm, xoá, nhân bản, đổi thứ tự hay ẩn/hiện khối. Bạn vẫn sửa
                được chữ riêng ngôn ngữ của từng khối.
              </p>
            ) : null}
            {adding ? (
              <div className="dx-lp-add" role="menu" aria-label="Chọn loại khối">
                <p className="dx-lp-overview__hint">
                  Khối mới được chèn{' '}
                  {selectedIndex >= 0 ? `sau khối ${selectedIndex + 1}` : 'ở cuối'}. Thêm khối là
                  thay đổi dùng chung: mọi ngôn ngữ phải duyệt lại cấu trúc.
                </p>
                {ORDER.filter((t) => blocks.has(t)).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="menuitem"
                    className="dx-lp-add__item"
                    onClick={() => add(t)}
                  >
                    <strong>{blockTitles[t]}</strong>
                    <span>{blockDescriptions[t]}</span>
                  </button>
                ))}
                <button type="button" className="dx-lp-btn" onClick={() => setAdding(false)}>
                  Huỷ
                </button>
              </div>
            ) : null}
            {rows.length === 0 ? (
              <p className="dx-lp-overview__hint">
                Chưa có khối nào: trang sản phẩm đang dùng bố cục hiện tại.
              </p>
            ) : (
              <DraggableSortable
                className="dx-lp-rows"
                ids={rows.map((r) => r.id)}
                onDragEnd={({ moveFromIndex, moveToIndex }) => move(moveFromIndex, moveToIndex)}
              >
                {rows.map((row, i) => {
                  const d = data[i]
                  const isSel = row.id === currentId
                  const isCollapsed = collapsed[row.id] === true
                  const title = blockTitles[row.blockType as LandingBlockType] ?? 'Khối'
                  return (
                    <DraggableSortableItem key={row.id} id={row.id} disabled={!canStructure}>
                      {({
                        attributes,
                        listeners,
                        setNodeRef,
                        transform,
                        transition,
                        isDragging,
                      }) => (
                        <div
                          ref={setNodeRef}
                          style={{
                            transform: transform ?? undefined,
                            transition: transition ?? undefined,
                          }}
                          className={`dx-lp-row ${isSel ? 'dx-lp-row--on' : ''} ${d?.hidden ? 'dx-lp-row--hidden' : ''} ${isDragging ? 'dx-lp-row--drag' : ''}`}
                          data-lp-row-index={i}
                          data-lp-row-id={row.id}
                        >
                          <div className="dx-lp-row__head">
                            {canStructure ? (
                              <span
                                className="dx-lp-row__handle"
                                {...attributes}
                                {...listeners}
                                aria-label={`Kéo để đổi vị trí khối ${i + 1}. Bàn phím: Space rồi phím mũi tên, Space để thả.`}
                                title="Kéo để đổi vị trí"
                              >
                                ⋮⋮
                              </span>
                            ) : null}
                            <button
                              type="button"
                              className="dx-lp-row__title"
                              aria-current={isSel ? 'true' : undefined}
                              onClick={() => {
                                setSelectedId(row.id)
                                setNarrowPane('edit')
                              }}
                            >
                              <span>
                                {i + 1}. {title}
                              </span>
                              {rowError(i) ? (
                                <span className="dx-lp-badge dx-lp--missing">Có lỗi</span>
                              ) : null}
                            </button>
                            <button
                              type="button"
                              className="dx-lp-icon"
                              aria-expanded={!isCollapsed}
                              aria-label={`${isCollapsed ? 'Mở' : 'Thu gọn'} khối ${i + 1}`}
                              title={isCollapsed ? 'Mở' : 'Thu gọn'}
                              onClick={() =>
                                setCollapsed((c) => ({ ...c, [row.id]: !isCollapsed }))
                              }
                            >
                              {isCollapsed ? '▸' : '▾'}
                            </button>
                          </div>
                          {!isCollapsed ? (
                            <div className="dx-lp-row__body">
                              <RowStatus data={d} />
                              {canStructure ? (
                                <div
                                  className="dx-lp-row__actions"
                                  role="group"
                                  aria-label={`Thao tác khối ${i + 1}`}
                                >
                                  <button
                                    type="button"
                                    className="dx-lp-btn dx-lp-btn--sm"
                                    disabled={i === 0}
                                    onClick={() => move(i, i - 1)}
                                    aria-label={`Di chuyển khối ${i + 1} lên`}
                                  >
                                    ↑ Lên
                                  </button>
                                  <button
                                    type="button"
                                    className="dx-lp-btn dx-lp-btn--sm"
                                    disabled={i === rows.length - 1}
                                    onClick={() => move(i, i + 1)}
                                    aria-label={`Di chuyển khối ${i + 1} xuống`}
                                  >
                                    ↓ Xuống
                                  </button>
                                  <button
                                    type="button"
                                    className="dx-lp-btn dx-lp-btn--sm"
                                    onClick={() => duplicate(i)}
                                    disabled={rows.length >= (field.maxRows ?? 20)}
                                  >
                                    Nhân bản
                                  </button>
                                  <button
                                    type="button"
                                    className="dx-lp-btn dx-lp-btn--sm"
                                    aria-pressed={d?.hidden === true}
                                    onClick={() => toggleHidden(i)}
                                  >
                                    {d?.hidden ? 'Hiện lại' : 'Ẩn'}
                                  </button>
                                  <button
                                    type="button"
                                    className="dx-lp-btn dx-lp-btn--sm dx-lp-btn--danger"
                                    onClick={() => askDelete(i)}
                                  >
                                    Xoá
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </DraggableSortableItem>
                  )
                })}
              </DraggableSortable>
            )}
            <p className="dx-lp-overview__hint dx-lp-builder__rule">
              Thêm, xoá, nhân bản, đổi thứ tự, ẩn/hiện, đổi ảnh hoặc nền là thay đổi{' '}
              <strong>dùng chung KO/EN/VI</strong>: khi lưu nháp, mọi ngôn ngữ phải duyệt lại cấu
              trúc. Sửa chữ chỉ ảnh hưởng ngôn ngữ đang chỉnh ({lang}).
            </p>
          </section>

          {/* ---- middle: preview ---- */}
          <section className="dx-lp-builder__preview" aria-label="Xem trước">
            <div className="dx-lp-builder__preview-bar">
              <div role="group" aria-label="Kích thước xem trước">
                {DEVICES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`dx-lp-chip ${device === d.id ? 'dx-lp-chip--on' : ''}`}
                    aria-pressed={device === d.id}
                    onClick={() => setDevice(d.id)}
                  >
                    {d.label} <small>{d.width}</small>
                  </button>
                ))}
              </div>
              <div role="group" aria-label="Xem với vai trò">
                <button
                  type="button"
                  className={`dx-lp-chip ${!guest ? 'dx-lp-chip--on' : ''}`}
                  aria-pressed={!guest}
                  onClick={() => setGuest(false)}
                >
                  Nhân sự (có đánh dấu)
                </button>
                <button
                  type="button"
                  className={`dx-lp-chip ${guest ? 'dx-lp-chip--on' : ''}`}
                  aria-pressed={guest}
                  onClick={() => setGuest(true)}
                >
                  Xem như khách
                </button>
              </div>
              <button
                type="button"
                className="dx-lp-btn dx-lp-btn--sm"
                onClick={() => setFrameKey((k) => k + 1)}
              >
                Tải lại
              </button>
            </div>
            {frameView !== null && frameView !== (guest ? 'guest' : 'staff') && !frameLoading ? (
              <p className="dx-lp-builder__stale" role="alert">
                <strong>Khung xem trước chưa khớp chế độ đã chọn</strong> (đang hiện{' '}
                {frameView === 'guest' ? 'chế độ khách' : 'chế độ nhân sự'}). Bấm &ldquo;Tải lại&rdquo;.
              </p>
            ) : null}
            {modified ? (
              <p className="dx-lp-builder__stale" role="status">
                <strong>Lưu nháp để xem thay đổi.</strong> Xem trước hiển thị bản nháp đã lưu gần
                nhất; thay đổi chưa lưu chưa có trong khung này.
              </p>
            ) : (
              <p className="dx-lp-overview__hint dx-lp-builder__preview-note">
                {guest
                  ? 'Xem như khách: khối trống, khối ẩn và ảnh riêng tư bị bỏ hẳn (kể cả dải nền), như khách sẽ thấy khi ngôn ngữ này được duyệt và xuất bản.'
                  : 'Bấm vào một khối trong xem trước để mở khối đó ở bảng chỉnh.'}
              </p>
            )}
            <div className="dx-lp-builder__stage" ref={stageRef}>
              {previewSrc ? (
                <div
                  className="dx-lp-builder__device"
                  style={{ width: deviceWidth * scale, height: '100%' }}
                >
                  <iframe
                    key={previewSrc}
                    ref={frameRef}
                    title={`Xem trước ${lang}, ${DEVICES.find((d) => d.id === device)!.label}`}
                    src={previewSrc}
                    style={{
                      width: deviceWidth,
                      height: `${100 / scale}%`,
                      transform: `scale(${scale})`,
                    }}
                    onLoad={() => {
                      if (currentId)
                        frameRef.current?.contentWindow?.postMessage(
                          { source: BUILDER_SOURCE, type: 'focus', id: currentId },
                          window.location.origin,
                        )
                    }}
                  />
                </div>
              ) : (
                <p className="dx-lp-overview__hint">
                  Cần có đường dẫn (slug) và lưu nháp để xem trước.
                </p>
              )}
            </div>
          </section>

          {/* ---- right: selected block ---- */}
          <section className="dx-lp-builder__edit" aria-label="Chỉnh khối">
            {selected && block ? (
              <>
                <div className="dx-lp-builder__edit-head">
                  <h2>
                    {selectedIndex + 1}.{' '}
                    {blockTitles[selected.blockType as LandingBlockType] ?? 'Khối'}
                  </h2>
                  <p className="dx-lp-overview__hint">
                    {blockDescriptions[selected.blockType as LandingBlockType]}
                  </p>
                  <SelectedStatus data={data[selectedIndex]} />
                  <p className="dx-lp-builder__legend">
                    <span className="dx-scope dx-scope--local">Riêng ngôn ngữ</span> nhập riêng cho{' '}
                    {lang}. <span className="dx-scope dx-scope--shared">Dùng chung KO/EN/VI</span>{' '}
                    đổi cho mọi ngôn ngữ và cần duyệt lại cấu trúc.
                  </p>
                </div>
                {selected.isLoading ? (
                  <p className="dx-lp-overview__hint">Đang chuẩn bị khối…</p>
                ) : (
                  <div className="dx-lp-builder__fields" key={selected.id}>
                    <RenderFields
                      fields={block.fields as ClientField[]}
                      margins="small"
                      parentIndexPath=""
                      parentPath={`${path}.${selectedIndex}`}
                      parentSchemaPath={schemaPath + block.slug}
                      permissions={blockPermissions(permissions, block.slug) as never}
                      readOnly={readOnly}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="dx-lp-overview__hint">
                Chọn một khối ở danh sách bên trái hoặc trong xem trước.
              </p>
            )}
          </section>

          <p className="dx-visually-hidden" aria-live="polite">
            {announce}
          </p>
          <ConfirmationModal
            modalSlug={deleteSlug}
            heading="Xoá khối?"
            body={
              pendingDelete !== null ? (
                <p>
                  Xoá khối {pendingDelete + 1} &ldquo;{titleOf(pendingDelete)}&rdquo; cùng chữ của
                  mọi ngôn ngữ trong khối này. Thay đổi chỉ được ghi khi bấm &ldquo;Lưu nháp&rdquo;.
                  Nếu chỉ muốn tạm không hiển thị, hãy dùng &ldquo;Ẩn&rdquo;: nội dung được giữ để
                  bật lại.
                </p>
              ) : null
            }
            confirmLabel="Xoá khối"
            cancelLabel="Giữ lại"
            onConfirm={confirmDelete}
            onCancel={() => setPendingDelete(null)}
          />
        </div>,
        document.body,
      )}
    </>
  )
}
