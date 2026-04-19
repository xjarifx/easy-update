import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/postgres",
});

client
  .connect()
  .then(async () => {
    try {
      // Drop public schema (and all tables)
      await client.query("DROP SCHEMA IF EXISTS public CASCADE");
      // Recreate public schema
      await client.query("CREATE SCHEMA public");
      // Drop drizzle schema (migration history)
      await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
      console.log("✓ Database schemas dropped and recreated");
      await client.end();
    } catch (err) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("Connection error:", err.message);
    process.exit(1);
  });
