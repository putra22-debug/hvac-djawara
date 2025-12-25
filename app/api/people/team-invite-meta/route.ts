import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function normalizeToken(token: string) {
  return String(token || "").trim();
}

function computeValidity(invitation: any) {
  if (!invitation) return { isValid: false, reason: "Undangan tidak ditemukan" };
  if (invitation.status !== "pending") {
    return { isValid: false, reason: "Undangan sudah digunakan / tidak valid" };
  }
  if (invitation.user_id) {
    return { isValid: false, reason: "Undangan sudah digunakan / tidak valid" };
  }
  if (invitation.expires_at) {
    const exp = new Date(invitation.expires_at as any).getTime();
    if (Number.isFinite(exp) && Date.now() > exp) {
      return { isValid: false, reason: "Undangan sudah expired" };
    }
  }
  return { isValid: true, reason: null as string | null };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const body = (await request.json().catch(() => null)) as { token?: string } | null;
    const token = normalizeToken(body?.token || "");

    if (!token) {
      return NextResponse.json({
        invitation: null,
        isValid: false,
        reason: "Link undangan tidak valid",
      });
    }

    const { data: invitation, error } = await adminClient
      .from("team_invitations")
      .select("id, tenant_id, email, full_name, phone, role, token, expires_at, status, user_id")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const validity = computeValidity(invitation);
    return NextResponse.json({ invitation: invitation || null, ...validity });
  } catch (error: any) {
    console.error("Error in team-invite-meta API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
