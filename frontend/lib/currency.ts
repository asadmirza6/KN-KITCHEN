/**
 * Currency Formatting Utilities for Pakistan Rupees
 */

/**
 * Format amount in Pakistan Rupees (PKR)
 * @param amount - The amount to format
 * @param showDecimals - Whether to show decimal places (default: true)
 * @returns Formatted currency string (e.g., "Rs 1,200.00" or "Rs 15,000")
 */
export function formatCurrency(amount: number | string, showDecimals: boolean = true): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(numAmount)) {
    return 'Rs 0.00'
  }

  const formatted = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  }).format(numAmount)

  return `Rs ${formatted}`
}

/**
 * Format amount for display without currency symbol
 * @param amount - The amount to format
 * @returns Formatted number string with commas
 */
export function formatNumber(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(numAmount)) {
    return '0.00'
  }

  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount)
}

/**
 * Get currency symbol
 * @returns Currency symbol for Pakistan Rupees
 */
export function getCurrencySymbol(): string {
  return 'Rs'
}
