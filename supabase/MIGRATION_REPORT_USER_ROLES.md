# Rapport de Migration - Ajout des Rôles Utilisateur (Version Corrigée)

## 📋 Résumé

Migration réussie pour l'ajout d'une table `profiles` avec une colonne `role` de type enum, évitant les problèmes de permissions sur la table système `auth.users`.

## ✅ Critères d'Acceptation Validés

### 1. La colonne role existe et accepte exactement les trois valeurs
- ✅ **Enum `role_type` créé** avec les valeurs : `'Tutor'`, `'Alternant'`, `'Stagiaire'`
- ✅ **Table `profiles` créée** avec une colonne `role` de type `role_type`
- ✅ **Contraintes de type** : Seules les trois valeurs définies sont acceptées

### 2. Les enregistrements existants héritent d'un rôle par défaut
- ✅ **Valeur par défaut définie** : `'Alternant'`
- ✅ **Migration des données existantes** : tous les utilisateurs existants reçoivent automatiquement un profil avec le rôle `'Alternant'`
- ✅ **Création automatique** : les nouveaux utilisateurs reçoivent automatiquement un profil via trigger

### 3. Le champ est non-null
- ✅ **Contrainte NOT NULL appliquée** dès la création de la table
- ✅ **Impossible d'insérer des valeurs null** pour la colonne `role`

## 📁 Fichiers Créés/Modifiés

### 1. Migration Principale (Corrigée)
- **Fichier** : `supabase/migrations/20250804_add_user_role_enum.sql`
- **Description** : Migration complète incluant la création de l'enum, de la table profiles, des triggers et des politiques RLS

### 2. Script de Test (Mis à jour)
- **Fichier** : `supabase/migrations/test_role_migration.sql`
- **Description** : Tests de validation adaptés à la nouvelle structure avec table profiles

### 3. Script de Rollback (Mis à jour)
- **Fichier** : `supabase/migrations/rollback_20250804_add_user_role_enum.sql`
- **Description** : Script pour annuler complètement la migration (table, triggers, fonctions)

## 🔧 Détails Techniques

### Structure de l'Enum
```sql
CREATE TYPE role_type AS ENUM ('Tutor', 'Alternant', 'Stagiaire');
```

### Structure de la Table Profiles
```sql
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role role_type NOT NULL DEFAULT 'Alternant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### Automatisation via Triggers
- **Trigger de création** : Crée automatiquement un profil pour chaque nouvel utilisateur
- **Trigger de mise à jour** : Met à jour automatiquement le champ `updated_at`

### Sécurité RLS
- **Row Level Security activé** sur la table profiles
- **Politiques** : Les utilisateurs ne peuvent voir/modifier que leur propre profil

### Valeurs Acceptées
- **`'Tutor'`** : Rôle pour les tuteurs/encadrants
- **`'Alternant'`** : Rôle pour les étudiants en alternance (valeur par défaut)
- **`'Stagiaire'`** : Rôle pour les stagiaires

## 🚀 Instructions d'Application

### Application de la Migration
```bash
# Dans le répertoire apps/backend/
supabase db push

# Ou pour appliquer manuellement :
psql -d your_database -f supabase/migrations/20250804_add_user_role_enum.sql
```

### Validation Post-Migration
```bash
# Exécuter les tests de validation
psql -d your_database -f supabase/migrations/test_role_migration.sql
```

### Rollback (si nécessaire)
```bash
# Annuler la migration
psql -d your_database -f supabase/migrations/rollback_20250804_add_user_role_enum.sql
```

## ⚠️ Notes Importantes

1. **Architecture** : Utilise une table `profiles` séparée plutôt que de modifier `auth.users` directement
2. **Permissions** : Évite les problèmes de permissions sur les tables système Supabase
3. **Automatisation** : Les profils sont créés automatiquement via triggers
4. **Sécurité** : Row Level Security configuré pour protéger les données
5. **Performance** : Jointure simple entre `auth.users` et `public.profiles`

## 📊 Impact

- **Nouvelles tables** : `public.profiles`
- **Nouveaux types** : `role_type` (enum)
- **Nouvelles fonctions** : `handle_new_user()`, `handle_updated_at()`
- **Nouveaux triggers** : Création automatique de profils et mise à jour de timestamps
- **Sécurité** : Politiques RLS pour l'accès aux profils
- **Compatibilité** : Parfaitement compatible avec l'authentification Supabase existante

## 🔄 Utilisation dans l'App

### Récupérer le profil d'un utilisateur
```sql
SELECT u.email, p.role, p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.id = auth.uid();
```

### Mettre à jour le rôle d'un utilisateur
```sql
UPDATE public.profiles 
SET role = 'Tutor' 
WHERE id = auth.uid();
```

## ✨ Conclusion

La migration a été corrigée pour éviter les problèmes de permissions et utilise maintenant une approche standard avec une table `profiles` séparée. Cette solution respecte toujours tous les critères d'acceptation et offre une meilleure architecture pour l'extension future des profils utilisateur.