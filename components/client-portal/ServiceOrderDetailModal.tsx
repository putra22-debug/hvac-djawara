// ============================================
// Service Order Detail Modal (Client View)
// Shows technician report, checkup data, and rating
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Star,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Wrench,
  AlertCircle,
  MapPin,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface ServiceOrderDetailModalProps {
  orderId: string
  orderNumber: string
  open: boolean
  onOpenChange: (open: boolean) => void
  isPremium?: boolean
}

interface TechnicianReport {
  id: string
  service_order_id: string
  technician_id: string
  technician_name: string
  work_started_at: string
  work_completed_at: string
  work_description: string
  findings: string
  recommendations: string
  parts_used: any[]
  before_photos: string[]
  after_photos: string[]
  client_signature: string
  technician_rating: number | null
  client_feedback: string | null
  created_at: string
}

interface OrderDetails {
  id: string
  order_number: string
  service_title: string
  status: string
  scheduled_date: string
  location_address: string
  client_notes: string
  technician_name: string
  assigned_to: string
}

export function ServiceOrderDetailModal({
  orderId,
  orderNumber,
  open,
  onOpenChange,
  isPremium = false
}: ServiceOrderDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [report, setReport] = useState<TechnicianReport | null>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails()
    }
  }, [open, orderId])

  async function fetchOrderDetails() {
    try {
      setLoading(true)

      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          service_title,
          status,
          scheduled_date,
          location_address,
          client_notes,
          assigned_to,
          profiles:assigned_to (
            full_name
          )
        `)
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError

      setOrder({
        ...orderData,
        technician_name: orderData.profiles?.full_name || 'Not assigned'
      })

      // Fetch technician report (if exists)
      const { data: reportData, error: reportError } = await supabase
        .from('service_reports')
        .select(`
          *,
          profiles:technician_id (
            full_name
          )
        `)
        .eq('service_order_id', orderId)
        .single()

      if (!reportError && reportData) {
        setReport({
          ...reportData,
          technician_name: reportData.profiles?.full_name || 'Unknown'
        })
        setRating(reportData.technician_rating || 0)
        setFeedback(reportData.client_feedback || '')
      }

    } catch (err) {
      console.error('Error fetching order details:', err)
      toast.error('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  async function submitRating() {
    if (!report || !isPremium) return
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }

    try {
      setSubmitting(true)

      const { error } = await supabase
        .from('service_reports')
        .update({
          technician_rating: rating,
          client_feedback: feedback.trim() || null,
          rated_at: new Date().toISOString()
        })
        .eq('id', report.id)

      if (error) throw error

      toast.success('Rating submitted successfully!')
      fetchOrderDetails() // Refresh data
    } catch (err) {
      console.error('Error submitting rating:', err)
      toast.error('Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    scheduled: 'bg-purple-100 text-purple-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Service Order Detail
          </DialogTitle>
          <DialogDescription>
            Order #{orderNumber}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Info */}
            {order && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Service</label>
                      <p className="font-medium">{order.service_title}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Status</label>
                      <div>
                        <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Scheduled Date
                      </label>
                      <p className="font-medium">
                        {new Date(order.scheduled_date).toLocaleDateString('id-ID', {
                          dateStyle: 'long'
                        })}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Technician
                      </label>
                      <p className="font-medium">{order.technician_name}</p>
                    </div>
                  </div>
                  
                  {order.location_address && (
                    <div>
                      <label className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Location
                      </label>
                      <p className="text-sm">{order.location_address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Technician Report */}
            {report ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Wrench className="w-5 h-5" />
                      Work Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500">Work Started</label>
                        <p className="text-sm font-medium">
                          {new Date(report.work_started_at).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Work Completed</label>
                        <p className="text-sm font-medium">
                          {new Date(report.work_completed_at).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-500 font-medium">Work Description</label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{report.work_description}</p>
                    </div>

                    {report.findings && (
                      <div>
                        <label className="text-sm text-gray-500 font-medium">Findings</label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{report.findings}</p>
                      </div>
                    )}

                    {report.recommendations && (
                      <div>
                        <label className="text-sm text-gray-500 font-medium flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Recommendations
                        </label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{report.recommendations}</p>
                      </div>
                    )}

                    {report.parts_used && report.parts_used.length > 0 && (
                      <div>
                        <label className="text-sm text-gray-500 font-medium">Parts Used</label>
                        <ul className="text-sm mt-1 space-y-1">
                          {report.parts_used.map((part: any, idx: number) => (
                            <li key={idx} className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              {part.name} - Qty: {part.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Rating Section (Premium Only) */}
                {isPremium && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        Rate This Service
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {report.technician_rating ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-sm text-green-800 font-medium mb-2">
                            ✓ You rated this service
                          </p>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-6 h-6 ${
                                  star <= report.technician_rating!
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="text-sm text-gray-600 ml-2">
                              ({report.technician_rating}/5)
                            </span>
                          </div>
                          {report.client_feedback && (
                            <p className="text-sm text-gray-700 mt-2 italic">
                              "{report.client_feedback}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              How satisfied are you with this service?
                            </label>
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRating(star)}
                                  onMouseEnter={() => setHoverRating(star)}
                                  onMouseLeave={() => setHoverRating(0)}
                                  className="transition-transform hover:scale-110"
                                >
                                  <Star
                                    className={`w-8 h-8 ${
                                      star <= (hoverRating || rating)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                </button>
                              ))}
                              {rating > 0 && (
                                <span className="text-sm text-gray-600 ml-2">
                                  ({rating}/5)
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Additional Feedback (Optional)
                            </label>
                            <Textarea
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              placeholder="Share your experience with this service..."
                              rows={3}
                            />
                          </div>

                          <Button
                            onClick={submitRating}
                            disabled={rating === 0 || submitting}
                            className="w-full"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Star className="w-4 h-4 mr-2" />
                                Submit Rating
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No work report available yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    The technician will submit a report after completing the work
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
