"use client"



import type React from "react"



import { useState, useEffect } from "react"

import { useAuth } from "@/hooks/use-auth"

import { Button } from "@/components/ui/button"

import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { ScrollArea } from "@/components/ui/scroll-area"

import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuItem,

  DropdownMenuLabel,

  DropdownMenuSeparator,

  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu"

import { AlertCircle } from "lucide-react"

import { useRouter } from "next/navigation"

import { getEnabledAgents } from "@/config/agents"

import { BrandLogo } from "@/components/branding/brand-logo"




interface UserProfile {

  name: string

  email: string

  company: string

  role: string

}



interface ChatMessage {

  id: string

  content: string

  sender: "user" | "assistant"

  timestamp: Date

}



interface ChatSession {

  id: string

  name: string

  messages: ChatMessage[]

  createdAt: Date

}



export default function HomePage() {

  const { user, isLoading, isAuthenticated, error, login, logout, clearError } = useAuth()

  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [loginError, setLoginError] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  const [hasMounted, setHasMounted] = useState(false)



  // Track client-side hydration to prevent hydration mismatch

  useEffect(() => {

    setHasMounted(true)

  }, [])



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



  // Show loading state while checking authentication or waiting for client hydration

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



  if (isAuthenticated && userProfile) {

    return <Dashboard onLogout={handleLogout} userProfile={userProfile} setUserProfile={setUserProfile} />

  }



  return (

    <div className="min-h-screen bg-gradient-to-br from-lht-cream to-lht-cream">

      {/* Header */}

      <header className="bg-white border-b border-lht-black/20">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex justify-between items-center h-16">

            <BrandLogo />

            <div className="flex space-x-2">

              <Button variant="outline" className="border-lht-black text-lht-black hover:bg-lht-cream bg-transparent">

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

            <CardDescription className="text-lht-black/60">Log in met je werk e-mailadres</CardDescription>

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

                <Button variant="link" className="text-lht-black hover:text-lht-black/70 p-0 h-auto">

                  Wachtwoord vergeten?

                </Button>

              </div>

              <Button
                type="submit"
                variant="lht"
                className="w-full"
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

            <div className="mt-6 text-center text-sm text-lht-black/60">

              Nog geen account?{" "}

              <Button variant="link" className="text-lht-black hover:text-lht-black/70 p-0 h-auto">

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

  const router = useRouter()

  const [showProfile, setShowProfile] = useState(false)



  // Get agents from central configuration
  const tools = getEnabledAgents()



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



  return (

    <div className="min-h-screen bg-gradient-to-br from-lht-cream to-lht-cream">

      {/* Header */}

      <header className="bg-white border-b border-lht-black/20">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex justify-between items-center h-16">

            <BrandLogo />

            <div className="flex items-center space-x-4">

              <DropdownMenu>

                <DropdownMenuTrigger asChild>

                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-lht-cream">

                    <div className="w-8 h-8 bg-lht-black rounded-full flex items-center justify-center text-white text-sm font-medium">

                      {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}

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

                  <DropdownMenuItem>Dashboard</DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowProfile(true)}>Profiel</DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={onLogout}>Uitloggen</DropdownMenuItem>

                </DropdownMenuContent>

              </DropdownMenu>

            </div>

          </div>

        </div>

      </header>



      {/* Main Content */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-lht-black mb-2">Dashboard</h2>

        </div>



        <div className="text-center mb-8">

          <h3 className="text-2xl font-semibold text-lht-black mb-2">Kies je tool</h3>

          <p className="text-lht-black/60">Selecteer de AI-assistent die je wilt gebruiken</p>

        </div>



        {/* Tools Grid */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">

          {tools.map((tool) => {

            const IconComponent = tool.icon

            return (

              <Card

                key={tool.id}

                className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-lht-black/20 hover:border-lht-black bg-white"

                onClick={() => router.push(`/chat/${tool.id}`)}

              >

                <CardHeader className="text-center">

                  <div className="w-16 h-16 bg-lht-green/30 rounded-full flex items-center justify-center mx-auto mb-4">

                    <IconComponent className="w-8 h-8 text-lht-black" />

                  </div>

                  <CardTitle className="text-lg font-semibold text-lht-black">{tool.name}</CardTitle>

                  <CardDescription className="text-sm text-lht-black/60">{tool.description}</CardDescription>

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

    <div className="min-h-screen bg-gradient-to-br from-lht-cream to-lht-cream">

      {/* Header */}

      <header className="bg-white border-b border-lht-black/20">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex justify-between items-center h-16">

            <div className="flex items-center space-x-4">

              <Button variant="ghost" onClick={onBack} className="text-lht-black/60 hover:text-lht-black">

                ← Terug naar Dashboard

              </Button>

              <h1 className="text-xl font-semibold text-lht-black">Profiel</h1>

            </div>

            <div className="flex items-center space-x-4">

              <div className="flex items-center space-x-2">

                <div className="w-8 h-8 bg-lht-black rounded-full flex items-center justify-center text-white text-sm font-medium">

                  {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}

                </div>

                <div className="text-left">

                  <div className="text-sm font-medium text-lht-black">{userProfile.name}</div>

                  <div className="text-xs text-lht-black/50">{userProfile.role}</div>

                </div>

              </div>

              <Button

                variant="outline"

                onClick={onLogout}

                className="border-lht-black text-lht-black hover:bg-lht-cream bg-transparent"

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

              <Button onClick={handleSaveProfile} variant="lht" className="w-full">
                Profiel Opslaan
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

                  className="w-full border-lht-black text-lht-black hover:bg-lht-cream"

                >

                  Wachtwoord Wijzigen

                </Button>

              ) : (

                <>

                  <div className="space-y-2">

                    <Label htmlFor="current-password">Huidig Wachtwoord</Label>

                    <Input

                      id="current-password"

                      type="password"

                      value={currentPassword}

                      onChange={(e) => setCurrentPassword(e.target.value)}

                    />

                  </div>

                  <div className="space-y-2">

                    <Label htmlFor="new-password">Nieuw Wachtwoord</Label>

                    <Input

                      id="new-password"

                      type="password"

                      value={newPassword}

                      onChange={(e) => setNewPassword(e.target.value)}

                    />

                  </div>

                  <div className="space-y-2">

                    <Label htmlFor="confirm-password">Bevestig Nieuw Wachtwoord</Label>

                    <Input

                      id="confirm-password"

                      type="password"

                      value={confirmPassword}

                      onChange={(e) => setConfirmPassword(e.target.value)}

                    />

                  </div>

                  <div className="flex space-x-2">

                    <Button onClick={handlePasswordChange} variant="lht" className="flex-1">
                      Wachtwoord Wijzigen
                    </Button>

                    <Button onClick={() => setShowPasswordChange(false)} variant="outline" className="flex-1">

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

