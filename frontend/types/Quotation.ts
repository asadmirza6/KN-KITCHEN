export interface Quotation {
  id: number
  created_by_name: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  items: Array<{
    item_id: number
    item_name: string
    quantity_kg: number
    price_per_kg: number
    subtotal: number
  }>
  manual_items: Array<{
    name: string
    quantity_kg: number
    price_per_kg: number
    subtotal: number
  }>
  total_amount: string
  advance_payment: string
  balance: string
  discount: string
  delivery_date: string | null
  valid_until: string | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}
