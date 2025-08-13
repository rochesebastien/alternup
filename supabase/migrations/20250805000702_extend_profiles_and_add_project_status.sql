-- Migration: Extend profiles table and add project_status_enum
-- Created: 2025-08-05
-- Description: Add missing fields to profiles table and create project status enum

-- Step 1: Create project_status_enum
CREATE TYPE project_status_enum AS ENUM ('non_demarre', 'en_cours', 'termine', 'annule');

-- Step 2: Extend profiles table with missing fields
ALTER TABLE public.profiles ADD COLUMN first_name text;
ALTER TABLE public.profiles ADD COLUMN last_name text;
ALTER TABLE public.profiles ADD COLUMN email text;

-- Step 3: Make new fields required and add constraints
ALTER TABLE public.profiles ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- Step 4: Add index on role for quick filtering
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Step 5: Update comments
COMMENT ON COLUMN public.profiles.first_name IS 'Prenom de l''utilisateur';
COMMENT ON COLUMN public.profiles.last_name IS 'Nom de famille de l''utilisateur';
COMMENT ON COLUMN public.profiles.email IS 'Adresse email de l''utilisateur (unique)';