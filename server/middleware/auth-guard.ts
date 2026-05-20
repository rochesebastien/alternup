import { isPublicApiRoute } from '~/shared/utils/public-routes'

export default defineEventHandler(async (event) => {
  const path = event.path ?? event.node.req.url ?? ''
  if (!path.startsWith('/api/')) return
  if (isPublicApiRoute(path)) return

  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentification requise.' })
  }
})
