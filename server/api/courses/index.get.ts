

defineRouteMeta({
  openAPI: {
    tags: ['Courses'],
    summary: 'Get all courses',
    description: 'Retrieve a list of all courses with creator information',
    responses: {
      200: {
        description: 'List of courses',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  created_by: { type: 'string', format: 'uuid' },
                  created_at: { type: 'string', format: 'date-time' },
                  created_by_profile: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      first_name: { type: 'string' },
                      last_name: { type: 'string' },
                      email: { type: 'string', format: 'email' },
                      role: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      500: {
        description: 'Internal server error'
      }
    }
  }
})

export default defineEventHandler(async (event) => {
  const supabase = event.context.supabase
  
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      created_by_profile:profiles!created_by(
        id,
        first_name,
        last_name,
        email,
        role
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data
})