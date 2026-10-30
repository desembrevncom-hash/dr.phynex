/**
 * Marks the content a page shows (server-rendered, invisible). AnalyticsProvider reads it after
 * the page_view, so a view event can never fire before its page or twice in one visit.
 */
export function TrackContent({
  event,
  contentId,
  contentName,
}: {
  event: 'view_product' | 'view_article'
  contentId: string
  contentName?: string
}) {
  return <span hidden data-track-view={event} data-content-id={contentId} data-content-name={contentName} />
}
