"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { DealCard } from "./DealCard";

export function DealPage({ id }: { id: string }) {
  const { deals, ready } = useApp();
  const deal = deals.find((d) => d.id === id);
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-3 py-4 sm:px-4">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><ArrowLeft size={16} /> All deals</Link>
      {!ready ? (
        <div className="h-56 animate-pulse rounded-xl bg-slate-200" aria-busy="true" />
      ) : deal ? (
        <DealCard deal={deal} defaultOpen />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-semibold text-slate-900">This deal isn&apos;t available.</p>
          <p className="mt-1 text-sm text-slate-600">It may have been deleted, expired or hidden after community reports.</p>
          <Link href="/" className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">See live deals</Link>
        </div>
      )}
    </div>
  );
}
