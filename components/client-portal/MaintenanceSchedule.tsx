// ============================================
// Maintenance Schedule Configuration
// Setup recurring maintenance for client contracts
// ============================================

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar,
  Clock,
  Save,
  AlertCircle,
  CheckCircle,
  Plus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MaintenanceScheduleProps {
  clientId: string
}

export function MaintenanceSchedule({ clientId }: MaintenanceScheduleProps) {
  const [schedule, setSchedule] = useState({
    frequency: 'monthly', // monthly, quarterly, semi_annual, annual
    custom_days: 30,
    start_date: '',
    maintenance_type: 'preventive',
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Check if client has maintenance contract
      const { data: contract } = await supabase
        .from('maintenance_contracts')
        .select('id')
        .eq('client_id', clientId)
        .single()

      if (!contract) {
        setError('No maintenance contract found. Please create a contract first.')
        return
      }

      // Save schedule configuration
      const { error: saveError } = await supabase
        .from('contract_schedules')
        .insert({
          contract_id: contract.id,
          frequency: schedule.frequency,
          custom_interval_days: schedule.custom_days,
          start_date: schedule.start_date,
          maintenance_type: schedule.maintenance_type,
          notes: schedule.notes,
          is_active: true
        })

      if (saveError) throw saveError

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving schedule:', err)
      setError(err instanceof Error ? err.message : 'Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Maintenance Schedule Configuration
        </CardTitle>
        <p className="text-sm text-gray-500">
          Setup recurring maintenance schedule for this client
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Maintenance schedule saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Frequency Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maintenance Frequency *
          </label>
          <select
            value={schedule.frequency}
            onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="monthly">Monthly (Every month)</option>
            <option value="quarterly">Quarterly (Every 3 months)</option>
            <option value="semi_annual">Semi-Annual (Every 6 months)</option>
            <option value="annual">Annual (Every year)</option>
            <option value="custom">Custom Interval</option>
          </select>
        </div>

        {/* Custom Days Input */}
        {schedule.frequency === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Interval (Days)
            </label>
            <Input
              type="number"
              value={schedule.custom_days}
              onChange={(e) => setSchedule({ ...schedule, custom_days: parseInt(e.target.value) })}
              min={1}
              placeholder="e.g., 45 days"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter number of days between maintenance visits
            </p>
          </div>
        )}

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Maintenance Date *
          </label>
          <Input
            type="date"
            value={schedule.start_date}
            onChange={(e) => setSchedule({ ...schedule, start_date: e.target.value })}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            The system will auto-schedule subsequent visits based on frequency
          </p>
        </div>

        {/* Maintenance Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maintenance Type
          </label>
          <select
            value={schedule.maintenance_type}
            onChange={(e) => setSchedule({ ...schedule, maintenance_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="preventive">Preventive Maintenance</option>
            <option value="cleaning">Cleaning & Inspection</option>
            <option value="full_service">Full Service</option>
            <option value="custom">Custom Service</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={schedule.notes}
            onChange={(e) => setSchedule({ ...schedule, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Any special instructions or requirements..."
          />
        </div>

        {/* Info Box */}
        <Alert className="bg-blue-50 border-blue-200">
          <Clock className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Example for Monthly:</strong> If you set first date as Jan 15, 2025,
            next maintenance will be auto-scheduled for Feb 15, Mar 15, and so on.
          </AlertDescription>
        </Alert>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving || !schedule.start_date}
          className="w-full"
        >
          {saving ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Maintenance Schedule
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
