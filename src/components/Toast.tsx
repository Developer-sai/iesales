"use client";

import { useApp } from "@/lib/app-context";

export function ToastHost() {
  const { toast } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex justify-center px-4" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={`max-w-md rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.kind === "err" ? "bg-rose-600" : "bg-slate-900"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
