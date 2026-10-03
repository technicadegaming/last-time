import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://donedate.technicade.tech";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DoneDate — Never wonder when you last did it",
    template: "%s | DoneDate",
  },
  description: "A simple shared maintenance memory for your home, car, pets, and family.",
  manifest: "/manifest.webmanifest",
  applicationName: "DoneDate",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "DoneDate",
    title: "DoneDate — Never wonder when you last did it",
    description: "Remember what was done, when it happened, and what is due again across your household.",
  },
  twitter: {
    card: "summary",
    title: "DoneDate — Never wonder when you last did it",
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
