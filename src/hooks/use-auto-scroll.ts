'use client'

import {
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
  type DependencyList
} from 'react'

interface UseAutoScrollOptions {
  dependencies?: DependencyList
  threshold?: number
}

export function useAutoScroll({ dependencies, threshold = 100 }: UseAutoScrollOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const isUserScrollingRef = useRef(false)
  const trackedDependenciesRef = useRef<DependencyList | null>(null)

  const resolvedDependencies = useMemo(() => dependencies ?? [], [dependencies])

  const scrollToBottom = useCallback(() => {
    if (containerRef.current && !isUserScrollingRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // User is scrolling if they're more than threshold pixels from bottom
    const userScrolling = distanceFromBottom > threshold

    if (userScrolling) {
      setIsUserScrolling(true)
      isUserScrollingRef.current = true

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Reset after user stops scrolling for 1 second
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false)
        isUserScrollingRef.current = false
      }, 1000)
    } else if (distanceFromBottom <= threshold && isUserScrollingRef.current) {
      // User returned near the bottom; clear the scrolling flag immediately
      setIsUserScrolling(false)
      isUserScrollingRef.current = false
    }
  }, [threshold])

  const resetUserScrolling = useCallback(() => {
    setIsUserScrolling(false)
    isUserScrollingRef.current = false
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  // Auto-scroll when dependencies change
  useEffect(() => {
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

    const timeoutId = setTimeout(scrollToBottom, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [resolvedDependencies, scrollToBottom])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  return {
    containerRef,
    isUserScrolling,
    scrollToBottom,
    handleScroll,
    resetUserScrolling
  }
}
