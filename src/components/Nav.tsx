"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Calendar" },
  { href: "/venues", label: "Venue availability" },
  { href: "/book", label: "Book a venue" },
  { href: "/my-bookings", label: "My bookings" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="bg-brand text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-sm font-black text-brand-dark">NM</span>
          <span className="leading-tight">
            <span className="block text-sm font-bold">NMAMIT</span>
            <span className="block text-xs text-white/70">Campus Booking</span>
          </span>
        </Link>
        <nav className="flex flex-wrap gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active ? "bg-white/15 font-semibold" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
