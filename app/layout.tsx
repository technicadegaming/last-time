import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lasttime.technicade.tech";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AgainDue — Never wonder when you last did it",
    template: "%s | AgainDue",
  },
  description: "A simple shared maintenance memory for your home, car, pets, and family.",
  manifest: "/manifest.webmanifest",
  applicationName: "AgainDue",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "AgainDue",
    title: "AgainDue — Never wonder when you last did it",
    description: "Remember what was done, when it happened, and what is due again across your household.",
  },
  twitter: {
    card: "summary",
    title: "AgainDue — Never wonder when you last did it",
    description: "Track the recurring stuff in life, remember the last time, and get reminded when it is due again.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<Analytics /></body>
    </html>
  );
}
