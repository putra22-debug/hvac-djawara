import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getBaseUrl(req: NextRequest) {
  const url = new URL(req.url);
  const originFromHeader = req.headers.get("x-forwarded-host")
    ? `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host")}`
    : req.headers.get("origin");
  return originFromHeader || url.origin;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    // Create Supabase Admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { email, password, token } = await request.json();

    // Validate input
    if (!email || !password || !token) {
      return NextResponse.json(
        { error: "Email, token, dan password harus diisi" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const nextPassword = String(password).trim();
    const nextToken = String(token).trim();

    if (nextPassword.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    // Get technician by email (token already verified in step 1)
    const { data: technician, error: techError } = await supabaseAdmin
      .from("technicians")
      .select("id, tenant_id, user_id, role, full_name, phone, verification_token, token_expires_at")
      .eq("email", normalizedEmail)
      .single();

    if (techError || !technician) {
      return NextResponse.json(
        { error: "Teknisi tidak ditemukan" },
        { status: 400 }
      );
    }

    // Verify token matches
    if (!technician.verification_token || nextToken !== technician.verification_token) {
      return NextResponse.json(
        { error: "Token tidak valid" },
        { status: 400 }
      );
    }

    // Verify token expiry if present
    if (technician.token_expires_at) {
      const expiresAt = new Date(technician.token_expires_at as any).getTime();
      if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
        return NextResponse.json(
          { error: "Token tidak valid atau sudah expired" },
          { status: 400 }
        );
      }
    }

    const fullName = (technician.full_name || normalizedEmail.split("@")[0] || "Technician").slice(0, 100);
    const phone = technician.phone || null;

    // If user already exists/linked, set password for that existing auth user.
    // This fixes the case: "Akun sudah terdaftar" but technician cannot login.
    if (technician.user_id) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        technician.user_id,
        {
          password: nextPassword,
          email_confirm: true,
        }
      );

      if (updateAuthError) {
        return NextResponse.json(
          { error: updateAuthError.message || "Gagal set password" },
          { status: 500 }
        );
      }

      const { error: updateTechError } = await supabaseAdmin
        .from("technicians")
        .update({
          is_verified: true,
          verification_token: null,
          token_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", technician.id);

      if (updateTechError) {
        console.error("Update technician error:", updateTechError);
      }

      const { error: profileUpsertError } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: technician.user_id,
            full_name: fullName,
            phone,
            active_tenant_id: technician.tenant_id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (profileUpsertError) {
        console.error("Profile upsert error:", profileUpsertError);
      }

      const roleMap: Record<string, string> = {
        technician: "technician",
        supervisor: "supervisor",
        team_lead: "tech_head",
      };
      const tenantRole = roleMap[String(technician.role || "technician")] || "technician";

      const { data: existingRole, error: existingRoleError } = await supabaseAdmin
        .from("user_tenant_roles")
        .select("id")
        .eq("tenant_id", technician.tenant_id)
        .eq("user_id", technician.user_id)
        .maybeSingle();

      if (existingRoleError) {
        console.error("Check existing role error:", existingRoleError);
      } else if (!existingRole) {
        const { error: insertRoleError } = await supabaseAdmin
          .from("user_tenant_roles")
          .insert({
            tenant_id: technician.tenant_id,
            user_id: technician.user_id,
            role: tenantRole as any,
            is_active: true,
            assigned_at: new Date().toISOString(),
          });

        if (insertRoleError) {
          console.error("Insert user_tenant_roles error:", insertRoleError);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Password berhasil diatur. Silakan login.",
        user_id: technician.user_id,
        login_url: `${getBaseUrl(request)}/technician/login?email=${encodeURIComponent(normalizedEmail)}`,
      });
    }

    // Create user with admin client (email auto-confirmed)
    const { data: authData, error: signUpError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: nextPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          role: "technician",
          is_technician: true,
        },
      });

    if (signUpError) {
      console.error("Sign up error:", signUpError);
      
      // Check if error is due to user already existing
      if (signUpError.message?.includes("already been registered")) {
        return NextResponse.json(
          { 
            error: "Akun sudah terdaftar",
            already_exists: true,
            message: "Akun Anda sudah terdaftar. Silakan login dengan email dan password yang telah dibuat."
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: signUpError?.message || "Gagal membuat akun" },
        { status: 500 }
      );
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { error: "Gagal membuat akun" },
        { status: 500 }
      );
    }

    // Update technician record with user_id
    const { error: updateError } = await supabaseAdmin
      .from("technicians")
      .update({
        user_id: authData.user.id,
        is_verified: true,
        verification_token: null,
        token_expires_at: null,
      })
      .eq("id", technician.id);

    if (updateError) {
      console.error("Update error:", updateError);
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Gagal mengupdate data teknisi" },
        { status: 500 }
      );
    }

    // Ensure profile exists for People Management / team hierarchy
    const { error: profileUpsertError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: authData.user.id,
          full_name: fullName,
          phone,
          active_tenant_id: technician.tenant_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (profileUpsertError) {
      console.error("Profile upsert error:", profileUpsertError);
      // Non-fatal: account already created and technician verified
    }

    // Ensure user has a tenant role entry (so they appear in get_team_members)
    // Map technician system roles to user_role enum values.
    const roleMap: Record<string, string> = {
      technician: "technician",
      supervisor: "supervisor",
      team_lead: "tech_head",
    };
    const tenantRole = roleMap[String(technician.role || "technician")] || "technician";

    const { data: existingRole, error: existingRoleError } = await supabaseAdmin
      .from("user_tenant_roles")
      .select("id")
      .eq("tenant_id", technician.tenant_id)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (existingRoleError) {
      console.error("Check existing role error:", existingRoleError);
    } else if (!existingRole) {
      const { error: insertRoleError } = await supabaseAdmin
        .from("user_tenant_roles")
        .insert({
          tenant_id: technician.tenant_id,
          user_id: authData.user.id,
          role: tenantRole as any,
          is_active: true,
          assigned_at: new Date().toISOString(),
        });

      if (insertRoleError) {
        console.error("Insert user_tenant_roles error:", insertRoleError);
        // Non-fatal
      }
    }

    return NextResponse.json({
      success: true,
      message: "Akun berhasil dibuat! Silakan login.",
      user_id: authData.user.id,
      login_url: `${getBaseUrl(request)}/technician/login?email=${encodeURIComponent(normalizedEmail)}`,
    });
  } catch (error: any) {
    console.error("Create account error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
