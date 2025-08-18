import { getSupabaseClient } from '../../plugins/supabase'

defineRouteMeta({
  openAPI: {
    tags: ['Profiles'],
    summary: 'Get all profiles',
    description: 'Retrieve a list of all user profiles',
    responses: {
      200: {
        description: 'List of profiles',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  role: { type: 'string', enum: ['student', 'tutor', 'admin'] },
                  created_at: { type: 'string', format: 'date-time' }
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
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data
})