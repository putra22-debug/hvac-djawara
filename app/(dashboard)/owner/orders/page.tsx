import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Orders - Djawara HVAC',
  description: 'Manage service orders',
}

export default function OrdersPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Orders Management</h1>
        <p className="text-gray-600">Incoming service orders</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Orders list will be displayed here</p>
      </div>
    </div>
  )
}
