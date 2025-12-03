"use client"

import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { getAgentById, isValidAgentId } from "@/config/agents"
import { ChatInterfaceEnhanced } from "@/components/chat-interface-enhanced"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BrandLogo } from "@/components/branding/brand-logo"
import { useEffect, useState } from "react"

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const [hasMounted, setHasMounted] = useState(false)

  const agentId = params.agentId as string
  const agent = getAgentById(agentId)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (hasMounted && !isLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [hasMounted, isLoading, isAuthenticated, router])

  // Show loading state
  if (!hasMounted || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lht-cream to-lht-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-lht-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lht-black/60">Loading...</p>
        </div>
      </div>
    )
  }

  // Check if agent exists
  if (!agent || !isValidAgentId(agentId)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lht-cream to-lht-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-lht-black mb-4">Agent niet gevonden</h1>
          <p className="text-lht-black/60 mb-6">De gevraagde AI-assistent bestaat niet.</p>
          <Button variant="lht" onClick={() => router.push("/")}>
            Terug naar Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Not authenticated - will redirect
  if (!isAuthenticated || !user) {
    return null
  }

  const userProfile = {
    name: user.name || user.username || "User",
    email: user.email,
    role: (user as any).role || "medewerker",
  }

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  return (
    <div className="h-screen bg-lht-cream flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-lht-black/10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="text-lht-black/60 hover:text-lht-black"
              >
                ← Terug naar dashboard
              </Button>
              <div className="h-6 w-px bg-lht-black/20" />
              <h1 className="text-xl font-semibold text-lht-black">{agent.name}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-lht-cream">
                    <div className="w-8 h-8 bg-lht-black rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {userProfile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-lht-black">{userProfile.name}</div>
                      <div className="text-xs text-lht-black/50">{userProfile.role}</div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userProfile.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{userProfile.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/")}>Dashboard</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Uitloggen</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Interface */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <ChatInterfaceEnhanced toolName={agent.name} toolId={agent.id} accentColor={agent.accentColor} textColor={agent.textColor} />
        </div>
      </main>
    </div>
  )
}
