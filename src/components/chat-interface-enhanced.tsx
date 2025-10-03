"use client"

import { useState, useEffect, useCallback } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useChatOCREnhanced } from "@/hooks/use-chat-ocr-enhanced"
import ChatContainer from "./chat-container"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/hooks/use-auth"
import { deleteConversation } from "@/lib/conversation"
import pb from "@/lib/pocketbase"

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
}

const SUGGESTION_PRESETS: Record<string, string[]> = {
  "contract-clearance": [
    "Kun je deze arbeidsovereenkomst controleren op risico's voor mijn organisatie?",
    "Dit zakelijke contract voelt scheef; welke risico's zie je?",
    "Ik wil een arbeidsovereenkomst invullen vanuit ons template, kun je dat doen?"
  ],
  "event-planner": [
    "Ik organiseer een bedrijfscongres op 12 oktober, kun je een draaiboek maken?",
    "Kun je een draaiboek maken voor een publieksevenement met 5.000 bezoekers?",
    "Dit is een interne borrel voor 80 mensen; welke info heb je nodig om te starten?"
  ],
  "event-contract-assistant": [
    "Controleer dit publieksevenement-contract op vergunning- en geluidsclausules.",
    "Toets deze arbeidsovereenkomst op minimumloon, ketenregeling en proeftijd.",
    "Analyseer deze samenwerkingsovereenkomst op risico's en onderhandelingskansen."
  ],
  "marketing-communicatie": [
    "Schrijf een nieuwsbrief voor fans over Open Monumentendag.",
    "Maak een contentkalender voor volgende maand op basis van de evenementenagenda.",
    "Hier zijn onze social stats uit Q2; wat valt je op in het dashboard?"
  ],
}

const DEFAULT_SUGGESTIONS = [
  "Met welke eerste stap kan ik het beste beginnen?",
  "Welke informatie heb je van mij nodig om te starten?"
]

export function ChatInterfaceEnhanced({ toolName, toolId }: ChatInterfaceEnhancedProps) {
  const { user, logout } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

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
    removeDocument
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
      const records = await pb.collection('conversations').getList(1, 50, {
        filter: `userId = "${authUserId}" && assistantType = "${toolId}"`,
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
      if (error?.status === 401) {
        await logout()
      }
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
      "contract-clearance": {
        title: `Hallo! Ik ben je Contract Clearance AI Assistent`,
        subtitle: "Ik help je met contractbeheer en -controle. Upload een contract of stel een vraag!",
        icon: null
      },
      "event-planner": {
        title: `Hallo! Ik ben je Event Planner AI Assistent`,
        subtitle: "Ik help je met het plannen en organiseren van evenementen.",
        icon: null
      },
      "event-contract-assistant": {
        title: `Hallo! Ik ben je Event Contract AI Assistent`,
        subtitle: "Ik help je met het opstellen van event contracten.",
        icon: null
      },
      "marketing-communicatie": {
        title: `Hallo! Ik ben je Marketing & Communicatie AI Assistent`,
        subtitle: "Ik help je met marketing en communicatie strategieën.",
        icon: null
      }
    }
    
    return placeholders[toolId as keyof typeof placeholders] || {
      title: `Hallo! Ik ben je ${toolName} AI Assistent`,
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


  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar with chat sessions */}
      <div className="w-64 bg-white rounded-lg border border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Geschiedenis</h3>
            <Button
              size="sm"
              variant="default"
              className="bg-[#ff7200] hover:bg-[#e56700] text-white border-transparent"
              onClick={createNewSession}
            >
              + Nieuw
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-1">
            {sessions.map((session) => {
              const isActive = currentSession?.id === session.id
              const showConfirm = sessionToDelete?.id === session.id
              const deleteButtonClasses = (showConfirm || isActive)
                ? "self-start text-gray-400 hover:text-[#ff7200] transition-opacity"
                : "self-start text-gray-400 hover:text-[#ff7200] transition-opacity opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"

              return (
                <div
                  key={session.id}
                  className={`group grid grid-cols-[1fr_auto] items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    isActive
                      ? "bg-[#ffe3d1] border border-[#ffa366]"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                  onClick={() => loadSession(session)}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-xs text-gray-900 truncate">{session.name}</div>
                    <div className="text-xs text-gray-500">
                      {session.createdAt.toLocaleDateString("nl-NL")}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={deleteButtonClasses}
                    aria-label="Verwijder chat"
                    title="Verwijder chat"
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleDeletePrompt(session)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {showConfirm && (
                    <div
                      className="col-span-2 mt-2 rounded-md border border-gray-200 bg-white p-2 text-xs text-gray-700 shadow-sm"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <p className="font-medium text-gray-800">Chat verwijderen?</p>
                      <p className="text-[11px] text-gray-500">Deze actie kan niet ongedaan worden gemaakt.</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-[#ff7200] hover:bg-[#e56700] text-white border-transparent"
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
              <div className="text-center text-gray-500 py-8">
                <p className="text-xs">Nog geen sessies</p>
                <p className="text-xs mt-1">Klik op &quot;+ Nieuw&quot;</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col">
        {currentSession ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{currentSession.name}</h3>
                <p className="text-sm text-gray-500">{toolName} AI Assistent</p>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={exportToText}>
                  Export TXT
                </Button>
              </div>
            </div>

            {/* Chat Component */}
            <div className="flex-1 overflow-hidden">
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
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 bg-gray-400 rounded"></div>
              </div>
              <p className="text-lg font-medium">Selecteer een chat of start een nieuwe</p>
              <p className="text-sm">Kies een bestaande chat sessie of maak een nieuwe aan</p>
              <Button onClick={createNewSession} variant="default" className="mt-4 bg-[#ff7200] hover:bg-[#e56700] text-white border-transparent">
                Start Nieuwe Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
