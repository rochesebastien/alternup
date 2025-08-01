# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alternup is a NuxtJS-based application for managing work-study students and interns. It uses a monorepo structure with separate frontend and backend applications, both built on Nuxt 3 with TypeScript and Supabase integration.

## Architecture

The project follows a monorepo pattern with two main applications:

- **Frontend** (`apps/frontend/`): Client-facing Nuxt 3 app with Nuxt UI 3 styling framework, runs on port 3000
- **Backend** (`apps/backend/`): API server using Nuxt 3 with Nitro preset, runs on port 4000
- **Database**: Supabase (external service)

Both apps are TypeScript-first with strict mode enabled and share the same Supabase configuration through environment variables.

## Development Commands

### Quick Start
```bash
# First time setup - install root dependencies
npm install

# Install all workspace dependencies
npm run install:all

# Run both apps concurrently
npm run dev  # Frontend: http://localhost:3000, Backend: http://localhost:4000

# Run individual apps
npm run dev:frontend  # Frontend only (port 3000)
npm run dev:backend   # Backend only (port 4000)
```

### Production
```bash
# Build all workspaces
npm run build

# Start production servers
npm run start
npm run start:frontend  # Frontend only
npm run start:backend   # Backend only
```

### Docker Development
```bash
# Build and run frontend
docker build -t alternup-frontend ./apps/frontend
docker run -p 3000:3000 alternup-frontend

# Build and run backend
docker build -t alternup-backend ./apps/backend
docker run -p 4000:4000 alternup-backend

# Or use docker-compose
docker-compose up
```

## Environment Configuration

Both applications require Supabase environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Public anon key for frontend, service role key for backend

The docker-compose setup expects these to be set in your environment.

## Key Technologies

- **Nuxt 3**: Full-stack framework for both frontend and backend
- **TypeScript**: Strict mode enabled across all apps
- **Supabase**: Database and authentication backend
- **Nuxt UI 3**: Modern UI framework with built-in Tailwind CSS integration (frontend only)
- **Concurrently**: Used for running multiple apps in development

## Workspace Structure

This is an npm workspaces monorepo. When adding dependencies:
- Use `npm install <package> --workspace=apps/frontend` for frontend deps
- Use `npm install <package> --workspace=apps/backend` for backend deps
- Root-level dependencies are for development tools and workspace management