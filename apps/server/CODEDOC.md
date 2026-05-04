# Easy Update Server - Code Documentation

## Architecture Overview

The server follows a **layered architecture** with clear separation of concerns:

```
Request → Middleware → Routes → Services → Repositories → Database
                ↓
          Error Handler ← Global error handling
```

### Layer Responsibilities

| Layer | Location | Purpose |
|-------|----------|---------|
| **Middleware** | `src/middleware/` | Auth, error handling, request preprocessing |
| **Routes** | `src/routes/` | HTTP request/response handling, validation |
| **Services** | `src/services/` | Business logic, data normalization, external API calls |
| **Repositories** | `src/repositories/` | Database queries (Drizzle ORM) |
| **Database** | `src/db/` | Schema definition, connection setup |

---

## Request Flow

### Example: Creating a Notice

```
1. Client sends POST /api/notices with Bearer token + JSON body
   ↓
2. cors() + express.json() middleware parse the request
   ↓
 3. requireAuthentication middleware (src/middleware/auth.ts)
   - Extracts Bearer token from Authorization header
   - Verifies JWT with Clerk (verifyToken)
   - Finds/creates user in local DB
   - Attaches authUser to request object
   ↓
4. noticesRouter (src/routes/noticesRoutes.ts)
   - Validates request body using Zod schema (noticeMutationSchema)
   - Calls createNoticeFromInput() from service layer
   ↓
5. noticesService (src/services/noticesService.ts)
   - Normalizes date/time using noticeNormalization utilities
   - Checks for duplicates via repository
   - Calls createNotice() from repository layer
   ↓
6. noticesRepository (src/repositories/noticesRepository.ts)
   - Executes Drizzle ORM insert query on "notices" table
   - Returns created record
   ↓
7. Response flows back: 201 status + JSON { data: { notice } }
   ↓
8. If error occurs at any point → errorHandler middleware (src/middleware/errorHandler.ts)
   - Catches error, formats standardized response
   - Response: { error: { message, statusCode, timestamp } }
```

---

## Key Components

### 1. Entry Point (`src/index.ts`)

- Creates Express app with CORS and JSON parsing
- Mounts routes under `/api` with authentication required
- Order matters:
  1. `cors()` + `express.json()` → body parsing
  2. `GET /api/health` → public health check
  3. `requireAuthentication` → all `/api/*` routes need auth
  4. Route handlers → `noticesRouter`, `eventsRouter`, `providersRouter`, `userPreferencesRouter`
  5. `notFoundHandler` → catches unmatched routes (404)
  6. `errorHandler` → catches all errors (must be last)

 ### 2. Authentication (`src/middleware/auth.ts`)

**Flow:**
- Reads `Authorization: Bearer <token>` header
- Verifies JWT using `jsonwebtoken` `verify()`
- Looks up user by `id` in local `users` table
- Attaches `authUser: { id, email }` to request
- Helper `getAuthenticatedUserId(req)` extracts user ID for routes

**Environment variables:**
- `JWT_SECRET` - For signing/verifying JWTs

### 3. Validation (`src/utils/validation.ts`)

Uses **Zod** schemas for request validation:

| Schema | Used In | Validates |
|--------|----------|-----------|
| `noticeMutationSchema` | POST/PUT /api/notices | date, time, title, moreInfo, completed |
| `calendarEventSchema` | POST /api/events | title, start (ISO datetime), moreInfo |
| `eventExtractionSchema` | POST /api/events/extract-and-create | text (required), dateFormat, timeFormat |
| `providerModelsSchema` | POST /api/providers/models | provider (enum) |
| `userPreferencesMutationSchema` | PUT /api/preferences | dateFormat, timeFormat, font, firstDayOfWeek |

**Usage pattern in routes:**
```typescript
const parseResult = noticeMutationSchema.safeParse(req.body);
if (!parseResult.success) {
  throw new ValidationError(parseResult.error.errors[0].message);
}
// Use parseResult.data (typed & validated)
```

### 4. Error Handling (`src/middleware/errorHandler.ts`)

**Custom Error Classes (`src/utils/errors.ts`):**

| Error Class | Status | Usage |
|-------------|--------|-------|
| `ValidationError` | 400 | Invalid input/params |
| `NotFoundError` | 404 | Resource not found |
| `UnauthorizedError` | 401 | Auth failures |
| `BadGatewayError` | 502 | Upstream API failures |

**Error Response Format:**
```json
{
  "error": {
    "message": "Description of error",
    "statusCode": 400,
    "timestamp": "2026-05-03T10:30:00.000Z"
  }
}
```

---

## Database Schema

### Tables

**1. `users` table**
```sql
- id: serial PRIMARY KEY
   - password_hash: text NOT NULL
- email: text UNIQUE NOT NULL
- created_at: timestamp with timezone DEFAULT now()
```

**2. `notices` table** (renamed from `events`)
```sql
- id: serial PRIMARY KEY
- user_id: integer NOT NULL → FK to users.id ON DELETE CASCADE
- date: text NOT NULL (stored as YYYY-MM-DD)
- time: text NOT NULL (stored as HH:MM or "no time")
- title: text NOT NULL
- more_info: text DEFAULT '' NOT NULL
- completed: boolean DEFAULT false NOT NULL
- Index on user_id
```

**3. `user_preferences` table**
```sql
- id: serial PRIMARY KEY
- user_id: integer UNIQUE NOT NULL → FK to users.id ON DELETE CASCADE
- date_format: text DEFAULT 'DD-MMM-YYYY'
- time_format: text DEFAULT 'hh:mm AM/PM'
- font: text DEFAULT 'Inter'
- first_day_of_week: integer DEFAULT 0 (0-6, CHECK constraint)
- created_at, updated_at: timestamp with timezone
```

### ORM Setup (`src/db/index.ts`)

- Uses Drizzle ORM with `pg` (node-postgres) Pool
- Normalizes DATABASE_URL by removing `sslmode` param (Aiven Cloud compat)
- SSL configured with `rejectUnauthorized: false`
- Exports singleton `db` instance for all repositories

---

## Services Layer

### Notices Service (`src/services/noticesService.ts`)

**Key functions:**
- `getNotices(userId)` → Lists notices, normalizes dates/times
- `getNoticeById(id, userId)` → Finds single notice
- `createNoticeFromInput(userId, input)` → Validates, normalizes, checks duplicates, creates
- `updateNoticeFromInput(id, userId, input)` → Finds, normalizes, updates
- `deleteNoticeById(id, userId)` → Deletes if exists
- `upsertNoticeFromExtractedInput(userId, input)` → Creates or updates based on existing data

**Duplicate detection logic:**
- First checks exact match (date + time + title)
- If found, updates existing notice
- If not found, creates new notice

**Normalization pipeline:**
- Raw input (any format) → `toCanonicalNoticeDate()` → `YYYY-MM-DD`
- Raw input (any format) → `toCanonicalNoticeTime()` → `HH:MM` or `"no time"`

### Event Extraction Service (`src/services/eventExtractionService.ts`)

**Purpose:** Uses AI to extract structured events from unstructured text.

**Flow:**
1. Receives text input + optional date/time format preferences
2. Builds system prompt using `buildEventExtractionSystemPrompt()` with current date as reference
3. Calls AI provider (OpenRouter/OpenAI/Anthropic/Google) with prompt
4. Parses JSON response → array of `{ title, moreInfo, date, time }`
5. Normalizes extracted dates/times
6. Returns array of `ExtractedEvent` objects

**AI Provider Configuration (server-side env vars only):**
- `MANAGED_AI_PROVIDER` - Which provider to use
- `MANAGED_AI_API_KEY` - API key (never accept from client)
- `MANAGED_AI_MODEL` - Model name (e.g., "gpt-4", "claude-3")

### Provider Models Service (`src/services/providerModelsService.ts`)

- Fetches available models from AI providers
- Used by clients to populate model selection dropdowns
- Requires server-side API key

---

## Data Normalization (`src/utils/noticeNormalization.ts`)

**Purpose:** Converts various date/time formats to canonical form.

**Supported date inputs:**
- `YYYY-MM-DD` (ISO) → `YYYY-MM-DD`
- `DD-MMM-YYYY` (e.g., "16-Apr-2026") → `YYYY-MM-DD`
- `DD/MM/YYYY` or `MM/DD/YYYY` → `YYYY-MM-DD`
- Natural language (e.g., "tomorrow", "next Monday") → resolved relative to current date

**Supported time inputs:**
- `HH:MM` (24-hour) → `HH:MM`
- `HH:MM AM/PM` → `HH:MM` (24-hour)
- Fuzzy times ("morning", "evening") → mapped to canonical times
- `"no time"` → passed through as-is

---

## API Endpoints Summary

### Public
- `GET /api/health` → Health check

### Notices (require auth)
- `GET /api/notices` → List all notices (normalized)
- `POST /api/notices` → Create notice (validates with Zod)
- `GET /api/notices/:id` → Get single notice
- `PUT /api/notices/:id` → Update notice
- `DELETE /api/notices/:id` → Delete notice

### Events (require auth)
- `GET /api/events` → List as calendar events (includes computed `start` datetime)
- `POST /api/events` → Create from calendar event object
- `POST /api/events/extract-and-create` → AI extraction from text → create/update notices

### Providers (require auth)
- `POST /api/providers/models` → Get available AI models for a provider

### Preferences (require auth)
- `GET /api/preferences` → Get user preferences
- `PUT /api/preferences` → Update user preferences

---

## Key Patterns & Conventions

### 1. Repository Pattern
- Repositories only handle DB queries (no business logic)
- Return typed results using `NoticeRecord` from `@easy-update/types`
- Export async functions: `listNotices`, `findNoticeById`, `createNotice`, etc.

### 2. Service Layer Returns
- Use result pattern: `{ error: string } | { value: T }`
- Services never throw for "expected" errors (duplicate, not found) → return error object
- Unexpected errors (DB failures) → throw → caught by global error handler

### 3. Auth User Access
- All routes get `userId` via `getAuthenticatedUserId(req)`
- Throws `UnauthorizedError` if not authenticated

### 4. Date/Time Storage
- Always store in canonical form: `YYYY-MM-DD` and `HH:MM`
- Normalize on input (service layer), not on output
- `noticesRepository.listNotices()` orders by date, time, id (all are text)

### 5. Environment Variables
- Server-side only (never exposed to client)
- `.env.example` documents all required vars
- AI API keys only from env, never from request body

---

## File Map

```
src/
├── index.ts                       # Express app setup
├── db/
│   ├── index.ts                   # Drizzle ORM singleton
│   └── schema.ts                  # Table definitions (users, notices, preferences)
├── routes/
│   ├── noticesRoutes.ts           # CRUD for notices
│   ├── eventsRoutes.ts            # Calendar events + AI extraction
│   ├── providersRoutes.ts         # AI provider model fetching
│   └── userPreferencesRoutes.ts   # User preferences
├── services/
│   ├── noticesService.ts          # Notice business logic + normalization
│   ├── eventExtractionService.ts # AI event extraction
│   ├── providerModelsService.ts   # AI model fetching
│   ├── userPreferencesService.ts  # Preferences management
│   └── emailService.ts           # Welcome email (Resend)
├── repositories/
│   ├── noticesRepository.ts       # Notice DB operations
│   └── userPreferencesRepository.ts
├── middleware/
│   ├── auth.ts              # JWT verification + user management
│   └── errorHandler.ts           # Global error handling
└── utils/
    ├── errors.ts                 # Custom error classes
    ├── asyncHandler.ts           # Express async wrapper
    ├── validation.ts             # Zod schemas
    ├── noticeNormalization.ts    # Date/time normalization
    └── eventExtractionPrompt.ts  # AI prompt builder
```

---

## OpenAPI Spec

The `openapi.yaml` file contains the full OpenAPI 3.0 specification. Use it to:
- Generate client SDKs: `openapi-generator`, `swagger-codegen`
- Import into Postman/Insomnia for testing
- Generate interactive docs with Swagger UI

This prevents clients from implementing vendor-specific logic since they can generate typed clients from the spec.
