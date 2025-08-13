

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseClient()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Assignment ID is required'
    })
  }

  const { error } = await supabase
    .from('project_assignments')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return { message: 'Assignment deleted successfully' }
})