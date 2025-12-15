import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { order_id, new_date, reason } = body

    if (!order_id || !new_date) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, new_date' },
        { status: 400 }
      )
    }

    // Call reschedule function
    const { data, error } = await supabase.rpc('reschedule_maintenance_order', {
      p_order_id: order_id,
      p_new_date: new_date,
      p_reason: reason || null,
    })

    if (error) {
      console.error('Error rescheduling:', error)
      return NextResponse.json(
        { error: 'Failed to reschedule order', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Order rescheduled successfully',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
