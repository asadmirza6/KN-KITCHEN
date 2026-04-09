/**
 * Order interface matching backend Order model.
 * Represents catering orders with items, amounts, and payments.
 */

export interface OrderItem {
  item_id: number
  item_name: string
  quantity_kg: number
  price_per_kg: number
  subtotal: number
}

export interface ManualItem {
  name: string
  quantity_kg: number
  price_per_kg: number
  subtotal: number
}

export interface Order {
  id: number
  user_id: number
  created_by_name: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  items: OrderItem[]
  manual_items: ManualItem[]
  total_amount: string
  advance_payment: string
  balance: string
  discount: string
  delivery_date: string | null
  notes: string | null
  status: 'pending' | 'partial' | 'paid' | 'cancelled'
  created_at: string
}

/**
 * DTO for creating a new order
 */
export interface CreateOrderRequest {
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  items: OrderItem[]
  manual_items: ManualItem[]
  total_amount: number
  advance_payment: number
  discount: number
  delivery_date?: string | null
  notes?: string | null
}

/**
 * DTO for order creation response (includes calculated totals)
 */
export interface CreateOrderResponse extends Order {
  message: string
}
