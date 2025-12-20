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
  orderNumber: string;
  serviceTitle: string;
  clientName: string;
  location: string;
  scheduledDate: string;
  technicianName: string;
  problem: string;
  tindakan: string;
  rincian_pekerjaan?: string;
  rincian_kerusakan?: string;
  lama_kerja?: number;
  jarak_tempuh?: number;
  spareparts?: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  photos?: string[];
  photoCaptions?: string[];
  signatureTechnician?: string;
  signatureClient?: string;
  signatureTechnicianName?: string;
  signatureClientName?: string;
  signatureDate?: string;
}

export async function generateTechnicalReportPDF(data: WorkLogData): Promise<Blob> {
  const doc = new jsPDF();
  
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
  doc.text(`No. Order: ${data.orderNumber}`, 25, yPos);
  yPos += 6;
  doc.text(`Layanan: ${data.serviceTitle}`, 25, yPos);
  yPos += 6;
  doc.text(`Klien: ${data.clientName}`, 25, yPos);
  yPos += 6;
  doc.text(`Lokasi: ${data.location}`, 25, yPos);
  yPos += 6;
  doc.text(`Tanggal: ${new Date(data.scheduledDate).toLocaleDateString("id-ID")}`, 25, yPos);
  yPos += 6;
  doc.text(`Teknisi: ${data.technicianName}`, 25, yPos);
  yPos += 10;
  
  // Technical Details
  doc.setFont("helvetica", "bold");
  doc.text("Detail Pekerjaan", 20, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  doc.text("Problem:", 25, yPos);
  yPos += 6;
  const problemLines = doc.splitTextToSize(data.problem, 160);
  doc.text(problemLines, 25, yPos);
  yPos += problemLines.length * 6 + 4;
  
  doc.text("Tindakan:", 25, yPos);
  yPos += 6;
  const tindakanLines = doc.splitTextToSize(data.tindakan, 160);
  doc.text(tindakanLines, 25, yPos);
  yPos += tindakanLines.length * 6 + 4;
  
  if (data.rincian_pekerjaan) {
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
      const caption = data.photoCaptions?.[i] || `Foto ${i + 1}`;
      
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
  if (data.signatureTechnician) {
    try {
      doc.addImage(data.signatureTechnician, "PNG", 25, yPos, 50, 20);
    } catch (e) {
      console.error("Failed to add technician signature:", e);
    }
  }
  doc.text("Teknisi", 25, yPos + 25);
  doc.text(data.signatureTechnicianName || data.technicianName || '', 25, yPos + 31);
  
  // Client signature
  if (data.signatureClient) {
    try {
      doc.addImage(data.signatureClient, "PNG", 125, yPos, 50, 20);
    } catch (e) {
      console.error("Failed to add client signature:", e);
    }
  }
  doc.text("Klien / PIC", 125, yPos + 25);
  doc.text(data.signatureClientName || "", 125, yPos + 31);
  
  yPos += 35;
  doc.text(`Tanggal: ${data.signatureDate ? new Date(data.signatureDate).toLocaleDateString("id-ID") : ""}`, 25, yPos);
  
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
