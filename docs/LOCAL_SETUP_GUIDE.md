# Easy Update - Local Run Guide (Using Cloud Database)

This guide explains exactly how to download this project and run it on your local computer while using a cloud PostgreSQL database.

## 1. Prerequisites

Install these first:

- Git (to clone the code)
- Node.js 20+ (recommended: latest LTS)
- npm (comes with Node.js)

Check versions:

```bash
git --version
node --version
npm --version
```

If `node --version` is below 20, upgrade Node.js before continuing.

## 2. Download the Code

Choose a folder where you want the project, then run:

```bash
git clone <YOUR_REPOSITORY_URL>
cd easy-update
```

If your repository folder name is different, use that folder name in `cd`.

## 3. Install Dependencies

From the project root:

```bash
npm install
```

## 4. Configure Environment Variables

Create a `.env` file in the project root.

Example `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME
OPENROUTE_API_KEY=
PORT=4000
```

Important notes:

- `DATABASE_URL` is required.
- Use your cloud PostgreSQL connection string (the one you already know).
- Keep credentials URL-encoded if they contain special characters.
- `OPENROUTE_API_KEY` is optional (only needed for provider/model related features).
- `PORT` defaults to `4000`; keep as-is unless needed.

## 5. Prepare Database Schema

Run migrations against your cloud database:

```bash
npm run db:migrate
```

Optional: seed demo data if you want sample notices:

```bash
npm run db:seed
```

## 6. Start the App in Development

Run frontend + backend together:

```bash
npm run dev:full
```

What starts:

- Frontend (Vite): `http://localhost:5173`
- Backend (Express): `http://localhost:4000`

## 7. Verify Everything Works

1. Open `http://localhost:5173` in your browser.
2. Check backend health endpoint:

```bash
curl http://localhost:4000/api/health
```

Expected: a JSON health response.

## 8. Production-Style Local Run (Optional)

Build and run compiled server:

```bash
npm run start
```

This will build first, then run backend from `dist-server`.

## 9. Useful Commands

```bash
npm run dev:server   # backend only
npm run dev:client   # frontend only
npm run lint         # run linter
npm run format       # format code
npm run db:studio    # open Drizzle Studio
```

## 10. Troubleshooting

### Port already in use

- Change `PORT` in `.env` for backend.
- Or stop the process using that port.

### Database connection errors

- Recheck `DATABASE_URL` in `.env`.
- Confirm cloud DB allows inbound connections from your IP/network.
- Confirm SSL requirements from your DB provider.

### Migration errors

- Ensure `.env` exists in project root.
- Ensure the database user has permission to run migrations.

### Cannot find command/script

- Run commands from the project root (same folder as `package.json`).
- Re-run `npm install` if dependencies are missing.

---

If you want, you can share your repository URL format and I can customize this guide with exact clone commands for your team.
