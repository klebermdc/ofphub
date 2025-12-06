import jsPDF from 'jspdf';
import { ParsedCart, TicketItem, HotelItem, CarItem, InsuranceItem } from '@/components/proposals/ProposalTab';

// Premium color palette
const COLORS = {
  primary: [255, 107, 0] as [number, number, number],
  primaryDark: [200, 80, 0] as [number, number, number],
  blue: [30, 58, 138] as [number, number, number],
  blueDark: [17, 24, 39] as [number, number, number],
  gold: [251, 191, 36] as [number, number, number],
  goldDark: [180, 130, 20] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  text: [17, 24, 39] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  purple: [126, 34, 206] as [number, number, number],
  teal: [13, 148, 136] as [number, number, number],
};

export async function generateProposalPDF(cart: ParsedCart): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Try to load logo
  let logoData: string | null = null;
  try {
    const response = await fetch('/images/logo-branco.png');
    if (response.ok) {
      const blob = await response.blob();
      logoData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.log('Logo not loaded');
  }

  // Helper: Add new page if needed
  const checkNewPage = (neededSpace: number): boolean => {
    if (yPosition + neededSpace > pageHeight - 25) {
      doc.addPage();
      yPosition = margin;
      addPageHeader();
      return true;
    }
    return false;
  };

  // Page header for content pages
  const addPageHeader = () => {
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 8, 'F');
  };

  // Page footer
  const addPageFooter = (pageNum: number, totalPages: number) => {
    doc.setFillColor(...COLORS.lightGray);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text('Orlando Fast Pass - Sua viagem dos sonhos', margin, pageHeight - 5);
    doc.text(`${pageNum} / ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  };

  // ===== COVER PAGE =====
  // Full gradient background
  doc.setFillColor(...COLORS.blue);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Darker bottom section
  doc.setFillColor(...COLORS.blueDark);
  doc.rect(0, pageHeight * 0.55, pageWidth, pageHeight * 0.45, 'F');

  // Decorative elements - subtle stars
  doc.setFillColor(...COLORS.gold);
  [[25, 35, 3], [185, 30, 2], [45, 75, 1.5], [175, 85, 2.5], [20, 140, 1.8], [190, 150, 2]].forEach(([x, y, r]) => {
    doc.circle(x, y, r, 'F');
  });

  // Logo
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', pageWidth / 2 - 40, 25, 80, 32);
    } catch (e) {
      console.log('Could not add logo to PDF');
    }
  }

  // Tagline
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'italic');
  doc.text('Realizando sonhos desde 2015', pageWidth / 2, 70, { align: 'center' });

  // Main title
  doc.setFontSize(42);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA', pageWidth / 2, 95, { align: 'center' });
  doc.setFontSize(38);
  doc.text('EXCLUSIVA', pageWidth / 2, 112, { align: 'center' });

  // Gold accent line
  doc.setFillColor(...COLORS.gold);
  doc.rect(pageWidth / 2 - 40, 118, 80, 3, 'F');

  // Client name box
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(margin + 20, 135, contentWidth - 40, 40, 6, 6, 'F');
  
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Preparada especialmente para', pageWidth / 2, 150, { align: 'center' });
  
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  const clientName = (cart.clientName || 'Cliente').toUpperCase();
  doc.text(clientName, pageWidth / 2, 167, { align: 'center' });

  // Trip summary box
  if (cart.summary) {
    doc.setFillColor(...COLORS.gold);
    doc.roundedRect(margin + 25, 190, contentWidth - 50, 50, 6, 6, 'F');
    
    doc.setTextColor(...COLORS.blueDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PERÍODO DA VIAGEM', pageWidth / 2, 203, { align: 'center' });
    
    doc.setFontSize(18);
    const tripDates = `${cart.summary.tripStart || '...'} a ${cart.summary.tripEnd || '...'}`;
    doc.text(tripDates, pageWidth / 2, 218, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(cart.summary.totalDays || '', pageWidth / 2, 232, { align: 'center' });
  }

  // What's included section
  const items: string[] = [];
  if (cart.tickets?.length) items.push(`✓ ${cart.tickets.length} Ingresso(s)`);
  if (cart.hotels?.length) items.push(`✓ ${cart.hotels.length} Hospedagem`);
  if (cart.cars?.length) items.push(`✓ ${cart.cars.length} Carro`);
  if (cart.insurance?.length) items.push(`✓ ${cart.insurance.length} Seguro Viagem`);

  if (items.length > 0) {
    doc.setFillColor(...COLORS.white);
    doc.roundedRect(margin, 255, contentWidth, 30, 4, 4, 'F');
    
    doc.setTextColor(...COLORS.blueDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SUA PROPOSTA INCLUI:', pageWidth / 2, 267, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(items.join('   •   '), pageWidth / 2, 279, { align: 'center' });
  }

  // ===== CONTENT PAGES =====
  doc.addPage();
  addPageHeader();
  yPosition = 20;

  // Section header function
  const addSectionHeader = (title: string, icon: string, color: [number, number, number]) => {
    checkNewPage(25);
    
    doc.setFillColor(...color);
    doc.roundedRect(margin, yPosition, contentWidth, 16, 4, 4, 'F');
    
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${icon}  ${title}`, margin + 8, yPosition + 11);
    
    yPosition += 22;
  };

  // Item card function - COMPREHENSIVE
  const addItemCard = (
    title: string,
    description: string | undefined,
    details: { label: string; value: string }[],
    extras: string[],
    accentColor: [number, number, number]
  ) => {
    const descLines = description ? doc.splitTextToSize(description, contentWidth - 20) : [];
    const descHeight = Math.min(descLines.length, 4) * 5;
    const detailsHeight = Math.min(details.length, 6) * 6;
    const extrasHeight = extras.length > 0 ? 15 : 0;
    const totalHeight = 20 + descHeight + detailsHeight + extrasHeight + 10;
    
    checkNewPage(totalHeight);
    
    // Card background
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(margin, yPosition, contentWidth, totalHeight, 4, 4, 'F');
    
    // Accent bar
    doc.setFillColor(...accentColor);
    doc.roundedRect(margin, yPosition, 5, totalHeight, 2, 2, 'F');
    
    let cardY = yPosition + 8;
    
    // Title
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const truncatedTitle = title.length > 70 ? title.substring(0, 67) + '...' : title;
    doc.text(truncatedTitle, margin + 12, cardY);
    cardY += 8;
    
    // Description
    if (descLines.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.gray);
      const linesToShow = descLines.slice(0, 4);
      linesToShow.forEach((line: string) => {
        doc.text(line, margin + 12, cardY);
        cardY += 5;
      });
      cardY += 2;
    }
    
    // Details grid
    if (details.length > 0) {
      doc.setFontSize(9);
      const colWidth = (contentWidth - 24) / 2;
      let col = 0;
      let detailY = cardY;
      
      details.slice(0, 6).forEach((detail, i) => {
        const x = margin + 12 + (col * colWidth);
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.text);
        doc.text(detail.label + ':', x, detailY);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.gray);
        const valueX = x + doc.getTextWidth(detail.label + ': ');
        const maxValueWidth = colWidth - doc.getTextWidth(detail.label + ': ') - 5;
        let value = detail.value;
        while (doc.getTextWidth(value) > maxValueWidth && value.length > 10) {
          value = value.slice(0, -4) + '...';
        }
        doc.text(value, valueX, detailY);
        
        col++;
        if (col >= 2) {
          col = 0;
          detailY += 6;
        }
      });
      cardY = detailY + (col > 0 ? 8 : 2);
    }
    
    // Extras/benefits badges
    if (extras.length > 0) {
      let extrasX = margin + 12;
      doc.setFontSize(8);
      
      extras.slice(0, 5).forEach((extra) => {
        const textWidth = doc.getTextWidth(extra) + 8;
        
        if (extrasX + textWidth > pageWidth - margin - 10) {
          return;
        }
        
        doc.setFillColor(...accentColor);
        doc.setDrawColor(...accentColor);
        doc.roundedRect(extrasX, cardY - 3, textWidth, 8, 2, 2, 'F');
        
        doc.setTextColor(...COLORS.white);
        doc.text(extra, extrasX + 4, cardY + 2.5);
        
        extrasX += textWidth + 4;
      });
    }
    
    yPosition += totalHeight + 6;
  };

  // ===== TICKETS =====
  if (cart.tickets && cart.tickets.length > 0) {
    addSectionHeader('INGRESSOS E PARQUES', '🎢', COLORS.primary);
    
    cart.tickets.forEach((ticket: TicketItem) => {
      const details: { label: string; value: string }[] = [];
      
      if (ticket.date) details.push({ label: '📅 Data', value: ticket.date });
      if (ticket.validityDays || ticket.duration) {
        details.push({ label: '⏱️ Validade', value: ticket.validityDays || ticket.duration || '' });
      }
      if (ticket.guests) details.push({ label: '👥 Visitantes', value: ticket.guests });
      if (ticket.entryType) details.push({ label: '🎫 Tipo', value: ticket.entryType });
      if (ticket.time) details.push({ label: '🕐 Horário', value: ticket.time });
      if (ticket.parks && ticket.parks.length > 0) {
        details.push({ label: '🎡 Parques', value: ticket.parks.join(', ') });
      }
      
      const extras: string[] = [];
      if (ticket.benefits) extras.push(...ticket.benefits.slice(0, 4));
      if (ticket.mainAttractions && ticket.mainAttractions.length > 0) {
        extras.push(...ticket.mainAttractions.slice(0, 2).map(a => `★ ${a}`));
      }
      
      addItemCard(
        ticket.name,
        ticket.fullDescription || ticket.description,
        details,
        extras,
        COLORS.primary
      );
    });
  }

  // ===== HOTELS =====
  if (cart.hotels && cart.hotels.length > 0) {
    addSectionHeader('HOSPEDAGEM', '🏨', COLORS.teal);
    
    cart.hotels.forEach((hotel: HotelItem) => {
      const details: { label: string; value: string }[] = [];
      
      if (hotel.checkIn && hotel.checkOut) {
        details.push({ label: '📅 Check-in', value: hotel.checkIn });
        details.push({ label: '📅 Check-out', value: hotel.checkOut });
      }
      if (hotel.nights) details.push({ label: '🌙 Noites', value: hotel.nights });
      if (hotel.rooms) details.push({ label: '🚪 Quartos', value: hotel.rooms });
      if (hotel.guests) details.push({ label: '👥 Hóspedes', value: hotel.guests });
      if (hotel.roomType) details.push({ label: '🛏️ Tipo Quarto', value: hotel.roomType });
      if (hotel.category) details.push({ label: '⭐ Categoria', value: hotel.category });
      if (hotel.mealPlan) details.push({ label: '🍽️ Refeições', value: hotel.mealPlan });
      
      const extras: string[] = [];
      if (hotel.amenities) extras.push(...hotel.amenities.slice(0, 5));
      
      addItemCard(
        hotel.name,
        hotel.fullDescription || hotel.roomDescription,
        details,
        extras,
        COLORS.teal
      );
    });
  }

  // ===== CARS =====
  if (cart.cars && cart.cars.length > 0) {
    addSectionHeader('ALUGUEL DE CARRO', '🚗', COLORS.success);
    
    cart.cars.forEach((car: CarItem) => {
      const details: { label: string; value: string }[] = [];
      
      if (car.pickupDate) details.push({ label: '📅 Retirada', value: `${car.pickupDate} ${car.pickupTime || ''}`.trim() });
      if (car.returnDate) details.push({ label: '📅 Devolução', value: `${car.returnDate} ${car.returnTime || ''}`.trim() });
      if (car.pickupLocation) details.push({ label: '📍 Local Retirada', value: car.pickupLocation });
      if (car.returnLocation) details.push({ label: '📍 Local Devolução', value: car.returnLocation });
      if (car.category) details.push({ label: '🚙 Categoria', value: car.category });
      if (car.capacity) details.push({ label: '👥 Capacidade', value: car.capacity });
      if (car.rentalCompany) details.push({ label: '🏢 Locadora', value: car.rentalCompany });
      
      const extras: string[] = [];
      if (car.features) extras.push(...car.features.slice(0, 5));
      if (car.extras) extras.push(...car.extras.slice(0, 3));
      
      addItemCard(
        car.name,
        car.fullDescription,
        details,
        extras,
        COLORS.success
      );
    });
  }

  // ===== INSURANCE =====
  if (cart.insurance && cart.insurance.length > 0) {
    addSectionHeader('SEGURO VIAGEM', '🛡️', COLORS.purple);
    
    cart.insurance.forEach((ins: InsuranceItem) => {
      const details: { label: string; value: string }[] = [];
      
      if (ins.coverageAmount || ins.coverage) {
        details.push({ label: '💰 Cobertura', value: ins.coverageAmount || ins.coverage || '' });
      }
      if (ins.startDate) details.push({ label: '📅 Início', value: ins.startDate });
      if (ins.endDate) details.push({ label: '📅 Fim', value: ins.endDate });
      if (ins.travelers) details.push({ label: '👥 Segurados', value: ins.travelers });
      if (ins.destination) details.push({ label: '🌎 Destino', value: ins.destination });
      if (ins.travelerDetails) details.push({ label: '📋 Detalhes', value: ins.travelerDetails });
      if (ins.dates && !ins.startDate) details.push({ label: '📅 Período', value: ins.dates });
      
      const extras: string[] = [];
      if (ins.coverageDetails) extras.push(...ins.coverageDetails.slice(0, 5));
      
      addItemCard(
        ins.name,
        ins.fullDescription,
        details,
        extras,
        COLORS.purple
      );
    });
  }

  // ===== TRIP HIGHLIGHTS PAGE =====
  if (cart.summary?.highlights && cart.summary.highlights.length > 0) {
    checkNewPage(80);
    
    doc.setFillColor(...COLORS.gold);
    doc.roundedRect(margin, yPosition, contentWidth, 12, 4, 4, 'F');
    doc.setTextColor(...COLORS.blueDark);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('⭐ DESTAQUES DA SUA VIAGEM', margin + 8, yPosition + 8);
    yPosition += 18;
    
    cart.summary.highlights.forEach((highlight) => {
      checkNewPage(12);
      
      doc.setFillColor(...COLORS.lightGray);
      doc.roundedRect(margin, yPosition, contentWidth, 10, 2, 2, 'F');
      
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`✨ ${highlight}`, margin + 8, yPosition + 7);
      
      yPosition += 13;
    });
    
    yPosition += 10;
  }

  // ===== CTA / FOOTER PAGE =====
  checkNewPage(90);
  
  // CTA Box
  doc.setFillColor(...COLORS.blue);
  doc.roundedRect(margin, yPosition, contentWidth, 80, 6, 6, 'F');
  
  // Gold accent
  doc.setFillColor(...COLORS.gold);
  doc.rect(margin + 15, yPosition + 5, contentWidth - 30, 4, 'F');
  
  // CTA Text
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Pronto para realizar seu sonho?', pageWidth / 2, yPosition + 30, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Entre em contato e feche sua viagem mágica!', pageWidth / 2, yPosition + 42, { align: 'center' });
  
  // Contact box
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(margin + 10, yPosition + 52, contentWidth - 20, 22, 4, 4, 'F');
  
  doc.setTextColor(...COLORS.blueDark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('📱 WhatsApp: (11) 99999-9999', pageWidth / 2, yPosition + 63, { align: 'center' });
  doc.text('✉️ contato@orlandofastpass.com.br', pageWidth / 2, yPosition + 71, { align: 'center' });

  // ===== ADD PAGE NUMBERS =====
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(i - 1, totalPages - 1);
  }

  // Save
  const fileName = `Proposta_${(cart.clientName || 'Cliente').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}
