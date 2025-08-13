-- Migration: Ajouter enum role_type et table profiles avec colonne role
-- Créé le: 2025-08-04
-- Description: Ajoute un enum pour les rôles utilisateur (Tutor, Alternant, Stagiaire) 
--              et une table profiles qui étend auth.users avec le rôle

-- Étape 1: Créer l'enum role_type
CREATE TYPE role_type AS ENUM ('Tutor', 'Alternant', 'Stagiaire');

-- Étape 2: Créer la table profiles
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role role_type NOT NULL DEFAULT 'Alternant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Étape 3: Ajouter des commentaires pour documenter la table et les colonnes
COMMENT ON TABLE public.profiles IS 'Profils utilisateur étendant auth.users avec des informations métier';
COMMENT ON COLUMN public.profiles.id IS 'Référence vers auth.users.id';
COMMENT ON COLUMN public.profiles.role IS 'Rôle de l''utilisateur: Tutor (tuteur), Alternant (étudiant en alternance), Stagiaire (stagiaire)';
COMMENT ON COLUMN public.profiles.created_at IS 'Date de création du profil';
COMMENT ON COLUMN public.profiles.updated_at IS 'Date de dernière mise à jour du profil';

-- Étape 4: Créer une fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Étape 5: Créer le trigger pour updated_at
CREATE TRIGGER profiles_updated_at_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Étape 6: Créer un trigger pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, 'Alternant');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Étape 7: Créer le trigger sur auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Étape 8: Créer des profils pour les utilisateurs existants (s'il y en a)
INSERT INTO public.profiles (id, role)
SELECT id, 'Alternant'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- Étape 9: Activer RLS (Row Level Security) sur la table profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Étape 10: Créer une politique RLS pour que les utilisateurs ne voient que leur propre profil
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Étape 11: Créer une politique RLS pour que les utilisateurs puissent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);