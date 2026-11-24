import type { Metadata } from "next";
import Link from "next/link";
import { PledgeBody } from "@/components/legal/LegalText";

export const metadata: Metadata = { title: "Zero-Profit Pledge", alternates: { canonical: "/pledge" } };

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm font-medium text-emerald-700 underline underline-offset-2">&larr; Back to deals</Link>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">Zero-Profit Pledge</h1>
      <PledgeBody />
    </main>
  );
}
