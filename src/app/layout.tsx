import type React from "react"
import type { Metadata } from "next"
import { Nunito } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider } from "@/providers/auth-provider"
import { Toaster } from "sonner"
import "./globals.css"
import "@/components/styles.css"

// TwoFeetUp huisstijl font
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-nunito",
  display: "swap",
})

export const metadata: Metadata = {
  title: "TwoFeetUp Demo",
  description: "Ontdek wat TwoFeetUp voor u kan betekenen",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl" className={nunito.variable}>
      <body className={`font-nunito ${GeistMono.variable} bg-background text-tfu-black`}>
        <AuthProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </AuthProvider>
        <Toaster richColors position="top-center" />
        <Analytics />
      </body>
    </html>
  )
}
