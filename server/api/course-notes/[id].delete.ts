import { getSupabaseClient } from '../../plugins/supabase'


export default defineEventHandler(async (event) => {
  const supabase = getSupabaseClient()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Note ID is required'
    })
  }

  const { error } = await supabase
    .from('course_notes')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return { message: 'Note deleted successfully' }
})