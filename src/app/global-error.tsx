'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-xl font-semibold text-red-800 mb-4">
            Er is een kritieke fout opgetreden
          </h2>
          <p className="text-gray-600 mb-4">
            De applicatie kon niet worden geladen.
          </p>
          <details className="mb-4 text-sm text-left">
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
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Opnieuw laden
          </button>
        </div>
      </body>
    </html>
  )
}
