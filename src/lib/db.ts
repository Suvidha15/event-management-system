import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// The Neon HTTP driver suits Next.js route handlers on serverless hosts:
// each query is a single HTTPS round trip with no connection to keep alive.
// DATABASE_URL is the pooled connection string written by `neon deploy`.
let client: NeonQueryFunction<false, false> | undefined;

export function db() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Run `neon deploy` to pull it into .env.local.");
    client = neon(url);
  }
  return client;
}
