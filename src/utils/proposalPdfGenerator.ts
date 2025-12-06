import jsPDF from 'jspdf';
import { ParsedCart } from '@/components/proposals/ProposalTab';

const COLORS = {
  primary: [255, 107, 0] as [number, number, number], // Orange
  secondary: [30, 30, 35] as [number, number, number],
  accent: [255, 140, 50] as [number, number, number],
  text: [50, 50, 50] as [number, number, number],
  lightText: [120, 120, 120] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightBg: [248, 248, 250] as [number, number, number],
};

async function loadImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateProposalPDF(cart: ParsedCart): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Load logo
  let logoData: string | null = null;
  try {
    logoData = await loadImage('/images/logo-branco.png');
  } catch {
    console.log('Could not load logo');
  }

  // Helper function to add new page
  const addNewPageIfNeeded = (requiredSpace: number): boolean => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // ===== COVER PAGE =====
  
  // Orange header gradient
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 100, 'F');
  
  // Accent line
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 100, pageWidth, 3, 'F');

  // Logo
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', margin, 15, 50, 20);
    } catch {
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('ORLANDO FAST PASS', margin, 30);
    }
  }

  // Title
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA DE VIAGEM', margin, 60);
  
  // Client name
  doc.setFontSize(24);
  doc.setFont('helvetica', 'normal');
  doc.text(cart.clientName || 'Cliente', margin, 75);

  // Trip period badge
  if (cart.summary) {
    doc.setFontSize(12);
    doc.text(`${cart.summary.tripStart} a ${cart.summary.tripEnd}`, margin, 90);
  }

  yPosition = 120;

  // Summary box
  if (cart.summary) {
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(margin, yPosition, contentWidth, 35, 3, 3, 'F');
    
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('✨ Sua viagem dos sonhos inclui:', margin + 5, yPosition + 12);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    
    const items = [];
    if (cart.tickets?.length) items.push(`${cart.tickets.length} ingresso(s)`);
    if (cart.hotels?.length) items.push(`${cart.hotels.length} hospedagem(s)`);
    if (cart.cars?.length) items.push(`${cart.cars.length} carro(s)`);
    if (cart.insurance?.length) items.push(`${cart.insurance.length} seguro(s)`);
    
    doc.text(items.join(' • '), margin + 5, yPosition + 25);
    
    yPosition += 45;
  }

  // ===== TICKETS SECTION =====
  if (cart.tickets && cart.tickets.length > 0) {
    addNewPageIfNeeded(60);
    
    // Section header
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPosition, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('🎢 INGRESSOS E PARQUES', margin + 5, yPosition + 8);
    yPosition += 18;

    for (const ticket of cart.tickets) {
      addNewPageIfNeeded(50);
      
      // Ticket card
      doc.setFillColor(...COLORS.lightBg);
      doc.roundedRect(margin, yPosition, contentWidth, 40, 3, 3, 'F');
      
      // Orange accent bar
      doc.setFillColor(...COLORS.primary);
      doc.rect(margin, yPosition, 4, 40, 'F');
      
      // Ticket info
      doc.setTextColor(...COLORS.secondary);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(ticket.name.substring(0, 60), margin + 10, yPosition + 12);
      
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`📅 ${ticket.date}`, margin + 10, yPosition + 22);
      doc.text(`⏱️ ${ticket.duration}`, margin + 60, yPosition + 22);
      doc.text(`👥 ${ticket.guests}`, margin + 10, yPosition + 32);
      
      yPosition += 45;
    }
  }

  // ===== HOTELS SECTION =====
  if (cart.hotels && cart.hotels.length > 0) {
    addNewPageIfNeeded(60);
    
    // Section header
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPosition, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('🏨 HOSPEDAGEM', margin + 5, yPosition + 8);
    yPosition += 18;

    for (const hotel of cart.hotels) {
      addNewPageIfNeeded(55);
      
      // Hotel card
      doc.setFillColor(...COLORS.lightBg);
      doc.roundedRect(margin, yPosition, contentWidth, 45, 3, 3, 'F');
      
      // Blue accent bar for hotels
      doc.setFillColor(59, 130, 246);
      doc.rect(margin, yPosition, 4, 45, 'F');
      
      // Hotel info
      doc.setTextColor(...COLORS.secondary);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(hotel.name.substring(0, 50), margin + 10, yPosition + 12);
      
      if (hotel.roomType) {
        doc.setTextColor(...COLORS.lightText);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(hotel.roomType.substring(0, 60), margin + 10, yPosition + 20);
      }
      
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`📅 Check-in: ${hotel.checkIn}`, margin + 10, yPosition + 30);
      doc.text(`📅 Check-out: ${hotel.checkOut}`, margin + 80, yPosition + 30);
      doc.text(`🌙 ${hotel.nights} noites • 🚪 ${hotel.rooms} quarto(s) • 👥 ${hotel.guests}`, margin + 10, yPosition + 40);
      
      yPosition += 50;
    }
  }

  // ===== CARS SECTION =====
  if (cart.cars && cart.cars.length > 0) {
    addNewPageIfNeeded(50);
    
    // Section header
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPosition, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('🚗 ALUGUEL DE CARRO', margin + 5, yPosition + 8);
    yPosition += 18;

    for (const car of cart.cars) {
      addNewPageIfNeeded(45);
      
      // Car card
      doc.setFillColor(...COLORS.lightBg);
      doc.roundedRect(margin, yPosition, contentWidth, 35, 3, 3, 'F');
      
      // Green accent bar
      doc.setFillColor(34, 197, 94);
      doc.rect(margin, yPosition, 4, 35, 'F');
      
      doc.setTextColor(...COLORS.secondary);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(car.name, margin + 10, yPosition + 12);
      
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`📍 Retirada: ${car.pickupLocation} - ${car.pickupDate}`, margin + 10, yPosition + 22);
      doc.text(`📍 Devolução: ${car.returnLocation || car.pickupLocation} - ${car.returnDate}`, margin + 10, yPosition + 30);
      
      yPosition += 40;
    }
  }

  // ===== INSURANCE SECTION =====
  if (cart.insurance && cart.insurance.length > 0) {
    addNewPageIfNeeded(50);
    
    // Section header
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPosition, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('🛡️ SEGURO VIAGEM', margin + 5, yPosition + 8);
    yPosition += 18;

    for (const ins of cart.insurance) {
      addNewPageIfNeeded(40);
      
      // Insurance card
      doc.setFillColor(...COLORS.lightBg);
      doc.roundedRect(margin, yPosition, contentWidth, 35, 3, 3, 'F');
      
      // Purple accent bar
      doc.setFillColor(147, 51, 234);
      doc.rect(margin, yPosition, 4, 35, 'F');
      
      doc.setTextColor(...COLORS.secondary);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(ins.name.substring(0, 50), margin + 10, yPosition + 12);
      
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`💰 Cobertura: ${ins.coverage}`, margin + 10, yPosition + 22);
      doc.text(`📅 ${ins.dates} • 👥 ${ins.travelers} segurado(s)`, margin + 10, yPosition + 30);
      
      yPosition += 40;
    }
  }

  // ===== FOOTER =====
  addNewPageIfNeeded(40);
  
  // Footer box
  doc.setFillColor(...COLORS.secondary);
  doc.roundedRect(margin, yPosition, contentWidth, 35, 3, 3, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('✨ Pronto para realizar o sonho?', margin + 5, yPosition + 12);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Entre em contato conosco para fechar sua viagem!', margin + 5, yPosition + 22);
  doc.text('📱 WhatsApp: (11) 99999-9999 | 📧 contato@orlandofastpass.com.br', margin + 5, yPosition + 30);

  // Add page numbers
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.lightText);
    doc.text(
      `Proposta gerada em ${new Date().toLocaleDateString('pt-BR')} • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save
  const fileName = `Proposta_${(cart.clientName || 'Cliente').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}
