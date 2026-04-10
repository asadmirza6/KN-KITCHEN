'use client'

import { ReactNode, useEffect } from 'react'
import { SWRConfig } from 'swr'
import axios from '@/lib/axios'

/**
 * Global SWR fetcher using the configured axios instance
 * Automatically includes JWT authentication headers
 */
const globalFetcher = async (url: string) => {
  try {
    const response = await axios.get(url)
    return response.data
  } catch (error: any) {
    throw error
  }
}

/**
 * Global SWR configuration for the entire application
 * Optimized for performance and caching
 */
const swrConfig = {
  fetcher: globalFetcher,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10000, // 10 seconds - aggressive deduplication
  focusThrottleInterval: 300000, // 5 minutes
  shouldRetryOnError: true,
  errorRetryCount: 5,
  errorRetryInterval: 3000,
  onError: (error: any) => {
    console.error('[SWR] Global fetch error:', error.message)
  },
  onErrorRetry: (error: any, key: string, config: any, retryer: any, { retryCount }: any) => {
    // Don't retry on 404 or 401 errors
    if (error.response?.status === 404 || error.response?.status === 401) {
      return
    }
    // Exponential backoff for retries
    if (retryCount < 5) {
      setTimeout(() => retryer({ retryCount }), 1000 * Math.pow(2, retryCount))
    }
  }
}

interface SWRProviderProps {
  children: ReactNode
}

/**
 * Global SWR Provider wrapping the entire application
 * Provides centralized data fetching, caching, and revalidation
 */
export function SWRProvider({ children }: SWRProviderProps) {
  // Backend pre-warming: wake up Render free-tier on app load
  useEffect(() => {
    const warmupBackend = async () => {
      try {
        // Send a simple GET request to backend root to trigger spin-up
        await axios.get('/', { timeout: 5000 })
        console.debug('[Pre-warm] Backend is ready')
      } catch (error) {
        // Silently fail - this is just a warmup request
        console.debug('[Pre-warm] Backend warmup request completed')
      }
    }

    // Run warmup immediately on mount
    warmupBackend()
  }, [])

  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  )
}
