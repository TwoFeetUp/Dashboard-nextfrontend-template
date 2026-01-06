'use client'

import { memo, useMemo } from 'react'
import { MarkdownRenderer } from './markdown-renderer'
import { ToolCallDisplay } from './tool-call-display'
import { ThinkingIndicator } from './thinking-indicator'
import type { Message, MessageEvent, ResearchOutput } from '../lib/types'
import type { ToolCall } from '../lib/tools'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
  isLatest?: boolean
}

const ChatMessageComponent = ({ message, isStreaming = false }: ChatMessageProps) => {
  const streamingContent = useMemo(() => {
    if (!message.content) return ''
    return isStreaming ? `${message.content}▊` : message.content
  }, [message.content, isStreaming])

  // User messages stay in a bubble on the right
  if (message.role === 'user') {
    return (
      <div className="flex justify-end user-message">
        <div className="px-3 py-2 rounded-xl max-w-[75%] bg-gradient-to-br from-tfu-purple to-tfu-blue text-white">
          <p className="text-sm leading-relaxed font-light">{message.content}</p>
        </div>
      </div>
    )
  }

  // Assistant messages - no bubble, left-aligned, more width
  return (
    <div className="w-full max-w-full overflow-hidden px-2 sm:px-4 md:px-6 lg:px-8 message-content">
      <div className="text-sm text-tfu-black max-w-full font-light">
        {!message.content && !message.toolCalls && !message.timeline && isStreaming ? (
          <div className="flex items-center gap-2 py-2">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="text-gray-400 text-xs ml-2">AI is thinking</span>
          </div>
        ) : message.timeline && message.timeline.length > 0 ? (
          <div className="space-y-3">
            {/* Display events in chronological order from timeline */}
            {message.timeline.map((event, index) => {
              if (event.type === 'thinking') {
                return (
                  <ThinkingIndicator
                    key={`thinking-${index}`}
                    reasoning={[event.content]}
                    isThinking={event.isActive || false}
                  />
                )
              } else if (event.type === 'tool_call') {
                return (
                  <ToolCallDisplay key={`tool-${index}`} toolCall={event.toolCall as ToolCall} />
                )
              } else if (event.type === 'text') {
                return (
                  <div key={`text-${index}`} className="leading-relaxed prose prose-sm max-w-none chat-message-content">
                    <MarkdownRenderer content={event.content} />
                  </div>
                )
              }
              return null
            })}

            {/* Render research output HTML content */}
            {message.researchOutput?.html_content && (
              <div className="research-output mt-4 p-4 border border-gray-200 rounded-lg bg-white">
                <div
                  className="research-html-content"
                  dangerouslySetInnerHTML={{ __html: message.researchOutput.html_content }}
                />
                {message.researchOutput.sources && message.researchOutput.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Bronnen:</p>
                    <ul className="text-xs text-gray-400 space-y-0.5">
                      {message.researchOutput.sources.map((source, idx) => (
                        <li key={idx}>{source}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Fallback to old grouped display */}
            {(message.reasoning || message.isThinking) && (
              <ThinkingIndicator
                reasoning={message.reasoning || []}
                isThinking={message.isThinking || false}
              />
            )}

            {message.toolCalls && message.toolCalls.map(toolCall => (
              <ToolCallDisplay key={toolCall.id} toolCall={toolCall as ToolCall} />
            ))}

            {message.content && (
              <div className="leading-relaxed prose prose-sm max-w-none chat-message-content">
                <MarkdownRenderer content={streamingContent} />
              </div>
            )}

            {/* Render research output HTML content (fallback) */}
            {message.researchOutput?.html_content && (
              <div className="research-output mt-4 p-4 border border-gray-200 rounded-lg bg-white">
                <div
                  className="research-html-content"
                  dangerouslySetInnerHTML={{ __html: message.researchOutput.html_content }}
                />
                {message.researchOutput.sources && message.researchOutput.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Bronnen:</p>
                    <ul className="text-xs text-gray-400 space-y-0.5">
                      {message.researchOutput.sources.map((source, idx) => (
                        <li key={idx}>{source}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(ChatMessageComponent, (prevProps, nextProps) => {
  return (
    prevProps.message === nextProps.message &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.isLatest === nextProps.isLatest
  )
})
