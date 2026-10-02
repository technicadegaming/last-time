import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Last Time — Never wonder when you last did it",
  description: "A dead-simple life maintenance tracker for the things you do again eventually.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
