import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [row] = await db()`
    SELECT now() AS db_time, current_database() AS database,
           (SELECT count(*)::int FROM venues) AS venues,
           (SELECT count(*)::int FROM bookings WHERE status = 'confirmed') AS active_bookings`;
  return NextResponse.json({ ok: true, ...row });
}
