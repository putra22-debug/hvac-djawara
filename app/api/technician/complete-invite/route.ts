import { NextResponse } from 'next/server'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = String(user.email || '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      )
    }

    const admin = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: technician, error: techError } = await admin
      .from('technicians')
      .select('id, tenant_id, user_id, is_verified, role, full_name, phone, email')
      .eq('email', email)
      .maybeSingle()

    if (techError) {
      return NextResponse.json({ error: techError.message }, { status: 500 })
    }

    if (!technician) {
      return NextResponse.json(
        { error: 'Technician not found for this email' },
        { status: 404 }
      )
    }

    if (technician.user_id && technician.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Technician email already linked to another account' },
        { status: 409 }
      )
    }

    if (technician.is_verified && technician.user_id === user.id) {
      return NextResponse.json({ success: true, alreadyCompleted: true })
    }

    const { error: updateError } = await admin
      .from('technicians')
      .update({
        user_id: user.id,
        is_verified: true,
        verification_token: null,
        token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', technician.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const fullName = (technician.full_name || email.split('@')[0] || 'Technician').slice(0, 100)
    const phone = technician.phone || null

    const { error: profileUpsertError } = await admin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: fullName,
          phone,
          active_tenant_id: technician.tenant_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (profileUpsertError) {
      // non-fatal
      console.error('Profile upsert error:', profileUpsertError)
    }

    const roleMap: Record<string, string> = {
      technician: 'technician',
      supervisor: 'supervisor',
      team_lead: 'tech_head',
    }
    const tenantRole = roleMap[String(technician.role || 'technician')] || 'technician'

    const { data: existingRole, error: existingRoleError } = await admin
      .from('user_tenant_roles')
      .select('id')
      .eq('tenant_id', technician.tenant_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingRoleError) {
      console.error('Check existing role error:', existingRoleError)
    } else if (!existingRole) {
      const { error: insertRoleError } = await admin.from('user_tenant_roles').insert({
        tenant_id: technician.tenant_id,
        user_id: user.id,
        role: tenantRole as any,
        is_active: true,
        assigned_at: new Date().toISOString(),
      })

      if (insertRoleError) {
        console.error('Insert user_tenant_roles error:', insertRoleError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in complete-invite API:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
