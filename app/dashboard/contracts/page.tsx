// ============================================
// Contract Management - Redirect to Contract Requests
// Unified contract management interface
// ============================================

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function ContractsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to contract-requests page
    router.push('/dashboard/contract-requests')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to Contract Requests...</p>
      </div>
    </div>
  )
}
