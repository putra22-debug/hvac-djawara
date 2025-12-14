import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface MaintenanceContract {
  id: string;
  tenant_id: string;
  client_id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  frequency: string;
  frequency_months?: number;
  service_scope?: string;
  room_count?: number;
  job_type?: string;
  job_category?: string;
  service_notes?: string;
  total_cost_value?: number;
  total_selling_value?: number;
  total_margin?: number;
  marketing_partner_name?: string;
  marketing_fee_percentage?: number;
  created_at: string;
  updated_at: string;
  
  // Relations
  clients?: {
    name: string;
    phone?: string;
    city?: string;
  };
  contract_locations?: ContractLocation[];
  contract_units?: ContractUnit[];
}

export interface ContractLocation {
  id: string;
  contract_id: string;
  location_name: string;
  address?: string;
  city?: string;
  province?: string;
  contact_person?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface ContractUnit {
  id: string;
  contract_id: string;
  location_id?: string;
  unit_category: string;
  brand?: string;
  model?: string;
  capacity?: string;
  room_name?: string;
  room_type?: string;
  maintenance_frequency: string;
  frequency_months: number;
  cost_price?: number;
  selling_price?: number;
  is_active: boolean;
  created_at: string;
}

export function useContracts() {
  const [contracts, setContracts] = useState<MaintenanceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("maintenance_contracts")
        .select(`
          *,
          clients:client_id (
            name,
            phone,
            city
          ),
          contract_locations!contract_locations_contract_id_fkey (
            id,
            location_name,
            city,
            is_active
          ),
          contract_units!contract_units_contract_id_fkey (
            id,
            room_name,
            room_type,
            cost_price,
            selling_price
          )
        `)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setContracts(data || []);
    } catch (err: any) {
      console.error("Error fetching contracts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const createContract = async (contractData: Partial<MaintenanceContract>) => {
    try {
      const { data, error: insertError } = await supabase
        .from("maintenance_contracts")
        .insert(contractData)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchContracts(); // Refresh list
      return { data, error: null };
    } catch (err: any) {
      console.error("Error creating contract:", err);
      return { data: null, error: err.message };
    }
  };

  const updateContract = async (id: string, updates: Partial<MaintenanceContract>) => {
    try {
      const { data, error: updateError } = await supabase
        .from("maintenance_contracts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchContracts(); // Refresh list
      return { data, error: null };
    } catch (err: any) {
      console.error("Error updating contract:", err);
      return { data: null, error: err.message };
    }
  };

  const deleteContract = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("maintenance_contracts")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      await fetchContracts(); // Refresh list
      return { error: null };
    } catch (err: any) {
      console.error("Error deleting contract:", err);
      return { error: err.message };
    }
  };

  return {
    contracts,
    loading,
    error,
    fetchContracts,
    createContract,
    updateContract,
    deleteContract,
  };
}
