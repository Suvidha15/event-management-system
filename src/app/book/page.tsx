"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { categoryClass, useBookings, useVenues } from "@/lib/client";
import { addDays, fmtDate, fmtTime, hhmmToMinutes, istIso, minutesToHHMM, todayKey } from "@/lib/time";
import { CATEGORIES } from "@/lib/types";

const TIMES = Array.from({ length: 49 }, (_, i) => minutesToHHMM(i * 30)); // 00:00 … 24:00

type Done = { id: number; venue_name: string; starts_at: string; ends_at: string };

function BookingForm() {
  const params = useSearchParams();
  const { venues } = useVenues();
  const today = todayKey();
  const initialStart = params.get("start") ?? "10:00";

  const [venueId, setVenueId] = useState<number>(Number(params.get("venue")) || 0);
  const [date, setDate] = useState(params.get("date") ?? today);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(minutesToHHMM(Math.min(hhmmToMinutes(initialStart) + 60, 1440)));
  const [form, setForm] = useState({
    title: "", description: "", category: "event", organizerName: "", organizerEmail: "",
    organizerRole: "student", department: "", expectedCount: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!venueId && venues.length) setVenueId(venues[0].id);
  }, [venues, venueId]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("organizer") ?? "null");
      if (saved) setForm((f) => ({ ...f, ...saved }));
    } catch {}
  }, []);

  const venue = venues.find((v) => v.id === venueId);
  const { bookings } = useBookings(istIso(date, "00:00"), istIso(addDays(date, 1), "00:00"), venueId || null, version);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const startOpts = venue ? TIMES.filter((t) => hhmmToMinutes(t) >= hhmmToMinutes(venue.open_time) && hhmmToMinutes(t) < hhmmToMinutes(venue.close_time)) : TIMES;
  const endOpts = venue ? TIMES.filter((t) => hhmmToMinutes(t) > hhmmToMinutes(start) && hhmmToMinutes(t) <= hhmmToMinutes(venue.close_time)) : TIMES;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        venueId,
        expectedCount: Number(form.expectedCount || 0),
        startsAt: istIso(date, start),
        endsAt: end === "24:00" ? istIso(addDays(date, 1), "00:00") : istIso(date, end),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? `Booking failed (HTTP ${res.status})`);
      setVersion((v) => v + 1);
      return;
    }
    try {
      localStorage.setItem("organizer", JSON.stringify({
        organizerName: form.organizerName, organizerEmail: form.organizerEmail,
        organizerRole: form.organizerRole, department: form.department,
      }));
    } catch {}
    setDone(data);
    setVersion((v) => v + 1);
  }

  if (done) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
        <h1 className="text-xl font-bold">Booking confirmed</h1>
        <p className="mt-2 text-slate-600">
          <b>{done.venue_name}</b> is reserved for you on {fmtDate(date, { weekday: "long", day: "numeric", month: "long" })},{" "}
          {fmtTime(done.starts_at)} – {fmtTime(done.ends_at)}.
        </p>
        <p className="mt-1 text-xs text-slate-500">Booking #{done.id} · It now appears on the campus calendar.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/" className="btn-ghost">View calendar</Link>
          <Link href="/my-bookings" className="btn-ghost">My bookings</Link>
          <button className="btn-primary" onClick={() => { setDone(null); setForm((f) => ({ ...f, title: "", description: "" })); }}>Book another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Book a venue</h1>
        <p className="text-sm text-slate-500">Reserve a campus location for your event. Clashes are rejected automatically.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <form onSubmit={submit} className="card space-y-5 p-5">
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold text-slate-700">Venue &amp; slot</legend>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="venue">Venue</label>
              <select id="venue" className="field" value={venueId} onChange={(e) => setVenueId(Number(e.target.value))} required>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} — {v.building} ({v.capacity} seats)</option>
                ))}
              </select>
              {venue && venue.facilities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {venue.facilities.map((f) => <span key={f} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{f}</span>)}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="date">Date</label>
              <input id="date" type="date" min={today} className="field" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="start">Start</label>
              <select id="start" className="field" value={start} onChange={(e) => {
                setStart(e.target.value);
                if (hhmmToMinutes(end) <= hhmmToMinutes(e.target.value)) setEnd(minutesToHHMM(hhmmToMinutes(e.target.value) + 60));
              }}>
                {startOpts.map((t) => <option key={t} value={t}>{fmtTime(istIso("2000-01-01", t))}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="end">End</label>
              <select id="end" className="field" value={end} onChange={(e) => setEnd(e.target.value)}>
                {endOpts.map((t) => <option key={t} value={t}>{t === "24:00" ? "12:00 AM" : fmtTime(istIso("2000-01-01", t))}</option>)}
              </select>
            </div>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold text-slate-700">Event details</legend>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="title">Event title</label>
              <input id="title" className="field" value={form.title} onChange={set("title")} minLength={3} maxLength={120} required placeholder="e.g. Hackathon orientation" />
            </div>
            <div>
              <label className="label" htmlFor="category">Category</label>
              <select id="category" className="field capitalize" value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="count">Expected attendees</label>
              <input id="count" type="number" min={0} max={venue?.capacity} className="field" value={form.expectedCount} onChange={set("expectedCount")} placeholder={venue ? `Up to ${venue.capacity}` : ""} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="desc">Description (optional)</label>
              <textarea id="desc" rows={2} className="field" value={form.description} onChange={set("description")} />
            </div>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold text-slate-700">Organizer</legend>
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" className="field" value={form.organizerName} onChange={set("organizerName")} required />
            </div>
            <div>
              <label className="label" htmlFor="email">NMAMIT email</label>
              <input id="email" type="email" pattern=".+@nmamit\.in" title="Use your @nmamit.in address" className="field" value={form.organizerEmail} onChange={set("organizerEmail")} required placeholder="you@nmamit.in" />
            </div>
            <div>
              <label className="label" htmlFor="role">I am</label>
              <select id="role" className="field" value={form.organizerRole} onChange={set("organizerRole")}>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="dept">Department / club</label>
              <input id="dept" className="field" value={form.department} onChange={set("department")} placeholder="e.g. ISE, Rotaract Club" />
            </div>
          </fieldset>

          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

          <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting || !venueId}>
            {submitting ? "Booking…" : "Confirm booking"}
          </button>
        </form>

        <aside className="card h-fit">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="font-semibold">{venue?.name ?? "Venue"} on {fmtDate(date)}</div>
            <div className="text-xs text-slate-500">
              Open {venue ? `${fmtTime(istIso(date, venue.open_time))} – ${fmtTime(istIso(date, venue.close_time))}` : ""}
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {bookings.length === 0 && <li className="px-4 py-6 text-center text-sm text-emerald-700">Free all day</li>}
            {bookings.map((b) => {
              const clash = hhmmToMinutes(start) < hhmmToMinutes(fmt24(b.ends_at)) && hhmmToMinutes(end) > hhmmToMinutes(fmt24(b.starts_at));
              return (
                <li key={b.id} className={`px-4 py-2.5 text-sm ${clash ? "bg-rose-50" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{fmtTime(b.starts_at)} – {fmtTime(b.ends_at)}</span>
                    <span className={`rounded-full border px-2 text-[10px] capitalize ${categoryClass(b.category)}`}>{b.category}</span>
                  </div>
                  <div className="text-slate-600">{b.title}</div>
                  {clash && <div className="text-xs font-medium text-rose-700">Overlaps your selected time</div>}
                </li>
              );
            })}
          </ul>
          <div className="border-t border-slate-200 p-3">
            <Link href={`/venues?date=${date}`} className="btn-ghost w-full">Compare all venues</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** ISO instant → "HH:MM" in IST, with midnight end mapped to 24:00. */
function fmt24(iso: string) {
  const t = new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(11, 16);
  return t === "00:00" ? "24:00" : t;
}

export default function BookPage() {
  return (
    <Suspense>
      <BookingForm />
    </Suspense>
  );
}
