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

## API Endpoints

- `GET /api/health` backend health check.
- `GET /api/events` returns in-memory events.
- `POST /api/events` creates a new in-memory event with `{ title, start }`.
- `POST /api/providers/models` fetches model lists from external providers using `{ provider, apiKey }`.
