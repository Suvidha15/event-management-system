"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categoryClass, useBookings, useVenues } from "@/lib/client";
import { addDays, fmtDate, fmtTime, istDateKey, istIso, todayKey } from "@/lib/time";
import type { Booking } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const today = todayKey();
  const [month, setMonth] = useState(today.slice(0, 7)); // "YYYY-MM"
  const [selected, setSelected] = useState(today);
  const [venueId, setVenueId] = useState<number | null>(null);
  const { venues } = useVenues();

  // Grid starts on the Monday on/before the 1st and spans 6 weeks.
  const first = `${month}-01`;
  const weekday = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const gridStart = addDays(first, -weekday);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const { bookings, loading } = useBookings(istIso(days[0], "00:00"), istIso(addDays(days[41], 1), "00:00"), venueId);

  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const k = istDateKey(b.starts_at);
      map.set(k, [...(map.get(k) ?? []), b]);
    }
    return map;
  }, [bookings]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  };

  const dayEvents = byDay.get(selected) ?? [];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Campus calendar</h1>
          <p className="text-sm text-slate-500">Every confirmed event and booking across NMAMIT venues.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="field w-auto" value={venueId ?? ""} onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">All venues</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <Link href={`/book?date=${selected}${venueId ? `&venue=${venueId}` : ""}`} className="btn-primary">+ Book a venue</Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <button className="btn-ghost" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
            <div className="text-center">
              <div className="font-semibold">{fmtDate(first, { month: "long", year: "numeric" })}</div>
              <button className="text-xs text-brand hover:underline" onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}>
                Today
              </button>
            </div>
            <button className="btn-ghost" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-500">
            {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className={`grid grid-cols-7 ${loading ? "opacity-60" : ""}`}>
            {days.map((d) => {
              const events = byDay.get(d) ?? [];
              const inMonth = d.startsWith(month);
              const isSel = d === selected;
              return (
                <button
                  key={d}
                  onClick={() => setSelected(d)}
                  className={`min-h-20 border-b border-r border-slate-100 p-1.5 text-left align-top transition hover:bg-blue-50/50 sm:min-h-24 ${
                    inMonth ? "" : "bg-slate-50/60 text-slate-400"
                  } ${isSel ? "ring-2 ring-inset ring-brand" : ""}`}
                >
                  <span className={`inline-grid h-6 w-6 place-items-center rounded-full text-xs ${d === today ? "bg-accent font-bold text-brand-dark" : ""}`}>
                    {Number(d.slice(8))}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {events.slice(0, 2).map((b) => (
                      <div key={b.id} className={`truncate rounded border px-1 text-[10px] leading-4 sm:text-[11px] ${categoryClass(b.category)}`}>
                        <span className="hidden sm:inline">{fmtTime(b.starts_at)} </span>{b.title}
                      </div>
                    ))}
                    {events.length > 2 && <div className="text-[10px] text-slate-500">+{events.length - 2} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="card flex flex-col">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="font-semibold">{fmtDate(selected, { weekday: "long", day: "numeric", month: "long" })}</div>
            <div className="text-xs text-slate-500">{dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}</div>
          </div>
          <ul className="flex-1 divide-y divide-slate-100 overflow-auto">
            {dayEvents.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-500">
                Nothing scheduled.{" "}
                {selected >= today && (
                  <Link className="text-brand hover:underline" href={`/venues?date=${selected}`}>Check free venues</Link>
                )}
              </li>
            )}
            {dayEvents.map((b) => (
              <li key={b.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{b.title}</div>
                  <span className={`shrink-0 rounded-full border px-2 text-[10px] capitalize ${categoryClass(b.category)}`}>{b.category}</span>
                </div>
                <div className="mt-0.5 text-sm text-slate-600">
                  {fmtTime(b.starts_at)} – {fmtTime(b.ends_at)} · {b.venue_name}
                </div>
                <div className="text-xs text-slate-500">
                  {b.organizer_name} ({b.organizer_role}{b.department ? `, ${b.department}` : ""})
                </div>
                {b.description && <p className="mt-1 text-xs text-slate-500">{b.description}</p>}
              </li>
            ))}
          </ul>
          {selected >= today && (
            <div className="border-t border-slate-200 p-3">
              <Link href={`/venues?date=${selected}`} className="btn-ghost w-full">See venue availability for this day</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
