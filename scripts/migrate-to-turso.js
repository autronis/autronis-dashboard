// Migrate local SQLite data to Turso
// Usage: TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=eyJ... node scripts/migrate-to-turso.js

const Database = require("better-sqlite3");
const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "..", "data", "autronis.db");

if (!fs.existsSync(DB_PATH)) {
  console.error("Local database not found at:", DB_PATH);
  process.exit(1);
}

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables");
  process.exit(1);
}

async function migrate() {
  const local = new Database(DB_PATH);
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Connected to local DB and Turso");

  // Get all tables
  const tables = local
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name")
    .all()
    .map((t) => t.name);

  console.log(`Found ${tables.length} tables:`, tables.join(", "));

  // Step 1: Create tables by reading schema from local DB
  for (const table of tables) {
    const createStmt = local
      .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`)
      .get(table);

    if (createStmt && createStmt.sql) {
      try {
        await turso.execute(createStmt.sql);
        console.log(`✓ Created table: ${table}`);
      } catch (e) {
        if (e.message && e.message.includes("already exists")) {
          console.log(`⊘ Table exists: ${table}`);
        } else {
          console.error(`✗ Error creating ${table}:`, e.message);
        }
      }
    }
  }

  // Create indexes
  const indexes = local
    .prepare("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL")
    .all();

  for (const idx of indexes) {
    try {
      await turso.execute(idx.sql);
    } catch (e) {
      // Index already exists or similar — skip
    }
  }
  console.log(`✓ Created ${indexes.length} indexes`);

  // Step 2: Copy data
  for (const table of tables) {
    const rows = local.prepare(`SELECT * FROM "${table}"`).all();
    if (rows.length === 0) {
      console.log(`⊘ ${table}: empty`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => "?").join(", ");
    const insertSql = `INSERT OR IGNORE INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders})`;

    let inserted = 0;
    let errors = 0;

    // Insert in batches of 20
    for (let i = 0; i < rows.length; i += 20) {
      const batch = rows.slice(i, i + 20);
      for (const row of batch) {
        try {
          await turso.execute({
            sql: insertSql,
            args: columns.map((col) => row[col] ?? null),
          });
          inserted++;
        } catch (e) {
          errors++;
          if (errors <= 2) console.error(`  Error in ${table}:`, e.message);
        }
      }
    }

    console.log(`✓ ${table}: ${inserted}/${rows.length} rows${errors > 0 ? ` (${errors} errors)` : ""}`);
  }

  console.log("\n✅ Migration complete!");
  local.close();
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
