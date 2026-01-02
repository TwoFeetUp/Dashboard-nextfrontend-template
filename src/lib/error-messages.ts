/**
 * Structured error messages with Dutch translations.
 * All user-facing error messages should go through this module.
 */

export interface ErrorMessage {
  nl: string
  en: string
  action?: string
}

export const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  // Authentication errors
  UNAUTHORIZED: {
    nl: 'Uw sessie is verlopen.',
    en: 'Your session has expired.',
    action: 'Log opnieuw in om door te gaan.'
  },

  // Network errors
  NETWORK_ERROR: {
    nl: 'Kan geen verbinding maken met de server.',
    en: 'Cannot connect to server.',
    action: 'Controleer uw internetverbinding en probeer opnieuw.'
  },
  TIMEOUT: {
    nl: 'Het verzoek duurde te lang.',
    en: 'The request took too long.',
    action: 'Probeer een korter bericht of probeer het later opnieuw.'
  },

  // Service errors
  AGENT_NOT_FOUND: {
    nl: 'De gevraagde assistent is niet beschikbaar.',
    en: 'The requested assistant is not available.',
    action: 'Selecteer een andere assistent.'
  },
  SERVICE_UNAVAILABLE: {
    nl: 'De service is tijdelijk niet beschikbaar.',
    en: 'The service is temporarily unavailable.',
    action: 'Probeer het over enkele minuten opnieuw.'
  },

  // Database errors
  POCKETBASE_ERROR: {
    nl: 'Er is een probleem met het opslaan van berichten.',
    en: 'There was a problem saving messages.',
    action: 'Controleer uw internetverbinding.'
  },

  // AI/Anthropic errors
  RATE_LIMIT: {
    nl: 'Te veel verzoeken. Even geduld.',
    en: 'Too many requests. Please wait.',
    action: 'Wacht een moment en probeer opnieuw.'
  },
  API_ERROR: {
    nl: 'De AI-service is tijdelijk niet beschikbaar.',
    en: 'The AI service is temporarily unavailable.',
    action: 'Probeer het over enkele minuten opnieuw.'
  },
  OVERLOADED: {
    nl: 'De AI-service is overbelast.',
    en: 'The AI service is overloaded.',
    action: 'Wacht een moment en probeer opnieuw.'
  },

  // Tool/MCP errors
  MCP_ERROR: {
    nl: 'Een tool is niet beschikbaar.',
    en: 'A tool is unavailable.',
    action: 'Probeer het later opnieuw.'
  },

  // Generic errors
  INTERNAL_ERROR: {
    nl: 'Er is een onverwachte fout opgetreden.',
    en: 'An unexpected error occurred.',
    action: 'Probeer het later opnieuw.'
  },
  BACKEND_ERROR: {
    nl: 'Er is een serverfout opgetreden.',
    en: 'A server error occurred.',
    action: 'Probeer het later opnieuw.'
  },
  EVENT_OVERFLOW: {
    nl: 'Te veel berichten ontvangen.',
    en: 'Too many messages received.',
    action: 'Start een nieuw gesprek.'
  },
  CLIENT_DISCONNECTED: {
    nl: 'Verbinding verbroken.',
    en: 'Connection lost.',
    action: 'Ververs de pagina om opnieuw te verbinden.'
  }
}

/**
 * Get error message by code, with fallback to generic error.
 */
export function getErrorMessage(code: string): ErrorMessage {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.INTERNAL_ERROR
}

/**
 * Format error for display (Dutch primary, English in details).
 */
export function formatError(code: string): { title: string; message: string; action?: string } {
  const error = getErrorMessage(code)
  return {
    title: 'Er is iets misgegaan',
    message: error.nl,
    action: error.action
  }
}
