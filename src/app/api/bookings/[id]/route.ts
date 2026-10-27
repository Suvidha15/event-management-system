import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH /api/bookings/:id  { email }  → cancels the booking if the email matches its organizer.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  const rows = await db()`
    UPDATE bookings SET status = 'cancelled'
    WHERE id = ${Number(id)} AND lower(organizer_email) = ${email.trim().toLowerCase()} AND status = 'confirmed'
    RETURNING id, status`;
  if (!rows.length) {
    return NextResponse.json({ error: "No active booking with that id for this email." }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}
