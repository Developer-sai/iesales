"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { CONTACT_EMAIL } from "@/lib/constants";
import { OperatorLine } from "./legal/LegalText";

export function Footer() {
  const { openModal } = useApp();
  const link = "font-medium text-slate-700 underline-offset-2 hover:underline";
  return (
    <footer className="mt-8 border-t border-slate-200 bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-6 text-sm text-slate-600">
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legal">
          <Link href="/guide" className={link}>Is this deal genuine?</Link>
          <button onClick={() => openModal({ type: "pledge" })} className={link}>Zero-Profit Pledge</button>
          <button onClick={() => openModal({ type: "terms" })} className={link}>Terms &amp; takedown policy</button>
          <button onClick={() => openModal({ type: "privacy" })} className={link}>Privacy (GDPR)</button>
          <button onClick={() => openModal({ type: "notice" })} className={link}>Report illegal content</button>
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>{CONTACT_EMAIL}</a>
        </nav>
        <p className="text-xs text-slate-500">Operated by <OperatorLine /> Also at <Link href="/terms" className={link}>/terms</Link>, <Link href="/privacy" className={link}>/privacy</Link>.</p>
        <p className="text-xs leading-relaxed text-slate-500">
          iesales.ie is a free, community-run, ad-free tool. Prices, prior prices and stock are reported by shoppers and are not verified. Check the shop&apos;s own listing before you buy.
          Not affiliated with or endorsed by any shop or brand named. All names belong to their owners.
        </p>
      </div>
    </footer>
  );
}
