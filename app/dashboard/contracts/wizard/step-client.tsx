"use client";

import { useClients } from "@/hooks/use-clients";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContractFormData } from "../contract-wizard";

interface ContractStepClientProps {
  formData: Partial<ContractFormData>;
  updateFormData: (data: Partial<ContractFormData>) => void;
}

export function ContractStepClient({
  formData,
  updateFormData,
}: ContractStepClientProps) {
  const { clients, loading } = useClients();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Pilih Client</h3>
        <p className="text-sm text-muted-foreground">
          Pilih client yang akan dikontrak untuk maintenance berkala
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Client *</Label>
          <Select
            value={formData.client_id}
            onValueChange={(value) => updateFormData({ client_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih client..." />
            </SelectTrigger>
            <SelectContent>
              {loading && <SelectItem value="loading">Loading...</SelectItem>}
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name} {client.city && `- ${client.city}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.client_id && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium">Client terpilih:</p>
            <p className="text-sm text-muted-foreground mt-1">
              {clients.find((c) => c.id === formData.client_id)?.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
