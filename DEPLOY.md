Deployment notes — Vercel (client) and Render (server)

Overview

- This repo is a monorepo with the frontend at `apps/client` and the backend at `apps/server`.

Recommended (simple, reliable)

- Deploy the client to Vercel (static Vite build).
- Deploy the server to Render (managed Node service) or Railway/Heroku.

Why this recommendation

- The server is an Express app (stateful long-running Node process). Render runs standard Node servers easily with a build/start command.
- Vercel is excellent for static frontends and serverless functions; converting the current Express app to serverless requires refactor.

Quick steps — Client (Vercel)

1. In Vercel dashboard create a new project from this repo.
2. Set the project Root to `apps/client`.
3. Set the Build Command to `npm run build` and the Output Directory to `dist` (Vite default).
4. Add any env vars (client-only) under Project Settings > Environment Variables.
5. Deploy.

Notes: you can also link the repo and let Vercel detect the framework. I added `apps/client/vercel.json` to help with static-build settings.

Quick steps — Server (Render)

1. In Render create a new Web Service.
2. Connect to repo and set the Root directory to `apps/server`.
3. Build Command: `npm ci && npm run build` (Render will run `npm install` by default; adjust if you use workspace installs)
4. Start Command: `npm run start` (server package.json uses `node dist/index.js`)
5. Add `DATABASE_URL` and other secrets under Environment > Environment Variables.

Alternative: Deploy both to Vercel

- You can deploy the server as a separate Vercel project by:
  - Converting Express routes to serverless functions (move handlers into `api/`), or
  - Creating a separate Vercel project with `apps/server` as root and using a Dockerfile to run a full Node server (requires Vercel's Docker support / Pro features).
- For most teams, using Render (or Railway) for the Node server is faster and simpler.

Environment variables and secrets

- Do NOT commit real secrets. Use Vercel/Render secret management.
- I updated `.env.example` with the expected vars: `DATABASE_URL`, `OPENROUTE_API_KEY`, and `PORT`.

Local build/test commands

- Run both dev servers locally:

```bash
npm run dev
```

- Build both:

```bash
npm run build
```

Next steps I can do for you (pick any):

- Convert the Express app into Vercel serverless functions (requires refactor).
- Add a `Dockerfile` for `apps/server` for deploying to Vercel via Docker or to other hosts.
- Add GitHub Actions to auto-deploy on push.
- Add Dockerfiles, `docker-compose.yml`, and GitHub Actions for CI/CD (I added these files).

CI / Docker notes

- A CI workflow (`.github/workflows/ci.yml`) builds the monorepo on push/PR and runs lint.
- A Docker publish workflow (`.github/workflows/docker-publish.yml`) builds images and pushes them to GitHub Container Registry (`ghcr.io`) on push to `main`.

Secrets / permissions

- The Docker publish workflow uses the repository `GITHUB_TOKEN` for pushing to GHCR; ensure the repository owner allows package write access for workflows.
- If you prefer Docker Hub or another registry, update the workflow to log in with `DOCKER_USERNAME`/`DOCKER_PASSWORD` secrets.

Local docker-compose

- There's a `docker-compose.yml` at the repo root to run Postgres, server, and client locally.
- Start locally with:

```bash
docker compose up --build
```
