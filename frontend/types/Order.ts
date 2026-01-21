/**
 * Order interface matching backend Order model.
 * Represents catering orders with items, amounts, and payments.
 */

export interface OrderItem {
  item_id: number
  quantity: number
}

export interface Order {
  id: number
  user_id: number
  items: OrderItem[] // JSON array of {item_id, quantity}
  total_amount: string // Decimal as string (e.g., "1500.00")
  advance_payment: string // Decimal as string
  balance: string // Decimal as string
  created_at: string // ISO 8601 datetime string
}

/**
 * DTO for creating a new order
 */
export interface CreateOrderRequest {
  customer_name?: string // Optional customer name (not in DB model but useful for UI)
  items: OrderItem[]
  advance_payment: string // Decimal as string
}

/**
 * DTO for order creation response (includes calculated totals)
 */
export interface CreateOrderResponse extends Order {
  message: string
}
