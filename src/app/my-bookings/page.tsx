"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryClass } from "@/lib/client";
import { fmtDate, fmtTime, istDateKey } from "@/lib/time";
import type { Booking } from "@/lib/types";

export default function MyBookingsPage() {
  const [email, setEmail] = useState("");
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load(addr = email) {
    if (!addr) return;
    setLoading(true);
    const res = await fetch(`/api/bookings?email=${encodeURIComponent(addr)}`);
    setRows(res.ok ? await res.json() : []);
    setLoading(false);
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("organizer") ?? "null");
      if (saved?.organizerEmail) {
        setEmail(saved.organizerEmail);
        load(saved.organizerEmail);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancel(b: Booking) {
    if (!confirm(`Cancel "${b.title}" at ${b.venue_name}?`)) return;
    const res = await fetch(`/api/bookings/${b.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? `Cancelled "${b.title}". The slot is free again.` : data.error ?? "Could not cancel.");
    load();
  }

  const now = Date.now();
  const upcoming = rows?.filter((b) => b.status === "confirmed" && Date.parse(b.ends_at) > now) ?? [];
  const past = rows?.filter((b) => !(b.status === "confirmed" && Date.parse(b.ends_at) > now)) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">My bookings</h1>
        <p className="text-sm text-slate-500">Enter the NMAMIT email you booked with to see and manage your reservations.</p>
      </div>

      <form className="card flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); setMessage(null); load(); }}>
        <input type="email" className="field" placeholder="you@nmamit.in" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button className="btn-primary shrink-0" disabled={loading}>{loading ? "Loading…" : "Show bookings"}</button>
      </form>

      {message && <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</div>}

      {rows && rows.length === 0 && (
        <div className="card p-8 text-center text-sm text-slate-500">
          No bookings for this email yet. <Link href="/book" className="text-brand hover:underline">Book a venue</Link>
        </div>
      )}

      {upcoming.length > 0 && <List title="Upcoming" items={upcoming} onCancel={cancel} />}
      {past.length > 0 && <List title="Past & cancelled" items={past} />}
    </div>
  );
}

function List({ title, items, onCancel }: { title: string; items: Booking[]; onCancel?: (b: Booking) => void }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <ul className="card divide-y divide-slate-100">
        {items.map((b) => (
          <li key={b.id} className={`flex items-center gap-4 px-4 py-3 ${b.status === "cancelled" ? "opacity-60" : ""}`}>
            <div className="w-16 shrink-0 text-center">
              <div className="text-xs uppercase text-slate-500">{fmtDate(istDateKey(b.starts_at), { month: "short" })}</div>
              <div className="text-2xl font-bold text-brand-dark">{Number(istDateKey(b.starts_at).slice(8))}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`truncate font-medium ${b.status === "cancelled" ? "line-through" : ""}`}>{b.title}</span>
                <span className={`rounded-full border px-2 text-[10px] capitalize ${categoryClass(b.category)}`}>{b.category}</span>
                {b.status === "cancelled" && <span className="rounded-full bg-slate-200 px-2 text-[10px] text-slate-600">cancelled</span>}
              </div>
              <div className="text-sm text-slate-600">{fmtTime(b.starts_at)} – {fmtTime(b.ends_at)} · {b.venue_name}, {b.building}</div>
            </div>
            {onCancel && <button className="btn-ghost text-rose-700" onClick={() => onCancel(b)}>Cancel</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
