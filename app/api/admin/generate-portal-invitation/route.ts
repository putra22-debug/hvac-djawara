// ============================================
// API: Generate Portal Invitation
// Called by staff from dashboard
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createServiceClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is staff
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { client_id } = await request.json()

    if (!client_id) {
      return NextResponse.json(
        { success: false, error: 'Missing client_id' },
        { status: 400 }
      )
    }

    // Generate invitation using function
    const { data, error } = await adminClient
      .rpc('generate_portal_invitation', {
        p_client_id: client_id,
        p_generated_by: user.id,
        p_validity_days: 7,
      })
      .single()

    if (error) {
      console.error('Error generating invitation:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      token: data.token,
      invitation_link: data.invitation_link,
      expires_at: data.expires_at,
    })
  } catch (error) {
    console.error('Error in generate-portal-invitation:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
