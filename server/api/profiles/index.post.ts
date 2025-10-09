

defineRouteMeta({
  openAPI: {
    tags: ['Profiles'],
    summary: 'Create a new profile',
    description: 'Create a new user profile',
    requestBody: {
      description: 'Profile data',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['first_name', 'last_name', 'email', 'role'],
            properties: {
              first_name: { type: 'string', example: 'John' },
              last_name: { type: 'string', example: 'Doe' },
              email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
              role: { type: 'string', enum: ['student', 'tutor', 'admin'], example: 'student' }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Profile created successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request - validation error'
      }
    }
  }
})

export default defineEventHandler(async (event) => {
  const supabase = event.context.supabase
  const body = await readBody(event)

  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      role: body.role
    }])
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message
    })
  }

  return data
})