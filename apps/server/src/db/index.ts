import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for PostgreSQL connection");
}

const normalizedDatabaseUrl = (() => {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");

  return url.toString();
})();

const pool = new Pool({
  connectionString: normalizedDatabaseUrl,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);
