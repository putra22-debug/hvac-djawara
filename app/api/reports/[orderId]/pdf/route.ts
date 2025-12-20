// ============================================
// API: Generate Technical Report PDF
// Generate PDF for client download
// ============================================

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateTechnicalReportPDF } from '@/lib/pdf-generator'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    // Use service role client to bypass RLS for PDF generation
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const orderId = params.orderId
    
    // Fetch work log with all data using admin client (bypasses RLS)
    const { data: workLog, error } = await supabaseAdmin
      .from('technician_work_logs')
      .select(`
        *,
        service_orders (
          order_number,
          service_title,
          location_address,
          clients (
            name,
            phone,
            email,
            address,
            client_type
          )
        ),
        technicians (
          full_name
        )
      `)
      .eq('service_order_id', orderId)
      .single()
    
    if (error || !workLog) {
      console.error('Work log not found:', error);
      return NextResponse.json(
        { error: 'Technical report not found' },
        { status: 404 }
      )
    }
    
    // Fetch spareparts using admin client
    const { data: spareparts } = await supabaseAdmin
      .from('work_order_spareparts')
      .select('*')
      .eq('work_log_id', workLog.id)
    
    // Generate PDF
    const pdfData = {
      orderNumber: workLog.service_orders?.order_number || 'N/A',
      clientName: workLog.service_orders?.clients?.name || 'N/A',
      clientPhone: workLog.service_orders?.clients?.phone || '',
      clientAddress: workLog.service_orders?.clients?.address || workLog.service_orders?.location_address || '',
      serviceTitle: workLog.service_orders?.service_title || 'N/A',
      findings: workLog.findings || '',
      actionsTaken: workLog.actions_taken || '',
      workDuration: workLog.work_duration?.toString() || '',
      distance: workLog.travel_distance?.toString() || '',
      additionalNotes: workLog.additional_notes || '',
      repairNotes: workLog.repair_notes || '',
      photos: workLog.documentation_photos || [],
      photoCaptions: workLog.photo_captions || [],
      spareparts: spareparts || [],
      technicianSignature: workLog.signature_technician,
      clientSignature: workLog.signature_client,
      technicianName: workLog.technicians?.full_name || workLog.signature_technician_name || '',
      clientName: workLog.signature_client_name || workLog.service_orders?.clients?.name || '',
      signatureDate: workLog.signature_date || new Date().toISOString(),
    }
    
    const pdfBlob = await generateTechnicalReportPDF(pdfData)
    
    // Return PDF
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Laporan-Teknis-${workLog.service_orders?.order_number}.pdf"`,
      },
    })
    
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
