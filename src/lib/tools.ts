export interface Tool {
  name: string
  description: string
  parameters?: Record<string, any>
}

export interface ToolCall {
  id: string
  toolName: string
  arguments?: Record<string, any>
  status: 'calling' | 'completed' | 'error'
  result?: any
}

// Define available tools
export const availableTools: Tool[] = [
  {
    name: 'getCurrentTime',
    description: 'Get the current date and time',
    parameters: {
      timezone: {
        type: 'string',
        description: 'Timezone (e.g., "Europe/Amsterdam")',
        required: false
      }
    }
  }
]

// Tool implementations
export async function executeTools(toolCalls: any[]): Promise<ToolCall[]> {
  const results: ToolCall[] = []
  
  for (const call of toolCalls) {
    const toolCall: ToolCall = {
      id: call.id,
      toolName: call.function.name,
      arguments: JSON.parse(call.function.arguments || '{}'),
      status: 'calling' as const,
      result: null
    }
    
    try {
      switch (call.function.name) {
        case 'getCurrentTime':
          const timezone = toolCall.arguments?.timezone || 'Europe/Amsterdam'
          const now = new Date()
          const formatter = new Intl.DateTimeFormat('nl-NL', {
            timeZone: timezone,
            dateStyle: 'full',
            timeStyle: 'medium'
          })
          toolCall.result = {
            formatted: formatter.format(now),
            timestamp: now.toISOString(),
            timezone
          }
          toolCall.status = 'completed'
          break
          
        default:
          toolCall.result = { error: `Unknown tool: ${call.function.name}` }
          toolCall.status = 'error'
      }
    } catch (error: any) {
      toolCall.result = { error: error.message }
      toolCall.status = 'error'
    }
    
    results.push(toolCall)
  }
  
  return results
}

// Format tool for OpenAI
export function getToolDefinitions() {
  return [
    {
      type: 'function' as const,
      function: {
        name: 'getCurrentTime',
        description: 'Get the current date and time in a specific timezone',
        parameters: {
          type: 'object',
          properties: {
            timezone: {
              type: 'string',
              description: 'The timezone to get the time for (e.g., "Europe/Amsterdam", "America/New_York")',
              default: 'Europe/Amsterdam'
            }
          }
        }
      }
    }
  ]
}