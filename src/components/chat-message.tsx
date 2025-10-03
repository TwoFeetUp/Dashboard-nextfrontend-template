'use client'

import { MarkdownRenderer } from './markdown-renderer'
import { ToolCallDisplay } from './tool-call-display'
import type { Message } from '../lib/types'
import type { ToolCall } from '../lib/tools'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
  isLatest?: boolean
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  // User messages stay in a bubble on the right
  if (message.role === 'user') {
    return (
      <div className="flex justify-end user-message">
        <div className="px-3 py-2 rounded-lg shadow-sm border max-w-[75%] bg-[#ff7200] text-white border-[#ffa366]">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  // Assistant messages - no bubble, left-aligned, more width
  return (
    <div className="w-full max-w-full overflow-hidden px-2 sm:px-4 md:px-6 lg:px-8 message-content">
      <div className="text-sm text-gray-800 max-w-full">
        {!message.content && !message.toolCalls && isStreaming ? (
          <div className="flex items-center gap-2 py-2">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="text-gray-400 text-xs ml-2">AI is thinking</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Display tool calls if present */}
            {message.toolCalls && message.toolCalls.map(toolCall => (
              <ToolCallDisplay key={toolCall.id} toolCall={toolCall as ToolCall} />
            ))}
            
            {/* Display message content */}
            {message.content && (
              <div className="leading-relaxed prose prose-sm max-w-none chat-message-content">
                <MarkdownRenderer content={message.content + (isStreaming ? '▊' : '')} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}