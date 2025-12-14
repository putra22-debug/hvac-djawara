// ============================================
// Audit Log Viewer
// Display history of all client data changes
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  History,
  Loader2,
  AlertCircle,
  User,
  Clock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AuditLog {
  id: string
  changed_at: string
  changed_by: string
  changed_fields: string[]
  old_data: any
  new_data: any
  staff_name?: string
  staff_email?: string
}

interface AuditLogViewerProps {
  clientId: string
}

export function AuditLogViewer({ clientId }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchAuditLogs()
  }, [clientId])

  async function fetchAuditLogs() {
    try {
      const { data, error: fetchError } = await supabase
        .from('client_audit_log')
        .select(`
          *,
          staff:changed_by (
            full_name,
            email
          )
        `)
        .eq('client_id', clientId)
        .order('changed_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError

      const formatted = data?.map(log => ({
        ...log,
        staff_name: log.staff?.full_name || 'System',
        staff_email: log.staff?.email || ''
      })) || []

      setLogs(formatted)
    } catch (err) {
      console.error('Error fetching audit logs:', err)
      setError('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  function formatValue(value: any): string {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  function getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      client_type: 'Client Type',
      pic_name: 'PIC Name',
      pic_phone: 'PIC Phone',
      company_npwp: 'NPWP',
      company_address_npwp: 'NPWP Address',
      notes_internal: 'Internal Notes'
    }
    return labels[field] || field
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Change History
        </CardTitle>
        <p className="text-sm text-gray-500">
          Track all modifications to client data
        </p>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No changes recorded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id} className="border-l-4 border-l-blue-500">
                <CardContent className="py-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{log.staff_name}</p>
                        {log.staff_email && (
                          <p className="text-xs text-gray-500">{log.staff_email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(log.changed_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </div>
                  </div>

                  {/* Changed Fields */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Modified Fields ({log.changed_fields.length}):
                    </p>
                    
                    <div className="space-y-3">
                      {log.changed_fields.map((field) => (
                        <div key={field} className="bg-gray-50 rounded p-3">
                          <p className="text-sm font-medium text-gray-900 mb-2">
                            {getFieldLabel(field)}
                          </p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Old Value</p>
                              <p className="text-gray-700 break-words">
                                {formatValue(log.old_data?.[field])}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">New Value</p>
                              <p className="text-blue-700 font-medium break-words">
                                {formatValue(log.new_data?.[field])}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
