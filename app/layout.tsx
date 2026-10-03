import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lasttime.technicade.tech";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Last Time — Never wonder when you last did it",
    template: "%s | Last Time",
  },
  description: "A dead-simple life maintenance tracker for the things you do again eventually.",
  manifest: "/manifest.webmanifest",
  applicationName: "Last Time",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Last Time",
    title: "Last Time — Never wonder when you last did it",
    description: "Track the recurring stuff in life, remember the last time, and get reminded when it is due again.",
  },
  twitter: {
    card: "summary",
    title: "Last Time — Never wonder when you last did it",
    description: "Track the recurring stuff in life, remember the last time, and get reminded when it is due again.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
