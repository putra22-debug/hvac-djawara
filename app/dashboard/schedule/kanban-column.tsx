import { useDroppable } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface KanbanColumnProps {
  id: string
  title: string
  count: number
  color: string
  description?: string
  children: React.ReactNode
}

export default function KanbanColumn({ id, title, count, color, description, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <Card 
      ref={setNodeRef}
      className={`${color} ${isOver ? 'ring-2 ring-blue-400' : ''} transition-all`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary" className="ml-2">
            {count}
          </Badge>
        </CardTitle>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2 min-h-[450px]">
        {children}
      </CardContent>
    </Card>
  )
}
