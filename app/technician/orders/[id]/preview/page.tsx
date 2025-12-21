"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateTechnicalReportPDF } from "@/lib/pdf-generator";

export default function PreviewPDFPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    loadPDFData();
  }, [orderId]);

  const loadPDFData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get technician ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User tidak ditemukan");
        router.push("/technician/login");
        return;
      }
      
      const { data: techData } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!techData) {
        toast.error("Teknisi tidak ditemukan");
        return;
      }
      
      // Fetch work log with all data
      const { data: workLog, error } = await supabase
        .from('technician_work_logs')
        .select('*')
        .eq('service_order_id', orderId)
        .eq('technician_id', techData.id)
        .maybeSingle();
      
      if (error || !workLog) {
        toast.error("Data teknis tidak ditemukan");
        router.push("/technician/dashboard");
        return;
      }
      
      // Fetch order data
      const { data: order } = await supabase
        .from('service_orders')
        .select(`
          *,
          clients (
            name,
            address,
            phone
          )
        `)
        .eq('id', orderId)
        .single();
      
      if (order) {
        setOrderData(order);
        
        // Generate PDF
        const pdfBlob = await generateTechnicalReportPDF({
          order_number: order.order_number,
          problem: workLog.problem,
          tindakan: workLog.tindakan,
          rincian_pekerjaan: workLog.rincian_pekerjaan,
          rincian_kerusakan: workLog.rincian_kerusakan,
          catatan_rekomendasi: workLog.catatan_rekomendasi,
          lama_kerja: workLog.lama_kerja,
          jarak_tempuh: workLog.jarak_tempuh,
          signature_technician: workLog.signature_technician,
          signature_client: workLog.signature_client,
          signature_technician_name: workLog.signature_technician_name,
          signature_client_name: workLog.signature_client_name,
          signature_date: workLog.signature_date,
          photos: workLog.documentation_photos || [],
          photo_captions: workLog.photo_captions || [],
          work_type: workLog.work_type,
          check_type: workLog.check_type,
          ac_units_data: workLog.ac_units_data || [],
          maintenance_units_data: workLog.maintenance_units_data || [],
        });
        
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error("Gagal memuat PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (pdfUrl && orderData) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Laporan-Teknis-${orderData.order_number}.pdf`;
      link.click();
      toast.success("PDF berhasil diunduh");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-muted-foreground">Memuat PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/technician/dashboard")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-lg">Preview Laporan Teknis</h1>
                <p className="text-sm text-muted-foreground">
                  {orderData?.order_number}
                </p>
              </div>
            </div>
            <Button onClick={handleDownload} disabled={!pdfUrl}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      {/* PDF Viewer */}
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-0">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-[calc(100vh-180px)] border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Tidak ada PDF untuk ditampilkan</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
