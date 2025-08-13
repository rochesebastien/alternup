# Alternup - Manage your alternship

![Image Description](docs/readme_cover.jpg)  

Welcome to **Alternup**, a unified Nuxt 3 monolithic application for tutors to monitor and manage their work-study students and interns. Built with Nuxt 3, TypeScript, Supabase, and Nuxt UI, this application provides a complete solution for educational supervision.

## Architecture

Alternup is now a **monolithic Nuxt 3 application** that combines frontend and backend in a single codebase:

- **Frontend**: Pages and components using Nuxt UI 3
- **Backend**: API endpoints via Nuxt's server routes (`/server/api/*`)
- **Database**: Supabase with TypeScript integration
- **Styling**: Nuxt UI 3 with Tailwind CSS

## Project Structure

```
alternup/
├── pages/              # Frontend pages (auto-routing)
├── server/api/         # Backend API endpoints
├── server/plugins/     # Server initialization (Supabase, etc.)
├── plugins/            # Client plugins
├── utils/              # Shared utilities
├── types/              # TypeScript definitions
├── supabase/           # Database migrations
└── tests/              # Vitest tests
```

# Table of Contents

1. [Installation](#installation)
2. [Development](#development)
3. [Environment Configuration](#environment-configuration)
4. [Deployment](#deployment)
5. [License](#license)

# Project overview
[![](https://img.shields.io/badge/Nuxt-00DC82?style=for-the-badge&logo=nuxtdotjs&logoColor=white)](https://nuxt.com)
[![](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/en)
[![](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/)

# Installation

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/en))
- npm or yarn package manager
- Supabase account and project

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd alternup

# Install dependencies
npm install

# Set up environment variables (see Environment Configuration)
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000` with both frontend and API endpoints accessible.

## Environment Configuration

Create a `.env` file with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
```

## Development

```bash
# Development server
npm run dev                 # Start dev server on port 3000

# Building and Production
npm run build              # Build for production
npm run preview            # Preview production build

# Code Quality
npm run typecheck          # TypeScript checking
npm run lint               # ESLint checking
npm run test               # Run Vitest tests
```

## API Endpoints

All API endpoints are available under `/api/`:
- `/api/health` - Health check
- `/api/profiles` - User profiles management
- `/api/students` - Student management
- `/api/projects` - Project management
- `/api/courses` - Course management
- And more...

## Docker Deployment

```bash
# Build the application
npm run build

# Create Docker image
docker build -t alternup .

# Run container
docker run -p 3000:3000 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  alternup
```

## Deployment Options

### Option A: Node.js
```bash
npm run build
npm run preview  # Test locally
node .output/server/index.mjs  # Production
```

### Option B: Nitro Standalone
```bash
npm run build
# Deploy .output/ directory to your hosting provider
```
# License

You may use, modify and contribute to this project for personal, non-commercial purposes.  
This project is under license.  
For more details, read the [LICENSE](LICENSE) file.

---
2025 - Roche Sébastien
