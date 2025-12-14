"use client";

import { useContracts } from "@/hooks/use-contracts";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export function ContractList() {
  const { contracts, loading, error } = useContracts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading contracts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
        <p className="font-semibold">Error loading contracts</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">Belum ada kontrak maintenance.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Klik tombol "Buat Kontrak Baru" untuk memulai.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No. Kontrak</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Lokasi</TableHead>
            <TableHead>Periode</TableHead>
            <TableHead>Frekuensi</TableHead>
            <TableHead className="text-right">Total Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => {
            const locationCount = contract.contract_locations?.length || 0;
            const unitCount = contract.contract_units?.length || 0;
            
            return (
              <TableRow key={contract.id}>
                <TableCell className="font-medium">
                  {contract.contract_number}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{contract.clients?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {contract.clients?.city}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {locationCount} cabang · {unitCount} unit
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>
                    {new Date(contract.start_date).toLocaleDateString("id-ID")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    s/d {new Date(contract.end_date).toLocaleDateString("id-ID")}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {contract.frequency === "monthly" && "Bulanan"}
                    {contract.frequency === "quarterly" && "3 Bulan"}
                    {contract.frequency === "semi_annual" && "6 Bulan"}
                    {contract.frequency === "annual" && "Tahunan"}
                    {contract.frequency === "custom_months" && `${contract.frequency_months} Bulan`}
                    {contract.frequency === "mixed" && "Mixed"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(contract.total_selling_value || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Margin: {formatCurrency(contract.total_margin || 0)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={contract.is_active ? "default" : "secondary"}>
                    {contract.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/dashboard/contracts/${contract.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
