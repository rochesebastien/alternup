# Rapport de Migration - Structure Base de Données Complète

## 📋 Résumé

Migration complète de la structure de base de données pour l'application Alternup, incluant la gestion des profils étendus, des cours, des projets, des notes et du calendrier.

**🔧 MISE À JOUR** : Toutes les migrations ont été corrigées pour résoudre les erreurs d'encodage UTF-8 en supprimant les caractères accentués des valeurs enum et commentaires.

## ✅ Critères d'Acceptation Validés

### 1. Extension de la table profiles
- ✅ **Champs ajoutés** : `first_name`, `last_name`, `email`
- ✅ **Contraintes appliquées** : NOT NULL sur tous les nouveaux champs
- ✅ **Contrainte d'unicité** : email unique
- ✅ **Index de performance** : idx_profiles_role pour filtrage rapide par rôle

### 2. Enum project_status_enum créé
- ✅ **Valeurs définies** : `'non_demarre'`, `'en_cours'`, `'termine'`, `'annule'`
- ✅ **Encodage corrigé** : suppression des caractères accentués pour éviter les erreurs UTF-8

### 3. Relations tuteur ↔ étudiants
- ✅ **Table tutor_students** : relation many-to-many avec clé primaire composite
- ✅ **Référencement** : foreign keys vers profiles(id)
- ✅ **Horodatage** : added_at avec timestamp automatique

### 4. Système de cours complet
- ✅ **Table courses** : gestion des cours avec créateur
- ✅ **Table course_assignments** : affectation cours → étudiants
- ✅ **Table course_notes** : notes et commentaires par séance
- ✅ **Structure JSONB** : notions_covered pour flexibilité

### 5. Système de projets/missions
- ✅ **Table projects** : projets internes/externes
- ✅ **Table project_assignments** : assignation avec statuts
- ✅ **Commentaires** : tuteur et étudiant séparés
- ✅ **Suivi temporel** : started_at et updated_at

### 6. Calendrier des événements
- ✅ **Table calendar_events** : événements avec tuteur et étudiant
- ✅ **Période flexible** : start_time et end_time en timestamptz
- ✅ **Index temporel** : optimisation des requêtes par étudiant et date

## 📁 Fichiers Créés

### 1. Migration 1 - Extension Profils et Enum Projet
- **Fichier** : `20250805000702_extend_profiles_and_add_project_status.sql`
- **Description** : Extension table profiles + création project_status_enum

### 2. Migration 2 - Tables Centrales  
- **Fichier** : `20250805000903_add_core_tables.sql`
- **Description** : Tables tutor_students et courses avec politiques RLS

### 3. Migration 3 - Tables d'Assignation
- **Fichier** : `20250805000953_add_assignment_tables.sql`
- **Description** : Tables course_assignments, projects, project_assignments

### 4. Migration 4 - Notes et Calendrier
- **Fichier** : `20250805001102_add_notes_and_calendar_tables.sql`
- **Description** : Tables course_notes et calendar_events

### 5. Migration 5 - Triggers et Fonctions
- **Fichier** : `20250805001409_add_triggers_and_functions.sql`
- **Description** : Triggers updated_at et fonction handle_new_user améliorée

## 🔧 Détails Techniques

### Énumérations Créées
```sql
-- Existant (conservé)
CREATE TYPE role_type AS ENUM ('Tutor', 'Alternant', 'Stagiaire');

-- Nouveau
CREATE TYPE project_status_enum AS ENUM ('non_demarre', 'en_cours', 'termine', 'annule');
```

### Structure des Tables Principales

#### Profiles (étendue)
```sql
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role role_type NOT NULL DEFAULT 'Alternant',
    first_name text NOT NULL,           -- NOUVEAU
    last_name text NOT NULL,            -- NOUVEAU  
    email text NOT NULL UNIQUE,         -- NOUVEAU
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Relations Tuteur-Étudiants
```sql
CREATE TABLE public.tutor_students (
    tutor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    added_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tutor_id, student_id)
);
```

#### Système de Cours
```sql
-- Cours disponibles
CREATE TABLE public.courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Affectations cours → étudiants
CREATE TABLE public.course_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    start_date date NOT NULL,
    end_date date,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, course_id, start_date)
);

-- Notes par séance
CREATE TABLE public.course_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
    session_date date NOT NULL,
    grade numeric(5,2),
    comment text,
    notions_covered jsonb,              -- Structure flexible
    created_at timestamptz NOT NULL DEFAULT now()
);
```

#### Système de Projets
```sql
-- Projets/missions
CREATE TABLE public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    internal boolean NOT NULL DEFAULT true,
    created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Assignations projet → étudiants
CREATE TABLE public.project_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status project_status_enum NOT NULL DEFAULT 'non_demarre',
    tutor_comment text,
    student_comment text,
    started_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, student_id)
);
```

#### Calendrier
```sql
CREATE TABLE public.calendar_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tutor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

## 🔒 Sécurité (Row Level Security)

### Politiques Implémentées

#### Profiles
- Les utilisateurs voient uniquement leur propre profil
- Les utilisateurs peuvent modifier leur propre profil

#### Tutor_Students  
- Les tuteurs voient leurs étudiants
- Les étudiants voient leurs tuteurs

#### Courses
- Tous les utilisateurs authentifiés peuvent voir les cours
- Seuls les tuteurs peuvent créer des cours
- Les créateurs peuvent modifier leurs cours

#### Course_Assignments & Course_Notes
- Les étudiants voient leurs propres affectations/notes
- Les tuteurs voient les affectations/notes de leurs étudiants
- Seuls les tuteurs peuvent créer des notes

#### Projects & Project_Assignments
- Tous les utilisateurs authentifiés voient les projets
- Seuls les tuteurs peuvent créer des projets
- Les étudiants voient leurs assignations de projets
- Les tuteurs voient les assignations de leurs étudiants

#### Calendar_Events
- Les étudiants voient leurs événements
- Les tuteurs voient les événements qu'ils ont créés
- Seuls les tuteurs peuvent créer des événements pour leurs étudiants

## ⚡ Optimisations de Performance

### Index Créés
```sql
-- Performance sur les rôles
CREATE INDEX idx_profiles_role ON profiles(role);

-- Performance sur les assignations
CREATE INDEX idx_course_assignments_student ON course_assignments(student_id);
CREATE INDEX idx_proj_assign_student ON project_assignments(student_id);

-- Performance sur les notes
CREATE INDEX idx_course_notes_assignment ON course_notes(assignment_id);

-- Performance sur le calendrier
CREATE INDEX idx_calendar_events_student ON calendar_events(student_id, start_time);
```

## 🔄 Triggers et Automatisations

### Fonctions Créées/Modifiées
```sql
-- Fonction générique pour updated_at
CREATE FUNCTION handle_updated_at() RETURNS TRIGGER;

-- Fonction améliorée pour création automatique de profils
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER;
```

### Triggers Actifs
- `profiles_updated_at_trigger` : MAJ automatique updated_at sur profiles
- `project_assignments_updated_at_trigger` : MAJ automatique updated_at sur project_assignments  
- `on_auth_user_created` : Création automatique de profil lors de l'inscription

## 🛠️ Instructions d'Application

### Commandes de Migration
```bash
cd apps/backend
npx supabase db push
```

**⚠️ IMPORTANT** : Si vous rencontrez des erreurs UTF-8, toutes les migrations ont été corrigées pour supprimer les caractères accentués. Les fichiers sont maintenant compatibles avec l'encodage PostgreSQL standard.

### Ordre d'Application
1. `20250805000702_extend_profiles_and_add_project_status.sql`
2. `20250805000903_add_core_tables.sql`
3. `20250805000953_add_assignment_tables.sql`
4. `20250805001102_add_notes_and_calendar_tables.sql`
5. `20250805001409_add_triggers_and_functions.sql`

## ⚠️ Notes Importantes

### Correction d'Encodage UTF-8 (CRITIQUE)
- **Problème identifié** : Erreurs UTF-8 multiples avec caractères accentués dans enums et commentaires
- **Erreur type** : `ERROR: invalid byte sequence for encoding "UTF8": 0xe9 0x74 0x75 (SQLSTATE 22021)`
- **Solution appliquée** : Suppression complète des caractères accentués dans toutes les migrations

#### Valeurs Enum Corrigées
- `'non_démarré'` → `'non_demarre'`
- `'terminé'` → `'termine'`
- `'annulé'` → `'annule'`

#### Commentaires Corrigés (exemples)  
- `'étudiants'` → `'etudiants'`
- `'créé'` → `'cree'`
- `'détaillée'` → `'detaillee'`
- `'séance'` → `'seance'`
- `'événements'` → `'evenements'`
- `'périodes'` → `'periodes'`

#### Fichiers Corrigés
✅ `20250805000702_extend_profiles_and_add_project_status.sql`
✅ `20250805000903_add_core_tables.sql`  
✅ `20250805000953_add_assignment_tables.sql`
✅ `20250805001102_add_notes_and_calendar_tables.sql`
✅ `20250805001409_add_triggers_and_functions.sql`

### Compatibilité
- **Enum existant conservé** : `role_type` maintenu tel quel
- **Structure profiles étendue** : ajout de champs sans modification des existants
- **Foreign keys** : utilisation de profiles(id) pour toutes les références utilisateur

## 📊 Impact sur l'Application

### Nouvelles Fonctionnalités Activées
1. **Gestion complète des profils utilisateur** avec informations personnelles
2. **Système de relation tuteur-étudiant** flexible
3. **Gestion des cours** avec affectations et notes détaillées
4. **Suivi de projets/missions** avec statuts et commentaires
5. **Calendrier d'événements** pour planification des séances
6. **Système de notes JSONB** pour structure flexible des notions

### Base pour Développement Frontend
- API prête pour CRUD sur toutes les entités
- Politiques RLS configurées pour sécurité
- Index optimisés pour performance
- Structure normalisée et extensible

## ✅ Validation et Tests

Pour valider la migration :
```sql
-- Vérifier les tables créées
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Vérifier les enum
SELECT typname, string_agg(enumlabel, ', ' ORDER BY enumsortorder) as values
FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname IN ('role_type', 'project_status_enum')
GROUP BY typname;

-- Vérifier les politiques RLS
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```