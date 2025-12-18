// ============================================
// Service Order PDF Report Page
// Generate PDF report for completed service orders
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, ArrowLeft, CheckCircle, Calendar, Users, MapPin, FileText } from 'lucide-react'
import Link from 'next/link'

export default async function ServiceOrderReportPage({
  params,
}: {
  params: { orderId: string }
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client/login')

  const clientId = user.user_metadata?.client_id
  if (!clientId) redirect('/client/login')

  // Get order details with technician info
  const { data: order, error } = await supabase
    .from('order_with_technicians')
    .select('*')
    .eq('id', params.orderId)
    .eq('client_id', clientId)
    .single()

  if (error || !order) notFound()

  // Get client data
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  // TODO: Get technical inspection data from technician
  // This will be added when we implement technician dashboard
  // const { data: technicalData } = await supabase
  //   .from('service_inspections')
  //   .select('*')
  //   .eq('order_id', params.orderId)
  //   .single()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/client/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Button 
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* PDF Report Content */}
        <div id="report-content" className="bg-white rounded-lg shadow-lg p-8 print:shadow-none">
          {/* Report Header */}
          <div className="border-b-2 border-gray-200 pb-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Service Report
                </h1>
                <p className="text-gray-600">Order #{order.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Report Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date().toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Client Name</p>
                <p className="font-semibold text-gray-900">{client?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Client Type</p>
                <p className="font-semibold text-gray-900">
                  {client?.client_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
              {client?.email && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold text-gray-900">{client.email}</p>
                </div>
              )}
              {client?.phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-semibold text-gray-900">{client.phone}</p>
                </div>
              )}
              {order.location_address && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Service Location</p>
                  <p className="font-semibold text-gray-900">{order.location_address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-semibold text-gray-900">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {order.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Service Type</p>
                  <p className="font-semibold text-gray-900">
                    {order.service_title || order.order_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>
                {order.scheduled_date && (
                  <div>
                    <p className="text-sm text-gray-500">Service Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(order.scheduled_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {order.scheduled_time && ` at ${order.scheduled_time}`}
                    </p>
                  </div>
                )}
              </div>

              {order.service_description && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Service Description</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900 leading-relaxed">{order.service_description}</p>
                  </div>
                </div>
              )}

              {order.assigned_technician_names && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Assigned Technician(s)</p>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">{order.assigned_technician_names}</span>
                    {order.technician_count && order.technician_count > 1 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {order.technician_count} technicians
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technical Inspection Report (Coming Soon) */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Technical Inspection Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Technical Report Coming Soon</p>
                <p className="text-sm">
                  Detailed technical inspection data from technicians will be available here
                </p>
                <div className="mt-6 text-left bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">Report will include:</p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Equipment condition assessment</li>
                    <li>Maintenance activities performed</li>
                    <li>Parts replaced or repaired</li>
                    <li>Technician notes and recommendations</li>
                    <li>Before/after photos (if applicable)</li>
                    <li>Customer signature confirmation</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="border-t-2 border-gray-200 pt-6 mt-8">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <p>© {new Date().getFullYear()} HVAC Djawara - Service Platform</p>
              <p>Generated on {new Date().toLocaleDateString('id-ID')} at {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print\\:shadow-none {
              box-shadow: none !important;
            }
            button, a {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}
