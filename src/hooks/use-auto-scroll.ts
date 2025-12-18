'use client'

import {
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
  useEffect,
  type DependencyList
} from 'react'

interface UseAutoScrollOptions {
  dependencies?: DependencyList
  threshold?: number
  isStreaming?: boolean
}

type ScrollToBottomOptions = {
  force?: boolean
  behavior?: ScrollBehavior
}

export function useAutoScroll({
  dependencies,
  threshold = 100,
  isStreaming = false,
}: UseAutoScrollOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScrollTopRef = useRef(0)
  const isAutoScrollEnabledRef = useRef(true)
  const trackedDependenciesRef = useRef<DependencyList | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const isProgrammaticScrollRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  const resolvedDependencies = useMemo(() => dependencies ?? [], [dependencies])

  const scrollToBottom = useCallback((options: ScrollToBottomOptions = {}) => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const { force = false, behavior = 'smooth' } = options

    if (force) {
      isAutoScrollEnabledRef.current = true
    }

    if (!force && !isAutoScrollEnabledRef.current) {
      return
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = true
      container.scrollTo({ top: container.scrollHeight, behavior })

      requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = false
      })
    })
  }, [])

  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const { scrollTop, scrollHeight, clientHeight } = container
    const previousScrollTop = lastScrollTopRef.current
    lastScrollTopRef.current = scrollTop

    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const scrolledUp = scrollTop < previousScrollTop

    if (isProgrammaticScrollRef.current) {
      return
    }

    if (isStreaming && scrolledUp) {
      isAutoScrollEnabledRef.current = false
      return
    }

    isAutoScrollEnabledRef.current = distanceFromBottom <= threshold
  }, [isStreaming, threshold])

  const resetUserScrolling = useCallback(() => {
    scrollToBottom({ force: true, behavior: 'smooth' })
  }, [scrollToBottom])

  useEffect(() => {
    const content = contentRef.current
    if (!content) {
      return
    }

    const observer = new ResizeObserver(() => {
      scrollToBottom({ behavior: 'smooth' })
    })

    observer.observe(content)

    return () => {
      observer.disconnect()
    }
  }, [scrollToBottom])

  // Auto-scroll when dependencies change
  useLayoutEffect(() => {
    const previousDependencies = trackedDependenciesRef.current
    let dependenciesChanged = false

    if (!previousDependencies) {
      dependenciesChanged = resolvedDependencies.length > 0
    } else if (previousDependencies.length !== resolvedDependencies.length) {
      dependenciesChanged = true
    } else {
      for (let index = 0; index < resolvedDependencies.length; index += 1) {
        if (!Object.is(resolvedDependencies[index], previousDependencies[index])) {
          dependenciesChanged = true
          break
        }
      }
    }

    trackedDependenciesRef.current = resolvedDependencies

    if (!dependenciesChanged) {
      return
    }

    scrollToBottom()
  }, [resolvedDependencies, scrollToBottom])

  return {
    containerRef,
    contentRef,
    scrollToBottom,
    handleScroll,
    resetUserScrolling
  }
}
