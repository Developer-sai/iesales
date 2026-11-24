import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import { SITE_URL } from "@/lib/constants";
import { SITE_SHARE_TEXT } from "@/lib/share";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "iesales.ie: Irish deals & sales tracker, all year round (free, no ads)", template: "%s | iesales.ie" },
  description: SITE_SHARE_TEXT,
  applicationName: "iesales.ie",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "iesales.ie", locale: "en_IE", title: "iesales.ie: Irish deals & sales tracker", description: SITE_SHARE_TEXT },
  twitter: { card: "summary_large_image", title: "iesales.ie: Irish deals & sales tracker", description: SITE_SHARE_TEXT },
  appleWebApp: { capable: true, title: "iesales.ie", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#059669",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
