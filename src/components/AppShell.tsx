"use client";

import { useEffect, type ReactNode } from "react";
import { AppProvider, useApp } from "@/lib/app-context";
import { Footer } from "./Footer";
import { InstallPrompt } from "./InstallPrompt";
import { Navbar } from "./Navbar";
import { RegisterSW } from "./RegisterSW";
import { ToastHost } from "./Toast";
import { ModalHost } from "./modals/ModalHost";

function AuthErrorWatcher() {
  const { notify } = useApp();
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("auth") === "error") {
      notify("Sign-in did not complete. Please try again, in the same browser.", "err");
      url.searchParams.delete("auth");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [notify]);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[70] focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <Navbar />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
      <ModalHost />
      <ToastHost />
      <InstallPrompt />
      <RegisterSW />
      <AuthErrorWatcher />
    </AppProvider>
  );
}
