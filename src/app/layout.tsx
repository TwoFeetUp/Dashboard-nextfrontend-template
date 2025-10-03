import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider } from "@/providers/auth-provider"
import { Toaster } from "sonner"
import "./globals.css"
import "@/components/styles.css"

export const metadata: Metadata = {
  title: "Olympisch Stadion Dashboard",
  description: "Dashboard voor het Olympisch Stadion Amsterdam",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} bg-background`}>
        <AuthProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </AuthProvider>
        <Toaster richColors position="top-center" />
        <Analytics />
      </body>
    </html>
  )
}
