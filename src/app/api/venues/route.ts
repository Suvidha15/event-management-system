import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const venues = await db()`
    SELECT id, name, building, kind, capacity, facilities,
           to_char(open_time, 'HH24:MI') AS open_time,
           to_char(close_time, 'HH24:MI') AS close_time
    FROM venues ORDER BY capacity DESC, name`;
  return NextResponse.json(venues);
}
