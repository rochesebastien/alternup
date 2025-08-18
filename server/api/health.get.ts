defineRouteMeta({
  openAPI: {
    tags: ['Health'],
    description: 'Health check endpoint',
    responses: {
      200: {
        description: 'Service is healthy',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'ok' }
              }
            }
          }
        }
      }
    }
  }
})

export default defineEventHandler(() => {
  return { status: 'ok' }
})
