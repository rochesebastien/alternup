-- Script d'initialisation de la base de données Supabase
-- Exécutez ce script dans l'éditeur SQL de votre projet Supabase

-- Table des alternants
CREATE TABLE IF NOT EXISTS alternants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  formation TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telephone TEXT,
  date_naissance DATE,
  competences JSONB DEFAULT '[]'::JSONB,
  notes JSONB DEFAULT '[]'::JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Fonction pour mettre à jour automatiquement le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement le champ updated_at
DROP TRIGGER IF EXISTS update_alternants_updated_at ON alternants;
CREATE TRIGGER update_alternants_updated_at
BEFORE UPDATE ON alternants
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at();

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Trigger pour mettre à jour automatiquement le champ updated_at des profils
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at();

-- Politiques RLS (Row Level Security) pour les alternants
ALTER TABLE alternants ENABLE ROW LEVEL SECURITY;

-- Politique permettant aux utilisateurs authentifiés de voir tous les alternants
CREATE POLICY "Les utilisateurs authentifiés peuvent voir tous les alternants"
ON alternants FOR SELECT
TO authenticated
USING (true);

-- Politique permettant aux utilisateurs de créer leurs propres alternants
CREATE POLICY "Les utilisateurs peuvent créer leurs propres alternants"
ON alternants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Politique permettant aux utilisateurs de modifier leurs propres alternants
CREATE POLICY "Les utilisateurs peuvent modifier leurs propres alternants"
ON alternants FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Politique permettant aux utilisateurs de supprimer leurs propres alternants
CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres alternants"
ON alternants FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Données de démonstration (optionnel)
INSERT INTO alternants (nom, prenom, formation, email, competences, notes)
VALUES 
('Dupont', 'Jean', 'BTS SIO', 'jean.dupont@example.com', 
 '[{"nom": "JavaScript", "description": "Maîtrise du langage JavaScript", "niveau": 4, "date_evaluation": "2025-05-15"}, {"nom": "HTML/CSS", "description": "Structure et style de pages web", "niveau": 3, "date_evaluation": "2025-05-10"}]',
 '[{"titre": "Évaluation mi-parcours", "contenu": "Bonne progression technique", "date": "2025-03-15"}]'),
('Martin', 'Alice', 'BUT Informatique', 'alice.martin@example.com',
 '[{"nom": "Java", "description": "Programmation orientée objet en Java", "niveau": 3, "date_evaluation": "2025-05-18"}, {"nom": "SQL", "description": "Requêtes et modélisation de bases de données", "niveau": 4, "date_evaluation": "2025-05-12"}]',
 '[{"titre": "Point hebdomadaire", "contenu": "Excellente autonomie", "date": "2025-04-02"}]'),
('Leroy', 'Thomas', 'Master MIAGE', 'thomas.leroy@example.com',
 '[{"nom": "React", "description": "Développement d'interfaces utilisateur", "niveau": 5, "date_evaluation": "2025-05-20"}, {"nom": "TypeScript", "description": "JavaScript avec typage statique", "niveau": 4, "date_evaluation": "2025-05-15"}]',
 '[{"titre": "Évaluation de projet", "contenu": "A réalisé un excellent travail sur le projet client", "date": "2025-03-25"}]');
