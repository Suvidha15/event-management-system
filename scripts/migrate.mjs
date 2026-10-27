// Applies db/schema.sql to DATABASE_URL. Run with: npm run db:migrate
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run `neon deploy` (or `neon env pull`) first.");
  process.exit(1);
}

const sql = neon(url);
const statements = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")
  .split(/^-- ;\s*$/m)
  .map((s) => s.trim())
  .filter((s) => s.replace(/--.*$/gm, "").trim().length > 0);

for (const statement of statements) {
  await sql.query(statement);
}

const [{ count }] = await sql`SELECT count(*)::int AS count FROM venues`;
console.log(`Applied ${statements.length} statements. Venues in database: ${count}.`);
