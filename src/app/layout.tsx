import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider } from "@/providers/auth-provider"
import { Toaster } from "sonner"
import "./globals.css"
import "@/components/styles.css"

export const metadata: Metadata = {
  title: "Hoogtij Dashboard",
  description: "Hoogtij AI-powered assistant dashboard",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl">
      <body className="font-sans bg-lht-cream text-lht-black antialiased">
        <AuthProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </AuthProvider>
        <Toaster richColors position="top-center" />
        <Analytics />
      </body>
    </html>
  )
}
