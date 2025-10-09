# Alternup - Gérez vos alternances

![Image Description](docs/readme_cover.jpg)  

Bienvenue dans **Alternup**, une solution fullstack basée sur NuxtJS permettant aux tuteurs de suivre et gérer leurs étudiants en alternance (et stagiaires). Le projet s'appuie sur une architecture monorepo avec une base de données Supabase, Tailwind CSS pour le styling et TypeScript pour la sécurité du typage. L'application vous permet de voir vos alternants/stagiaires, leurs compétences, leurs notes et de créer des quiz personnalisés.

## Table des matières

1. [Structure du projet](#structure-du-projet)
2. [Fonctionnalités](#fonctionnalités)
3. [Installation](#installation)
4. [Développement](#développement)
5. [Production](#production)
6. [Licence](#license)

## Structure du projet

Le projet utilise une **architecture monolithique** avec Nuxt.js :

### 🎯 Architecture Monolithique
```
alternup/
├── monolith/              # Application monolithique Nuxt.js
│   ├── components/        # Composants Vue réutilisables
│   ├── pages/            # Pages de l'application (routing automatique)
│   ├── server/           # API routes intégrées (/api/*)
│   │   ├── api/          # Routes API
│   │   └── plugins/      # Plugins Nitro (Supabase)
│   ├── plugins/          # Plugins client (Supabase client)
│   ├── assets/           # Ressources CSS, images
│   ├── types/            # Définitions TypeScript partagées
│   └── nuxt.config.ts    # Configuration Nuxt unifiée
├── docker-compose.yml    # Configuration Docker
├── scripts/              # Scripts de base de données
└── docs/                 # Documentation
```

### ✅ Avantages de cette architecture

- **Simplicité** : Une seule application à maintenir
- **Déploiement unique** : Un seul service à déployer
- **Configuration unifiée** : Un seul fichier de configuration
- **Types partagés** : Pas de duplication TypeScript
- **API intégrée** : Routes API dans le même projet
- **HMR complet** : Hot Module Replacement pour tout le projet

## Fonctionnalités

- 👥 **Gestion des alternants** : Vue d'ensemble et détaillée des alternants
- 💻 **Suivi des compétences** : Enregistrez et suivez le niveau des compétences
- 📝 **Système de notes** : Ajoutez des notes et commentaires sur les alternants
- 📊 **Tableau de bord** : Visualisez les métriques clés
- 🌐 **API REST** : Backend complet avec validation des données
- 🔐 **Authentification** : Connexion sécurisée via Supabase Auth
- 📱 **Interface responsive** : Design adapté à tous les appareils

# Project overview
[![](https://img.shields.io/badge/Nuxt-00DC82?style=for-the-badge&logo=nuxtdotjs&logoColor=white)](https://nuxt.com)
[![](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/en)
[![](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/)
[![](https://img.shields.io/badge/figma-%23F24E1E.svg?style=for-the-badge&logo=figma&logoColor=white)](https://www.figma.com)

# Installation 

## Prérequis

- [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
- [npm](https://www.npmjs.com/) (installé avec Node.js)
- Compte [Supabase](https://supabase.com/) pour la base de données

## Configuration des variables d'environnement

1. Copiez le fichier `.env.example` vers `.env` à la racine du projet
2. Remplissez les variables avec vos valeurs de Supabase:
   ```
   SUPABASE_URL=votre-url-supabase
   SUPABASE_KEY=votre-cle-anon-publique
   ```

## Installation des dépendances

```bash
# Installer toutes les dépendances (frontend et backend)
npm run install:all

# Ou installer séparément
npm install --workspace=apps/frontend
npm install --workspace=apps/backend
```

## Développement local

```bash
# Lancer l'application monolithique (port 3000)
npm run dev

# Ou depuis le dossier monolith directement
cd monolith
npm run dev
```

## Production

### Option 1: Avec Docker
```bash
# Construire et lancer l'application monolithique
docker-compose up -d --build

# Ou construire et exécuter manuellement
docker build -t alternup-monolith ./monolith
docker run -p 3000:3000 \
  -e SUPABASE_URL=xxx \
  -e SUPABASE_KEY=xxx \
  alternup-monolith
```

### Option 2: Sans Docker
```bash
# Construire l'application monolithique
npm run build

# Démarrer l'application
npm run start
```
## License

You may use, modify and contribute to this project for personal, non-commercial purposes.  
This project is under license.  
For more details, read the [LICENSE](LICENSE) file.

## Structure de la base de données

L'application utilise Supabase comme base de données PostgreSQL avec les tables principales suivantes :

### Table `alternants`

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique de l'alternant |
| nom | text | Nom de l'alternant |
| prenom | text | Prénom de l'alternant |
| email | text | Email de contact |
| telephone | text | Numéro de téléphone |
| formation | text | Formation suivie |
| date_naissance | date | Date de naissance |
| competences | jsonb | Liste des compétences avec niveaux (voir détails ci-dessous) |
| notes | jsonb | Notes et commentaires |
| user_id | uuid | Référence vers l'utilisateur (foreign key) |
| created_at | timestamp | Date de création |
| updated_at | timestamp | Date de mise à jour |

### Table `profiles`

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique du profil |
| user_id | uuid | Référence vers l'utilisateur (foreign key) |
| username | text | Nom d'utilisateur |
| full_name | text | Nom complet |
| avatar_url | text | URL de l'avatar |
| website | text | Site web personnel |
| updated_at | timestamp | Date de mise à jour |

### Structure du champ `competences`

Le champ `competences` utilise une structure JSON avec le format suivant :

```json
[
  {
    "nom": "JavaScript",
    "description": "Maîtrise du langage JavaScript et de ses fonctionnalités modernes",
    "niveau": 4,
    "date_evaluation": "2025-05-15"
  },
  {
    "nom": "React",
    "description": "Création de composants et gestion d'état avec React",
    "niveau": 3,
    "date_evaluation": "2025-05-20"
  }
]
```

Les niveaux de compétence sont définis comme suit :
1. **Notions** : Connaissances théoriques de base
2. **Débutant** : Peut utiliser avec guidance
3. **Intermédiaire** : Autonome sur des tâches standards
4. **Avancé** : Maîtrise approfondie, peut former d'autres personnes
5. **Expert** : Expertise totale, référent technique

### Structure du champ `notes`

Le champ `notes` utilise également une structure JSON avec le format suivant :

```json
[
  {
    "titre": "Évaluation mi-parcours",
    "contenu": "L'alternant progresse bien sur les aspects techniques mais doit améliorer sa communication",
    "date": "2025-03-15",
    "auteur_id": "uuid-de-lauteur"
  },
  {
    "titre": "Point hebdomadaire",
    "contenu": "A terminé la formation React avec succès",
    "date": "2025-04-02",
    "auteur_id": "uuid-de-lauteur"
  }
]
```

## Initialisation de la base de données

Pour initialiser la base de données Supabase, suivez ces étapes :

1. Connectez-vous à votre [dashboard Supabase](https://app.supabase.io/)
2. Sélectionnez votre projet (ou créez-en un nouveau)
3. Naviguez vers `SQL Editor`
4. Copiez le contenu du fichier `scripts/init-supabase.sql`
5. Collez et exécutez le script dans l'éditeur SQL

Ce script va :
- Créer les tables nécessaires pour l'application
- Configurer les déclencheurs pour la mise à jour automatique des timestamps
- Mettre en place les politiques de sécurité (RLS)
- Insérer quelques données de démonstration (optionnel)

## Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez votre branche de fonctionnalité (`git checkout -b feature/amazing-feature`)
3. Committez vos changements (`git commit -m 'Add some amazing feature'`)
4. Poussez vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

---
2025 - Roche Sébastien
