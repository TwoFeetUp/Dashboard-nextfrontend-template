'use client'

import { memo, useMemo } from 'react'
import { MarkdownRenderer } from './markdown-renderer'
import { ToolCallDisplay } from './tool-call-display'
import { ThinkingIndicator } from './thinking-indicator'
import { PermissionMessage } from './permission-message'
import type { Message, MessageEvent } from '../lib/types'
import type { ToolCall } from '../lib/tools'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
  isLatest?: boolean
  accentColor?: string
  textColor?: string
  onApprovePermission?: (permissionId: string) => Promise<void>
  onDenyPermission?: (permissionId: string) => Promise<void>
}

const ChatMessageComponent = ({
  message,
  isStreaming = false,
  accentColor = '#a1d980',
  textColor = '#1a1a1a',
  onApprovePermission,
  onDenyPermission
}: ChatMessageProps) => {
  const streamingContent = useMemo(() => {
    if (!message.content) return ''
    return isStreaming ? `${message.content}▊` : message.content
  }, [message.content, isStreaming])

  // User messages stay in a bubble on the right
  if (message.role === 'user') {
    return (
      <div className="flex justify-end user-message">
        <div
          className="px-3 py-2 rounded-lg shadow-sm border max-w-[75%]"
          style={{ backgroundColor: accentColor, borderColor: accentColor, color: textColor }}
        >
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  // Assistant messages - no bubble, left-aligned, more width
  return (
    <div className="w-full max-w-full overflow-hidden px-2 sm:px-4 md:px-6 lg:px-8 message-content">
      <div className="text-sm text-gray-800 max-w-full">
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
              } else if (event.type === 'permission_request') {
                return (
                  <PermissionMessage
                    key={`permission-${event.permission.permissionId}`}
                    permission={event.permission}
                    status={event.status}
                    onApprove={onApprovePermission}
                    onDeny={onDenyPermission}
                  />
                )
              }
              return null
            })}
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
    prevProps.isLatest === nextProps.isLatest &&
    prevProps.accentColor === nextProps.accentColor &&
    prevProps.textColor === nextProps.textColor &&
    prevProps.onApprovePermission === nextProps.onApprovePermission &&
    prevProps.onDenyPermission === nextProps.onDenyPermission
  )
})
