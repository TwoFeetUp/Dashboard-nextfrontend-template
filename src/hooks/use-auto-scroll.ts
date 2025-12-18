'use client'

import {
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
  type DependencyList
} from 'react'

interface UseAutoScrollOptions {
  dependencies?: DependencyList
  threshold?: number
  isStreaming?: boolean
}

export function useAutoScroll({
  dependencies,
  threshold = 100,
  isStreaming = false,
}: UseAutoScrollOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isUserScrollingRef = useRef(false)
  const trackedDependenciesRef = useRef<DependencyList | null>(null)
  const lastScrollTopRef = useRef(0)

  const resolvedDependencies = useMemo(() => dependencies ?? [], [dependencies])

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current
    if (!container || isUserScrollingRef.current) {
      return
    }

    container.scrollTop = container.scrollHeight
    lastScrollTopRef.current = container.scrollTop
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

    if (isStreaming && scrolledUp) {
      if (!isUserScrollingRef.current) {
        isUserScrollingRef.current = true
      }
      return
    }

    if (distanceFromBottom <= threshold) {
      // User returned near the bottom; clear the scrolling flag.
      const wasUserScrolling = isUserScrollingRef.current
      isUserScrollingRef.current = false

      if (wasUserScrolling && !scrolledUp) {
        container.scrollTop = container.scrollHeight
        lastScrollTopRef.current = container.scrollTop
      }
      return
    }

    // User is scrolling if they're more than threshold pixels from bottom
    if (!isUserScrollingRef.current && distanceFromBottom > threshold) {
      isUserScrollingRef.current = true
    }
  }, [isStreaming, threshold])

  const resetUserScrolling = useCallback(() => {
    isUserScrollingRef.current = false
  }, [])

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

    if (!dependenciesChanged || isUserScrollingRef.current) {
      return
    }

    scrollToBottom()
  }, [resolvedDependencies, scrollToBottom])

  return {
    containerRef,
    scrollToBottom,
    handleScroll,
    resetUserScrolling
  }
}
