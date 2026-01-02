'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <h2 className="text-xl font-semibold text-red-800 mb-4">
        Er is iets misgegaan
      </h2>
      <p className="text-gray-600 mb-4">
        We werken eraan om dit op te lossen.
      </p>
      <details className="mb-4 text-sm max-w-md">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
          Technische details
        </summary>
        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
          {error.message}
        </pre>
        {error.digest && (
          <code className="text-xs text-gray-400 block mt-1">
            Referentie: {error.digest}
          </code>
        )}
      </details>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
      >
        Opnieuw proberen
      </button>
    </div>
  )
}
