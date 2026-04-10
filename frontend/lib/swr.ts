import axios from 'axios'

/**
 * SWR fetcher function using axios with JWT interceptor
 * Automatically includes authentication headers
 */
export const swrFetcher = async (url: string) => {
  try {
    const response = await axios.get(url)
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * SWR configuration with optimized settings
 * - revalidateOnFocus: false - don't refetch when window regains focus
 * - dedupingInterval: 5000 - deduplicate requests within 5 seconds
 * - revalidateOnReconnect: true - refetch when connection restored
 */
export const swrConfig = {
  fetcher: swrFetcher,
  revalidateOnFocus: false,
  dedupingInterval: 5000,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
}
