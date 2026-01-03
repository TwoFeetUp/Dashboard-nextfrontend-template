'use client'

import { useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'

interface CardContentProps {
  htmlContent: string
  cardId: string
}

// Check if Chart.js is already loaded
const isChartLoaded = () => typeof window !== 'undefined' && 'Chart' in window

// Get Chart constructor from window
const getChart = () => {
  if (typeof window !== 'undefined' && 'Chart' in window) {
    return (window as { Chart?: unknown }).Chart as {
      getChart: (canvas: HTMLCanvasElement | string) => { destroy: () => void } | undefined
    }
  }
  return null
}

// Load Chart.js from CDN and return a promise
const loadChartJs = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isChartLoaded()) {
      resolve()
      return
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="chart.js"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Chart.js')))
      return
    }

    // Load Chart.js
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Chart.js'))
    document.head.appendChild(script)
  })
}

// Destroy any existing charts on canvases
const destroyExistingCharts = (container: HTMLElement) => {
  const Chart = getChart()
  if (!Chart) return

  const canvases = container.querySelectorAll('canvas')
  canvases.forEach((canvas) => {
    try {
      const existingChart = Chart.getChart(canvas as HTMLCanvasElement)
      if (existingChart) {
        existingChart.destroy()
      }
    } catch {
      // Canvas might not have a chart, ignore
    }
  })
}

export function CardContent({ htmlContent, cardId }: CardContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const renderIdRef = useRef(0)

  useEffect(() => {
    if (!containerRef.current || !htmlContent) return

    const container = containerRef.current
    renderIdRef.current += 1
    const currentRenderId = renderIdRef.current

    const renderContent = async () => {
      if (!container) return

      // Destroy any existing charts before re-rendering
      destroyExistingCharts(container)

      // Generate unique prefix for this card + render
      const uniquePrefix = `${cardId}-${currentRenderId}-${Date.now()}`

      // Extract scripts and process HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = htmlContent

      // Find all canvas elements and create ID mapping
      const canvases = tempDiv.querySelectorAll('canvas[id]')
      const idMap: Record<string, string> = {}

      canvases.forEach((canvas, index) => {
        const oldId = canvas.getAttribute('id')
        if (oldId) {
          const newId = `canvas-${uniquePrefix}-${index}`
          idMap[oldId] = newId
          canvas.setAttribute('id', newId)
        }
      })

      // Get scripts before removing them
      const scripts = Array.from(tempDiv.querySelectorAll('script'))
      const inlineScripts = scripts.filter(s => !s.src && s.textContent)

      // Remove scripts from temp div
      scripts.forEach(s => s.remove())

      // Configure DOMPurify
      const config = {
        ADD_TAGS: ['canvas'],
        ADD_ATTR: ['id', 'style', 'width', 'height'],
        FORBID_TAGS: ['script'],
        FORCE_BODY: true,
      }

      // Sanitize HTML (without scripts)
      const sanitized = DOMPurify.sanitize(tempDiv.innerHTML, config)
      container.innerHTML = sanitized

      // IMPORTANT: Set max-height on all canvas elements to prevent infinite scroll bug
      // When Chart.js fails to render, canvas can grow infinitely
      // NOTE: Do NOT set width: 100% as it breaks Chart.js rendering when the agent
      // provides specific pixel dimensions. Let the agent's styling take precedence.
      const containerCanvases = container.querySelectorAll('canvas')
      containerCanvases.forEach((canvas) => {
        canvas.style.maxHeight = '400px'
      })

      // If there are chart scripts, load Chart.js first then execute inline scripts
      if (inlineScripts.length > 0) {
        try {
          await loadChartJs()

          // Wait for DOM to be ready and verify canvases exist
          await new Promise(resolve => setTimeout(resolve, 150))

          // Verify all canvases exist in the DOM before executing scripts
          const canvasesInDom = Object.values(idMap).every(newId => {
            const canvas = document.getElementById(newId)
            return canvas !== null
          })

          if (!canvasesInDom) {
            console.warn('[CardContent] Canvas elements not found in DOM, skipping script execution')
            return
          }

          // Execute inline scripts with updated canvas IDs
          for (const scriptEl of inlineScripts) {
            try {
              let scriptCode = scriptEl.textContent || ''

              // Replace old canvas IDs with new ones in script
              for (const [oldId, newId] of Object.entries(idMap)) {
                // Escape special regex characters in oldId
                const escapedOldId = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

                // Replace getElementById('oldId') and getElementById("oldId")
                scriptCode = scriptCode.replace(
                  new RegExp(`getElementById\\(['"]${escapedOldId}['"]\\)`, 'g'),
                  `getElementById('${newId}')`
                )
                // Replace other string references to the ID (for direct canvas ID passing)
                scriptCode = scriptCode.replace(
                  new RegExp(`['"]${escapedOldId}['"]`, 'g'),
                  `'${newId}'`
                )
              }

              // Wrap chart creation with retry logic to handle timing issues
              const wrappedCode = `
                (function() {
                  const maxRetries = 3;
                  let retryCount = 0;

                  function tryCreateChart() {
                    try {
                      ${scriptCode}
                    } catch (e) {
                      if (e.message && e.message.includes("can't acquire context") && retryCount < maxRetries) {
                        retryCount++;
                        console.log('[CardContent] Retry chart creation attempt', retryCount);
                        setTimeout(tryCreateChart, 100);
                      } else {
                        console.warn('[CardContent] Chart creation failed:', e.message);
                      }
                    }
                  }

                  tryCreateChart();
                })();
              `
              // eslint-disable-next-line no-new-func
              new Function(wrappedCode)()
            } catch (scriptError) {
              console.warn('Chart script execution error:', scriptError)
            }
          }

          // After all scripts execute, force chart update to ensure proper rendering
          // This fixes an issue where charts don't render if canvas dimensions aren't finalized
          // Use requestAnimationFrame to ensure DOM is fully painted before updating
          await new Promise(resolve => requestAnimationFrame(resolve))
          await new Promise(resolve => setTimeout(resolve, 100))

          const Chart = getChart()
          if (Chart) {
            const renderedCanvases = container.querySelectorAll('canvas')
            renderedCanvases.forEach((canvas) => {
              try {
                const chart = Chart.getChart(canvas as HTMLCanvasElement)
                if (chart) {
                  // Use update('none') which forces a complete redraw without animation
                  chart.update('none')
                }
              } catch {
                // Chart might not exist on this canvas, ignore
              }
            })
          }
        } catch (error) {
          console.error('Failed to load Chart.js:', error)
        }
      }
    }

    renderContent()

    // Cleanup on unmount
    return () => {
      destroyExistingCharts(container)
    }
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
      className="card-content-container min-h-[200px]"
    />
  )
}
