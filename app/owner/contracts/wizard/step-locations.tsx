"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { ContractFormData } from "../contract-wizard";

interface ContractStepLocationsProps {
  formData: Partial<ContractFormData>;
  updateFormData: (data: Partial<ContractFormData>) => void;
}

export function ContractStepLocations({
  formData,
  updateFormData,
}: ContractStepLocationsProps) {
  const locations = formData.locations || [];

  const addLocation = () => {
    updateFormData({
      locations: [
        ...locations,
        {
          location_name: "",
          address: "",
          city: "",
          province: "",
          contact_person: "",
          contact_phone: "",
        },
      ],
    });
  };

  const removeLocation = (index: number) => {
    updateFormData({
      locations: locations.filter((_, i) => i !== index),
    });
  };

  const updateLocation = (index: number, field: string, value: string) => {
    const updated = [...locations];
    updated[index] = { ...updated[index], [field]: value };
    updateFormData({ locations: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">Lokasi / Cabang</h3>
          <p className="text-sm text-muted-foreground">
            Tambahkan lokasi atau cabang yang akan di-service
          </p>
        </div>
        <Button onClick={addLocation} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Lokasi
        </Button>
      </div>

      {locations.length === 0 && (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">Belum ada lokasi ditambahkan.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Klik tombol "Tambah Lokasi" untuk memulai.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {locations.map((location, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Lokasi {index + 1}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeLocation(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nama Lokasi *</Label>
                <Input
                  placeholder="Cabang Purbalingga"
                  value={location.location_name}
                  onChange={(e) =>
                    updateLocation(index, "location_name", e.target.value)
                  }
                />
              </div>

              <div className="col-span-2">
                <Label>Alamat</Label>
                <Input
                  placeholder="Jl. Raya..."
                  value={location.address}
                  onChange={(e) =>
                    updateLocation(index, "address", e.target.value)
                  }
                />
              </div>

              <div>
                <Label>Kota</Label>
                <Input
                  placeholder="Purbalingga"
                  value={location.city}
                  onChange={(e) => updateLocation(index, "city", e.target.value)}
                />
              </div>

              <div>
                <Label>Provinsi</Label>
                <Input
                  placeholder="Jawa Tengah"
                  value={location.province}
                  onChange={(e) =>
                    updateLocation(index, "province", e.target.value)
                  }
                />
              </div>

              <div>
                <Label>Nama Kontak</Label>
                <Input
                  placeholder="Pak Hendra"
                  value={location.contact_person}
                  onChange={(e) =>
                    updateLocation(index, "contact_person", e.target.value)
                  }
                />
              </div>

              <div>
                <Label>No. Telepon</Label>
                <Input
                  placeholder="08123456789"
                  value={location.contact_phone}
                  onChange={(e) =>
                    updateLocation(index, "contact_phone", e.target.value)
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
