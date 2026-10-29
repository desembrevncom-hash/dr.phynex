import { detailMetadata, IngredientDetail } from '@/components/ingredient/DetailPage'
import type { SlugParams } from '@/lib/locale'
export async function generateMetadata({ params }: { params: SlugParams }) { return detailMetadata('technologies', params) }
export default function Page({ params }: { params: SlugParams }) { return <IngredientDetail kind="technologies" params={params} /> }
