import { z } from 'zod'

// Schéma de validation pour l'ID de l'alternant
const idSchema = z.string().uuid({
  message: "L'ID doit être un UUID valide"
})

export default defineEventHandler(async (event) => {
  try {
    // Récupère et valide l'ID de l'alternant depuis les paramètres
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID manquant'
      })
    }
    
    // Valide que l'ID est un UUID
    idSchema.parse(id)
    
    // Récupère l'instance Supabase depuis le contexte
    const supabase = event.context.supabase
    
    // Récupère les détails de l'alternant avec relations éventuelles
    const { data, error } = await supabase
      .from('alternants')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Alternant non trouvé'
        })
      }
      throw error
    }
    
    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Alternant non trouvé'
      })
    }
    
    return { 
      success: true, 
      data 
    }
  } catch (error: any) {
    // Gestion des différents types d'erreurs
    if (error.statusCode === 404) {
      setResponseStatus(event, 404)
      return { 
        success: false, 
        error: 'Alternant non trouvé'
      }
    } else if (error instanceof z.ZodError) {
      setResponseStatus(event, 400)
      return { 
        success: false, 
        error: 'ID invalide',
        details: error.errors 
      }
    } else {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue'
      setResponseStatus(event, 500)
      
      return { 
        success: false, 
        error: message
      }
    }
  }
})