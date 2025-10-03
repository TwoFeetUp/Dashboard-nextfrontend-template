'use client'

import { useRef, useCallback, useState, useEffect, type DependencyList } from 'react'

interface UseAutoScrollOptions {
  dependencies?: DependencyList
  threshold?: number
}

export function useAutoScroll({ dependencies = [], threshold = 100 }: UseAutoScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const scrollToBottom = useCallback(() => {
    if (containerRef.current && !isUserScrolling) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [isUserScrolling])

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // User is scrolling if they're more than threshold pixels from bottom
    const userScrolling = distanceFromBottom > threshold

    if (userScrolling) {
      setIsUserScrolling(true)

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Reset after user stops scrolling for 1 second
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false)
      }, 1000)
    }
  }, [threshold])

  const resetUserScrolling = useCallback(() => {
    setIsUserScrolling(false)
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  // Auto-scroll when dependencies change
  useEffect(() => {
    if (isUserScrolling) {
      return
    }

    const timeoutId = setTimeout(scrollToBottom, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [dependencies, isUserScrolling, scrollToBottom])

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
