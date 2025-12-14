"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { ContractStepClient } from "./wizard/step-client";
import { ContractStepDetails } from "./wizard/step-details";
import { ContractStepLocations } from "./wizard/step-locations";
import { ContractStepUnits } from "./wizard/step-units";
import { ContractStepReview } from "./wizard/step-review";
import { useContracts } from "@/hooks/use-contracts";
import { toast } from "sonner";

interface ContractWizardProps {
  open: boolean;
  onClose: () => void;
}

export interface ContractFormData {
  // Step 1: Client
  client_id: string;
  
  // Step 2: Details
  contract_number: string;
  start_date: string;
  end_date: string;
  job_type: string;
  job_category: string;
  service_notes: string;
  marketing_partner_name: string;
  marketing_fee_percentage: number;
  
  // Step 3: Locations
  locations: Array<{
    location_name: string;
    address: string;
    city: string;
    province: string;
    contact_person: string;
    contact_phone: string;
  }>;
  
  // Step 4: Units
  units: Array<{
    location_index: number; // Index to locations array
    unit_category: string;
    brand: string;
    capacity: string;
    room_name: string;
    room_type: string;
    maintenance_frequency: string;
    frequency_months: number;
    cost_price: number;
    selling_price: number;
  }>;
}

const STEPS = [
  { id: 1, name: "Pilih Client", component: ContractStepClient },
  { id: 2, name: "Detail Kontrak", component: ContractStepDetails },
  { id: 3, name: "Lokasi", component: ContractStepLocations },
  { id: 4, name: "Unit AC", component: ContractStepUnits },
  { id: 5, name: "Review", component: ContractStepReview },
];

export function ContractWizard({ open, onClose }: ContractWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<ContractFormData>>({
    locations: [],
    units: [],
    marketing_fee_percentage: 100,
  });
  const { createContract } = useContracts();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const CurrentStepComponent = STEPS[currentStep - 1].component;

  const updateFormData = (data: Partial<ContractFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Calculate totals
      const totalCost = formData.units?.reduce((sum, u) => sum + (u.cost_price || 0), 0) || 0;
      const totalSelling = formData.units?.reduce((sum, u) => sum + (u.selling_price || 0), 0) || 0;
      const totalMargin = totalSelling - totalCost;

      // Determine frequency
      const frequencies = [...new Set(formData.units?.map(u => u.maintenance_frequency))];
      const frequency = frequencies.length === 1 ? frequencies[0] : 'mixed';

      // Create contract
      const contractData = {
        client_id: formData.client_id,
        contract_number: formData.contract_number,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: true,
        frequency,
        job_type: formData.job_type,
        job_category: formData.job_category,
        service_notes: formData.service_notes,
        total_cost_value: totalCost,
        total_selling_value: totalSelling,
        total_margin: totalMargin,
        marketing_partner_name: formData.marketing_partner_name,
        marketing_fee_percentage: formData.marketing_fee_percentage,
        room_count: formData.units?.length || 0,
      };

      const { data: contract, error: contractError } = await createContract(contractData);
      
      if (contractError || !contract) {
        throw new Error(contractError || "Failed to create contract");
      }

      // TODO: Create locations and units in backend
      // This requires additional API endpoints or database function

      toast.success("Kontrak berhasil dibuat!");
      onClose();
      setCurrentStep(1);
      setFormData({ locations: [], units: [], marketing_fee_percentage: 100 });
      
    } catch (error: any) {
      console.error("Error creating contract:", error);
      toast.error(error.message || "Gagal membuat kontrak");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (confirm("Tutup wizard? Data yang sudah diisi akan hilang.")) {
      onClose();
      setCurrentStep(1);
      setFormData({ locations: [], units: [], marketing_fee_percentage: 100 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Kontrak Maintenance Baru</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                    ${
                      currentStep > step.id
                        ? "bg-primary text-primary-foreground"
                        : currentStep === step.id
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                    }
                  `}
                >
                  {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.name}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          <CurrentStepComponent formData={formData} updateFormData={updateFormData} />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </div>

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext}>
              Lanjut
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Buat Kontrak"}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
