-- Rollback Migration: Supprimer table profiles et enum role_type
-- Créé le: 2025-08-04
-- Description: Script de rollback pour annuler la création de la table profiles 
--              et de l'enum role_type

-- ATTENTION: Ce script supprimera définitivement toutes les données de profil et de rôle!
-- Assurez-vous de sauvegarder les données si nécessaire avant d'exécuter.

-- Étape 1: Supprimer les triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS profiles_updated_at_trigger ON public.profiles;

-- Étape 2: Supprimer les fonctions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- Étape 3: Supprimer les politiques RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Étape 4: Supprimer la table profiles (cela supprimera aussi les contraintes FK)
DROP TABLE IF EXISTS public.profiles;

-- Étape 5: Supprimer l'enum role_type
DROP TYPE IF EXISTS role_type;

-- Confirmations de nettoyage:

-- Vérifier que l'enum a été supprimé
-- SELECT typname FROM pg_type WHERE typname = 'role_type';
-- Résultat attendu: aucune ligne

-- Vérifier que la table profiles a été supprimée
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name = 'profiles';
-- Résultat attendu: aucune ligne

-- Vérifier que les triggers ont été supprimés
-- SELECT trigger_name FROM information_schema.triggers 
-- WHERE trigger_name IN ('on_auth_user_created', 'profiles_updated_at_trigger');
-- Résultat attendu: aucune ligne

-- Vérifier que les fonctions ont été supprimées
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN ('handle_new_user', 'handle_updated_at');
-- Résultat attendu: aucune ligne