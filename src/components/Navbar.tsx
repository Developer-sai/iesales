"use client";

import { BarChart3, Bookmark, Plus, Search, ShieldCheck, X } from "lucide-react";
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
    <header ref={headerRef} className="sticky top-0 z-40 bg-[#131921] text-white shadow-lg shadow-slate-900/20">
      {mode === "demo" && (
        <div className="bg-amber-300 px-3 py-1 text-center text-[11px] font-semibold leading-tight text-amber-950 sm:text-xs">
          DEMO MODE: sample data, fictional shops, not real deals.
        </div>
      )}
      {banner && (
        <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 px-3 py-1 text-center text-[11px] leading-tight text-white sm:py-1.5 sm:text-xs">
          <ShieldCheck size={13} className="hidden shrink-0 sm:block" />
          <span className="sm:hidden">🇮🇪 Free • Zero ads • No affiliate links</span>
          <span className="hidden sm:inline">🇮🇪 100% community-powered Irish Black Friday tracker • Zero ads • Zero affiliate links • Prices are community-reported</span>
          <button onClick={() => setBanner(false)} aria-label="Dismiss banner" className="shrink-0 rounded p-0.5 hover:bg-emerald-800/60">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2.5 sm:gap-x-4 sm:px-4">
        <Link href="/" className="flex items-center gap-1.5 rounded border border-transparent px-1 py-0.5 text-xl font-extrabold tracking-tight text-white hover:border-white/60">
          iesales<span className="text-amber-400">.ie</span>
          <span className="relative inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            <span className="live-dot relative h-2 w-2 rounded-full bg-emerald-400" />
            <span className="hidden sm:inline">LIVE</span><span className="sr-only sm:hidden">live</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:order-3 sm:gap-2">
          <button
            onClick={() => requireAuth() && openModal({ type: "post" })}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm hover:bg-amber-300 sm:gap-1.5"
          >
            <Plus size={16} /> <span>Post<span className="hidden sm:inline"> a deal</span></span>
          </button>
          <button
            onClick={() => requireAuth() && openModal({ type: "poll" })}
            className="hidden items-center gap-1.5 rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 md:inline-flex"
          >
            <BarChart3 size={16} /> Poll
          </button>
          {me ? (
            <button
              onClick={() => openModal({ type: "profile" })}
              aria-label={`Profile: ${me.username}`}
              className="flex h-9 items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-sm font-semibold hover:bg-white/20"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: me.avatar_color }}>
                {me.username.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[8rem] truncate sm:inline">{me.username}</span>
            </button>
          ) : (
            <button onClick={() => openModal({ type: "auth" })} className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
              Sign in
            </button>
          )}
        </div>

        {showSearch && (
          <div className="order-last flex w-full overflow-hidden rounded-lg bg-white shadow-inner ring-2 ring-transparent focus-within:ring-amber-400 sm:order-2 sm:w-auto sm:flex-1">
            <label htmlFor="site-search" className="sr-only">Search deals</label>
            <input
              id="site-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search deals, shops, brands, counties…"
              className="min-w-0 flex-1 bg-white px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <span className="flex w-12 shrink-0 items-center justify-center bg-amber-400 text-slate-900" aria-hidden>
              <Search size={20} />
            </span>
          </div>
        )}
      </div>
      <nav className="bg-[#232f3e]" aria-label="Quick links">
        <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-3 py-1.5 text-sm sm:px-4">
          <Link href="/" className="whitespace-nowrap rounded px-2.5 py-1 font-semibold hover:bg-white/10">All deals</Link>
          <Link href="/guide" className="whitespace-nowrap rounded px-2.5 py-1 hover:bg-white/10">Is this deal genuine?</Link>
          <Link href="/pledge" className="whitespace-nowrap rounded px-2.5 py-1 hover:bg-white/10">Zero-Profit Pledge</Link>
          <span className="ml-auto hidden items-center gap-1 whitespace-nowrap px-2 text-xs text-slate-300 sm:inline-flex"><Bookmark size={12} /> Saved deals stay on your device</span>
        </div>
      </nav>
    </header>
  );
}
