import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
export const metadata:Metadata={title:"Autopilot · Biswajit Power Hub",description:"Customer, EMI and service reminders for your dealership."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><AppShell><Suspense fallback={<div className="p-10 text-center text-muted">Loading…</div>}>{children}</Suspense></AppShell></body></html>}
