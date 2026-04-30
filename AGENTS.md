# Easy Update

React + TypeScript (Vite) frontend with Express API backend, Drizzle ORM, PostgreSQL.

## Project Structure

Monorepo with npm workspaces:

```
easy-update/
├── apps/
│   ├── client/          # Frontend (React, Vite, Tailwind CSS)
│   │   ├── src/
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── server/          # Backend (Express API, Drizzle ORM)
│       ├── src/
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   └── types/           # Shared domain types (@easy-update/types)
├── scripts/             # Database utility scripts
├── docs/                # Project documentation
├── drizzle/             # SQL migrations
├── drizzle.config.ts
├── package.json         # Root workspace config
├── tsconfig.json        # Solution-style references
└── tsconfig.node.json   # Build tooling
```

## Key Commands

| Command               | Notes                                           |
| --------------------- | ----------------------------------------------- |
| `npm run dev`         | Runs `dev:full`                                 |
| `npm run dev:full`    | Runs server + client concurrently               |
| `npm run dev:client`  | Client only (Vite dev server)                   |
| `npm run dev:server`  | Server only on port 4000                        |
| `npm run build`       | Builds both client and server                   |
| `npm run start`       | Builds first, then starts Express               |
| `npm run start:built` | Starts already-built Express (skips build)      |
| `npm run lint`        | ESLint                                          |
| `npm run format`      | Prettier + Tailwind class sorting               |

Workspace-specific commands:

```bash
npm run dev --workspace=@easy-update/client
npm run build --workspace=@easy-update/server
```

## Database (Drizzle + PostgreSQL)

Requires `DATABASE_URL` in `.env`.

```bash
npm run db:generate   # Create migrations from schema.ts
npm run db:migrate    # Apply migrations to PostgreSQL
npm run db:push       # Push schema changes directly
npm run db:seed       # Seed demo data if notices table empty
npm run db:studio     # Open Drizzle Studio
```

Schema: `apps/server/src/db/schema.ts`

## Architecture

Enforces one-way data flow:

- Frontend → API → Database (writes)
- Database → API → Frontend (reads)

Code organization:

- `apps/client/src/api/*` - API client modules (frontend never talks to DB)
- `apps/server/src/routes/*` - Express route handlers
- `apps/server/src/services/*` - Business logic
- `apps/server/src/repositories/*` - Database access

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

- `apps/client/tsconfig.json` - Frontend (DOM, esnext modules, noEmit)
- `apps/server/tsconfig.json` - Backend (NodeNext, outputs to `dist/`)
- `tsconfig.node.json` - Build tooling
- `tsconfig.json` - Solution-style root (references all workspaces)
