# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Alternup** is a fullstack application for managing apprenticeships (alternances) built with Nuxt.js and Supabase. The project uses a **monolithic architecture** where all frontend and backend code lives in a single Nuxt application at the root of the repository.

**Stack:**
- Nuxt.js 3.15+ (Vue 3, TypeScript)
- Supabase (PostgreSQL database + Auth)
- Tailwind CSS for styling
- Pinia for state management
- Zod for validation
- Vitest for testing

## Development Commands

```bash
# Install all dependencies
npm install

# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Preview production build
npm run preview

# Linting
npm run lint           # Check for errors
npm run lint:fix       # Auto-fix errors

# Testing
npm run test           # Run tests once
npm run test:watch     # Run tests in watch mode
```

## Docker Commands

```bash
# Build and start the application
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Architecture

### Monolithic Structure

The application uses a unified Nuxt.js monolith architecture at the root:

- **`pages/`** - Vue pages with file-based routing
- **`components/`** - Reusable Vue components
- **`server/api/`** - API routes (accessible at `/api/*`)
- **`server/plugins/`** - Nitro plugins (e.g., Supabase initialization)
- **`plugins/`** - Client-side plugins
- **`types/`** - Shared TypeScript type definitions
- **`assets/`** - CSS and images

### Key Configuration Files

- **`nuxt.config.ts`** - Main Nuxt configuration
  - Runtime config for Supabase credentials
  - Module configuration (@nuxtjs/tailwindcss, @pinia/nuxt, etc.)
  - TypeScript strict mode enabled (type checking disabled temporarily)
  - Nitro CORS configuration

### Supabase Integration

The Supabase client is initialized in `server/plugins/supabase.ts` and attached to the Nitro request context as `event.context.supabase`. This makes it available in all API routes.

```typescript
// In any API route
export default defineEventHandler(async (event) => {
  const supabase = event.context.supabase
  const { data, error } = await supabase.from('alternants').select('*')
  // ...
})
```

### Type System

The `types/supabase.ts` file contains auto-generated TypeScript types for the Supabase database schema. These types are used throughout the application:

- `Database` - Full database schema
- `Alternant`, `AlternantInsert`, `AlternantUpdate` - Alternant entity types
- `Profile`, `ProfileInsert`, `ProfileUpdate` - Profile entity types

## Database Schema

The application uses two main tables in Supabase:

### `alternants` Table
- Stores apprentice/intern information
- JSONB fields:
  - `competences` - Array of skills with levels (1-5) and evaluation dates
  - `notes` - Array of notes with title, content, date, and author_id
- Row Level Security (RLS) enabled - users can only modify their own alternants

### `profiles` Table
- User profile information linked to Supabase Auth users
- One-to-one relationship with auth.users

### Database Initialization

To set up the database, run the SQL script in `scripts/init-supabase.sql` in the Supabase SQL Editor. This creates:
- Tables with proper constraints
- Auto-update triggers for `updated_at` fields
- RLS policies for secure data access
- Optional demo data

## Environment Variables

Required environment variables (see `.env.example`):

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
```

Optional variables:
- `JWT_SECRET` - JWT signing secret (default: 'super_secret_jwt_key')
- `APP_VERSION` - Application version (default: '1.0.0')
- `NODE_ENV` - Environment mode (development/production)
- `APP_PORT` - Port for Docker deployment (default: 3000)

## API Patterns

API routes follow consistent patterns:

1. **Validation** - Use Zod schemas to validate query parameters and request bodies
2. **Error handling** - Catch errors and return structured responses with `success`, `error`, and optional `details` fields
3. **Pagination** - List endpoints support `limit`, `offset`, `sort`, and `order` parameters
4. **Search/Filter** - Support query parameters for filtering (e.g., `search`, `formation`)

Example from `server/api/alternants/index.get.ts`:
- Returns paginated results with metadata
- Supports search by name/firstname
- Supports filtering by formation
- Uses Zod for parameter validation

## Development Notes

- All code is now at the root level (migrated from `monolith/` subdirectory)
- TypeScript strict mode is enabled (type checking temporarily disabled)
- Husky and lint-staged are configured for pre-commit hooks
- Node.js version >=18.0.0 is required
- All dependencies have been updated to their latest stable versions
