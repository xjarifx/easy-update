# Easy Update

Minimal React + TypeScript app built with Vite, styled with Tailwind CSS.

Includes an Express backend API in TypeScript under `server/index.ts`.

## Scripts

- `npm run dev` starts the frontend development server.
- `npm run dev:server` starts the TypeScript Express API on port 4000.
- `npm run dev:full` runs frontend and backend together.
- `npm run build` creates a production build.
- `npm run start` starts the compiled Express API from `dist-server`.
- `npm run preview` previews the production build locally.
- `npm run lint` runs ESLint.
- `npm run format` formats files with Prettier and Tailwind class sorting.
- `npm run db:generate` creates SQL migrations from your Drizzle schema.
- `npm run db:migrate` applies generated migrations to your PostgreSQL database.
- `npm run db:push` pushes schema changes directly to your PostgreSQL database.
- `npm run db:studio` opens Drizzle Studio.

## Database (Drizzle ORM)

- Drizzle config: `drizzle.config.ts`
- Schema file: `server/db/schema.ts`
- DB client: `server/db/index.ts`
- Connection: PostgreSQL via `DATABASE_URL`

Quick start:

1. Set `DATABASE_URL` in `.env` to your PostgreSQL connection string.
2. Edit schema in `server/db/schema.ts`.
3. Run `npm run db:generate`.
4. Run `npm run db:migrate`.
5. Use `npm run db:studio` to inspect/update data.

## API Endpoints

- `GET /api/health` backend health check.
- `GET /api/events` returns in-memory events.
- `POST /api/events` creates a new in-memory event with `{ title, start }`.
- `POST /api/providers/models` fetches model lists from external providers using `{ provider, apiKey }`.
