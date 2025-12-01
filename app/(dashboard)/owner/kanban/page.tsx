import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kanban - Djawara HVAC',
  description: 'Job board kanban view',
}

export default function KanbanPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Kanban Board</h1>
        <p className="text-gray-600">Track job progress</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Kanban board (To Do → In Progress → Done → Invoiced)</p>
      </div>
    </div>
  )
}
