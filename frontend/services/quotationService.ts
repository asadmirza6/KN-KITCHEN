import axios from '@/lib/axios'
import type { Quotation } from '@/types/Quotation'

export interface CreateQuotationRequest {
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  items: Array<{
    item_id: number
    item_name: string
    quantity_kg: number
    price_per_kg: number
  }>
  manual_items: Array<{
    name: string
    quantity_kg: number
    price_per_kg: number
  }>
  total_amount: number
  advance_payment?: number
  delivery_date?: string
  valid_until?: string
  notes?: string
}

export async function createQuotation(data: CreateQuotationRequest): Promise<Quotation> {
  const response = await axios.post('/quotations/', data)
  return response.data
}

export async function getQuotations(): Promise<Quotation[]> {
  const response = await axios.get('/quotations/')
  return response.data
}

export async function getQuotation(id: number): Promise<Quotation> {
  const response = await axios.get(`/quotations/${id}`)
  return response.data
}

export async function updateQuotation(id: number, data: CreateQuotationRequest): Promise<Quotation> {
  const response = await axios.put(`/quotations/${id}`, data)
  return response.data
}

export async function deleteQuotation(id: number): Promise<{ message: string }> {
  const response = await axios.delete(`/quotations/${id}`)
  return response.data
}

export async function approveQuotation(id: number): Promise<{ message: string; order_id: number; quotation_id: number }> {
  const response = await axios.post(`/quotations/${id}/approve`)
  return response.data
}

export async function downloadQuotationEstimate(id: number, customerName: string): Promise<void> {
  const response = await axios.get(`/quotations/${id}/estimate`, {
    responseType: 'blob'
  })

  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `quotation_${id}_${customerName.replace(/\s+/g, '_')}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.parentNode?.removeChild(link)
  window.URL.revokeObjectURL(url)
}
