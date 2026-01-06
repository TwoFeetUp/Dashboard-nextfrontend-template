export interface ToolCall {
  id: string
  toolName: string
  args?: any
  result?: any
  status: 'calling' | 'completed' | 'error'
}

export type MessageEvent =
  | { type: 'thinking'; content: string; isActive?: boolean }
  | { type: 'tool_call'; toolCall: ToolCall }
  | { type: 'text'; content: string }

export interface ResearchOutput {
  html_content: string
  summary: string
  sources: string[]
  output_type: 'chart' | 'structured_html'
  methodology?: {
    tools_used: Array<{
      tool_name: string
      domain: string
      results_count: number
      success: boolean
      error_message?: string
    }>
    total_sources_checked: number
    analysis_steps: string[]
    time_taken_seconds: number
  }
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  reasoning?: string[]
  isThinking?: boolean
  timeline?: MessageEvent[]  // Chronological order of events
  researchOutput?: ResearchOutput  // For Deep Research agent HTML output
  createdAt?: Date
}

export interface DocumentAttachment {
  id: string
  name: string
  size: number
  type: string
  status: 'uploading' | 'processing' | 'ready' | 'error'
  uploadedAt: Date
  processedAt?: Date
  content?: string // Base64 content
  ocrText?: string
  characterCount?: number
  pageCount?: number
  error?: string
  persistedId?: string   // PocketBase record ID
  fileUrl?: string       // PocketBase file URL
}