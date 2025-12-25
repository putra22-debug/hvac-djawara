import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

type Body = {
  notes?: string | null;
};

function parseTimeToMinutes(value: string) {
  const trimmed = String(value || "").trim();
  const [h, m] = trimmed.split(":");
  const hour = Number(h || 0);
  const minute = Number(m || 0);
  return hour * 60 + minute;
}

function getJakartaMinutes(isoTs: string) {
  const dt = new Date(isoTs);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(dt);

  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function getJakartaDateISO(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) return now.toISOString().slice(0, 10);
  return `${year}-${month}-${day}`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Body;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const admin = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: tech, error: techError } = await admin
      .from("technicians")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (techError) {
      return NextResponse.json({ error: techError.message }, { status: 500 });
    }

    if (!tech?.tenant_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: config } = await admin
      .from("working_hours_config")
      .select("work_start_time, work_end_time")
      .eq("tenant_id", tech.tenant_id)
      .maybeSingle();

    const startMinutes = parseTimeToMinutes(String(config?.work_start_time || "09:00:00"));

    const today = getJakartaDateISO();
    const now = new Date().toISOString();
    const isLate = getJakartaMinutes(now) > startMinutes;

    const { data: existing, error: existingError } = await admin
      .from("daily_attendance")
      .select("id, clock_in_time, clock_out_time")
      .eq("tenant_id", tech.tenant_id)
      .eq("technician_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing?.clock_in_time) {
      return NextResponse.json(
        { error: "Sudah clock-in untuk hari ini" },
        { status: 409 }
      );
    }

    if (existing?.id) {
      const { data: updated, error: updateError } = await admin
        .from("daily_attendance")
        .update({
          clock_in_time: now,
          work_start_time: now,
          is_late: isLate,
          is_early_leave: false,
          is_auto_checkout: false,
          notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        })
        .eq("id", existing.id)
        .select(
          "id, date, clock_in_time, clock_out_time, total_work_hours, is_late, is_early_leave, is_auto_checkout, notes"
        )
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, row: updated });
    }

    const { data: inserted, error: insertError } = await admin
      .from("daily_attendance")
      .insert({
        tenant_id: tech.tenant_id,
        technician_id: user.id,
        date: today,
        clock_in_time: now,
        work_start_time: now,
        is_late: isLate,
        is_early_leave: false,
        is_auto_checkout: false,
        notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
      })
      .select(
        "id, date, clock_in_time, clock_out_time, total_work_hours, is_late, is_early_leave, is_auto_checkout, notes"
      )
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, row: inserted });
  } catch (error: any) {
    console.error("Error in technician attendance clock-in API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
