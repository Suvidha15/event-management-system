import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { CATEGORIES } from "@/lib/types";
import { hhmmToMinutes, istDateKey, istMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

const ROLES = ["student", "faculty", "staff"];
const EMAIL_DOMAIN = "@nmamit.in";

// GET /api/bookings?from=ISO&to=ISO[&venueId=1]  → confirmed bookings overlapping the range
// GET /api/bookings?email=x@nmamit.in             → all bookings made with that email
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const sql = db();

  const email = p.get("email")?.trim().toLowerCase();
  if (email) {
    const rows = await sql`
      SELECT b.*, v.name AS venue_name, v.building
      FROM bookings b JOIN venues v ON v.id = b.venue_id
      WHERE lower(b.organizer_email) = ${email}
      ORDER BY b.starts_at DESC LIMIT 200`;
    return NextResponse.json(rows);
  }

  const from = p.get("from");
  const to = p.get("to");
  if (!from || !to || isNaN(Date.parse(from)) || isNaN(Date.parse(to))) {
    return NextResponse.json({ error: "from and to (ISO timestamps) are required" }, { status: 400 });
  }
  const venueId = p.get("venueId") ? Number(p.get("venueId")) : null;

  // Organizer email is left out of the public calendar.
  const rows = await sql`
    SELECT b.id, b.venue_id, v.name AS venue_name, v.building, b.title, b.description, b.category,
           b.organizer_name, b.organizer_role, b.department, b.expected_count,
           b.starts_at, b.ends_at, b.status
    FROM bookings b JOIN venues v ON v.id = b.venue_id
    WHERE b.status = 'confirmed'
      AND b.starts_at < ${to} AND b.ends_at > ${from}
      AND (${venueId}::int IS NULL OR b.venue_id = ${venueId}::int)
    ORDER BY b.starts_at`;
  return NextResponse.json(rows);
}

type Body = {
  venueId?: number;
  title?: string;
  description?: string;
  category?: string;
  organizerName?: string;
  organizerEmail?: string;
  organizerRole?: string;
  department?: string;
  expectedCount?: number;
  startsAt?: string;
  endsAt?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title?.trim() ?? "";
  const name = body.organizerName?.trim() ?? "";
  const email = body.organizerEmail?.trim().toLowerCase() ?? "";
  const role = body.organizerRole ?? "";
  const category = body.category ?? "event";
  const expected = Number(body.expectedCount ?? 0);
  const starts = body.startsAt ? new Date(body.startsAt) : null;
  const ends = body.endsAt ? new Date(body.endsAt) : null;

  const errors: string[] = [];
  if (title.length < 3 || title.length > 120) errors.push("Title must be 3–120 characters.");
  if (!name) errors.push("Organizer name is required.");
  if (!email.endsWith(EMAIL_DOMAIN) || email.length <= EMAIL_DOMAIN.length) errors.push(`Use your ${EMAIL_DOMAIN} email address.`);
  if (!ROLES.includes(role)) errors.push("Role must be student, faculty or staff.");
  if (!(CATEGORIES as readonly string[]).includes(category)) errors.push("Unknown category.");
  if (!Number.isInteger(expected) || expected < 0) errors.push("Expected attendees must be a whole number.");
  if (!starts || !ends || isNaN(+starts) || isNaN(+ends)) errors.push("Start and end time are required.");
  else {
    if (ends <= starts) errors.push("End time must be after start time.");
    if (starts.getTime() < Date.now() - 5 * 60_000) errors.push("You cannot book a slot in the past.");
    if (istDateKey(starts) !== istDateKey(new Date(ends.getTime() - 1))) errors.push("A booking must start and end on the same day.");
  }
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const sql = db();
  const [venue] = await sql`
    SELECT id, name, capacity, to_char(open_time, 'HH24:MI') AS open_time, to_char(close_time, 'HH24:MI') AS close_time
    FROM venues WHERE id = ${Number(body.venueId)}`;
  if (!venue) return NextResponse.json({ error: "Venue not found." }, { status: 404 });

  if (expected > venue.capacity) {
    return NextResponse.json({ error: `${venue.name} holds at most ${venue.capacity} people.` }, { status: 400 });
  }
  const s = istMinutes(starts!);
  const e = istMinutes(ends!) || 24 * 60;
  if (s < hhmmToMinutes(venue.open_time) || e > hhmmToMinutes(venue.close_time)) {
    return NextResponse.json(
      { error: `${venue.name} can be booked between ${venue.open_time} and ${venue.close_time}.` },
      { status: 400 },
    );
  }

  try {
    const [row] = await sql`
      INSERT INTO bookings (venue_id, title, description, category, organizer_name, organizer_email,
                            organizer_role, department, expected_count, starts_at, ends_at)
      VALUES (${venue.id}, ${title}, ${body.description?.trim() ?? ""}, ${category}, ${name}, ${email},
              ${role}, ${body.department?.trim() ?? ""}, ${expected}, ${starts!.toISOString()}, ${ends!.toISOString()})
      RETURNING id, starts_at, ends_at`;
    return NextResponse.json({ ...row, venue_name: venue.name }, { status: 201 });
  } catch (err) {
    // 23P01 = exclusion_violation from bookings_no_overlap: the slot was already taken.
    if ((err as { code?: string }).code === "23P01") {
      const clashes = await sql`
        SELECT title, starts_at, ends_at FROM bookings
        WHERE venue_id = ${venue.id} AND status = 'confirmed'
          AND starts_at < ${ends!.toISOString()} AND ends_at > ${starts!.toISOString()}
        ORDER BY starts_at`;
      return NextResponse.json({ error: `${venue.name} is already booked during that time.`, clashes }, { status: 409 });
    }
    throw err;
  }
}
