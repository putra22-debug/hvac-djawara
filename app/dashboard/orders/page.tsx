'use client'

import { Plus, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useOrders, OrderStatus } from '@/hooks/use-orders'

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
}

export default function OrdersPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const { orders, loading, error } = useOrders({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery,
  })

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleRowClick = (orderId: string) => {
    router.push(`/dashboard/orders/${orderId}`)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Orders</h1>
          <p className="text-gray-500 mt-1">Manage customer service requests</p>
        </div>
        <Link href="/dashboard/orders/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by order number or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <p className="text-gray-500">No orders found</p>
          {(statusFilter !== 'all' || searchQuery) && (
            <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
          )}
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(order.id)}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.client?.name || '-'}</div>
                      {order.client?.phone && (
                        <div className="text-xs text-gray-500">{order.client.phone}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{order.service_title}</div>
                      <div className="text-xs text-gray-500 capitalize">{order.order_type}</div>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate" title={order.location_address}>
                      {order.location_address}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <div>{formatDate(order.scheduled_date)}</div>
                      {order.scheduled_time && (
                        <div className="text-xs text-gray-500">{order.scheduled_time}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[order.status]?.color || 'bg-gray-100 text-gray-800'}>
                        {statusConfig[order.status]?.label || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.technician?.full_name || (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-gray-500">
            Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
          </div>
        </>
      )}
    </div>
  )
}
