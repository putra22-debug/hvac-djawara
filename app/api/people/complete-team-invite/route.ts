import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase()
}

async function findAuthUserIdByEmail(
  adminClient: any,
  email: string
): Promise<string | null> {
  // Supabase JS doesn't provide a guaranteed getUserByEmail in all versions.
  // Fallback: scan users list (bounded) to find matching email.
  const target = normalizeEmail(email)
  if (!target) return null

  const perPage = 100
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw error
    }

    const found = (data?.users || []).find((u: any) => normalizeEmail(u.email || '') === target)
    if (found?.id) return found.id

    if ((data?.users || []).length < perPage) {
      break
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      )
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const body = (await request.json()) as { token?: string; password?: string }
    const token = String(body?.token || '').trim()
    const password = String(body?.password || '').trim()

    if (!token || !password) {
      return NextResponse.json({ error: 'Missing token or password' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    const { data: invitation, error: inviteError } = await adminClient
      .from('team_invitations')
      .select('id, tenant_id, email, full_name, phone, role, expires_at, status, user_id')
      .eq('token', token)
      .maybeSingle()

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    if (!invitation) {
      return NextResponse.json({ error: 'Undangan tidak ditemukan' }, { status: 404 })
    }

    if (invitation.status !== 'pending' || invitation.user_id) {
      return NextResponse.json({ error: 'Undangan sudah digunakan / tidak valid' }, { status: 409 })
    }

    if (invitation.expires_at) {
      const exp = new Date(invitation.expires_at as any).getTime()
      if (Number.isFinite(exp) && Date.now() > exp) {
        return NextResponse.json({ error: 'Undangan sudah expired' }, { status: 410 })
      }
    }

    const email = normalizeEmail(invitation.email)
    if (!email) {
      return NextResponse.json({ error: 'Email undangan tidak valid' }, { status: 400 })
    }

    let userId: string | null = null

    // Create auth user (or update existing)
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: invitation.role,
        tenant_id: invitation.tenant_id,
        invited_via: 'team_invitations',
      },
    })

    if (createError) {
      // Common case: user already exists
      if (String(createError.message || '').toLowerCase().includes('already')) {
        const existingId = await findAuthUserIdByEmail(adminClient, email)
        if (!existingId) {
          return NextResponse.json(
            { error: 'Akun sudah terdaftar, tapi tidak bisa ditemukan untuk update password' },
            { status: 409 }
          )
        }

        const { error: updateError } = await adminClient.auth.admin.updateUserById(existingId, {
          password,
          email_confirm: true,
        })

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        userId = existingId
      } else {
        return NextResponse.json({ error: createError.message }, { status: 400 })
      }
    } else {
      userId = created?.user?.id || null
    }

    if (!userId) {
      return NextResponse.json({ error: 'Gagal membuat akun' }, { status: 500 })
    }

    // Mark invitation accepted
    const nowIso = new Date().toISOString()
    const { error: updateInviteError } = await adminClient
      .from('team_invitations')
      .update({
        status: 'accepted',
        accepted_at: nowIso,
        user_id: userId,
        updated_at: nowIso,
      })
      .eq('id', invitation.id)

    if (updateInviteError) {
      console.error('Update invitation error:', updateInviteError)
    }

    // Ensure profile exists
    const fullName = String(invitation.full_name || email.split('@')[0] || 'User').slice(0, 100)
    const phone = invitation.phone || null

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: userId,
          full_name: fullName,
          phone,
          active_tenant_id: invitation.tenant_id,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      console.error('Profile upsert error:', profileError)
    }

    // Ensure tenant role exists
    const { data: existingRole, error: existingRoleError } = await adminClient
      .from('user_tenant_roles')
      .select('id')
      .eq('tenant_id', invitation.tenant_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingRoleError) {
      console.error('Check existing role error:', existingRoleError)
    } else if (!existingRole) {
      const { error: insertRoleError } = await adminClient.from('user_tenant_roles').insert({
        tenant_id: invitation.tenant_id,
        user_id: userId,
        role: invitation.role as any,
        is_active: true,
        assigned_at: nowIso,
      })

      if (insertRoleError) {
        console.error('Insert user_tenant_roles error:', insertRoleError)
      }
    }

    // Decide redirect target
    const role = String(invitation.role || '')
    const redirectTo = ['technician', 'helper', 'magang', 'supervisor', 'team_lead'].includes(role)
      ? '/technician/login?email=' + encodeURIComponent(email)
      : '/login?email=' + encodeURIComponent(email)

    return NextResponse.json({ success: true, userId, redirectTo })
  } catch (error: any) {
    console.error('Error in complete-team-invite API:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
