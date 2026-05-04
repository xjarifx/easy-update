# Easy Update Server

Express API server for managing notices/events with AI-powered event extraction.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express v5
- **ORM**: Drizzle ORM with PostgreSQL
- **Auth**: JWT Email/Password
- **Validation**: Zod
- **AI Integration**: OpenRouter, OpenAI, Anthropic, Google

## Prerequisites

- Node.js >= 18
- pnpm >= 10
- PostgreSQL database (Aiven Cloud or local)

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Configure environment variables (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your credentials:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: JWT secret key (use strong secret in production)
   - `MANAGED_AI_API_KEY`: AI provider API key
   - `MANAGED_AI_PROVIDER`: AI provider (openrouter/openai/anthropic/google)
   - `MANAGED_AI_MODEL`: AI model name
   - `RESEND_API_KEY`: For welcome emails (optional)

4. Run database migrations:
   ```bash
   pnpm run db:push
   ```

5. Seed the database (optional):
   ```bash
   pnpm run db:seed
   ```

## Development

```bash
pnpm run dev
```

Server runs on `http://localhost:4000`

## Build & Production

```bash
pnpm run build
pnpm run start
```

## API Documentation

OpenAPI/Swagger spec is available at `openapi.yaml`. Use it to:
- Generate client SDKs in any language
- Import into Postman/Insomnia
- Generate interactive docs with Swagger UI

### Quick API Overview

All endpoints except `/api/health`, `/api/auth/register`, and `/api/auth/login` require Bearer token authentication.

| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/api/auth/register` | Register with email/password (public) |
| POST | `/api/auth/login` | Login with email/password (public) |
| GET | `/api/health` | Health check (public) |
| GET | `/api/notices` | List all notices |
| POST | `/api/notices` | Create a notice |
| GET | `/api/notices/:id` | Get notice by ID |
| PUT | `/api/notices/:id` | Update a notice |
| DELETE | `/api/notices/:id` | Delete a notice |
| GET | `/api/events` | Get notices as calendar events |
| POST | `/api/events` | Create notice from calendar event |
| POST | `/api/events/extract-and-create` | AI event extraction |
| POST | `/api/providers/models` | Get AI provider models |
| GET | `/api/preferences` | Get user preferences |
| PUT | `/api/preferences` | Update user preferences |

## Environment Variables

See `.env.example` for all available options.

## Testing

```bash
pnpm run test
pnpm run test:coverage
```

## Deployment

Deployed to Render as a Node.js service.

## Project Structure

```
src/
├── index.ts              # Express app entry point
├── db/
│   ├── index.ts         # Drizzle ORM setup
│   ├── schema.ts        # Database schema
│   └── seed.ts         # Seed script
├── routes/              # Express route handlers
├── services/            # Business logic
├── repositories/        # Data access layer
├── middleware/          # Auth & error handling
└── utils/              # Validation & helpers
```
