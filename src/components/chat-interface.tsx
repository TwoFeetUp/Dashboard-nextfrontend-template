"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/hooks/use-auth"
import pb from "@/lib/pocketbase"
import { MemoizedMarkdown } from "@/components/memoized-markdown"
import { agentConfig } from "@/lib/agent-config"

interface ChatSession {
  id: string
  name: string
  createdAt: Date
  messageCount: number
  conversationId?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatInterfaceProps {
  toolName: string
  toolId: string
}

export function ChatInterface({ toolName, toolId }: ChatInterfaceProps) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [localInput, setLocalInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const loadSessions = useCallback(async () => {
    const authUserId = pb.authStore.model?.id
    if (!authUserId) return
    
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
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }, [toolId])

  // Load sessions from PocketBase on mount or tool change
  useEffect(() => {
    if (user) {
      loadSessions()
    }
  }, [user, toolId, loadSessions])

  // Auto-load most recent session when sessions are loaded and no session is selected
  useEffect(() => {
    if (sessions.length > 0 && !currentSession && user) {
      loadSession(sessions[0])
    }
  }, [sessions, currentSession, user, loadSession])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const createNewSession = async (): Promise<string | null> => {
    if (!user) {
      console.error('No user found for creating session')
      return null
    }

    try {
      // Get the current authenticated user ID from PocketBase
      const authUserId = pb.authStore.model?.id

      if (!authUserId) {
        console.error('No authenticated user ID found')
        return null
      }

      console.log('Creating conversation with userId:', authUserId)

      const conversation = await pb.collection('conversations').create({
        title: `${toolName} - ${new Date().toLocaleDateString('nl-NL')}`,
        userId: authUserId,  // Use the auth user ID directly from PocketBase
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

      setSessions([newSession, ...sessions])
      setCurrentSession(newSession)
      setConversationId(conversation.id)
      setMessages([])

      // Return the conversation ID immediately so caller can use it
      return conversation.id
    } catch (error) {
      console.error('Failed to create session:', error)
      return null
    }
  }

  const loadSession = useCallback(async (session: ChatSession) => {
    if (!session.conversationId || !user) return

    setCurrentSession(session)
    setConversationId(session.conversationId)

    try {
      const messages = await pb.collection('messages').getList(1, 100, {
        filter: `conversationId = "${session.conversationId}"`,
        sort: 'created', // Sort by creation time to preserve message order
      })

      const loadedMessages: ChatMessage[] = messages.items.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))

      setMessages(loadedMessages)
    } catch (error) {
      console.error('Failed to load messages:', error)
      setMessages([]) // Clear messages on error to show empty state
    }
  }, [user])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!localInput?.trim() || isLoading) return

    // Create session if none exists and get the conversation ID
    let activeConversationId = conversationId
    if (!currentSession && user) {
      const newConvoId = await createNewSession()
      if (newConvoId) {
        activeConversationId = newConvoId
      }
    }

    // If still no conversationId after creating session, something is wrong
    if (!activeConversationId) {
      console.error('No conversation ID available')
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: localInput
    }

    // Add message to UI immediately
    setMessages(prev => [...prev, userMessage])
    setLocalInput('')
    setIsLoading(true)

    // Save user message to PocketBase - NOW WITH THE CORRECT conversationId!
    const authUserId = pb.authStore.model?.id
    if (activeConversationId && authUserId) {
      try {
        await pb.collection('messages').create({
          conversationId: activeConversationId,
          role: 'user',
          content: userMessage.content,
          userId: authUserId
        })
        console.log('User message saved to PocketBase:', userMessage.content.substring(0, 50))
      } catch (error) {
        console.error('Failed to save user message:', error)
      }
    }
    
    try {
      // Call the API - use agent backend or direct Mistral based on config
      const chatEndpoint = agentConfig.getChatEndpoint()
      console.log(`Using chat endpoint: ${chatEndpoint} (Agent backend: ${agentConfig.useAgentBackend()})`)

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          assistantType: toolId,
          conversation_id: activeConversationId  // Use activeConversationId
        })
      })
      
      if (!response.ok) throw new Error('Failed to get response')
      
      // Handle the streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''
      
      if (reader) {
        // Add placeholder for assistant message
        const assistantId = (Date.now() + 1).toString()
        setMessages(prev => [...prev, {
          id: assistantId,
          role: 'assistant',
          content: ''
        }])
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          console.log('Received chunk:', chunk) // Debug log
          
          // The response comes in different formats, let's handle them
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (!line.trim()) continue
            
            // Handle different response formats
            if (line.startsWith('0:')) {
              // Format: 0:"content"
              const content = line.slice(2).trim()
              if (content && content !== '"\\n"') {
                try {
                  const parsed = JSON.parse(content)
                  if (parsed) {
                    assistantMessage += parsed
                  }
                } catch (e) {
                  // Try without parsing
                  assistantMessage += content.replace(/^"|"$/g, '')
                }
              }
            } else if (line.startsWith('data: ')) {
              // Format: data: content
              const content = line.slice(6).trim()
              if (content && content !== '[DONE]') {
                try {
                  const parsed = JSON.parse(content)
                  // Handle Vercel AI SDK streaming format
                  if (parsed.type === 'text-delta' && parsed.delta) {
                    assistantMessage += parsed.delta
                  } else if (parsed.choices?.[0]?.delta?.content) {
                    assistantMessage += parsed.choices[0].delta.content
                  } else if (parsed.content) {
                    assistantMessage += parsed.content
                  } else if (typeof parsed === 'string') {
                    assistantMessage += parsed
                  }
                } catch (e) {
                  // Try without parsing
                  if (!content.includes('type":"start"') && 
                      !content.includes('type":"finish') && 
                      !content.includes('type":"error"')) {
                    assistantMessage += content
                  }
                }
              }
            } else {
              // Try to parse as JSON directly
              try {
                const parsed = JSON.parse(line)
                if (parsed.choices?.[0]?.delta?.content) {
                  assistantMessage += parsed.choices[0].delta.content
                } else if (parsed.content) {
                  assistantMessage += parsed.content
                } else if (typeof parsed === 'string') {
                  assistantMessage += parsed
                }
              } catch (e) {
                // If it's just text, add it
                if (line && !line.startsWith('{') && !line.startsWith('[')) {
                  // Skip metadata lines
                  if (!line.includes('event:') && !line.includes('id:')) {
                    assistantMessage += line
                  }
                }
              }
            }
            
            // Update the message if we have content
            if (assistantMessage) {
              setMessages(prev => prev.map(msg => 
                msg.id === assistantId 
                  ? { ...msg, content: assistantMessage }
                  : msg
              ))
            }
          }
        }
      }
      
      // Save assistant message to PocketBase - use activeConversationId
      if (activeConversationId && authUserId && assistantMessage) {
        try {
          await pb.collection('messages').create({
            conversationId: activeConversationId,
            role: 'assistant',
            content: assistantMessage,
            userId: authUserId
          })
          
          // Update conversation's last message
          await pb.collection('conversations').update(conversationId, {
            lastMessage: assistantMessage.substring(0, 100)
          })
        } catch (error) {
          console.error('Failed to save assistant message:', error)
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Er is een fout opgetreden. Probeer het opnieuw.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const exportToText = () => {
    if (!currentSession) return
    
    const content = messages
      .map(msg => `${msg.role === 'user' ? 'Gebruiker' : 'AI Assistent'}:\n${msg.content}\n\n`)
      .join('')
    
    const blob = new Blob(
      [`Chat Sessie: ${currentSession.name}\nTool: ${toolName}\n\n${content}`],
      { type: 'text/plain' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${toolName}_${currentSession.name}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Sidebar with chat sessions - smaller and moved left */}
      <div className="w-64 bg-white rounded-lg border border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Geschiedenis</h3>
            <Button size="sm" variant="default" onClick={createNewSession} className="bg-[#ff7200] hover:bg-[#e56700] text-white border-transparent">
              + Nieuw
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-2 rounded-lg cursor-pointer transition-colors ${
                  currentSession?.id === session.id
                    ? "bg-[#ffe3d1] border border-[#ffa366]"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
                onClick={() => loadSession(session)}
              >
                <div className="font-medium text-xs text-gray-900 truncate">{session.name}</div>
                <div className="text-xs text-gray-500">
                  {session.createdAt.toLocaleDateString("nl-NL")}
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p className="text-xs">Nog geen sessies</p>
                <p className="text-xs mt-1">Klik op &quot;+ Nieuw&quot;</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area - more space */}
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

            {/* Messages */}
            <ScrollArea className="flex-1 px-6 py-4" ref={scrollAreaRef}>
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <div className="w-12 h-12 bg-[#ffe3d1] rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="w-6 h-6 bg-[#ff7200] rounded"></div>
                    </div>
                    <p className="text-lg font-medium">Hallo! Ik ben je {toolName} AI Assistent</p>
                    <p className="text-sm">Stel me een vraag om te beginnen</p>
                  </div>
                )}
                {messages.map((message) => (
                  <div key={message.id} className="group">
                    {message.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-xl bg-[#ff7200] text-white p-3 rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
                            <div className="w-4 h-4 bg-gray-600 rounded"></div>
                          </div>
                          <span className="text-xs font-medium text-gray-600">AI Assistent</span>
                        </div>
                        <div className="pl-9">
                          <div className="prose prose-sm max-w-none text-gray-900">
                            <MemoizedMarkdown 
                              id={message.id} 
                              content={message.content} 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.content === '' && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input area */}
            <form onSubmit={handleFormSubmit} className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <Input
                  value={localInput}
                  onChange={(e) => setLocalInput(e.target.value)}
                  placeholder={`Stel een vraag aan je ${toolName} assistent...`}
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={!localInput || !localInput.trim() || isLoading}
                  className="bg-[#ff7200] hover:bg-[#e56700]"
                >
                  Verstuur
                </Button>
              </div>
            </form>
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
