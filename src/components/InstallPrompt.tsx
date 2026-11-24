"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY = "iesales-install-dismissed";

export function InstallPrompt() {
  const { modal } = useApp();
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === "1"; } catch { /* storage unavailable */ }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (dismissed || standalone) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const t = setTimeout(() => {
      if (isIos) { setIos(true); setHidden(false); }
    }, 15_000);
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); setTimeout(() => setHidden(false), 8_000); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onPrompt); };
  }, []);

  function dismiss() {
    setHidden(true);
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  }

  if (hidden || modal || (!evt && !ios)) return null; // never sit on top of a dialog
  return (
    <div className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md md:left-auto md:right-4 md:mx-0 items-center gap-3 rounded-xl border border-emerald-200 bg-white p-3 shadow-lg">
      <Download className="shrink-0 text-emerald-600" size={20} />
      <p className="flex-1 text-sm text-slate-800">
        {evt ? "Install iesales.ie for one-tap access to every Irish sale." : "Add to your Home Screen: tap Share, then “Add to Home Screen”."}
      </p>
      {evt && (
        <button onClick={async () => { await evt.prompt(); await evt.userChoice; dismiss(); }} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Install</button>
      )}
      <button onClick={dismiss} aria-label="Dismiss" className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
    </div>
  );
}
