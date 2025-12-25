import { NextResponse } from 'next/server'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

type Body = {
  tenantId: string
  membershipId: string
  userId: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as Partial<Body>
    const tenantId = String(body?.tenantId || '').trim()
    const membershipId = String(body?.membershipId || '').trim()
    const userId = String(body?.userId || '').trim()

    if (!tenantId || !membershipId || !userId) {
      return NextResponse.json({ error: 'Missing tenantId, membershipId, or userId' }, { status: 400 })
    }

    const { data: roleRow, error: roleError } = await supabase
      .from('user_tenant_roles')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 })
    }

    if (!roleRow || !['owner', 'admin_finance', 'admin_logistic', 'tech_head'].includes(roleRow.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    const { error: deleteRoleError } = await admin
      .from('user_tenant_roles')
      .delete()
      .eq('id', membershipId)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)

    if (deleteRoleError) {
      return NextResponse.json({ error: deleteRoleError.message }, { status: 500 })
    }

    // Best-effort cleanup for technician portal access.
    // (Helper/Magang are mapped into technicians as 'technician'.)
    await admin.from('technicians').delete().eq('tenant_id', tenantId).eq('user_id', userId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in remove-member API:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
