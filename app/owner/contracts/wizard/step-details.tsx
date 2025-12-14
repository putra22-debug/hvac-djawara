"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContractFormData } from "../contract-wizard";

interface ContractStepDetailsProps {
  formData: Partial<ContractFormData>;
  updateFormData: (data: Partial<ContractFormData>) => void;
}

export function ContractStepDetails({
  formData,
  updateFormData,
}: ContractStepDetailsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Detail Kontrak</h3>
        <p className="text-sm text-muted-foreground">
          Informasi dasar kontrak maintenance
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nomor Kontrak *</Label>
          <Input
            placeholder="MC-BP-2025-001"
            value={formData.contract_number || ""}
            onChange={(e) => updateFormData({ contract_number: e.target.value })}
          />
        </div>

        <div>
          <Label>Marketing Partner</Label>
          <Input
            placeholder="Nama marketing freelance"
            value={formData.marketing_partner_name || ""}
            onChange={(e) =>
              updateFormData({ marketing_partner_name: e.target.value })
            }
          />
        </div>

        <div>
          <Label>Tanggal Mulai *</Label>
          <Input
            type="date"
            value={formData.start_date || ""}
            onChange={(e) => updateFormData({ start_date: e.target.value })}
          />
        </div>

        <div>
          <Label>Tanggal Selesai *</Label>
          <Input
            type="date"
            value={formData.end_date || ""}
            onChange={(e) => updateFormData({ end_date: e.target.value })}
          />
        </div>

        <div>
          <Label>Jenis Pekerjaan</Label>
          <Select
            value={formData.job_type || "maintenance"}
            onValueChange={(value) => updateFormData({ job_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="checking">Checking</SelectItem>
              <SelectItem value="survey">Survey</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Kategori Pekerjaan</Label>
          <Select
            value={formData.job_category || "commercial"}
            onValueChange={(value) => updateFormData({ job_category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="industrial">Industrial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Catatan Service</Label>
        <Textarea
          placeholder="Deskripsi lingkup pekerjaan, unit yang di-service, dll"
          rows={4}
          value={formData.service_notes || ""}
          onChange={(e) => updateFormData({ service_notes: e.target.value })}
        />
      </div>
    </div>
  );
}
