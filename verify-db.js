import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL || "",
});

client
  .connect()
  .then(async () => {
    try {
      // Check for tables
      const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

      console.log("✓ Tables in database:");
      result.rows.forEach((row) => console.log(`  - ${row.table_name}`));

      // Check users table structure
      const usersColumns = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'users' ORDER BY ordinal_position;
    `);

      if (usersColumns.rows.length > 0) {
        console.log("\n✓ Users table columns:");
        usersColumns.rows.forEach((row) =>
          console.log(`  - ${row.column_name} (${row.data_type})`),
        );
      }

      // Check events table structure
      const eventsColumns = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'events' ORDER BY ordinal_position;
    `);

      if (eventsColumns.rows.length > 0) {
        console.log("\n✓ Events table columns:");
        eventsColumns.rows.forEach((row) =>
          console.log(`  - ${row.column_name} (${row.data_type})`),
        );
      }

      // Check for migration history
      const migrations = await client
        .query(
          `
      SELECT migration FROM drizzle.__drizzle_migrations ORDER BY created_at;
    `,
        )
        .catch(() => ({ rows: [] }));

      if (migrations.rows.length > 0) {
        console.log("\n✓ Applied migrations:");
        migrations.rows.forEach((row) => console.log(`  - ${row.migration}`));
      }

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
