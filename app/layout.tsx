import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

// The font variable sits on <html>: the App shell tokens live on :root and read it from there.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Checklists | Bookchaowalit",
  description: "Run personal checklists for launches, interviews, and content work.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "Bookchaowalit", title: "Checklists | Bookchaowalit", description: "Run personal checklists for launches, interviews, and content work." },
  twitter: { card: "summary", creator: "@bookchaowalit" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={geistSans.variable}><body>{children}</body></html>;
}
