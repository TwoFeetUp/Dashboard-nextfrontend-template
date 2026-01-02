'use client'

import { getErrorMessage } from '@/lib/error-messages'

interface ErrorDisplayProps {
  /** Error code from backend or 'UNKNOWN' */
  errorCode?: string
  /** Override title (default: "Er is iets misgegaan") */
  title?: string
  /** Override message (uses errorCode lookup if not provided) */
  message?: string
  /** Technical details to show in expandable section */
  technicalDetails?: string
  /** Reference ID for support */
  referenceId?: string
  /** Callback for retry button */
  onRetry?: () => void
  /** Custom retry button text */
  retryText?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Reusable error display component with Dutch messages and expandable technical details.
 */
export function ErrorDisplay({
  errorCode = 'INTERNAL_ERROR',
  title = 'Er is iets misgegaan',
  message,
  technicalDetails,
  referenceId,
  onRetry,
  retryText = 'Opnieuw proberen',
  size = 'md'
}: ErrorDisplayProps) {
  const errorInfo = getErrorMessage(errorCode)
  const displayMessage = message || errorInfo.nl

  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4',
    lg: 'p-6 text-lg'
  }

  const titleClasses = {
    sm: 'text-sm font-medium',
    md: 'text-base font-semibold',
    lg: 'text-xl font-semibold'
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg ${sizeClasses[size]}`}>
      <h3 className={`text-red-800 ${titleClasses[size]}`}>{title}</h3>
      <p className="text-red-700 mt-2">{displayMessage}</p>

      {errorInfo.action && (
        <p className="text-red-600 mt-2 text-sm">{errorInfo.action}</p>
      )}

      {technicalDetails && (
        <details className="mt-3">
          <summary className="text-sm text-red-600 cursor-pointer hover:text-red-800">
            Technische details
          </summary>
          <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-32">
            {technicalDetails}
          </pre>
        </details>
      )}

      {referenceId && (
        <p className="text-xs text-red-500 mt-2">Referentie: {referenceId}</p>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
        >
          {retryText}
        </button>
      )}
    </div>
  )
}

/**
 * Inline error message for forms and inputs.
 */
export function InlineError({
  message,
  className = ''
}: {
  message: string
  className?: string
}) {
  return (
    <p className={`text-sm text-red-600 mt-1 ${className}`}>
      {message}
    </p>
  )
}

/**
 * Toast-style error notification.
 */
export function ErrorToast({
  message,
  onDismiss,
  autoDismiss = 5000
}: {
  message: string
  onDismiss?: () => void
  autoDismiss?: number | false
}) {
  if (autoDismiss && onDismiss) {
    setTimeout(onDismiss, autoDismiss)
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-white/80 hover:text-white"
          aria-label="Sluiten"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
