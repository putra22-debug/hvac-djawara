// ============================================
// Client Service History with Detail Modal
// Clickable service orders with technician report
// ============================================

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Clock, Calendar, CheckCircle, Eye } from 'lucide-react'
import { ServiceOrderDetailModal } from './ServiceOrderDetailModal'

interface ServiceOrder {
  id: string
  order_number: string
  service_title: string
  status: string
  scheduled_date: string
  completed_date?: string
}

interface ClientServiceHistoryProps {
  orders: ServiceOrder[]
  isPremium?: boolean
}

export function ClientServiceHistory({ orders, isPremium = false }: ClientServiceHistoryProps) {
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    scheduled: 'bg-purple-100 text-purple-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800'
  }

  const handleOrderClick = (order: ServiceOrder) => {
    setSelectedOrder(order)
    setModalOpen(true)
  }

  return (
    <>
      <div className="space-y-3">
        {orders.map((order) => (
          <Card
            key={order.id}
            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-all hover:shadow-md"
            onClick={() => handleOrderClick(order)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{order.order_number}</h3>
                  <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                    {order.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {order.status}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{order.service_title}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.scheduled_date).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  {order.completed_date && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Clock className="w-3 h-3" />
                      Completed {new Date(order.completed_date).toLocaleDateString('id-ID')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Eye className="w-5 h-5 text-gray-400" />
                {order.status === 'completed' && (
                  <span className="text-xs text-blue-600 font-medium">
                    View Report
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <ServiceOrderDetailModal
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.order_number}
          open={modalOpen}
          onOpenChange={setModalOpen}
          isPremium={isPremium}
        />
      )}
    </>
  )
}
