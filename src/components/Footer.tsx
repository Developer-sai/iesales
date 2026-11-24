"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { CONTACT_EMAIL } from "@/lib/constants";
import { OperatorLine } from "./legal/LegalText";

export function Footer() {
  const { openModal } = useApp();
  const link = "text-left text-slate-300 underline-offset-2 hover:text-white hover:underline";
  const head = "mb-2 text-sm font-bold text-white";
  return (
    <footer className="mt-10 bg-[#131921] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-sm text-slate-300">
      <a href="#main" className="block bg-[#232f3e] py-3 text-center text-sm font-semibold text-white hover:bg-[#37475a]">Back to top</a>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xl font-extrabold tracking-tight text-white">iesales<span className="text-amber-400">.ie</span></p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Ireland&apos;s free, community-run deal tracker. No ads. No affiliate links. Prices are reported by shoppers like you.
          </p>
        </div>
        <nav aria-label="Explore" className="flex flex-col items-start gap-1.5">
          <p className={head}>Explore</p>
          <Link href="/" className={link}>All deals</Link>
          <Link href="/guide" className={link}>Is this deal genuine?</Link>
          <Link href="/pledge" className={link}>Zero-Profit Pledge</Link>
        </nav>
        <nav aria-label="Legal" className="flex flex-col items-start gap-1.5">
          <p className={head}>Legal &amp; trust</p>
          <button onClick={() => openModal({ type: "terms" })} className={link}>Terms &amp; takedown policy</button>
          <button onClick={() => openModal({ type: "privacy" })} className={link}>Privacy (GDPR)</button>
          <button onClick={() => openModal({ type: "notice" })} className={link}>Report illegal content</button>
        </nav>
        <div className="flex flex-col items-start gap-1.5">
          <p className={head}>Contact</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>{CONTACT_EMAIL}</a>
          <p className="text-xs text-slate-400">Also at <Link href="/terms" className={link}>/terms</Link>, <Link href="/privacy" className={link}>/privacy</Link>.</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-5 text-xs leading-relaxed text-slate-400">
          <p>Operated by <OperatorLine /></p>
          <p>
            iesales.ie is a free, community-run, ad-free tool. Prices, prior prices and stock are reported by shoppers and are not verified. Check the shop&apos;s own listing before you buy.
            Not affiliated with or endorsed by any shop or brand named. All names belong to their owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
