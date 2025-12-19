"use client"

import { useState, useEffect, useCallback } from "react"
import { Trash2, Pencil, Check, X, Menu } from "lucide-react"
import { toast } from "sonner"
import { useChatOCREnhanced } from "@/hooks/use-chat-ocr-enhanced"
import ChatContainer from "./chat-container"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/hooks/use-auth"
import { deleteConversation, updateConversationTitle } from "@/lib/conversation"
import pb from "@/lib/pocketbase"
import { Input } from "@/components/ui/input"

// Sanitize values for PocketBase filter queries to prevent injection
const sanitizeFilterValue = (value: string): string => {
  // Escape double quotes and backslashes for PocketBase filter syntax
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

interface ChatSession {
  id: string
  name: string
  createdAt: Date
  messageCount: number
  conversationId?: string
}

interface ChatInterfaceEnhancedProps {
  toolName: string
  toolId: string
  accentColor?: string
  textColor?: string
}

const SUGGESTION_PRESETS: Record<string, string[]> = {
  "henry-hr": [
    "Ik wil mijn eigen Custom GPT maken, waar begin ik?",
    "Kun je me helpen met het schrijven van instructies voor mijn GPT?",
    "Wat zijn de beste practices voor het configureren van een Custom GPT?"
  ],
  "perry-prompt": [
    "Kun je deze prompt verbeteren voor betere resultaten?",
    "Hoe schrijf ik een effectieve system prompt?",
    "Wat zijn veelgemaakte fouten bij het prompten van AI?"
  ],
  "corry-content": [
    "Kun je deze tekst omzetten naar een LinkedIn post?",
    "Maak een Instagram caption van deze informatie.",
    "Transformeer dit persbericht naar social media content voor meerdere platforms."
  ],
  "kenny-kennis": [
    "Kun je deze transcriptie omzetten naar een gestructureerd knowledge file?",
    "Help me deze informatie te formatteren voor AI-consumptie.",
    "Extraheer de belangrijkste feiten uit dit document voor een kennisbank."
  ],
  "knowledge-hub": [
    "Zoek in de LHT kennisbank naar procedures voor de brandcentrale en noodsituaties.",
    "Waar staan de afspraken en stappen voor aanvragen en reserveringen van events?",
    "Vind het huisstijlhandboek en de logo-richtlijnen van Hoogtij."
  ],
  "mickey-mice": [
    "Welke events staan er gepland voor deze maand?",
    "Kun je een overzicht geven van recente boekingen?",
    "Welke venues zijn beschikbaar?"
  ],
}

const DEFAULT_SUGGESTIONS = [
  "Met welke eerste stap kan ik het beste beginnen?",
  "Welke informatie heb je van mij nodig om te starten?"
]

export function ChatInterfaceEnhanced({ toolName, toolId, accentColor = '#a1d980', textColor = '#1a1a1a' }: ChatInterfaceEnhancedProps) {
  // Calculate darker shade for hover
  const darkerAccent = accentColor.replace(/^#/, '').match(/.{2}/g)?.map(hex => {
    const val = Math.max(0, parseInt(hex, 16) - 20)
    return val.toString(16).padStart(2, '0')
  }).join('') || accentColor.slice(1)
  const hoverColor = `#${darkerAccent}`
  const { user, logout } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleChatError = useCallback((error: Error) => {
    console.error('Chat error:', error)
  }, [])

  const handleFileProcessed = useCallback((file: File, result: unknown) => {
    console.log('File processed:', file.name, result)
  }, [])

  // Use the enhanced hook with PocketBase integration
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    documents,
    uploadError,
    handleFileSelect,
    handleFilesDropped,
    removeDocument,
    pendingPermissions,
    approvePermission,
    denyPermission
  } = useChatOCREnhanced({
    conversationId,
    assistantType: toolId,
    onError: handleChatError,
    onFileProcessed: handleFileProcessed
  })

  const loadSessions = useCallback(async () => {
    const authUserId = pb.authStore.model?.id
    if (!authUserId) {
      await logout()
      return
    }

    try {
      const safeToolId = sanitizeFilterValue(toolId)
      // Backend rules already filter by userId - we only need to filter by assistantType
      const records = await pb.collection('conversations').getList(1, 50, {
        filter: `assistantType = "${safeToolId}"`,
        sort: '-created',
      })
      
      const loadedSessions: ChatSession[] = records.items.map(record => ({
        id: record.id,
        name: record.title || `Chat ${new Date(record.created).toLocaleDateString('nl-NL')}`,
        createdAt: new Date(record.created),
        messageCount: 0,
        conversationId: record.id
      }))
      
      setSessions(loadedSessions)
    } catch (error: any) {
      console.error('Failed to load sessions:', error)
      console.error('Error details:', {
        status: error?.status,
        message: error?.message,
        data: error?.data,
        response: error?.response
      })
      // Only logout on 401 (unauthorized) - not on 400 (bad request)
      if (error?.status === 401) {
        // Auth token invalid or expired - force re-login
        await logout()
      }
      // For other errors, just log and continue - don't logout
    }
  }, [toolId, logout])

  useEffect(() => {
    if (user) {
      loadSessions()
    }
  }, [user, toolId, loadSessions])

  const createNewSession = async () => {
    if (!user) {
      console.error('No user found for creating session')
      await logout()
      return
    }
    
    try {
      const authUserId = pb.authStore.model?.id
      
      if (!authUserId) {
        console.error('No authenticated user ID found')
        await logout()
        return
      }
      
      const conversation = await pb.collection('conversations').create({
        title: `${toolName} - ${new Date().toLocaleDateString('nl-NL')}`,
        userId: authUserId,
        assistantType: toolId,
        isActive: true,
        lastMessage: ''
      })
      
      const newSession: ChatSession = {
        id: conversation.id,
        name: conversation.title,
        createdAt: new Date(),
        messageCount: 0,
        conversationId: conversation.id
      }
      
      setSessions((previous) => [newSession, ...previous])
      setCurrentSession(newSession)
      setConversationId(conversation.id)
      setIsSidebarOpen(false)
    } catch (error: any) {
      console.error('Failed to create session:', error)
      if (error?.status === 401) {
        await logout()
      }
    }
  }

  const loadSession = async (session: ChatSession) => {
    if (!session.conversationId || !user) return
    
    setSessionToDelete(null)
    setCurrentSession(session)
    setConversationId(session.conversationId)
    setIsSidebarOpen(false)
  }

  const toggleDeletePrompt = (session: ChatSession) => {
    setSessionToDelete((current) => (current?.id === session.id ? null : session))
  }

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return

    try {
      setDeletingSessionId(sessionToDelete.id)
      await deleteConversation(sessionToDelete.id)
      setSessions((previous) => previous.filter((session) => session.id !== sessionToDelete.id))
      if (currentSession?.id === sessionToDelete.id) {
        setCurrentSession(null)
        setConversationId(null)
      }
      toast.success('Chat verwijderd')
    } catch (error: any) {
      console.error('Failed to delete session:', error)
      if (error?.status === 401) {
        await logout()
      } else {
        toast.error('Kon chat niet verwijderen')
      }
    } finally {
      setDeletingSessionId(null)
      setSessionToDelete(null)
    }
  }

  const startEditingName = (session: ChatSession) => {
    setEditingSessionId(session.id)
    setEditingName(session.name)
  }

  const cancelEditingName = () => {
    setEditingSessionId(null)
    setEditingName("")
  }

  const saveEditedName = async () => {
    if (!editingSessionId || !editingName.trim()) return

    try {
      await updateConversationTitle(editingSessionId, editingName.trim())

      setSessions((previous) =>
        previous.map((session) =>
          session.id === editingSessionId
            ? { ...session, name: editingName.trim() }
            : session
        )
      )

      if (currentSession?.id === editingSessionId) {
        setCurrentSession({ ...currentSession, name: editingName.trim() })
      }

      toast.success('Naam bijgewerkt')
    } catch (error: any) {
      console.error('Failed to update conversation name:', error)
      if (error?.status === 401) {
        await logout()
      } else {
        toast.error('Kon naam niet bijwerken')
      }
    } finally {
      setEditingSessionId(null)
      setEditingName("")
    }
  }

  const exportToText = () => {
    if (!currentSession) return
    
    const content = messages
      .map(msg => `${msg.role === 'user' ? 'Gebruiker' : 'AI Assistent'}:\n${msg.content}\n\n`)
      .join('')
    
    const fullContent = `Chat Sessie: ${currentSession.name}\nTool: ${toolName}\n\n${content}`
    
    const blob = new Blob([fullContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${toolName}_${currentSession.name}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Custom placeholder for each tool
  const getPlaceholder = () => {
    const placeholders = {
      "henry-hr": {
        title: `Hallo! Ik ben Henry HR`,
        subtitle: "Ik begeleid je stap-voor-stap door het proces van het maken van je eigen Custom GPT.",
        icon: null
      },
      "perry-prompt": {
        title: `Hallo! Ik ben Perry Prompt`,
        subtitle: "Ik help je met het optimaliseren van je AI-interacties en prompts.",
        icon: null
      },
      "corry-content": {
        title: `Hallo! Ik ben Corry Content`,
        subtitle: "Ik transformeer je ruwe teksten in platform-specifieke content die klaar is om te posten.",
        icon: null
      },
      "kenny-kennis": {
        title: `Hallo! Ik ben Kenny Kennis`,
        subtitle: "Ik transformeer ruwe informatie in AI-interpreteerbare knowledge files.",
        icon: null
      },
      "knowledge-hub": {
        title: "Hallo! Ik ben Knowledge Hub",
        subtitle: "Ik zoek in de LHT kennisbank en geef antwoorden met bronnen.",
        icon: null
      }
    }

    return placeholders[toolId as keyof typeof placeholders] || {
      title: `Hallo! Ik ben ${toolName}`,
      subtitle: "Stel me een vraag om te beginnen",
      icon: null
    }
  }

  const suggestions = SUGGESTION_PRESETS[toolId] || DEFAULT_SUGGESTIONS

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading) return
    setInput(suggestion)
    sendMessage(suggestion)
  }

  const renderSessions = () => (
    <ScrollArea className="flex-1 p-3">
      <div className="space-y-1">
        {sessions.map((session) => {
          const isActive = currentSession?.id === session.id
          const showConfirm = sessionToDelete?.id === session.id
          const isEditing = editingSessionId === session.id
          const actionButtonClasses = (showConfirm || isActive)
            ? "self-start text-lht-black/40 hover:text-lht-black transition-opacity"
            : "self-start text-lht-black/40 hover:text-lht-black transition-opacity opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"

          return (
            <div
              key={session.id}
              className={`group grid grid-cols-[1fr_auto_auto] items-start gap-2 p-2 rounded-lg ${!isEditing ? 'cursor-pointer' : ''} transition-colors ${
                isActive
                  ? "border"
                  : "bg-lht-cream"
              }`}
              style={isActive ? {
                backgroundColor: `${accentColor}4D`,
                borderColor: accentColor
              } : undefined}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = `${accentColor}1A`
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = ''
                }
              }}
              onClick={() => {
                if (isEditing) return
                void loadSession(session)
              }}
            >
              <div className="min-w-0">
                {isEditing ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-6 text-xs px-2"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          void saveEditedName()
                        } else if (e.key === 'Escape') {
                          cancelEditingName()
                        }
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="font-medium text-xs text-lht-black truncate">{session.name}</div>
                    <div className="text-xs text-lht-black/50">
                      {session.createdAt.toLocaleDateString("nl-NL")}
                    </div>
                  </>
                )}
              </div>
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="self-start text-green-600 hover:text-green-700 h-6 w-6"
                    aria-label="Opslaan"
                    title="Opslaan"
                    onClick={(event) => {
                      event.stopPropagation()
                      void saveEditedName()
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="self-start text-red-600 hover:text-red-700 h-6 w-6"
                    aria-label="Annuleren"
                    title="Annuleren"
                    onClick={(event) => {
                      event.stopPropagation()
                      cancelEditingName()
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={actionButtonClasses}
                    aria-label="Naam bewerken"
                    title="Naam bewerken"
                    onClick={(event) => {
                      event.stopPropagation()
                      startEditingName(session)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={actionButtonClasses}
                    aria-label="Verwijder chat"
                    title="Verwijder chat"
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleDeletePrompt(session)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              {showConfirm && !isEditing && (
                <div
                  className="col-span-3 mt-2 rounded-md border border-lht-black/10 bg-white p-2 text-xs text-lht-black/70 shadow-sm"
                  onClick={(event) => event.stopPropagation()}
                >
                  <p className="font-medium text-lht-black">Chat verwijderen?</p>
                  <p className="text-[11px] text-lht-black/50">Deze actie kan niet ongedaan worden gemaakt.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="lht"
                      disabled={deletingSessionId === session.id}
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleConfirmDelete()
                      }}
                    >
                      {deletingSessionId === session.id ? "Verwijderen..." : "Bevestigen"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSessionToDelete(null)
                      }}
                    >
                      Annuleren
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {sessions.length === 0 && (
          <div className="text-center text-lht-black/50 py-8">
            <p className="text-xs">Nog geen sessies</p>
            <p className="text-xs mt-1">Klik op &quot;+ Nieuw&quot;</p>
          </div>
        )}
      </div>
    </ScrollArea>
  )

  const renderSidebar = (variant: 'desktop' | 'mobile') => (
    <div className={`flex h-full flex-col bg-white ${variant === 'desktop' ? 'rounded-lg border border-lht-black/10' : ''}`}>
      <div className="p-3 border-b border-lht-black/10">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-lht-black text-sm">Geschiedenis</h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => { void createNewSession() }}
              style={{
                backgroundColor: accentColor,
                borderColor: accentColor,
                color: textColor,
              }}
              className="border transition-all duration-200 hover:shadow-md hover:opacity-80"
            >
              + Nieuw
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 text-lht-black/50 hover:text-lht-black"
              aria-label="Sluit chatgeschiedenis"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {renderSessions()}
    </div>
  )


  return (
    <>
      <div className="flex h-full flex-col gap-4 lg:flex-row">
        <div className="hidden lg:flex lg:w-72 flex-none">
          {renderSidebar('desktop')}
        </div>

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {currentSession ? (
            <>
              <div className="p-4 border border-lht-black/10 rounded-t-lg bg-white border-b-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="lg:hidden text-lht-black/60 hover:text-lht-black bg-white"
                      aria-label="Open chatgeschiedenis"
                      onClick={() => setIsSidebarOpen(true)}
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                    <div>
                      <h3 className="font-semibold text-lht-black leading-tight">{currentSession.name}</h3>
                      <p className="text-sm text-lht-black/50">{toolName} AI Assistent</p>
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                    <Button size="sm" variant="outline" className="w-full sm:w-auto bg-white hover:bg-lht-cream" onClick={exportToText}>
                      Export TXT
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden bg-white rounded-b-lg border border-lht-black/10">
                <ChatContainer
                  messages={messages}
                  input={input}
                  setInput={setInput}
                  sendMessage={sendMessage}
                  isLoading={isLoading}
                  documents={documents}
                  onFileSelect={handleFileSelect}
                  onRemoveDocument={removeDocument}
                  onFilesDropped={handleFilesDropped}
                  uploadError={uploadError}
                  placeholder={getPlaceholder()}
                  enableVoice={true}
                  enableOCR={true}
                  suggestions={suggestions}
                  onSuggestionClick={handleSuggestionClick}
                  accentColor={accentColor}
                  textColor={textColor}
                  onApprovePermission={approvePermission}
                  onDenyPermission={denyPermission}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center space-y-4 text-center text-lht-black/50">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}4D` }}
              >
                <div className="w-6 h-6 rounded" style={{ backgroundColor: accentColor }}></div>
              </div>
              <div>
                <p className="text-lg font-medium text-lht-black">Selecteer een chat of start een nieuwe</p>
                <p className="text-sm">Kies een bestaande chat sessie of maak een nieuwe aan</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Button
                  onClick={() => { void createNewSession() }}
                  style={{
                    backgroundColor: accentColor,
                    borderColor: accentColor,
                    color: textColor,
                  }}
                  className="border transition-all duration-200 hover:shadow-md hover:opacity-80"
                >
                  Start Nieuwe Chat
                </Button>
                {sessions.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="lg:hidden"
                    onClick={() => setIsSidebarOpen(true)}
                  >
                    <Menu className="mr-2 h-4 w-4" />
                    Bekijk geschiedenis
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permission requests are now shown inline in the chat timeline */}

      {isSidebarOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85%] overflow-hidden rounded-r-lg bg-white shadow-xl">
            {renderSidebar('mobile')}
          </div>
        </div>
      )}
    </>
  )
}
