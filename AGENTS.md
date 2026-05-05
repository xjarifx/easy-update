# AGENTS.md

## Monorepo Structure
- pnpm workspace: `apps/*`, `packages/*`
- `@easy-update/server` - Express backend (entry: `apps/server/src/index.ts`)
- `@easy-update/client-web` - React frontend (entry: `apps/client-web/src/main.tsx`)
- `@easy-update/types` - shared types (source-only, no build output)

## Commands
- `pnpm dev:full` - client + server concurrently
- `pnpm dev:client` / `pnpm dev:server` - run individually
- `pnpm build` - turbo build (respects `^build` dependency order)
- `pnpm lint` - ESLint all packages
- `pnpm test` - server vitest only (client "test" is `tsc --noEmit`)
- `pnpm db:generate` / `pnpm db:migrate` (db:seed not implemented)

## Critical Notes
- **Database env**: `drizzle.config.ts` loads from `apps/server/.env`, not root. All `pnpm db:*` commands require this file.
- **Prettier**: uses `prettier-plugin-tailwindcss` to auto-sort Tailwind classes
- **Server tests**: vitest with 80% coverage thresholds (v8), config at `apps/server/vitest.config.ts`
- **CI**: runs `turbo lint build` only (no tests in pipeline)
- **pnpm**: version 10.33.2 enforced via `packageManager` field
- **Node**: CI uses 20 (README says v18+)

## Test Quirks
- Client has no test runner - `pnpm test` only runs server vitest
- Server tests: `apps/server/src/__tests__/` (placeholder only currently)
- Single test: `pnpm --filter @easy-update/server test -- src/__tests__/placeholder.test.ts`

## ESLint Differences
- Client: allows `any`, ignores `_` prefixed vars, `set-state-in-effect` off
- Server: standard recommended rules
