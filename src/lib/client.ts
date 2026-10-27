"use client";

import { useEffect, useState } from "react";
import type { Booking, Venue } from "./types";

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/venues")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setVenues)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);
  return { venues, error };
}

/** Confirmed bookings overlapping [from, to). Refetches when inputs or `version` change. */
export function useBookings(from: string, to: string, venueId?: number | null, version = 0) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    const q = new URLSearchParams({ from, to });
    if (venueId) q.set("venueId", String(venueId));
    fetch(`/api/bookings?${q}`)
      .then((r) => r.json())
      .then((rows) => live && setBookings(Array.isArray(rows) ? rows : []))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [from, to, venueId, version]);
  return { bookings, loading };
}

const CATEGORY_STYLES: Record<string, string> = {
  event: "bg-blue-100 text-blue-800 border-blue-300",
  workshop: "bg-violet-100 text-violet-800 border-violet-300",
  seminar: "bg-indigo-100 text-indigo-800 border-indigo-300",
  meeting: "bg-slate-200 text-slate-800 border-slate-300",
  "club activity": "bg-emerald-100 text-emerald-800 border-emerald-300",
  exam: "bg-rose-100 text-rose-800 border-rose-300",
  sports: "bg-orange-100 text-orange-800 border-orange-300",
  cultural: "bg-pink-100 text-pink-800 border-pink-300",
};

export function categoryClass(c: string) {
  return CATEGORY_STYLES[c] ?? CATEGORY_STYLES.event;
}
