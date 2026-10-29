import type { MetadataRoute } from 'next'

import { siteURL } from '@/lib/seo'

// Pre-launch: block all crawlers. Switch to allow '/' (keeping /admin, /api disallowed) when launch is approved.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
    sitemap: `${siteURL}/sitemap.xml`,
  }
}
