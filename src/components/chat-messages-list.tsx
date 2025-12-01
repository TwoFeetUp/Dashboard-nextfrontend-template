"use client"

import { memo } from "react"
import { MemoizedMarkdown } from "@/components/memoized-markdown"

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatMessagesListProps {
  messages: ChatMessage[]
  isLoading: boolean
}

export const ChatMessagesList = memo(
  ({ messages, isLoading }: ChatMessagesListProps) => {
    return (
      <>
        {messages.map((message) => (
          <div key={message.id} className="group">
            {message.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-xl bg-[#f5b781] text-black p-3 rounded-lg">
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
      </>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if messages array reference changed or loading state changed
    return prevProps.messages === nextProps.messages && prevProps.isLoading === nextProps.isLoading
  }
)

ChatMessagesList.displayName = 'ChatMessagesList'
