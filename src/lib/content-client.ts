import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'
import { withContentLocaleGuard } from './content-mutations'

export const getPayloadClient = async () => withContentLocaleGuard(await getPayload({ config }))
