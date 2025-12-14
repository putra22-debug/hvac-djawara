'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  FileText,
  Upload,
  Image as ImageIcon,
  Paperclip,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Save,
} from 'lucide-react'
import { useUpdateOrder, useTechnicians, OrderStatus } from '@/hooks/use-orders'
import { toast } from 'sonner'
import moment from 'moment'

const statusConfig = {
  listing: { label: 'Listing', color: 'bg-gray-100 text-gray-800', icon: FileText },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800', icon: Activity },
  pending: { label: 'Pending', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
}

interface OrderDetailModalProps {
  order: any
  open: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function OrderDetailModal({ order, open, onClose, onUpdate }: OrderDetailModalProps) {
  const { updateOrder, loading: updating } = useUpdateOrder()
  const { technicians } = useTechnicians()
  
  // Form state
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>(order.status)
  const [selectedTechnician, setSelectedTechnician] = useState(order.assigned_to || '')
  const [selectedPriority, setSelectedPriority] = useState(order.priority || 'normal')
  const [scheduledDate, setScheduledDate] = useState(order.scheduled_date || '')
  const [scheduledTime, setScheduledTime] = useState(order.scheduled_time?.slice(0, 5) || '')
  const [jobType, setJobType] = useState(order.job_type || '')
  const [jobCategory, setJobCategory] = useState(order.job_category || '')
  const [unitCategory, setUnitCategory] = useState(order.unit_category || '')
  const [notes, setNotes] = useState(order.notes || '')
  const [newNote, setNewNote] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Track changes
  useEffect(() => {
    const changed = 
      selectedStatus !== order.status ||
      selectedTechnician !== (order.assigned_to || '') ||
      selectedPriority !== (order.priority || 'normal') ||
      scheduledDate !== (order.scheduled_date || '') ||
      scheduledTime !== (order.scheduled_time?.slice(0, 5) || '') ||
      jobType !== (order.job_type || '') ||
      jobCategory !== (order.job_category || '') ||
      unitCategory !== (order.unit_category || '')
    
    setHasChanges(changed)
  }, [selectedStatus, selectedTechnician, selectedPriority, scheduledDate, scheduledTime, jobType, jobCategory, unitCategory, order])

  // Single save handler for all changes
  const handleSaveChanges = async () => {
    if (!hasChanges) return

    const updates: any = {}
    
    if (selectedStatus !== order.status) updates.status = selectedStatus
    if (selectedTechnician !== (order.assigned_to || '')) updates.assigned_to = selectedTechnician
    if (selectedPriority !== (order.priority || 'normal')) updates.priority = selectedPriority
    if (scheduledDate !== (order.scheduled_date || '')) updates.scheduled_date = scheduledDate
    if (scheduledTime !== (order.scheduled_time?.slice(0, 5) || '')) updates.scheduled_time = scheduledTime + ':00'
    if (jobType !== (order.job_type || '')) updates.job_type = jobType
    if (jobCategory !== (order.job_category || '')) updates.job_category = jobCategory
    if (unitCategory !== (order.unit_category || '')) updates.unit_category = unitCategory

    const success = await updateOrder(order.id, updates)
    
    if (success) {
      toast.success('Order updated successfully')
      setHasChanges(false)
      onUpdate()
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    const timestamp = moment().format('DD MMM YYYY, HH:mm')
    const updatedNotes = notes 
      ? `${notes}\n\n[${timestamp}]\n${newNote}` 
      : `[${timestamp}]\n${newNote}`

    const success = await updateOrder(order.id, { notes: updatedNotes })
    
    if (success) {
      toast.success('Note added')
      setNotes(updatedNotes)
      setNewNote('')
      onUpdate()
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setUploadedFiles(prev => [...prev, ...files])
      toast.success(`${files.length} file(s) uploaded`)
    }
  }

  const StatusIcon = statusConfig[order.status as keyof typeof statusConfig]?.icon || Activity

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">{order.service_title}</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">{order.order_number}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusConfig[order.status as keyof typeof statusConfig]?.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[order.status as keyof typeof statusConfig]?.label}
              </Badge>
              <Badge className={priorityConfig[order.priority as keyof typeof priorityConfig]?.color}>
                {priorityConfig[order.priority as keyof typeof priorityConfig]?.label}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.client && (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{order.client.name}</span>
                    </div>
                    {order.client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{order.client.phone}</span>
                      </div>
                    )}
                    {order.client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{order.client.email}</span>
                      </div>
                    )}
                    {order.client.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-sm">{order.client.address}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Schedule & Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule & Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Scheduled Date/Time */}
                <div>
                  <Label htmlFor="scheduled_date">Scheduled Date</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="scheduled_time">Scheduled Time</Label>
                  <Input
                    id="scheduled_time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {/* Technician Assignment */}
                <div>
                  <Label htmlFor="technician">Assigned Technician</Label>
                  <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                    <SelectTrigger id="technician" className="mt-2">
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as OrderStatus)}>
                    <SelectTrigger id="status" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                    <SelectTrigger id="priority" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Job Type */}
                <div>
                  <Label htmlFor="job_type">Jenis Pekerjaan</Label>
                  <Select value={jobType} onValueChange={setJobType}>
                    <SelectTrigger id="job_type" className="mt-2">
                      <SelectValue placeholder="Pilih jenis pekerjaan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="survey">Survey</SelectItem>
                      <SelectItem value="maintenance">Pemeliharaan Unit</SelectItem>
                      <SelectItem value="installation">Pemasangan Unit</SelectItem>
                      <SelectItem value="troubleshooting">Troubleshooting Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Job Category */}
                <div>
                  <Label htmlFor="job_category">Kategori Pekerjaan</Label>
                  <Select value={jobCategory} onValueChange={setJobCategory}>
                    <SelectTrigger id="job_category" className="mt-2">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Rumah Tangga</SelectItem>
                      <SelectItem value="commercial">Komersial</SelectItem>
                      <SelectItem value="industrial">Industri / Central</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Unit Category */}
                <div>
                  <Label htmlFor="unit_category">Kategori Unit</Label>
                  <Select value={unitCategory} onValueChange={setUnitCategory}>
                    <SelectTrigger id="unit_category" className="mt-2">
                      <SelectValue placeholder="Pilih kategori unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="split">Split</SelectItem>
                      <SelectItem value="cassette">Cassette</SelectItem>
                      <SelectItem value="standing_floor">Standing Floor</SelectItem>
                      <SelectItem value="split_duct">Split Duct</SelectItem>
                      <SelectItem value="vrf_vrv">VRF / VRV</SelectItem>
                      <SelectItem value="cold_storage">Cold Storage</SelectItem>
                      <SelectItem value="refrigerator">Refrigerator</SelectItem>
                      <SelectItem value="other">Lain-lain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-gray-500">Service Title</Label>
                  <p className="mt-1">{order.service_title || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Description</Label>
                  <p className="mt-1 text-sm">{order.description || '-'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Save Changes Button */}
            {hasChanges && (
              <Button 
                onClick={handleSaveChanges} 
                disabled={updating}
                className="w-full"
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-3">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Timeline items */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium">Order Created</p>
                      <p className="text-sm text-gray-500">
                        {moment(order.created_at).format('DD MMM YYYY, HH:mm')}
                      </p>
                    </div>
                  </div>

                  {order.scheduled_date && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium">Scheduled</p>
                        <p className="text-sm text-gray-500">
                          {moment(order.scheduled_date).format('DD MMM YYYY')} at {order.scheduled_time}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.technician && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-purple-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Assigned to {order.technician.full_name}</p>
                        <p className="text-sm text-gray-500">
                          {moment(order.updated_at).format('DD MMM YYYY, HH:mm')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Work Documentation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-12 w-12 text-gray-400" />
                      <p className="text-sm font-medium">Click to upload files</p>
                      <p className="text-xs text-gray-500">Images or PDF files</p>
                    </div>
                  </Label>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Files ({uploadedFiles.length})</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                          <ImageIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm truncate flex-1">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Add Note
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Add technical notes, observations, or comments..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={4}
                />
                <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                  Add Note
                </Button>
              </CardContent>
            </Card>

            {notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Note History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm">{notes}</div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
