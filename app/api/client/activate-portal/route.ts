// ============================================
// API: Activate Client Portal
// Create auth user and activate portal
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { token, email, password, client_id } = await request.json()

    if (!token || !email || !password || !client_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 1. Validate token again (double-check)
    const { data: validation } = await adminClient
      .rpc('validate_invitation_token', { p_token: token })
      .single()

    if (!validation?.is_valid || validation.client_id !== client_id) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invitation' },
        { status: 400 }
      )
    }

    // 2. Create auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm (staff already verified)
      user_metadata: {
        client_id: client_id,
        account_type: 'client',
        client_name: validation.client_name,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 }
      )
    }

    // 3. Activate portal & clear token
    const { error: activateError } = await adminClient
      .rpc('activate_client_portal', {
        p_client_id: client_id,
        p_portal_email: email,
      })

    if (activateError) {
      console.error('Activate error:', activateError)
      // Rollback: delete auth user
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json(
        { success: false, error: 'Failed to activate portal' },
        { status: 500 }
      )
    }

    // 4. Log activity
    await adminClient
      .from('client_portal_activities')
      .insert({
        client_id: client_id,
        activity_type: 'portal_activated',
        metadata: {
          invited_via: 'invitation_link',
          activated_at: new Date().toISOString(),
        },
      })
      .catch(() => {}) // Non-critical

    return NextResponse.json({
      success: true,
      message: 'Portal activated successfully',
      auth_user_id: authUser.user.id,
    })
  } catch (error) {
    console.error('Error in activate-portal:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
