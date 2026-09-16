import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Smart Library Admin", description: "Library operations dashboard", manifest: "/manifest.json" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
