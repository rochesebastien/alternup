import { z } from 'zod'
import type { Alternant } from '~/types/supabase'

// Schéma de validation pour les paramètres de requête
const querySchema = z.object({
  limit: z.coerce.number().optional().default(20),
  offset: z.coerce.number().optional().default(0),
  search: z.string().optional(),
  formation: z.string().optional(),
  sort: z.string().optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
})

export default defineEventHandler(async (event) => {
  try {
    // Récupère et valide les paramètres de requête
    const query = getQuery(event)
    const { limit, offset, search, formation, sort, order } = querySchema.parse(query)
    
    // Récupère l'instance Supabase depuis le contexte
    const supabase = event.context.supabase
    
    // Construire la requête
    let supabaseQuery = supabase
      .from('alternants')
      .select('*', { count: 'exact' })
      .order(sort as keyof Alternant, { ascending: order === 'asc' })
      .limit(limit)
      .offset(offset)
    
    // Ajouter des filtres si présents
    if (formation) {
      supabaseQuery = supabaseQuery.eq('formation', formation)
    }
    
    // Ajouter une recherche par nom/prénom si présente
    if (search) {
      const searchTerm = `%${search}%`
      supabaseQuery = supabaseQuery.or(`nom.ilike.${searchTerm},prenom.ilike.${searchTerm}`)
    }
    
    // Exécuter la requête
    const { data, error, count } = await supabaseQuery
    
    if (error) throw error
    
    return { 
      success: true, 
      data,
      pagination: {
        total: count,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Une erreur est survenue'
    const status = error instanceof z.ZodError ? 400 : 500
    
    setResponseStatus(event, status)
    
    return { 
      success: false, 
      error: message,
      details: error instanceof z.ZodError ? error.errors : undefined
    }
  }
})