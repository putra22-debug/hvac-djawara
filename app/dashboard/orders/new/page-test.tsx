'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function NewOrderPage() {
  const router = useRouter()
  const [test] = useState('Page is rendering!')

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Test Page</h1>
            <p className="text-gray-500">{test}</p>
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-6">
          <p>If you can see this, the page is working!</p>
          <p className="mt-2">Next step: Add form components...</p>
        </div>
      </div>
    </div>
  )
}
