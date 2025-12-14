"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ContractList } from "./contract-list";
import { ContractWizard } from "./contract-wizard";

export default function ContractsPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kontrak Maintenance</h1>
          <p className="text-muted-foreground mt-1">
            Kelola kontrak perawatan berkala dengan client
          </p>
        </div>
        <Button onClick={() => setIsWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Buat Kontrak Baru
        </Button>
      </div>

      {/* Contract List */}
      <ContractList />

      {/* Contract Creation Wizard */}
      <ContractWizard
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </div>
  );
}
