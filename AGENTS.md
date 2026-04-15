# Easy Update

React + TypeScript (Vite) frontend with Express API backend, Drizzle ORM, PostgreSQL.

## Project Structure

- `src/client/` - Frontend (React, Vite, Tailwind CSS)
- `src/server/` - Backend (Express API, Drizzle ORM)
- `dist-client/` - Built frontend output
- `dist-server/` - Built backend output
- `drizzle/` - SQL migrations

## Key Commands

| Command               | Notes                                                 |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | Builds first, then runs `dev:full`                    |
| `npm run dev:full`    | Runs server + client concurrently                     |
| `npm run dev:server`  | Backend only on port 4000                             |
| `npm run build`       | Compiles `tsc -b && vite build`                       |
| `npm run start`       | Builds first, then starts Express from `dist-server`  |
| `npm run start:built` | Starts already-built Express (skips build)            |
| `npm run lint`        | ESLint (ignores `dist`, `dist-client`, `dist-server`) |
| `npm run format`      | Prettier + Tailwind class sorting                     |

## Database (Drizzle + PostgreSQL)

Requires `DATABASE_URL` in `.env`.

```bash
npm run db:generate   # Create migrations from schema.ts
npm run db:migrate    # Apply migrations to PostgreSQL
npm run db:push       # Push schema changes directly
npm run db:seed       # Seed demo data if notices table empty
npm run db:studio     # Open Drizzle Studio
```

Schema: `src/server/db/schema.ts`

## Architecture

Enforces one-way data flow:

- Frontend → API → Database (writes)
- Database → API → Frontend (reads)

Code organization:

- `src/client/api/*` - API client modules (frontend never talks to DB)
- `src/server/routes/*` - Express route handlers
- `src/server/services/*` - Business logic
- `src/server/repositories/*` - Database access

## API Endpoints

- `GET /api/health` - Health check
- `GET/POST /api/notices` - CRUD notices
- `PUT/DELETE /api/notices/:id` - Update/delete notice
- `GET/POST /api/events` - Calendar events from notices
- `POST /api/events/extract-and-create` - Extract events from text
- `POST /api/providers/models` - Fetch provider model lists

## Environment Variables

```
DATABASE_URL=          # PostgreSQL connection string
OPENROUTE_API_KEY=     # External API key (optional)
PORT=4000              # Server port (default: 4000)
```

## TypeScript Configs

- `tsconfig.app.json` - Frontend (DOM, esnext modules, noEmit)
- `tsconfig.server.json` - Backend (NodeNext, outputs to `dist-server/`)
- `tsconfig.node.json` - Build tooling
