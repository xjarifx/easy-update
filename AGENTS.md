# AGENTS.md

## Project Overview

Easy Update - a monorepo for managing notices/events with React frontend and Express backend.

## Tech Stack

- **Monorepo**: Turborepo v2 with pnpm workspaces
- **Package Manager**: pnpm@10.33.2
- **Client**: React + Vite v8 + TypeScript
- **Server**: Express + TypeScript + Drizzle ORM + PostgreSQL
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

## Commands

```bash
pnpm install              # Install dependencies
pnpm run dev             # Start all apps in dev mode
pnpm run build           # Build all apps
pnpm run lint            # Lint all apps
pnpm run test            # Run tests (if configured)

# Database
pnpm run db:generate    # Generate migration (drizzle-kit)
pnpm run db:migrate     # Run migrations
pnpm run db:push        # Push schema changes
pnpm run db:studio      # Open Drizzle Studio
pnpm run db:seed        # Seed database

# Individual apps
pnpm --filter @easy-update/client dev
pnpm --filter @easy-update/server dev
```

## Environment Setup

- **Per-project `.env.example` files**: Each app has its own `.env.example`
  - `apps/server/.env.example`: Server environment (DATABASE_URL, PORT, etc.)
  - `apps/client-web/.env.example`: Client environment (VITE_* vars if needed)
- **`apps/server/.env`**: Local server environment (gitignored)
- Database: Remote PostgreSQL on Aiven Cloud
- Server runs on `http://localhost:4000`
- Client runs on `http://localhost:5173` (proxies `/api` to server)

## Deployment

- **Client**: Vercel (static Vite build from `apps/client`)
- **Server**: Render (Node service from `apps/server`)

## Key Notes

- Vite config has `optimizeDeps: { noDiscovery: true }` to fix dep-scan issue
- `.turbo/` is gitignored (add to gitignore if not present)
- TypeScript types are shared via `@easy-update/types` workspace package
- `NoticeRecord` (server) includes `userId`; `NoticeItem` (client) omits it via `Omit<NoticeRecord, "userId">`
- All `.env` files with secrets should never be committed
- Node modules may have stale npm artifacts; run `pnpm install` to clean

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`):
- Runs on push/PR to `main`
- Sets up pnpm + Node.js
- Caches pnpm store and turbo artifacts
- Runs `turbo run lint build`
