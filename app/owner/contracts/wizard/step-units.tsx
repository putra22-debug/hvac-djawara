"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { ContractFormData } from "../contract-wizard";

interface ContractStepUnitsProps {
  formData: Partial<ContractFormData>;
  updateFormData: (data: Partial<ContractFormData>) => void;
}

export function ContractStepUnits({
  formData,
  updateFormData,
}: ContractStepUnitsProps) {
  const units = formData.units || [];
  const locations = formData.locations || [];

  const addUnit = () => {
    updateFormData({
      units: [
        ...units,
        {
          location_index: 0,
          unit_category: "split",
          brand: "",
          capacity: "",
          room_name: "",
          room_type: "office",
          maintenance_frequency: "monthly",
          frequency_months: 1,
          cost_price: 35000,
          selling_price: 65000,
        },
      ],
    });
  };

  const removeUnit = (index: number) => {
    updateFormData({
      units: units.filter((_, i) => i !== index),
    });
  };

  const updateUnit = (index: number, field: string, value: any) => {
    const updated = [...units];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate frequency_months
    if (field === "maintenance_frequency") {
      if (value === "monthly") updated[index].frequency_months = 1;
      else if (value === "quarterly") updated[index].frequency_months = 3;
      else if (value === "semi_annual") updated[index].frequency_months = 6;
      else if (value === "annual") updated[index].frequency_months = 12;
    }
    
    updateFormData({ units: updated });
  };

  if (locations.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">
          Tambahkan lokasi terlebih dahulu di step sebelumnya.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">Unit AC</h3>
          <p className="text-sm text-muted-foreground">
            Daftar unit AC yang akan di-maintenance
          </p>
        </div>
        <Button onClick={addUnit} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Unit
        </Button>
      </div>

      {units.length === 0 && (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">Belum ada unit ditambahkan.</p>
        </div>
      )}

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {units.map((unit, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Unit {index + 1}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeUnit(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Lokasi *</Label>
                <Select
                  value={String(unit.location_index)}
                  onValueChange={(value) =>
                    updateUnit(index, "location_index", parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {loc.location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Kategori Unit *</Label>
                <Select
                  value={unit.unit_category}
                  onValueChange={(value) =>
                    updateUnit(index, "unit_category", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="split">Split</SelectItem>
                    <SelectItem value="cassette">Cassette</SelectItem>
                    <SelectItem value="standing_floor">Standing Floor</SelectItem>
                    <SelectItem value="split_duct">Split Duct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipe Ruangan *</Label>
                <Select
                  value={unit.room_type}
                  onValueChange={(value) => updateUnit(index, "room_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atm">ATM</SelectItem>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nama Ruangan</Label>
                <Input
                  placeholder="Ruang ATM 1"
                  value={unit.room_name}
                  onChange={(e) => updateUnit(index, "room_name", e.target.value)}
                />
              </div>

              <div>
                <Label>Brand</Label>
                <Input
                  placeholder="Daikin"
                  value={unit.brand}
                  onChange={(e) => updateUnit(index, "brand", e.target.value)}
                />
              </div>

              <div>
                <Label>Kapasitas</Label>
                <Input
                  placeholder="1 PK"
                  value={unit.capacity}
                  onChange={(e) => updateUnit(index, "capacity", e.target.value)}
                />
              </div>

              <div>
                <Label>Frekuensi *</Label>
                <Select
                  value={unit.maintenance_frequency}
                  onValueChange={(value) =>
                    updateUnit(index, "maintenance_frequency", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                    <SelectItem value="quarterly">3 Bulan</SelectItem>
                    <SelectItem value="semi_annual">6 Bulan</SelectItem>
                    <SelectItem value="annual">Tahunan</SelectItem>
                    <SelectItem value="custom_months">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {unit.maintenance_frequency === "custom_months" && (
                <div>
                  <Label>Setiap (bulan)</Label>
                  <Input
                    type="number"
                    value={unit.frequency_months}
                    onChange={(e) =>
                      updateUnit(index, "frequency_months", parseInt(e.target.value))
                    }
                  />
                </div>
              )}

              <div>
                <Label>Harga Cost</Label>
                <Input
                  type="number"
                  value={unit.cost_price}
                  onChange={(e) =>
                    updateUnit(index, "cost_price", parseFloat(e.target.value))
                  }
                />
              </div>

              <div>
                <Label>Harga Jual</Label>
                <Input
                  type="number"
                  value={unit.selling_price}
                  onChange={(e) =>
                    updateUnit(index, "selling_price", parseFloat(e.target.value))
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
