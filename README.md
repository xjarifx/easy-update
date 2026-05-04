# Easy Update

A production-ready application for managing notices and updates.

## Overview

Easy Update is a full-stack application designed to help users manage notices, events, and updates efficiently. Built with a modern tech stack including TypeScript, React, Node.js, and PostgreSQL.

## Features

- User authentication and authorization
- Notice creation and management
- Event extraction from text
- Provider management
- User preferences
- RESTful API
- Responsive web interface

## Tech Stack

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Vite
- Zustand (state management)

### Backend
- Node.js
- Express.js
- TypeScript
- Better Auth (authentication)
- Drizzle ORM
- PostgreSQL

### DevOps
- Docker
- GitHub Actions
- PM2 (process manager)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v10 or higher)
- PostgreSQL database
- Environment variables configured

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd easy-update
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in the `apps/server` directory
   - Update the values according to your environment
   - Minimum required variables:
     ```env
     PORT=4000
     DATABASE_URL=your_postgresql_connection_string
     JWT_SECRET=your_cryptographically_random_secret_here
     MANAGED_AI_API_KEY=your_ai_api_key
     CLIENT-WEB_URL=http://localhost:5173
     ```

4. Set up the database:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```

5. Start the development servers:
   ```bash
   pnpm dev:full
   ```

   This will start:
   - Backend server on http://localhost:4000
   - Frontend client on http://localhost:5173

### Environment Variables

Required environment variables in `apps/server/.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 4000 |
| DATABASE_URL | PostgreSQL connection string | postgres://user:pass@localhost:5432/dbname |
| JWT_SECRET | Secret for JWT token generation (32+ chars) | your_super_secret_key_here |
| MANAGED_AI_API_KEY | API key for AI services | sk-or-v1-... |
| CLIENT-WEB_URL | Frontend URL for CORS | http://localhost:5173 |

## Available Scripts

In the root directory:

- `pnpm dev` - Run all apps in development mode
- `pnpm dev:client` - Run only the client app
- `pnpm dev:server` - Run only the server app
- `pnpm dev:full` - Run both client and server concurrently
- `pnpm build` - Build all apps for production
- `pnpm start` - Start the built server
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

Database scripts:
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:migrate` - Run migrations
- `pnpm db:push` - Push schema changes directly
- `pnpm db:seed` - Seed the database with initial data
- `pnpm db:studio` - Open Drizzle Studio

## API Documentation

API documentation is available at `/api/docs` when the server is running, or view the [OpenAPI specification](apps/server/openapi.yaml).

## Testing

Run tests with:
```bash
pnpm test
```

## Deployment

### Docker

Build and run with Docker:
```bash
docker-compose up --build
```

### Manual Deployment

1. Build the application:
   ```bash
   pnpm build
   ```

2. Start the server:
   ```bash
   pnpm start
   ```

3. Use a process manager like PM2 for production:
   ```bash
   pm2 start apps/server/dist/index.js --name easy-update
   ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Your Name - your.email@example.com

Project Link: <https://github.com/your-username/easy-update>