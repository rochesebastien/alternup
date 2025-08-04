-- Script de test pour vérifier la migration des rôles utilisateur (table profiles)
-- Ce script peut être exécuté après la migration pour valider le bon fonctionnement

-- Test 1: Vérifier que l'enum role_type existe avec les bonnes valeurs
SELECT 
    enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'role_type'
)
ORDER BY enumlabel;

-- Résultat attendu: Alternant, Stagiaire, Tutor

-- Test 2: Vérifier que la table profiles existe avec les bonnes colonnes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Résultat attendu: id, role, created_at, updated_at avec leurs types appropriés

-- Test 3: Vérifier que la contrainte de clé étrangère existe
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='profiles';

-- Résultat attendu: une contrainte FK vers auth.users(id)

-- Test 4: Vérifier que les triggers existent
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('profiles', 'users')
ORDER BY trigger_name;

-- Résultat attendu: triggers pour updated_at et création automatique de profil

-- Test 5: Vérifier que les politiques RLS sont actives
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- Résultat attendu: rowsecurity = true

-- Test 6: Lister les politiques RLS
SELECT 
    pol.polname AS policy_name,
    pol.polcmd AS policy_command,
    pol.polqual AS policy_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'profiles';

-- Résultat attendu: politiques pour SELECT et UPDATE

-- Test 7: Tester l'insertion d'un profil avec des valeurs valides
-- INSERT INTO public.profiles (id, role) VALUES (gen_random_uuid(), 'Tutor');
-- INSERT INTO public.profiles (id, role) VALUES (gen_random_uuid(), 'Alternant');
-- INSERT INTO public.profiles (id, role) VALUES (gen_random_uuid(), 'Stagiaire');

-- Test 8: Tester l'insertion avec une valeur invalide (doit échouer)
-- INSERT INTO public.profiles (id, role) VALUES (gen_random_uuid(), 'InvalidRole');

-- Test 9: Compter les profils par rôle
SELECT 
    role,
    COUNT(*) as count
FROM public.profiles 
GROUP BY role
ORDER BY role;

-- Test 10: Vérifier la jointure avec auth.users
SELECT 
    u.email,
    p.role,
    p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
LIMIT 5;