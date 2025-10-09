export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      alternants: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          nom: string
          prenom: string
          formation: string
          email: string
          telephone?: string
          date_naissance?: string
          competences?: Json[]
          notes?: Json[]
          user_id?: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          nom: string
          prenom: string
          formation: string
          email: string
          telephone?: string
          date_naissance?: string
          competences?: Json[]
          notes?: Json[]
          user_id?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          nom?: string
          prenom?: string
          formation?: string
          email?: string
          telephone?: string
          date_naissance?: string
          competences?: Json[]
          notes?: Json[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alternants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          updated_at: string
          username: string
          full_name: string
          avatar_url: string
          website: string
          user_id: string
        }
        Insert: {
          id?: string
          updated_at?: string
          username: string
          full_name?: string
          avatar_url?: string
          website?: string
          user_id: string
        }
        Update: {
          id?: string
          updated_at?: string
          username?: string
          full_name?: string
          avatar_url?: string
          website?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Types dérivés pour les entités principales
export type Alternant = Database['public']['Tables']['alternants']['Row']
export type AlternantInsert = Database['public']['Tables']['alternants']['Insert']
export type AlternantUpdate = Database['public']['Tables']['alternants']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']