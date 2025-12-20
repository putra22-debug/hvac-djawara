// ============================================
// API: Get Technical Report Data (JSON)
// Client will generate PDF using jsPDF
// ============================================

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(
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
          scheduled_date,
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
    
    // Return JSON data for client-side PDF generation
    const reportData = {
      orderNumber: workLog.service_orders?.order_number || 'N/A',
      serviceTitle: workLog.service_orders?.service_title || 'N/A',
      clientName: workLog.service_orders?.clients?.name || 'N/A',
      clientPhone: workLog.service_orders?.clients?.phone || '',
      location: workLog.service_orders?.location_address || workLog.service_orders?.clients?.address || '',
      scheduledDate: workLog.service_orders?.scheduled_date || new Date().toISOString(),
      technicianName: workLog.technicians?.full_name || workLog.signature_technician_name || '',
      problem: workLog.problem || '',
      tindakan: workLog.tindakan || '',
      rincian_pekerjaan: workLog.rincian_pekerjaan || '',
      rincian_kerusakan: workLog.rincian_kerusakan || '',
      lama_kerja: workLog.lama_kerja || 0,
      jarak_tempuh: workLog.jarak_tempuh || 0,
      spareparts: (spareparts || []).map(sp => ({
        name: sp.sparepart_name,
        quantity: sp.quantity,
        unit: sp.unit,
        notes: sp.notes || ''
      })),
      photos: workLog.documentation_photos || [],
      photoCaptions: workLog.photo_captions || [],
      signatureTechnician: workLog.signature_technician,
      signatureClient: workLog.signature_client,
      signatureTechnicianName: workLog.signature_technician_name || workLog.technicians?.full_name || '',
      signatureClientName: workLog.signature_client_name || workLog.service_orders?.clients?.name || '',
      signatureDate: workLog.signature_date || new Date().toISOString(),
    }
    
    return NextResponse.json(reportData)
    
  } catch (error) {
    console.error('Error fetching report data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report data', details: String(error) },
      { status: 500 }
    )
  }
}
