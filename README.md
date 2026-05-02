# Easy Update

A monorepo for managing notices/events with React frontend, Express backend, and Clerk authentication.

## Tech Stack

- **Monorepo**: Turborepo v2 with pnpm workspaces
- **Package Manager**: pnpm@10.33.2
- **Client**: React + Vite v8 + TypeScript + Tailwind CSS
- **Server**: Express + TypeScript + Drizzle ORM + PostgreSQL
- **Auth**: Clerk (token-based, prebuilt components)
- **Email**: Resend (welcome emails)
- **Shared**: `@easy-update/types` package

## Project Structure

```
easy-update/
├── apps/
│   ├── client-web/      # Vite + React frontend (web)
│   ├── client-android/  # Android client (placeholder)
│   ├── client-ios/      # iOS client (placeholder)
│   └── server/          # Express API backend
├── packages/
│   └── types/           # Shared TypeScript types
├── drizzle/             # Database migrations
├── .github/workflows/   # CI/CD (ci.yml)
└── turbo.json
```

## Environment Setup

### Per-project `.env.example` files:
- `apps/server/.env.example`: `CLERK_SECRET_KEY`, `RESEND_API_KEY`
- `apps/client-web/.env.example`: `VITE_CLERK_PUBLISHABLE_KEY`

### Create your own `.env` files:
- `apps/server/.env` - Server environment (gitignored)
- `apps/client-web/.env` - Client environment (gitignored)

### Database
- Remote PostgreSQL on Aiven Cloud (configured via `DATABASE_URL`)
- Server runs on `http://localhost:4000`
- Client runs on `http://localhost:5173` (proxies `/api` to server)

## Getting Started

```bash
# Install dependencies
pnpm install

# Start all apps in dev mode
pnpm run dev

# Start individual apps
pnpm --filter @easy-update/client dev
pnpm --filter @easy-update/server dev
```

## Available Scripts

### Root
- `pnpm run dev` - Start all apps in dev mode (Turborepo)
- `pnpm run build` - Build all apps
- `pnpm run lint` - Lint all apps
- `pnpm run test` - Run tests (if configured)

### Database
- `pnpm run db:generate` - Generate migration (drizzle-kit)
- `pnpm run db:migrate` - Run migrations
- `pnpm run db:push` - Push schema changes
- `pnpm run db:studio` - Open Drizzle Studio
- `pnpm run db:seed` - Seed database with demo data

### Apps
- `pnpm --filter @easy-update/client dev` - Start client dev server
- `pnpm --filter @easy-update/server dev` - Start server dev server

## Database (Drizzle ORM)

- Drizzle config: `drizzle.config.ts`
- Schema file: `apps/server/src/db/schema.ts`
- DB client: `apps/server/src/db/index.ts`
- Connection: PostgreSQL via `DATABASE_URL`

### Quick start:
1. Set `DATABASE_URL` in `apps/server/.env`
2. Edit schema in `apps/server/src/db/schema.ts`
3. Run `pnpm run db:generate`
4. Run `pnpm run db:migrate`
5. Use `pnpm run db:studio` to inspect/update data

## Authentication (Clerk)

- **Server**: Uses `@clerk/backend` to verify JWT tokens
- **Client**: Uses `@clerk/clerk-react` with prebuilt `<SignIn>` component
- **User management**: Clerk handles auth; app DB stores `clerkId` in `users` table
- **Welcome emails**: Sent via Resend when new users sign up

### Clerk Setup:
1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Add `CLERK_SECRET_KEY` to `apps/server/.env`
3. Add `VITE_CLERK_PUBLISHABLE_KEY` to `apps/client-web/.env`

## Email Service (Resend)

- Sends welcome emails to new users with app usage instructions
- Template includes: how to use the app, OpenRouter.ai link for free API key
- Requires `RESEND_API_KEY` in `apps/server/.env`

### Resend Setup:
1. Create a Resend account at [resend.com](https://resend.com)
2. Add `RESEND_API_KEY` to `apps/server/.env`
3. Update `FROM_EMAIL` in `apps/server/src/services/emailService.ts` to your verified domain

## API Endpoints

- `GET /api/health` - Backend health check
- `GET /api/notices` - Returns notices from PostgreSQL (requires auth)
- `POST /api/notices` - Creates a notice with `{ date, time, title, moreInfo }` (requires auth)
- `PUT /api/notices/:id` - Updates an existing notice (requires auth)
- `DELETE /api/notices/:id` - Deletes an existing notice (requires auth)
- `GET /api/events` - Returns calendar-shaped events derived from notices (requires auth)
- `POST /api/events` - Creates one event via notice creation (requires auth)
- `POST /api/events/extract-and-create` - Extracts events from text and persists them (requires auth)
- `POST /api/providers/models` - Fetches model lists from external providers (requires auth)

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):
- Runs on push/PR to `main`
- Sets up pnpm + Node.js
- Caches pnpm store and Turbo artifacts
- Runs `turbo run lint build`

## Deployment

- **Client**: Vercel (static Vite build from `apps/client-web`)
- **Server**: Render (Node service from `apps/server`)

## How to Use the App

1. **Input page**: Use the AI-powered input to create notices from natural language. Just describe your event and let AI extract the details.
2. **Notice page**: View and manage all your notices. Edit, complete, or delete them as needed.
3. **Calendar page**: See your notices displayed on a calendar for a visual overview of your schedule.
4. **Settings page**: Configure your AI provider (OpenRouter, OpenAI, Anthropic, or Google) and add your API key to enable AI features.

### Get a Free AI API Key
You'll need an API key for the AI features. Get a free key from [OpenRouter.ai](https://openrouter.ai) – they offer free access to many AI models.
