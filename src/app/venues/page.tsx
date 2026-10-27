"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { categoryClass, useBookings, useVenues } from "@/lib/client";
import { addDays, fmtDate, fmtTime, hhmmToMinutes, istIso, istMinutes, minutesToHHMM, todayKey } from "@/lib/time";

const DAY_START = 8 * 60;
const DAY_END = 20 * 60;
const SLOT = 30;
const SLOTS = (DAY_END - DAY_START) / SLOT;

function Availability() {
  const params = useSearchParams();
  const router = useRouter();
  const today = todayKey();
  const [date, setDate] = useState(params.get("date") ?? today);
  const [minCapacity, setMinCapacity] = useState(0);
  const [kind, setKind] = useState("");
  const { venues, error } = useVenues();
  const { bookings, loading } = useBookings(istIso(date, "00:00"), istIso(addDays(date, 1), "00:00"));

  const kinds = useMemo(() => [...new Set(venues.map((v) => v.kind))].sort(), [venues]);
  const shown = venues.filter((v) => v.capacity >= minCapacity && (!kind || v.kind === kind));

  const nowMin = date === today ? istMinutes(new Date()) : date < today ? DAY_END : -1;

  const go = (d: string) => {
    setDate(d);
    router.replace(`/venues?date=${d}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Venue availability</h1>
          <p className="text-sm text-slate-500">Click any free slot to book it. Grid shows 8:00 AM – 8:00 PM in 30-minute slots.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-ghost" onClick={() => go(addDays(date, -1))} aria-label="Previous day">‹</button>
          <input type="date" className="field w-auto" value={date} onChange={(e) => e.target.value && go(e.target.value)} />
          <button className="btn-ghost" onClick={() => go(addDays(date, 1))} aria-label="Next day">›</button>
          <button className="btn-ghost" onClick={() => go(today)}>Today</button>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <div>
          <label className="label" htmlFor="kind">Venue type</label>
          <select id="kind" className="field w-auto" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">All types</option>
            {kinds.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cap">Minimum capacity</label>
          <select id="cap" className="field w-auto" value={minCapacity} onChange={(e) => setMinCapacity(Number(e.target.value))}>
            {[0, 30, 60, 100, 200, 500].map((c) => <option key={c} value={c}>{c ? `${c}+ people` : "Any"}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-end gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded-sm border border-emerald-300 bg-emerald-50" /> Free</span>
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded-sm border border-blue-300 bg-blue-100" /> Booked</span>
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded-sm bg-slate-200" /> Past / closed</span>
        </div>
      </section>

      {error && <p className="card p-4 text-sm text-rose-700">Could not load venues: {error}</p>}

      <section className="card overflow-x-auto">
        <div className={`min-w-[900px] ${loading ? "opacity-60" : ""}`}>
          <div className="grid border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500" style={{ gridTemplateColumns: `220px repeat(${SLOTS}, 1fr)` }}>
            <div className="px-3 py-2 font-semibold">{fmtDate(date, { weekday: "long", day: "numeric", month: "short" })}</div>
            {Array.from({ length: SLOTS }, (_, i) => (
              <div key={i} className="border-l border-slate-200 py-2 pl-1">{i % 2 === 0 ? fmtTime(istIso(date, minutesToHHMM(DAY_START + i * SLOT))).replace(":00", "") : ""}</div>
            ))}
          </div>
          {shown.map((v) => {
            const open = hhmmToMinutes(v.open_time);
            const close = hhmmToMinutes(v.close_time);
            const vb = bookings.filter((b) => b.venue_id === v.id);
            return (
              <div key={v.id} className="relative grid border-b border-slate-100 last:border-0" style={{ gridTemplateColumns: `220px repeat(${SLOTS}, 1fr)` }}>
                <div className="px-3 py-2">
                  <div className="text-sm font-medium">{v.name}</div>
                  <div className="text-[11px] text-slate-500">{v.building} · {v.kind} · {v.capacity} seats</div>
                </div>
                {Array.from({ length: SLOTS }, (_, i) => {
                  const start = DAY_START + i * SLOT;
                  const closed = start < open || start + SLOT > close;
                  const past = start < nowMin;
                  const taken = vb.some((b) => istMinutes(b.starts_at) < start + SLOT && (istMinutes(b.ends_at) || 1440) > start);
                  if (closed || past || taken) {
                    return <div key={i} className={`border-l border-slate-100 ${taken ? "" : "bg-slate-100"}`} />;
                  }
                  return (
                    <Link
                      key={i}
                      href={`/book?venue=${v.id}&date=${date}&start=${minutesToHHMM(start)}`}
                      title={`Book ${v.name} at ${minutesToHHMM(start)}`}
                      className="border-l border-slate-100 bg-emerald-50/70 transition hover:bg-emerald-200"
                    />
                  );
                })}
                {/* Booked blocks are overlaid on the slot columns */}
                <div className="pointer-events-none absolute inset-y-1 left-[220px] right-0">
                  {vb.map((b) => {
                    const s = Math.max(istMinutes(b.starts_at), DAY_START);
                    const e = Math.min(istMinutes(b.ends_at) || 1440, DAY_END);
                    if (e <= s) return null;
                    return (
                      <div
                        key={b.id}
                        title={`${b.title} · ${fmtTime(b.starts_at)}–${fmtTime(b.ends_at)} · ${b.organizer_name}`}
                        className={`pointer-events-auto absolute top-0 bottom-0 overflow-hidden rounded-md border px-1.5 py-0.5 text-[11px] leading-tight ${categoryClass(b.category)}`}
                        style={{ left: `${((s - DAY_START) / (DAY_END - DAY_START)) * 100}%`, width: `${((e - s) / (DAY_END - DAY_START)) * 100}%` }}
                      >
                        <div className="truncate font-semibold">{b.title}</div>
                        <div className="truncate opacity-75">{fmtTime(b.starts_at)}–{fmtTime(b.ends_at)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!shown.length && !error && <p className="p-6 text-center text-sm text-slate-500">No venues match these filters.</p>}
        </div>
      </section>
    </div>
  );
}

export default function VenuesPage() {
  return (
    <Suspense>
      <Availability />
    </Suspense>
  );
}
