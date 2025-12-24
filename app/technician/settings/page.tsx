"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User } from "lucide-react";

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  active_tenant_id?: string | null;
};

type TechnicianRow = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  status: string;
  is_verified: boolean;
};

export default function TechnicianSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [technician, setTechnician] = useState<TechnicianRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("Session tidak valid. Silakan login ulang.");
          return;
        }

        setEmail(user.email ?? null);

        const { data: techData, error: techError } = await supabase
          .from("technicians")
          .select("id, tenant_id, user_id, full_name, phone, role, status, is_verified")
          .eq("user_id", user.id)
          .single();

        if (techError || !techData) {
          setError("Data teknisi tidak ditemukan. Hubungi admin.");
          return;
        }

        setTechnician(techData as TechnicianRow);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, phone, avatar_url, active_tenant_id")
          .eq("id", user.id)
          .maybeSingle();

        setProfile((profileData as ProfileRow | null) ?? null);

        // Keep RLS context aligned (same pattern as technician dashboard)
        if (techData.tenant_id) {
          await supabase
            .from("profiles")
            .update({ active_tenant_id: techData.tenant_id })
            .eq("id", user.id);
        }
      } catch (e: any) {
        console.error("Technician settings load error:", e);
        setError(e?.message || "Gagal memuat pengaturan.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-500 mt-1">Data diri & preferensi teknisi</p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Tidak bisa memuat data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700">Nama</div>
              <div className="mt-1 text-gray-900">
                {technician?.full_name || profile?.full_name || "-"}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">Email</div>
              <div className="mt-1 text-gray-900">{email || "-"}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">No. HP</div>
              <div className="mt-1 text-gray-900">
                {technician?.phone || profile?.phone || "-"}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {technician?.role && <Badge variant="secondary">Role: {technician.role}</Badge>}
              {typeof technician?.is_verified === "boolean" && (
                <Badge variant={technician.is_verified ? "success" : "warning"}>
                  {technician.is_verified ? "Terverifikasi" : "Belum verifikasi"}
                </Badge>
              )}
              {technician?.status && <Badge variant="outline">Status: {technician.status}</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dokumen & Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600">
              Pengaturan alamat, upload KTP, dan informasi bank/virtual account akan diaktifkan
              setelah schema + storage + sinkronisasi admin selesai.
            </p>
            <p className="text-sm text-gray-500">Status: <span className="font-medium">Coming soon</span></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
