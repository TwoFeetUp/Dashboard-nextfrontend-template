/**
 * Debug logging utility for LHT Dashboard
 * Only logs when NEXT_PUBLIC_DEBUG_MODE=true
 *
 * Usage:
 *   import { debug } from '@/lib/debug'
 *   debug.log('User action', { userId: 123 })
 *   debug.error('Failed to save', error)
 */

const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true'

export const debug = {
  log: (...args: any[]) => {
    if (DEBUG_MODE) console.log('[DEBUG]', ...args)
  },

  info: (...args: any[]) => {
    if (DEBUG_MODE) console.info('[INFO]', ...args)
  },

  warn: (...args: any[]) => {
    if (DEBUG_MODE) console.warn('[WARN]', ...args)
  },

  error: (...args: any[]) => {
    // Always log errors, regardless of DEBUG_MODE
    console.error('[ERROR]', ...args)
  },

  group: (label: string) => {
    if (DEBUG_MODE) console.group(`[DEBUG] ${label}`)
  },

  groupEnd: () => {
    if (DEBUG_MODE) console.groupEnd()
  },

  table: (data: any) => {
    if (DEBUG_MODE) console.table(data)
  },

  time: (label: string) => {
    if (DEBUG_MODE) console.time(`[DEBUG] ${label}`)
  },

  timeEnd: (label: string) => {
    if (DEBUG_MODE) console.timeEnd(`[DEBUG] ${label}`)
  }
}

// Export DEBUG_MODE for conditional rendering
export const isDebugMode = DEBUG_MODE
