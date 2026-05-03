# Deployment Guide — Vercel (Client) & Render (Server)

> Last updated: May 2026 — based on official Vercel and Render documentation.

This monorepo contains:
- **Client**: Vite + React at `apps/client-web` → deployed to **Vercel**
- **Server**: Express + TypeScript at `apps/server` → deployed to **Render**

---

## Prerequisites

1. GitHub repository with your code pushed to `main`
2. Vercel account — sign up at [vercel.com](https://vercel.com) with GitHub
3. Render account — sign up at [render.com](https://render.com) with GitHub
4. PostgreSQL database (already configured on Aiven Cloud via `DATABASE_URL`)
5. Clerk account for authentication — [clerk.com](https://clerk.com)
6. Resend account for emails — [resend.com](https://resend.com)

---

## Part 1: Deploy Server to Render

Render runs the Express API as a managed Node.js web service with automatic HTTPS and GitHub auto-deploy.

### Step 1: Create a new Web Service

1. Log in to [render.com](https://render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub account if not already connected
4. Select the `easy-update` repository
5. Click **Connect**

### Step 2: Configure the service

Fill in the form with these values:

| Field | Value |
|-------|-------|
| **Name** | `easy-update-server` (or your preferred name) |
| **Runtime** | Node |
| **Root Directory** | `apps/server` |
| **Build Command** | `pnpm install && pnpm run build` |
| **Start Command** | `pnpm run start` |
| **Instance Type** | Free (or Starter $7/mo for always-on) |

> **Note**: Render uses `pnpm` if a `pnpm-lock.yaml` is present. If not detected, use `npm install && npm run build` and `npm start`.

### Step 3: Set environment variables

Click **Advanced** → **Add Environment Variable** and add:

```
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/dbname?sslmode=require
CLERK_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com
PORT=(leave blank — Render sets this automatically)
```

> **Important**: Never commit real secrets. Use Render's environment variable manager.

### Step 4: Deploy

1. Click **Create Web Service**
2. Render builds and deploys — watch the logs
3. Once live, your API is available at: `https://easy-update-server.onrender.com`

### Step 5: Verify deployment

```bash
curl https://easy-update-server.onrender.com/api/health
# Expected: {"status":"ok","service":"easy-update-express-api","timestamp":"..."}
```

### Render Free Tier Notes

- Services spin down after 15 minutes of inactivity
- Next request takes 30–60 seconds to wake up (cold start)
- Upgrade to **Starter ($7/month)** for always-on service

---

## Part 2: Deploy Client to Vercel

Vercel deploys the Vite static frontend with global CDN, automatic HTTPS, and preview URLs for every branch.

### Step 1: Create a new project

1. Log in to [vercel.com](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your `easy-update` GitHub repository
4. Click **Import**

### Step 2: Configure project settings

Vercel auto-detects Vite for most projects. Override these settings:

| Field | Value |
|-------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `apps/client-web` |
| **Build Command** | `pnpm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `pnpm install` |
| **Node.js Version** | 18+ (default is fine) |

> If Vercel doesn't detect the framework, set **Root Directory** to `apps/client-web` and override the build/output settings manually.

### Step 3: Set environment variables

Go to **Settings** → **Environment Variables** and add:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=https://easy-update-server.onrender.com
```

Select environments: **Production**, **Preview**, **Development**

### Step 4: Deploy

1. Click **Deploy**
2. Vercel builds and deploys — typically completes in 1–2 minutes
3. Your app is live at: `https://easy-update-client.vercel.app`

### Step 5: Verify deployment

Visit the provided URL and confirm:
- The app loads without console errors
- Clerk sign-in works
- API calls reach the Render server

---

## Part 3: Connect Client to Server

### Update API URL after deployment

Once both services are deployed:

1. Copy your Render server URL (e.g., `https://easy-update-server.onrender.com`)
2. In Vercel dashboard → **Settings** → **Environment Variables**
3. Set `VITE_API_URL` to your Render server URL
4. Trigger a new deployment: **Deployments** → **Redeploy**

### CORS configuration

The server already uses `cors()` middleware. For production, update `apps/server/src/index.ts` to allow only your Vercel domain:

```ts
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
}));
```

Add `CLIENT_URL=https://easy-update-client.vercel.app` to Render environment variables.

---

## Part 4: Custom Domains (Optional)

### Vercel (Client)

1. Vercel dashboard → **Settings** → **Domains**
2. Enter your domain (e.g., `app.yourdomain.com`)
3. Add the DNS records shown by Vercel:
   - **CNAME**: `app` → `cname.vercel-dns.com`
   - Or **A record** for apex: `@` → `76.76.21.21`
4. Vercel auto-provisions SSL via Let's Encrypt

### Render (Server)

1. Render dashboard → **Settings** → **Custom Domains**
2. Enter your domain (e.g., `api.yourdomain.com`)
3. Add the DNS records shown by Render
4. SSL is auto-provisioned

---

## Part 5: Auto-Deploy Workflow

Once connected, every push to `main` triggers automatic deployment:

```
Local change → git push origin main
    ├── Render: detects push → builds → deploys server
    └── Vercel: detects push → builds → deploys client
```

### Preview Deployments (Vercel)

- Every branch/PR gets a unique preview URL automatically
- Example: `https://easy-update-client-git-feature-xyz.vercel.app`
- Perfect for testing before merging to `main`

---

## Environment Variables Summary

### Render (Server) — `apps/server`

```
NODE_ENV=production
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com
CLIENT_URL=https://your-client.vercel.app
```

### Vercel (Client) — `apps/client-web`

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=https://your-server.onrender.com
```

---

## Troubleshooting

### Render build fails

- Check **Build Logs** in Render dashboard
- Ensure `pnpm-lock.yaml` is committed to the repo
- Verify `apps/server/package.json` has `build` and `start` scripts

### Vercel build fails

- Check **Build Logs** in Vercel dashboard
- Ensure `apps/client-web` has `vite.config.ts` with `outDir: "dist"`
- Verify `build` script is `tsc && vite build`

### API calls fail from client

1. Check CORS settings on the server
2. Verify `VITE_API_URL` is set correctly in Vercel
3. Check Render server logs for incoming requests
4. Test server health: `curl https://your-server.onrender.com/api/health`

### Cold starts (Render free tier)

- First request after inactivity takes 30–60 seconds
- Upgrade to Starter plan ($7/month) for always-on
- Or use [UptimeRobot](https://uptimerobot.com) to ping the server periodically

---

## CLI Deployment (Alternative)

### Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project (run from apps/client-web)
cd apps/client-web
vercel link

# Pull env vars locally
vercel env pull .env.local

# Deploy preview
vercel deploy

# Deploy to production
vercel deploy --prod
```

### Render CLI

Render does not have an official CLI for deployments. Use the dashboard or push to GitHub for auto-deploy.

---

## Useful Links

- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Vite Deploy Guide](https://vite.dev/guide/static-deploy.html)
- [Clerk Deploy Guide](https://clerk.com/docs/deployments)
