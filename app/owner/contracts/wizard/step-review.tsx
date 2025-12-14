"use client";

import { ContractFormData } from "../contract-wizard";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface ContractStepReviewProps {
  formData: Partial<ContractFormData>;
  updateFormData: (data: Partial<ContractFormData>) => void;
}

export function ContractStepReview({ formData }: ContractStepReviewProps) {
  const units = formData.units || [];
  const locations = formData.locations || [];
  
  const totalCost = units.reduce((sum, u) => sum + (u.cost_price || 0), 0);
  const totalSelling = units.reduce((sum, u) => sum + (u.selling_price || 0), 0);
  const totalMargin = totalSelling - totalCost;

  // Calculate services per year
  const servicesPerYear = units.reduce((sum, u) => {
    const monthsInYear = 12;
    const frequency = u.frequency_months || 1;
    return sum + Math.floor(monthsInYear / frequency);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Kontrak</h3>
        <p className="text-sm text-muted-foreground">
          Periksa kembali detail kontrak sebelum disimpan
        </p>
      </div>

      <div className="grid gap-6">
        {/* Contract Info */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Informasi Kontrak
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Nomor Kontrak</p>
              <p className="font-medium">{formData.contract_number}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Marketing Partner</p>
              <p className="font-medium">{formData.marketing_partner_name || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Periode</p>
              <p className="font-medium">
                {formData.start_date} s/d {formData.end_date}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Kategori</p>
              <p className="font-medium">{formData.job_category}</p>
            </div>
          </div>
        </div>

        {/* Locations */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Lokasi ({locations.length})
          </h4>
          <div className="space-y-2">
            {locations.map((loc, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium">{loc.location_name}</p>
                <p className="text-muted-foreground text-xs">
                  {loc.city}, {loc.province}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Units Summary */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Unit AC ({units.length})
          </h4>
          <div className="space-y-2">
            {locations.map((loc, locIndex) => {
              const locUnits = units.filter((u) => u.location_index === locIndex);
              if (locUnits.length === 0) return null;
              
              return (
                <div key={locIndex} className="text-sm">
                  <p className="font-medium">{loc.location_name}</p>
                  <ul className="list-disc list-inside text-muted-foreground text-xs ml-2">
                    {locUnits.map((unit, i) => (
                      <li key={i}>
                        {unit.room_name} ({unit.unit_category}) -{" "}
                        {unit.maintenance_frequency === "monthly" && "Bulanan"}
                        {unit.maintenance_frequency === "quarterly" && "3 Bulan"}
                        {unit.maintenance_frequency === "custom_months" && `${unit.frequency_months} Bulan`}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="border rounded-lg p-4 bg-primary/5">
          <h4 className="font-semibold mb-3">Ringkasan Keuangan</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Unit</span>
              <span className="font-medium">{units.length} unit</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service per Tahun</span>
              <span className="font-medium">{servicesPerYear} kali</span>
            </div>
            <div className="border-t pt-2 mt-2"></div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Cost</span>
              <span className="font-medium">{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Selling</span>
              <span className="font-medium">{formatCurrency(totalSelling)}</span>
            </div>
            <div className="border-t pt-2 mt-2"></div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total Margin</span>
              <span className="text-primary">{formatCurrency(totalMargin)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
