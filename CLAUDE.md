# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alternup is a unified Nuxt 3 monolithic application for managing work-study students and interns. It combines frontend and backend functionality in a single codebase with TypeScript and Supabase integration.

## Architecture

The project is now a **monolithic Nuxt 3 application** that unifies frontend and backend:

- **Frontend**: Pages and components using Nuxt UI 3, accessible at the root routes
- **Backend**: API endpoints via Nuxt's server routes (`/server/api/*`), accessible at `/api/*`
- **Database**: Supabase (external service)
- **Styling**: Nuxt UI 3 with built-in Tailwind CSS integration

The application is TypeScript-first with strict mode enabled and uses optimized Supabase integration.

## Project Structure

```
alternup/
├── pages/              # Frontend pages (auto-routing)
├── server/api/         # Backend API endpoints (/api/*)
├── server/plugins/     # Server initialization (Supabase, etc.)
├── plugins/            # Client plugins
├── utils/              # Shared utilities
├── types/              # TypeScript definitions
├── supabase/           # Database migrations
└── tests/              # Vitest tests
```

## Development Commands

### Quick Start
```bash
# Install dependencies
npm install

# Start development server (frontend + backend on port 3000)
npm run dev  # http://localhost:3000

# API endpoints accessible at http://localhost:3000/api/*
```

### Production
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Start production server
node .output/server/index.mjs
```

### Code Quality
```bash
# TypeScript checking
npm run typecheck

# Linting
npm run lint

# Testing
npm run test
npm run test:watch
```

### Docker Development
```bash
# Build the application
npm run build

# Build Docker image
docker build -t alternup .

# Run container
docker run -p 3000:3000 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  alternup
```

## Environment Configuration

The application requires Supabase environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for server-side operations (private)
- `SUPABASE_ANON_KEY`: Anonymous key for client-side operations (public)

## Key Technologies

- **Nuxt 3**: Full-stack monolithic framework
- **TypeScript**: Strict mode enabled
- **Supabase**: Database and authentication backend
- **Nuxt UI 3**: Modern UI framework with built-in Tailwind CSS integration
- **h3**: HTTP framework for API endpoints
- **Vitest**: Testing framework

## API Endpoints

All API endpoints are available under `/api/`:
- `/api/health` - Health check
- `/api/profiles` - User profiles CRUD
- `/api/courses` - Courses management
- `/api/projects` - Projects management
- `/api/calendar-events` - Calendar events
- `/api/tutor-students` - Tutor-student relationships

## Supabase Integration

- **Server-side**: Uses service role key via `getSupabaseClient()` helper
- **Client-side**: Uses anonymous key via Nuxt plugin
- **Plugin**: Optimized singleton pattern in `server/plugins/supabase.ts`

## Adding Dependencies

This is now a standard npm project:
```bash
npm install <package>  # Add to dependencies
npm install -D <package>  # Add to devDependencies
```