"use client"



import type React from "react"



import { useState, useEffect } from "react"

import { useAuth } from "@/hooks/use-auth"

// Hook to handle hydration safely
function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  return hasMounted;
}

import { Button } from "@/components/ui/button"

import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuItem,

  DropdownMenuLabel,

  DropdownMenuSeparator,

  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu"

import { FileText, Calendar, FileCheck, Megaphone, AlertCircle, Search } from "lucide-react"

import { ChatInterfaceEnhanced } from "@/components/chat-interface-enhanced"

import { DashboardView } from "@/components/dashboard"

import { BrandLogo } from "@/components/branding/brand-logo"




interface UserProfile {

  name: string

  email: string

  company: string

  role: string

}

export default function HomePage() {
  const hasMounted = useHasMounted();

  const { user, isLoading, isAuthenticated, error, login, logout, clearError } = useAuth()

  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [loginError, setLoginError] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)



  // Update userProfile when user changes

  useEffect(() => {

    if (user) {

      setUserProfile({

        name: user.name || user.username || 'User',

        email: user.email,

        company: "Your Company",

        role: (user as any).role || "medewerker",

      })

    } else {

      setUserProfile(null)

    }

  }, [user])



  // Clear login error when component unmounts or when auth error is cleared

  useEffect(() => {

    if (error) {

      setLoginError(error)

    }

  }, [error])



  const handleLogin = async (e: React.FormEvent) => {

    e.preventDefault()

    setLoginError(null)

    setIsSubmitting(true)

    

    try {

      await login({ email, password })

      // Success - will redirect automatically via auth provider

      setEmail("")

      setPassword("")

    } catch (err: any) {

      // Error is already set in context, but we can handle it here too

      setLoginError(err.message || "Failed to login. Please check your credentials.")

    } finally {

      setIsSubmitting(false)

    }

  }



  const handleLogout = async () => {

    await logout()

  }



  // Show loading state while checking authentication
  // Also show loading before hydration is complete to prevent hydration mismatch

  if (!hasMounted || isLoading) {

    return (

      <div className="min-h-screen bg-gradient-to-br from-tfu-purple to-tfu-blue flex items-center justify-center">

        <div className="text-center">

          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>

          <p className="text-white/80 font-light">Laden...</p>

        </div>

      </div>

    )

  }



  if (isAuthenticated && userProfile) {

    return <Dashboard onLogout={handleLogout} userProfile={userProfile} setUserProfile={setUserProfile} />

  }



  return (

    <div className="min-h-screen bg-gradient-to-br from-tfu-purple to-tfu-blue">

      {/* Header */}

      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex justify-between items-center h-16">

            <BrandLogo variant="dark" />

            <div className="flex space-x-2">

              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent">

                Registreren

              </Button>

            </div>

          </div>

        </div>

      </header>



      {/* Login Form */}

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">

        <Card className="w-full max-w-md bg-white">

          <CardHeader className="text-center space-y-3">

            <div className="flex justify-center">
              <BrandLogo className="justify-center" />
            </div>

            <CardDescription className="text-tfu-black/70 font-light">Log in met je werk e-mailadres</CardDescription>

          </CardHeader>

          <CardContent>

            <form onSubmit={handleLogin} className="space-y-4">

              {/* Error message display */}

              {loginError && (

                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">

                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />

                  <div className="text-sm">

                    {loginError}

                  </div>

                </div>

              )}

              

              <div className="space-y-2">

                <Label htmlFor="email">E-mailadres</Label>

                <Input

                  id="email"

                  type="email"

                  placeholder="name@company.com"

                  value={email}

                  onChange={(e) => {

                    setEmail(e.target.value)

                    setLoginError(null)

                    clearError()

                  }}

                  disabled={isSubmitting}

                  required

                />

              </div>

              <div className="space-y-2">

                <Label htmlFor="password">Wachtwoord</Label>

                <Input

                  id="password"

                  type="password"

                  value={password}

                  onChange={(e) => {

                    setPassword(e.target.value)

                    setLoginError(null)

                    clearError()

                  }}

                  disabled={isSubmitting}

                  required

                />

              </div>

              <div className="text-right">

                <Button variant="link" className="text-tfu-purple hover:text-tfu-violet p-0 h-auto font-normal">

                  Wachtwoord vergeten?

                </Button>

              </div>

              <Button

                type="submit"

                className="w-full bg-gradient-to-br from-tfu-purple to-tfu-blue hover:opacity-90 text-white font-bold shadow-tfu-md"

                disabled={isSubmitting || !email || !password}

              >

                {isSubmitting ? (

                  <div className="flex items-center justify-center gap-2">

                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>

                    <span>Inloggen...</span>

                  </div>

                ) : (

                  "Inloggen"

                )}

              </Button>

            </form>

            <div className="mt-6 text-center text-sm text-tfu-black/70 font-light">

              Nog geen account?{" "}

              <Button variant="link" className="text-tfu-purple hover:text-tfu-violet p-0 h-auto font-normal">

                Registreren

              </Button>

            </div>

          </CardContent>

        </Card>

      </div>

    </div>

  )

}



function Dashboard({

  onLogout,

  userProfile,

  setUserProfile,

}: {

  onLogout: () => void

  userProfile: UserProfile

  setUserProfile: (profile: UserProfile) => void

}) {

  const [selectedTool, setSelectedTool] = useState<string | null>(null)

  const [showProfile, setShowProfile] = useState(false)

  type ToolCard = {
    id: string
    name: string
    description: string
    icon: any
    available: boolean
    error?: string | null
    model?: string
  }

  const [tools, setTools] = useState<ToolCard[]>([])
  const [toolsError, setToolsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadTools = async () => {
      try {
        setToolsError(null)
        const response = await fetch('/api/agents', { cache: 'no-store' })
        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || `Agent backend error (status ${response.status})`)
        }

        const json = await response.json()
        const agents = json?.agents ?? {}

        const displayNames: Record<string, string> = {
          'contract-clearance': 'Contract Clearance',
          'event-planner': 'Event Planner',
          'event-contract-assistant': 'Event Contract Assistant',
          'marketing-communicatie': 'Marketing en Communicatie',
          'test-model': 'Test Model',
        }

        const icons: Record<string, any> = {
          'contract-clearance': FileText,
          'event-planner': Calendar,
          'event-contract-assistant': FileCheck,
          'marketing-communicatie': Megaphone,
          'test-model': AlertCircle,
          'research-dashboard': Search,
        }

        const toTitle = (value: string) =>
          value
            .split('-')
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')

        const toolCards: ToolCard[] = Object.entries(agents).map(([id, agent]: any) => ({
          id,
          name: displayNames[id] || toTitle(id),
          description: agent?.description || '',
          icon: icons[id] || AlertCircle,
          available: agent?.available !== false,
          error: agent?.error ?? null,
          model: agent?.model
        }))

        // Add Research Dashboard as a special tool card
        const researchDashboard: ToolCard = {
          id: 'research-dashboard',
          name: 'Research Dashboard',
          description: 'AI-gestuurde onderzoekskaarten die automatisch worden bijgewerkt',
          icon: Search,
          available: true,
          error: null,
          model: 'Claude Sonnet'
        }

        toolCards.push(researchDashboard)
        toolCards.sort((a, b) => a.name.localeCompare(b.name))

        if (!cancelled) {
          setTools(toolCards)
        }
      } catch (error: any) {
        console.error('Failed to load tools:', error)
        if (!cancelled) {
          setTools([])
          setToolsError(error?.message || 'Failed to load tools')
        }
      }
    }

    loadTools()
    return () => {
      cancelled = true
    }
  }, [])



  if (showProfile) {

    return (

      <ProfileManagement

        userProfile={userProfile}

        setUserProfile={setUserProfile}

        onBack={() => setShowProfile(false)}

        onLogout={onLogout}

      />

    )

  }



  // Research Dashboard needs natural page scrolling, chat needs fixed height
  const isResearchDashboard = selectedTool === 'research-dashboard'

  if (selectedTool) {

    return (

      <div className={`bg-tfu-grey flex flex-col ${isResearchDashboard ? 'min-h-screen' : 'h-screen overflow-hidden'}`}>

        {/* Header */}

        <header className="bg-white border-b border-tfu-grey flex-shrink-0 shadow-tfu-sm">

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="flex justify-between items-center h-16">

              <div className="flex items-center space-x-4">

                <Button

                  variant="ghost"

                  onClick={() => setSelectedTool(null)}

                  className="text-tfu-purple hover:text-tfu-violet hover:bg-tfu-grey"

                >

                  ← Terug naar tools

                </Button>

                <h1 className="text-xl font-bold text-tfu-black">

                  {tools.find((t) => t.id === selectedTool)?.name}

                </h1>

              </div>

              <div className="flex items-center space-x-4">

                <DropdownMenu>

                  <DropdownMenuTrigger asChild>

                    <Button variant="ghost" className="flex items-center space-x-2 hover:bg-tfu-grey">

                      <div className="w-8 h-8 bg-gradient-to-br from-tfu-purple to-tfu-blue rounded-full flex items-center justify-center text-white text-sm font-bold">

                        {userProfile.name.charAt(0)}

                      </div>

                      <div className="text-left">

                        <div className="text-sm font-bold text-tfu-black">{userProfile.name}</div>

                        <div className="text-xs text-tfu-black/60 font-light">{userProfile.role}</div>

                      </div>

                    </Button>

                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">

                    <DropdownMenuLabel>

                      <div className="flex flex-col space-y-1">

                        <p className="text-sm font-bold leading-none text-tfu-black">{userProfile.name}</p>

                        <p className="text-xs leading-none text-tfu-black/60 font-light">{userProfile.email}</p>

                      </div>

                    </DropdownMenuLabel>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setSelectedTool(null)} className="hover:bg-tfu-grey">Dashboard</DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setShowProfile(true)} className="hover:bg-tfu-grey">Profiel</DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={onLogout} className="hover:bg-tfu-grey">Uitloggen</DropdownMenuItem>

                  </DropdownMenuContent>

                </DropdownMenu>

              </div>

            </div>

          </div>

        </header>



        {/* Tool Content */}

        <main className={`mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 ${isResearchDashboard ? '' : 'flex-1 min-h-0 overflow-hidden'}`}>
          {(() => {
            const selected = tools.find((tool) => tool.id === selectedTool)
            if (!selected) return null

            // Render Research Dashboard view
            if (selected.id === 'research-dashboard') {
              return <DashboardView userId={userProfile.email} />
            }

            return (
              <ChatInterfaceEnhanced toolName={selected.name} toolId={selected.id} />
            )
          })()}

        </main>

      </div>

    )

  }



  return (

    <div className="min-h-screen bg-tfu-grey">

      {/* Header */}

      <header className="bg-white border-b border-tfu-grey shadow-tfu-sm">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex justify-between items-center h-16">

            <BrandLogo />

            <div className="flex items-center space-x-4">

              <DropdownMenu>

                <DropdownMenuTrigger asChild>

                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-tfu-grey">

                    <div className="w-8 h-8 bg-gradient-to-br from-tfu-purple to-tfu-blue rounded-full flex items-center justify-center text-white text-sm font-bold">

                      {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}

                    </div>

                    <div className="text-left">

                      <div className="text-sm font-bold text-tfu-black">{userProfile.name}</div>

                      <div className="text-xs text-tfu-black/60 font-light">{userProfile.role}</div>

                    </div>

                  </Button>

                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">

                  <DropdownMenuLabel>

                    <div className="flex flex-col space-y-1">

                      <p className="text-sm font-bold leading-none text-tfu-black">{userProfile.name}</p>

                      <p className="text-xs leading-none text-tfu-black/60 font-light">{userProfile.email}</p>

                    </div>

                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem className="hover:bg-tfu-grey">Dashboard</DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowProfile(true)} className="hover:bg-tfu-grey">Profiel</DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={onLogout} className="hover:bg-tfu-grey">Uitloggen</DropdownMenuItem>

                </DropdownMenuContent>

              </DropdownMenu>

            </div>

          </div>

        </div>

      </header>



      {/* Main Content */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-8">

          <h2 className="text-3xl font-normal text-tfu-black mb-2">Dashboard</h2>

        </div>



        <div className="text-center mb-8">

          <h3 className="text-2xl font-normal text-tfu-black mb-2">Kies je tool</h3>

          <p className="text-tfu-black/70 font-light">Selecteer de AI-assistent die je wilt gebruiken</p>

        </div>

        {toolsError && (
          <div className="mb-6 border border-red-200 bg-red-50 text-red-700 rounded-md p-4 text-sm">
            Kon tools niet laden: {toolsError}
          </div>
        )}



        {/* Tools Grid */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">

          {tools.map((tool) => {

            const IconComponent = tool.icon

            return (

              <Card

                key={tool.id}

                className={`transition-all duration-200 border-tfu-grey bg-white shadow-tfu-md ${
                  tool.available
                    ? 'cursor-pointer hover:shadow-tfu-lg hover:scale-[1.02] hover:border-tfu-purple/30'
                    : 'opacity-60 cursor-not-allowed'
                }`}

                onClick={() => tool.available && setSelectedTool(tool.id)}

              >

                <CardHeader className="text-center">

                  <div className="w-16 h-16 bg-gradient-to-br from-tfu-purple/10 to-tfu-blue/20 rounded-full flex items-center justify-center mx-auto mb-4">

                    <IconComponent className="w-8 h-8 text-tfu-purple" />

                  </div>

                  <CardTitle className="text-lg font-bold text-tfu-black">{tool.name}</CardTitle>

                  <CardDescription className="text-sm text-tfu-black/70 font-light">{tool.description}</CardDescription>

                  {!tool.available && tool.error && (
                    <CardDescription className="text-xs text-red-600 mt-2 font-light">
                      Niet beschikbaar: {tool.error}
                    </CardDescription>
                  )}

                </CardHeader>

              </Card>

            )

          })}

        </div>

      </main>

    </div>

  )

}



function ProfileManagement({

  userProfile,

  setUserProfile,

  onBack,

  onLogout,

}: {

  userProfile: UserProfile

  setUserProfile: (profile: UserProfile) => void

  onBack: () => void

  onLogout: () => void

}) {

  const [editedProfile, setEditedProfile] = useState(userProfile)

  const [currentPassword, setCurrentPassword] = useState("")

  const [newPassword, setNewPassword] = useState("")

  const [confirmPassword, setConfirmPassword] = useState("")

  const [showPasswordChange, setShowPasswordChange] = useState(false)



  const handleSaveProfile = () => {

    setUserProfile(editedProfile)

    alert("Profiel succesvol bijgewerkt!")

  }



  const handlePasswordChange = () => {

    if (newPassword !== confirmPassword) {

      alert("Nieuwe wachtwoorden komen niet overeen!")

      return

    }

    if (newPassword.length < 6) {

      alert("Wachtwoord moet minimaal 6 karakters lang zijn!")

      return

    }

    alert("Wachtwoord succesvol gewijzigd!")

    setCurrentPassword("")

    setNewPassword("")

    setConfirmPassword("")

    setShowPasswordChange(false)

  }



  return (

    <div className="min-h-screen bg-tfu-grey">

      {/* Header */}

      <header className="bg-white border-b border-tfu-grey shadow-tfu-sm">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex justify-between items-center h-16">

            <div className="flex items-center space-x-4">

              <Button variant="ghost" onClick={onBack} className="text-tfu-purple hover:text-tfu-violet hover:bg-tfu-grey">

                ← Terug naar dashboard

              </Button>

              <h1 className="text-xl font-bold text-tfu-black">Profiel</h1>

            </div>

            <div className="flex items-center space-x-4">

              <div className="flex items-center space-x-2">

                <div className="w-8 h-8 bg-gradient-to-br from-tfu-purple to-tfu-blue rounded-full flex items-center justify-center text-white text-sm font-bold">

                  {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}

                </div>

                <div className="text-left">

                  <div className="text-sm font-bold text-tfu-black">{userProfile.name}</div>

                  <div className="text-xs text-tfu-black/60 font-light">{userProfile.role}</div>

                </div>

              </div>

              <Button

                variant="outline"

                onClick={onLogout}

                className="border-tfu-purple text-tfu-purple hover:bg-tfu-purple hover:text-white bg-transparent"

              >

                Uitloggen

              </Button>

            </div>

          </div>

        </div>

      </header>



      {/* Profile Content */}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Profile Information */}

          <Card className="bg-white">

            <CardHeader>

              <CardTitle>Profiel Informatie</CardTitle>

              <CardDescription>Beheer je persoonlijke gegevens</CardDescription>

            </CardHeader>

            <CardContent className="space-y-4">

              <div className="space-y-2">

                <Label htmlFor="name">Naam</Label>

                <Input

                  id="name"

                  value={editedProfile.name}

                  onChange={(e) => setEditedProfile((prev) => ({ ...prev, name: e.target.value }))}

                />

              </div>

              <div className="space-y-2">

                <Label htmlFor="email">E-mailadres</Label>

                <Input

                  id="email"

                  type="email"

                  value={editedProfile.email}

                  onChange={(e) => setEditedProfile((prev) => ({ ...prev, email: e.target.value }))}

                />

              </div>

              <Button onClick={handleSaveProfile} className="w-full bg-gradient-to-br from-tfu-purple to-tfu-blue hover:opacity-90 text-white font-bold">

                Profiel opslaan

              </Button>

            </CardContent>

          </Card>



          {/* Password Management */}

          <Card className="bg-white">

            <CardHeader>

              <CardTitle>Wachtwoord</CardTitle>

              <CardDescription>Wijzig je wachtwoord voor extra beveiliging</CardDescription>

            </CardHeader>

            <CardContent className="space-y-4">

              {!showPasswordChange ? (

                <Button

                  onClick={() => setShowPasswordChange(true)}

                  variant="outline"

                  className="w-full border-tfu-purple text-tfu-purple hover:bg-tfu-purple hover:text-white"

                >

                  Wachtwoord wijzigen

                </Button>

              ) : (

                <>

                  <div className="space-y-2">

                    <Label htmlFor="current-password">Huidig wachtwoord</Label>

                    <Input

                      id="current-password"

                      type="password"

                      value={currentPassword}

                      onChange={(e) => setCurrentPassword(e.target.value)}

                    />

                  </div>

                  <div className="space-y-2">

                    <Label htmlFor="new-password">Nieuw wachtwoord</Label>

                    <Input

                      id="new-password"

                      type="password"

                      value={newPassword}

                      onChange={(e) => setNewPassword(e.target.value)}

                    />

                  </div>

                  <div className="space-y-2">

                    <Label htmlFor="confirm-password">Bevestig nieuw wachtwoord</Label>

                    <Input

                      id="confirm-password"

                      type="password"

                      value={confirmPassword}

                      onChange={(e) => setConfirmPassword(e.target.value)}

                    />

                  </div>

                  <div className="flex space-x-2">

                    <Button onClick={handlePasswordChange} className="flex-1 bg-gradient-to-br from-tfu-purple to-tfu-blue hover:opacity-90 text-white font-bold">

                      Wachtwoord wijzigen

                    </Button>

                    <Button onClick={() => setShowPasswordChange(false)} variant="outline" className="flex-1 border-tfu-grey hover:bg-tfu-grey">

                      Annuleren

                    </Button>

                  </div>

                </>

              )}

            </CardContent>

          </Card>

        </div>

      </main>

    </div>

  )

}
