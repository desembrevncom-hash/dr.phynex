import { permanentRedirect } from 'next/navigation'
import { detailMetadata, IngredientDetail } from '@/components/ingredient/DetailPage'
import { findPublicBySlug } from '@/lib/content'
import { pageLocale, type SlugParams } from '@/lib/locale'
export async function generateMetadata({ params }: { params: SlugParams }) { return detailMetadata('ingredients', params) }
export default async function Page({ params }: { params: SlugParams }) {
 const locale = await pageLocale(params)
 const { slug } = await params
 if (!(await findPublicBySlug('ingredients', slug, locale)) && await findPublicBySlug('technologies', slug, locale)) {
  permanentRedirect('/' + locale + '/technologies/' + slug)
 }
 return <IngredientDetail kind="ingredients" params={params} />
}
