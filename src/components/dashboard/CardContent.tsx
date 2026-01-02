'use client'

import { useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'

interface CardContentProps {
  htmlContent: string
  cardId: string
}

export function CardContent({ htmlContent, cardId }: CardContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !htmlContent) return

    // Configure DOMPurify to allow Chart.js scripts from CDN
    const config = {
      ADD_TAGS: ['script', 'canvas'],
      ADD_ATTR: ['id', 'style'],
      FORCE_BODY: true,
    }

    // Sanitize HTML
    const sanitized = DOMPurify.sanitize(htmlContent, config)
    containerRef.current.innerHTML = sanitized

    // Execute scripts after DOM is ready
    const scripts = containerRef.current.querySelectorAll('script')
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script')

      // Copy attributes
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value)
      })

      // Copy content
      newScript.textContent = oldScript.textContent
      oldScript.parentNode?.replaceChild(newScript, oldScript)
    })
  }, [htmlContent, cardId])

  if (!htmlContent) {
    return (
      <div className="flex items-center justify-center h-[200px] text-tfu-black/60 text-sm">
        Geen content beschikbaar
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="card-content-container min-h-[200px] max-h-[400px] overflow-y-auto"
    />
  )
}
