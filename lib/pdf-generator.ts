import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helper to load image as base64
function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      } else {
        reject(new Error("Failed to get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface WorkLogData {
  order_number?: string;
  orderNumber?: string;
  service_title?: string;
  serviceTitle?: string;
  client_name?: string;
  clientName?: string;
  location?: string;
  scheduled_date?: string;
  scheduledDate?: string;
  technician_name?: string;
  technicianName?: string;
  
  // Conditional work type
  work_type?: string;
  check_type?: string;
  ac_units_data?: Array<{
    nama_ruang?: string;
    merk_ac?: string;
    kapasitas_ac?: string;
    daya_listrik?: string;
    kondisi_compressor?: string;
    kondisi_evaporator?: string;
    kondisi_condenser?: string;
    suhu_ruangan?: string;
    suhu_supply?: string;
    suhu_return?: string;
    catatan?: string;
  }>;
  maintenance_units_data?: Array<{
    id?: string;
    nama_ruang?: string;
    merk_ac?: string;
    kapasitas_ac?: string;
    kondisi_ac?: string;
    status_ac?: string;
    catatan_rekomendasi?: string;
    photos?: Array<{ preview: string; caption?: string }>;
  }>;
  
  // Traditional fields (for troubleshooting/instalasi/lain-lain)
  problem?: string;
  tindakan?: string;
  rincian_pekerjaan?: string;
  rincian_kerusakan?: string;
  catatan_rekomendasi?: string;
  lama_kerja?: number;
  jarak_tempuh?: number;
  
  spareparts?: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  photos?: string[];
  photo_captions?: string[];
  photoCaptions?: string[];
  signature_technician?: string;
  signatureTechnician?: string;
  signature_client?: string;
  signatureClient?: string;
  signature_technician_name?: string;
  signatureTechnicianName?: string;
  signature_client_name?: string;
  signatureClientName?: string;
  signature_date?: string;
  signatureDate?: string;
}

export async function generateTechnicalReportPDF(data: WorkLogData): Promise<Blob> {
  const doc = new jsPDF();
  
  // Normalize field names (support both snake_case and camelCase)
  const orderNumber = data.order_number || data.orderNumber || 'N/A';
  const serviceTitle = data.service_title || data.serviceTitle || 'N/A';
  const clientName = data.client_name || data.clientName || 'N/A';
  const location = data.location || 'N/A';
  const scheduledDate = data.scheduled_date || data.scheduledDate || new Date().toISOString();
  const technicianName = data.technician_name || data.technicianName || 'N/A';
  const signatureTechnician = data.signature_technician || data.signatureTechnician;
  const signatureClient = data.signature_client || data.signatureClient;
  const signatureTechnicianName = data.signature_technician_name || data.signatureTechnicianName;
  const signatureClientName = data.signature_client_name || data.signatureClientName;
  const signatureDate = data.signature_date || data.signatureDate;
  const photoCaptions = data.photo_captions || data.photoCaptions;
  
  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN PEKERJAAN TEKNIS", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("HVAC Djawara Service", 105, 27, { align: "center" });
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.line(20, 32, 190, 32);
  
  let yPos = 40;
  
  // Order Info
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Informasi Order", 20, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`No. Order: ${orderNumber}`, 25, yPos);
  yPos += 6;
  doc.text(`Layanan: ${serviceTitle}`, 25, yPos);
  yPos += 6;
  doc.text(`Klien: ${clientName}`, 25, yPos);
  yPos += 6;
  doc.text(`Lokasi: ${location}`, 25, yPos);
  yPos += 6;
  doc.text(`Tanggal: ${new Date(scheduledDate).toLocaleDateString("id-ID")}`, 25, yPos);
  yPos += 6;
  doc.text(`Teknisi: ${technicianName}`, 25, yPos);
  yPos += 10;
  
  // Technical Details - Conditional based on work_type
  doc.setFont("helvetica", "bold");
  doc.text("Detail Pekerjaan", 20, yPos);
  yPos += 7;
  doc.setFont("helvetica", "normal");
  
  // Handle PEMELIHARAAN work type
  if (data.work_type === 'pemeliharaan' && data.maintenance_units_data && data.maintenance_units_data.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Data Unit AC - Pemeliharaan", 25, yPos);
    yPos += 7;
    
    for (let i = 0; i < data.maintenance_units_data.length; i++) {
      const unit = data.maintenance_units_data[i];
      
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text(`Unit ${i + 1}: ${unit.nama_ruang || 'N/A'}`, 25, yPos);
      yPos += 6;
      
      doc.setFont("helvetica", "normal");
      doc.text(`Merk AC: ${unit.merk_ac || 'N/A'}`, 30, yPos);
      yPos += 5;
      doc.text(`Kapasitas: ${unit.kapasitas_ac || 'N/A'}`, 30, yPos);
      yPos += 5;
      doc.text(`Kondisi AC: ${unit.kondisi_ac || 'N/A'}`, 30, yPos);
      yPos += 5;
      doc.text(`Status AC: ${unit.status_ac || 'N/A'}`, 30, yPos);
      yPos += 5;
      
      if (unit.catatan_rekomendasi) {
        doc.text(`Catatan/Rekomendasi:`, 30, yPos);
        yPos += 5;
        const catatanLines = doc.splitTextToSize(unit.catatan_rekomendasi, 150);
        doc.text(catatanLines, 35, yPos);
        yPos += catatanLines.length * 5 + 5;
      }
      
      yPos += 3;
    }
  }
  
  // Handle PENGECEKAN PERFORMA work type
  else if (data.work_type === 'pengecekan' && data.check_type === 'performa' && data.ac_units_data && data.ac_units_data.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Data Pengecekan Performa AC", 25, yPos);
    yPos += 7;
    
    for (let i = 0; i < data.ac_units_data.length; i++) {
      const unit = data.ac_units_data[i];
      
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text(`Unit ${i + 1}: ${unit.nama_ruang || 'N/A'}`, 25, yPos);
      yPos += 6;
      
      doc.setFont("helvetica", "normal");
      doc.text(`Merk AC: ${unit.merk_ac || 'N/A'}, Kapasitas: ${unit.kapasitas_ac || 'N/A'}`, 30, yPos);
      yPos += 5;
      doc.text(`Daya Listrik: ${unit.daya_listrik || 'N/A'}`, 30, yPos);
      yPos += 5;
      doc.text(`Kondisi Compressor: ${unit.kondisi_compressor || 'N/A'}`, 30, yPos);
      yPos += 5;
      doc.text(`Kondisi Evaporator: ${unit.kondisi_evaporator || 'N/A'}`, 30, yPos);
      yPos += 5;
      doc.text(`Kondisi Condenser: ${unit.kondisi_condenser || 'N/A'}`, 30, yPos);
      yPos += 5;
      doc.text(`Suhu: Ruangan ${unit.suhu_ruangan || 'N/A'}°C, Supply ${unit.suhu_supply || 'N/A'}°C, Return ${unit.suhu_return || 'N/A'}°C`, 30, yPos);
      yPos += 5;
      
      if (unit.catatan) {
        doc.text(`Catatan: ${unit.catatan}`, 30, yPos);
        yPos += 5;
      }
      
      yPos += 3;
    }
  }
  
  // Handle traditional fields (TROUBLESHOOTING, INSTALASI, LAIN-LAIN)
  else {
    if (data.problem) {
      doc.text("Problem:", 25, yPos);
      yPos += 6;
      const problemLines = doc.splitTextToSize(data.problem, 160);
      doc.text(problemLines, 25, yPos);
      yPos += problemLines.length * 6 + 4;
    }
    
    if (data.tindakan) {
      doc.text("Tindakan:", 25, yPos);
      yPos += 6;
      const tindakanLines = doc.splitTextToSize(data.tindakan, 160);
      doc.text(tindakanLines, 25, yPos);
      yPos += tindakanLines.length * 6 + 4;
    }
  }
  
  // Common fields for all work types
  if (data.rincian_pekerjaan) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    doc.text("Rincian Pekerjaan:", 25, yPos);
    yPos += 6;
    const rincianLines = doc.splitTextToSize(data.rincian_pekerjaan, 160);
    doc.text(rincianLines, 25, yPos);
    yPos += rincianLines.length * 6 + 4;
  }
  
  if (data.rincian_kerusakan) {
    doc.text("Rincian Kerusakan:", 25, yPos);
    yPos += 6;
    const kerusakanLines = doc.splitTextToSize(data.rincian_kerusakan, 160);
    doc.text(kerusakanLines, 25, yPos);
    yPos += kerusakanLines.length * 6 + 4;
  }
  
  if (data.catatan_rekomendasi && data.work_type !== 'pemeliharaan') {
    doc.text("Catatan/Rekomendasi:", 25, yPos);
    yPos += 6;
    const catatanLines = doc.splitTextToSize(data.catatan_rekomendasi, 160);
    doc.text(catatanLines, 25, yPos);
    yPos += catatanLines.length * 6 + 4;
  }
  
  if (data.lama_kerja) {
    doc.text(`Lama Kerja: ${data.lama_kerja} jam`, 25, yPos);
    yPos += 6;
  }
  
  if (data.jarak_tempuh) {
    doc.text(`Jarak Tempuh: ${data.jarak_tempuh} km`, 25, yPos);
    yPos += 10;
  }
  
  // Spareparts Table
  if (data.spareparts && data.spareparts.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFont("helvetica", "bold");
    doc.text("Sparepart yang Digunakan", 20, yPos);
    yPos += 5;
    
    autoTable(doc, {
      startY: yPos,
      head: [["No", "Nama Sparepart", "Jumlah", "Satuan", "Keterangan"]],
      body: data.spareparts.map((sp, idx) => [
        (idx + 1).toString(),
        sp.name,
        sp.quantity.toString(),
        sp.unit,
        sp.notes || "-",
      ]),
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 20, right: 20 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Photo Documentation
  if (data.photos && data.photos.length > 0) {
    doc.addPage();
    yPos = 20;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Dokumentasi Foto Pekerjaan", 20, yPos);
    yPos += 10;
    
    // Display photos in grid (2 columns)
    let col = 0;
    for (let i = 0; i < data.photos.length; i++) {
      const photo = data.photos[i];
      const caption = photoCaptions?.[i] || `Foto ${i + 1}`;
      
      const xPos = col === 0 ? 20 : 110;
      
      try {
        // Try to add image (may fail for some formats)
        await loadImage(photo).then((img) => {
          doc.addImage(img, "JPEG", xPos, yPos, 80, 60);
        }).catch(() => {
          // If image load fails, show placeholder
          doc.rect(xPos, yPos, 80, 60);
          doc.setFontSize(8);
          doc.text("Foto tidak dapat dimuat", xPos + 40, yPos + 30, { align: "center" });
        });
      } catch (e) {
        console.error("Failed to add photo:", e);
        doc.rect(xPos, yPos, 80, 60);
      }
      
      // Caption
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const captionLines = doc.splitTextToSize(caption, 75);
      doc.text(captionLines, xPos + 2, yPos + 65);
      
      col++;
      if (col >= 2) {
        col = 0;
        yPos += 75;
        
        // New page if needed
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }
      }
    }
    
    if (col > 0) yPos += 75; // Add space if last row not complete
  }
  
  // Add photos from maintenance units (per-unit photos)
  if (data.work_type === 'pemeliharaan' && data.maintenance_units_data) {
    let hasUnitPhotos = false;
    
    for (let unitIdx = 0; unitIdx < data.maintenance_units_data.length; unitIdx++) {
      const unit = data.maintenance_units_data[unitIdx];
      if (unit.photos && unit.photos.length > 0) {
        if (!hasUnitPhotos) {
          doc.addPage();
          yPos = 20;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.text("Dokumentasi Foto Per Unit", 20, yPos);
          yPos += 10;
          hasUnitPhotos = true;
        }
        
        // Unit header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`Unit ${unitIdx + 1}: ${unit.nama_ruang || 'N/A'}`, 20, yPos);
        yPos += 8;
        
        // Display unit photos in 2x2 grid
        let col = 0;
        for (let photoIdx = 0; photoIdx < unit.photos.length; photoIdx++) {
          const photo = unit.photos[photoIdx];
          const xPos = col === 0 ? 20 : 110;
          
          try {
            await loadImage(photo.preview).then((img) => {
              doc.addImage(img, "JPEG", xPos, yPos, 80, 60);
            }).catch(() => {
              doc.rect(xPos, yPos, 80, 60);
              doc.setFontSize(8);
              doc.text("Foto tidak dapat dimuat", xPos + 40, yPos + 30, { align: "center" });
            });
          } catch (e) {
            console.error("Failed to add unit photo:", e);
            doc.rect(xPos, yPos, 80, 60);
          }
          
          // Caption
          if (photo.caption) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            const captionLines = doc.splitTextToSize(photo.caption, 75);
            doc.text(captionLines, xPos + 2, yPos + 65);
          }
          
          col++;
          if (col >= 2) {
            col = 0;
            yPos += 75;
            
            if (yPos > 220) {
              doc.addPage();
              yPos = 20;
            }
          }
        }
        
        if (col > 0) yPos += 75;
        yPos += 10; // Space between units
      }
    }
  }
  
  // Signatures
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Tanda Tangan", 20, yPos);
  yPos += 10;
  
  // Technician signature
  doc.setFont("helvetica", "normal");
  if (signatureTechnician) {
    try {
      doc.addImage(signatureTechnician, "PNG", 25, yPos, 50, 20);
    } catch (e) {
      console.error("Failed to add technician signature:", e);
    }
  }
  doc.text("Teknisi", 25, yPos + 25);
  doc.text(signatureTechnicianName || technicianName || '', 25, yPos + 31);
  
  // Client signature
  if (signatureClient) {
    try {
      doc.addImage(signatureClient, "PNG", 125, yPos, 50, 20);
    } catch (e) {
      console.error("Failed to add client signature:", e);
    }
  }
  doc.text("Klien / PIC", 125, yPos + 25);
  doc.text(signatureClientName || "", 125, yPos + 31);
  
  yPos += 35;
  doc.text(`Tanggal: ${signatureDate ? new Date(signatureDate).toLocaleDateString("id-ID") : ""}`, 25, yPos);
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      105,
      290,
      { align: "center" }
    );
  }
  
  return doc.output("blob");
}
