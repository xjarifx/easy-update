# Easy Update

Minimal React + TypeScript app built with Vite, styled with Tailwind CSS.

Includes an Express backend API in TypeScript under `src/server/index.ts`.

## System Data Flow

This project is structured to enforce one-way flow from `DATA_RULE.md`:

- New data into system: frontend -> API -> database
- Data shown to user: database -> API -> frontend

To enforce this at code level:

- Frontend uses API client modules in `src/client/api/*` and never talks to DB directly.
- API routes in `src/server/routes/*` orchestrate requests/responses.
- Business logic lives in `src/server/services/*`.
- Database access is isolated in `src/server/repositories/*`.

## Scripts

- `npm run dev` builds first, then runs frontend + backend together.
- `npm run dev:server` starts the TypeScript Express API on port 4000.
- `npm run dev:full` runs frontend and backend together.
- `npm run build` creates production builds in `dist-client` and `dist-server`.
- `npm run start` builds first, then starts the compiled Express API from `dist-server`.
- `npm run start:built` starts the already-built Express API from `dist-server`.
- `npm run preview` previews the production build locally.
- `npm run lint` runs ESLint.
- `npm run format` formats files with Prettier and Tailwind class sorting.
- `npm run db:generate` creates SQL migrations from your Drizzle schema.
- `npm run db:migrate` applies generated migrations to your PostgreSQL database.
- `npm run db:push` pushes schema changes directly to your PostgreSQL database.
- `npm run db:seed` inserts demo notices if the notices table is empty.
- `npm run db:studio` opens Drizzle Studio.

## Database (Drizzle ORM)

- Drizzle config: `drizzle.config.ts`
- Schema file: `src/server/db/schema.ts`
- DB client: `src/server/db/index.ts`
- Connection: PostgreSQL via `DATABASE_URL`

Quick start:

1. Set `DATABASE_URL` in `.env` to your PostgreSQL connection string.
2. Edit schema in `src/server/db/schema.ts`.
3. Run `npm run db:generate`.
4. Run `npm run db:migrate`.
5. Use `npm run db:studio` to inspect/update data.

## API Endpoints

- `GET /api/health` backend health check.
- `GET /api/notices` returns notices from PostgreSQL.
- `POST /api/notices` creates a notice with `{ date, time, event }`.
- `PUT /api/notices/:id` updates an existing notice.
- `DELETE /api/notices/:id` deletes an existing notice.
- `GET /api/events` returns calendar-shaped events derived from notices.
- `POST /api/events` creates one event via notice creation `{ title, start }`.
- `POST /api/events/extract-and-create` extracts events from text and persists them.
- `POST /api/providers/models` fetches model lists from external providers using `{ provider, apiKey }`.
