/// <reference types="node" />
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolve } from "path";

// Load env from apps/server/.env
config({ path: resolve(__dirname, "apps/server/.env") });

export default defineConfig({
  out: "./drizzle",
  schema: "./apps/server/src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
