import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Schedule - Djawara HVAC',
  description: 'Schedule and manage jobs',
}

export default function SchedulePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Schedule</h1>
        <p className="text-gray-600">Calendar view of scheduled jobs</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Calendar will be displayed here</p>
      </div>
    </div>
  )
}
