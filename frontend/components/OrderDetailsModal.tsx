'use client'

/**
 * Order Details Modal Component
 * Shows complete order information including profit breakdown
 */

import { formatCurrency } from '@/lib/currency'

interface OrderDetailsModalProps {
  order: any
  isOpen: boolean
  onClose: () => void
}

export default function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
  if (!isOpen || !order) return null

  const hasRecipeWarnings = order.status_change_info?.profit_calculation?.warnings?.length > 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 sticky top-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Order #{order.id}</h2>
              <p className="text-blue-100 mt-1">{order.customer_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-100 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Customer Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-bold text-gray-900">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Phone</p>
                <p className="font-bold text-gray-900">{order.customer_phone}</p>
              </div>
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-bold text-gray-900">{order.customer_email}</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className={`font-bold ${
                  order.status === 'paid' ? 'text-green-600' :
                  order.status === 'partial' ? 'text-yellow-600' :
                  order.status === 'pending' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {order.status.toUpperCase()}
                </p>
              </div>
            </div>
            <p className="text-gray-600 text-sm mt-3">Address: {order.customer_address}</p>
          </div>

          {/* Items Ordered */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Items Ordered</h3>
            <div className="space-y-2">
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm bg-gray-50 p-3 rounded">
                  <div>
                    <p className="font-bold text-gray-900">{item.item_name}</p>
                    <p className="text-gray-600">{item.quantity_kg} kg @ {formatCurrency(parseFloat(item.price_per_kg))}/kg</p>
                  </div>
                  <p className="font-bold text-gray-900">{formatCurrency(parseFloat(item.subtotal))}</p>
                </div>
              ))}
              {order.manual_items?.map((item: any, idx: number) => (
                <div key={`manual-${idx}`} className="flex justify-between text-sm bg-gray-50 p-3 rounded">
                  <div>
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <p className="text-gray-600">{item.quantity_kg} kg @ {formatCurrency(parseFloat(item.price_per_kg))}/kg</p>
                  </div>
                  <p className="font-bold text-gray-900">{formatCurrency(parseFloat(item.subtotal))}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Financial Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-bold text-gray-900">{formatCurrency(parseFloat(order.total_amount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Advance Payment:</span>
                <span className="font-bold text-gray-900">{formatCurrency(parseFloat(order.advance_payment))}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Balance:</span>
                <span className="font-bold text-gray-900">{formatCurrency(parseFloat(order.balance))}</span>
              </div>
            </div>
          </div>

          {/* Profit Breakdown (if order is completed) */}
          {order.status === 'Completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-bold text-green-900 mb-3">Profit Breakdown</h3>

              {hasRecipeWarnings && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                  <p className="text-sm font-bold text-yellow-800">⚠️ Warnings:</p>
                  {order.status_change_info?.profit_calculation?.warnings?.map((warning: string, idx: number) => (
                    <p key={idx} className="text-sm text-yellow-700 mt-1">• {warning}</p>
                  ))}
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Revenue:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(parseFloat(order.total_amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(parseFloat(order.total_cost || '0'))}</span>
                </div>
                <div className="flex justify-between border-t pt-2 bg-green-100 p-2 rounded">
                  <span className="font-bold text-green-900">Net Profit:</span>
                  <span className="font-bold text-green-900">{formatCurrency(parseFloat(order.calculated_profit || '0'))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Profit Margin:</span>
                  <span className="font-bold text-gray-900">{parseFloat(order.profit_margin || '0').toFixed(2)}%</span>
                </div>
              </div>

              {/* Cost Breakdown by Item */}
              {order.status_change_info?.profit_calculation?.profit_details && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-bold text-gray-900 mb-2">Cost Breakdown by Item:</p>
                  {order.status_change_info.profit_calculation.profit_details.map((detail: any, idx: number) => (
                    <div key={idx} className="text-xs bg-white p-2 rounded mb-2">
                      <div className="flex justify-between">
                        <span className="font-bold">{detail.item_name}</span>
                        <span>{detail.quantity} units</span>
                      </div>
                      <div className="flex justify-between text-gray-600 mt-1">
                        <span>Cost: {formatCurrency(detail.cost)}</span>
                        <span>Profit: {formatCurrency(detail.profit)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Additional Info */}
          {order.delivery_date && (
            <div className="text-sm">
              <p className="text-gray-600">Delivery Date</p>
              <p className="font-bold text-gray-900">{order.delivery_date}</p>
            </div>
          )}
          {order.notes && (
            <div className="text-sm">
              <p className="text-gray-600">Notes</p>
              <p className="font-bold text-gray-900">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-900 rounded font-bold hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
