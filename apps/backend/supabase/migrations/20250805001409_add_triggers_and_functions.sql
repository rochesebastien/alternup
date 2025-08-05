-- Migration: Add additional triggers and functions
-- Created: 2025-08-05
-- Description: Create trigger for project_assignments updated_at and extend profile creation

-- Step 1: Create trigger for project_assignments updated_at
CREATE TRIGGER project_assignments_updated_at_trigger
    BEFORE UPDATE ON public.project_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Step 2: Update the handle_new_user function to populate profile fields from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role, first_name, last_name, email)
    VALUES (
        NEW.id, 
        'Alternant',
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Add comments for the new functionality
COMMENT ON FUNCTION public.handle_updated_at() IS 'Fonction generique pour mettre a jour automatiquement le champ updated_at';
COMMENT ON FUNCTION public.handle_new_user() IS 'Fonction pour creer automatiquement un profil lors de l''inscription d''un nouvel utilisateur';