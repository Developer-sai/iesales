"use client";

import { BarChart3, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-context";

export function Navbar() {
  const { me, query, setQuery, openModal, requireAuth, mode } = useApp();
  const [banner, setBanner] = useState(true);
  const pathname = usePathname();
  const showSearch = pathname === "/";
  const headerRef = useRef<HTMLElement>(null);

  // Publish the real header height so sticky bars below it can pin at the right offset.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      {mode === "demo" && (
        <div className="bg-amber-100 px-3 py-1 text-center text-[11px] font-medium leading-tight text-amber-900 sm:text-xs">
          DEMO MODE: sample data, fictional shops, not real deals.
        </div>
      )}
      {banner && (
        <div className="flex items-center justify-center gap-2 bg-emerald-700 px-3 py-1 text-center text-[11px] leading-tight text-white sm:py-1.5 sm:text-xs">
          <span className="sm:hidden">🇮🇪 Free • Zero ads • No affiliate links • Prices are community-reported</span>
          <span className="hidden sm:inline">🇮🇪 100% community-powered Irish Black Friday tracker • Zero ads • Zero affiliate links • Prices are community-reported</span>
          <button onClick={() => setBanner(false)} aria-label="Dismiss banner" className="shrink-0 rounded p-0.5 hover:bg-emerald-600">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2 sm:gap-x-3 sm:gap-y-2 sm:px-4 sm:py-2.5">
        <Link href="/" className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-slate-900">
          iesales<span className="text-emerald-600">.ie</span>
          <span className="relative inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <span className="live-dot relative h-2 w-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">LIVE</span><span className="sr-only sm:hidden">live</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:order-3">
          <button
            onClick={() => requireAuth() && openModal({ type: "post" })}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 sm:gap-1.5 sm:px-3"
          >
            <Plus size={16} /> <span>Post<span className="hidden sm:inline"> a deal</span></span>
          </button>
          <button
            onClick={() => requireAuth() && openModal({ type: "poll" })}
            className="hidden items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex"
          >
            <BarChart3 size={16} /> Poll
          </button>
          {me ? (
            <button
              onClick={() => openModal({ type: "profile" })}
              aria-label={`Profile: ${me.username}`}
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: me.avatar_color }}
            >
              {me.username.charAt(0).toUpperCase()}
            </button>
          ) : (
            <button onClick={() => openModal({ type: "auth" })} className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:px-3">
              Sign in
            </button>
          )}
        </div>

        {showSearch && (
          <div className="relative order-last w-full sm:order-2 sm:w-auto sm:flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search deals, shops, brands, counties…"
              aria-label="Search deals"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-base focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        )}
      </div>
    </header>
  );
}
