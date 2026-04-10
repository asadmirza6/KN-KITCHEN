import axiosInstance from './axios'

/**
 * SWR fetcher function using axios with JWT interceptor
 * Automatically includes authentication headers and handles cold starts
 */
export const swrFetcher = async (url: string) => {
  try {
    const response = await axiosInstance.get(url)
    return response.data
  } catch (error: any) {
    // Handle cold start gracefully - retry with exponential backoff
    if (error.response?.status === 503 || error.code === 'ECONNREFUSED') {
      console.warn(`[SWR] Backend cold start detected for ${url}, retrying...`)
      throw error
    }
    throw error
  }
}

/**
 * SWR configuration with optimized settings for production
 * - revalidateOnFocus: false - don't refetch when window regains focus
 * - dedupingInterval: 5000 - deduplicate requests within 5 seconds
 * - revalidateOnReconnect: true - refetch when connection restored
 * - errorRetryCount: 5 - retry up to 5 times on error
 * - errorRetryInterval: 3000 - wait 3s between retries (handles cold starts)
 */
export const swrConfig = {
  fetcher: swrFetcher,
  revalidateOnFocus: false,
  dedupingInterval: 5000,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  errorRetryCount: 5,
  errorRetryInterval: 3000,
  onError: (error: any) => {
    // Log errors for debugging but don't crash the page
    console.error('[SWR] Fetch error:', error.message)
  },
  onErrorRetry: (error: any, key: string, config: any, retryer: any, { retryCount }: any) => {
    // Don't retry on 404 or 401 errors
    if (error.response?.status === 404 || error.response?.status === 401) {
      return
    }
    // Retry with exponential backoff for cold starts
    if (retryCount < 5) {
      setTimeout(() => retryer({ retryCount }), 1000 * Math.pow(2, retryCount))
    }
  }
}

