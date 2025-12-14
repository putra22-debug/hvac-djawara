"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function RequestContractPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    province: "",
    unit_count: "",
    location_count: "1",
    preferred_frequency: "monthly",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      
      const { error } = await supabase.from("contract_requests").insert({
        company_name: formData.company_name,
        contact_person: formData.contact_person,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        unit_count: parseInt(formData.unit_count),
        location_count: parseInt(formData.location_count),
        preferred_frequency: formData.preferred_frequency,
        notes: formData.notes,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Permintaan kontrak berhasil dikirim! Tim kami akan segera menghubungi Anda.");
      
      // Reset form
      setFormData({
        company_name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        province: "",
        unit_count: "",
        location_count: "1",
        preferred_frequency: "monthly",
        notes: "",
      });
    } catch (error: any) {
      console.error("Error submitting contract request:", error);
      toast.error("Gagal mengirim permintaan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Ajukan Kontrak Maintenance AC</h1>
          <p className="text-lg text-muted-foreground">
            Layanan perawatan AC berkala untuk perusahaan Anda
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form Permintaan Kontrak</CardTitle>
            <CardDescription>
              Isi data di bawah ini, tim kami akan menghubungi Anda untuk penawaran terbaik
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informasi Perusahaan</h3>
                
                <div>
                  <Label htmlFor="company_name">Nama Perusahaan *</Label>
                  <Input
                    id="company_name"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="PT. Contoh Jaya"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_person">Nama Kontak *</Label>
                    <Input
                      id="contact_person"
                      required
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      placeholder="Bapak/Ibu..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">No. Telepon *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="08123456789"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@perusahaan.com"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Alamat</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Alamat lengkap perusahaan..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Kota</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Purbalingga"
                    />
                  </div>

                  <div>
                    <Label htmlFor="province">Provinsi</Label>
                    <Input
                      id="province"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      placeholder="Jawa Tengah"
                    />
                  </div>
                </div>
              </div>

              {/* Contract Details */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg">Detail Kontrak</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unit_count">Jumlah Unit AC *</Label>
                    <Input
                      id="unit_count"
                      type="number"
                      required
                      min="1"
                      value={formData.unit_count}
                      onChange={(e) => setFormData({ ...formData, unit_count: e.target.value })}
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location_count">Jumlah Lokasi/Cabang</Label>
                    <Input
                      id="location_count"
                      type="number"
                      min="1"
                      value={formData.location_count}
                      onChange={(e) => setFormData({ ...formData, location_count: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="preferred_frequency">Frekuensi Perawatan yang Diinginkan</Label>
                  <Select
                    value={formData.preferred_frequency}
                    onValueChange={(value) => setFormData({ ...formData, preferred_frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Bulanan (Setiap Bulan)</SelectItem>
                      <SelectItem value="quarterly">3 Bulan Sekali</SelectItem>
                      <SelectItem value="semi_annual">6 Bulan Sekali</SelectItem>
                      <SelectItem value="custom">Sesuai Kebutuhan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Catatan Tambahan</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Informasi tambahan seperti jenis unit, ruangan khusus (ATM, server, dll), atau kebutuhan spesifik lainnya..."
                    rows={4}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Mengirim..." : "Kirim Permintaan Kontrak"}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Tim kami akan menghubungi Anda dalam 1x24 jam untuk penawaran dan detail kontrak
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
