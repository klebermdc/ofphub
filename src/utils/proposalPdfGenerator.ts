import jsPDF from 'jspdf';
import { ParsedCart, TicketItem, HotelItem, CarItem, InsuranceItem } from '@/components/proposals/ProposalTab';

// Image paths for local images
const LOCAL_IMAGES = {
  disney: '/images/proposals/disney-castle.jpg',
  universal: '/images/proposals/universal-park.jpg',
  seaworld: '/images/proposals/seaworld.jpg',
  animal: '/images/proposals/animal-kingdom.jpg',
  hotel: '/images/proposals/hotel-resort.jpg',
  hotelLuxury: '/images/proposals/luxury-hotel.jpg',
  car: '/images/proposals/car-rental.jpg',
  insurance: '/images/proposals/travel-insurance.jpg',
  logo: '/images/logo-branco.png',
};

// Colors
const C = {
  primary: [249, 115, 22] as [number, number, number],
  blue: [30, 58, 138] as [number, number, number],
  blueDark: [26, 26, 46] as [number, number, number],
  gold: [251, 191, 36] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [248, 250, 252] as [number, number, number],
  text: [31, 41, 55] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  purple: [124, 58, 237] as [number, number, number],
  teal: [13, 148, 136] as [number, number, number],
};

// Load image as base64
async function loadLocalImage(path: string): Promise<string | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
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

// Get image for item type
function getImagePathForItem(name: string, type: 'ticket' | 'hotel' | 'car' | 'insurance'): string {
  const lowerName = name.toLowerCase();
  
  if (type === 'ticket') {
    if (lowerName.includes('disney') || lowerName.includes('magic kingdom') || lowerName.includes('epcot')) {
      return LOCAL_IMAGES.disney;
    }
    if (lowerName.includes('universal') || lowerName.includes('islands') || lowerName.includes('epic')) {
      return LOCAL_IMAGES.universal;
    }
    if (lowerName.includes('seaworld') || lowerName.includes('aquatica') || lowerName.includes('busch')) {
      return LOCAL_IMAGES.seaworld;
    }
    if (lowerName.includes('animal')) {
      return LOCAL_IMAGES.animal;
    }
    return LOCAL_IMAGES.disney;
  }
  
  if (type === 'hotel') {
    if (lowerName.includes('deluxe') || lowerName.includes('grand') || lowerName.includes('resort')) {
      return LOCAL_IMAGES.hotelLuxury;
    }
    return LOCAL_IMAGES.hotel;
  }
  
  if (type === 'car') return LOCAL_IMAGES.car;
  if (type === 'insurance') return LOCAL_IMAGES.insurance;
  
  return LOCAL_IMAGES.disney;
}

export async function generateProposalPDF(cart: ParsedCart): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Preload all images
  const imageCache = new Map<string, string>();
  const allPaths = new Set<string>();
  allPaths.add(LOCAL_IMAGES.logo);
  
  cart.tickets?.forEach(t => allPaths.add(getImagePathForItem(t.name, 'ticket')));
  cart.hotels?.forEach(h => allPaths.add(getImagePathForItem(h.name, 'hotel')));
  cart.cars?.forEach(c => allPaths.add(getImagePathForItem(c.name, 'car')));
  cart.insurance?.forEach(i => allPaths.add(getImagePathForItem(i.name, 'insurance')));
  
  await Promise.all(
    Array.from(allPaths).map(async (path) => {
      const data = await loadLocalImage(path);
      if (data) imageCache.set(path, data);
    })
  );

  const getImage = (path: string) => imageCache.get(path) || null;

  // Check page break
  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 25) {
      doc.addPage();
      y = margin;
      // Add header bar on content pages
      doc.setFillColor(...C.primary);
      doc.rect(0, 0, pageWidth, 8, 'F');
      y = 18;
    }
  };

  // ========== COVER PAGE ==========
  // Dark blue background
  doc.setFillColor(...C.blueDark);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Logo
  const logoImg = getImage(LOCAL_IMAGES.logo);
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', pageWidth / 2 - 35, 30, 70, 28);
    } catch (e) { /* ignore */ }
  }

  // Main title
  doc.setTextColor(...C.white);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA DE VIAGEM', pageWidth / 2, 85, { align: 'center' });

  // Subtitle
  doc.setTextColor(...C.primary);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Uma experiência mágica te espera', pageWidth / 2, 98, { align: 'center' });

  // Client box
  doc.setFillColor(42, 42, 78);
  doc.roundedRect(margin + 20, 120, contentWidth - 40, 45, 6, 6, 'F');
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(1);
  doc.roundedRect(margin + 20, 120, contentWidth - 40, 45, 6, 6, 'S');
  
  doc.setTextColor(...C.primary);
  doc.setFontSize(10);
  doc.text('PREPARADA ESPECIALMENTE PARA', pageWidth / 2, 135, { align: 'center' });
  
  doc.setTextColor(...C.white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text((cart.clientName || 'Cliente').toUpperCase(), pageWidth / 2, 152, { align: 'center' });

  // Trip info box
  if (cart.summary) {
    doc.setFillColor(...C.primary);
    doc.roundedRect(margin + 25, 180, contentWidth - 50, 35, 4, 4, 'F');
    
    doc.setTextColor(...C.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PERÍODO DA VIAGEM', pageWidth / 2, 192, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`${cart.summary.tripStart || '...'} a ${cart.summary.tripEnd || '...'}`, pageWidth / 2, 205, { align: 'center' });
  }

  // Includes summary
  const includes: string[] = [];
  if (cart.tickets?.length) includes.push(`${cart.tickets.length} Ingresso(s)`);
  if (cart.hotels?.length) includes.push(`${cart.hotels.length} Hospedagem`);
  if (cart.cars?.length) includes.push(`${cart.cars.length} Carro`);
  if (cart.insurance?.length) includes.push(`${cart.insurance.length} Seguro`);

  if (includes.length > 0) {
    doc.setFillColor(42, 42, 78);
    doc.roundedRect(margin + 15, 230, contentWidth - 30, 25, 4, 4, 'F');
    
    doc.setTextColor(...C.gray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('SUA PROPOSTA INCLUI:', pageWidth / 2, 240, { align: 'center' });
    
    doc.setTextColor(...C.white);
    doc.setFontSize(11);
    doc.text(includes.join('   •   '), pageWidth / 2, 250, { align: 'center' });
  }

  // Footer date
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setTextColor(...C.gray);
  doc.setFontSize(10);
  doc.text(`Proposta gerada em ${today}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

  // ========== CONTENT PAGES ==========
  doc.addPage();
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageWidth, 8, 'F');
  y = 18;

  // Section header helper
  const addSection = (title: string, color: [number, number, number]) => {
    checkPage(22);
    doc.setFillColor(...color);
    doc.roundedRect(margin, y, contentWidth, 12, 3, 3, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 8, y + 8);
    y += 18;
  };

  // Card helper with image
  const addCard = (
    title: string,
    description: string | undefined,
    imagePath: string,
    details: { label: string; value: string }[],
    badges: string[],
    color: [number, number, number]
  ) => {
    const imgData = getImage(imagePath);
    const hasImage = !!imgData;
    
    const descLines = description ? doc.splitTextToSize(description, contentWidth - 20) : [];
    const visibleDescLines = Math.min(descLines.length, 3);
    const detailRows = Math.ceil(details.length / 2);
    const hasBadges = badges.length > 0;
    
    const cardHeight = Math.max(
      hasImage ? 50 : 35,
      14 + (visibleDescLines * 4) + (detailRows * 6) + (hasBadges ? 10 : 0) + 8
    );
    
    checkPage(cardHeight + 8);
    
    // Card background
    doc.setFillColor(...C.lightGray);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 4, 4, 'F');
    
    // Color accent
    doc.setFillColor(...color);
    doc.roundedRect(margin, y, 4, cardHeight, 2, 2, 'F');
    
    let textX = margin + 10;
    let textWidth = contentWidth - 18;
    
    // Image
    if (hasImage) {
      try {
        doc.addImage(imgData!, 'JPEG', margin + 6, y + 4, 42, 42);
        textX = margin + 54;
        textWidth = contentWidth - 62;
      } catch (e) {
        console.log('Image load failed');
      }
    }
    
    let cardY = y + 8;
    
    // Title
    doc.setTextColor(...C.text);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    let displayTitle = title;
    while (doc.getTextWidth(displayTitle) > textWidth && displayTitle.length > 25) {
      displayTitle = displayTitle.slice(0, -4) + '...';
    }
    doc.text(displayTitle, textX, cardY);
    cardY += 5;
    
    // Description
    if (descLines.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.gray);
      descLines.slice(0, 3).forEach((line: string) => {
        doc.text(line, textX, cardY);
        cardY += 4;
      });
      cardY += 2;
    }
    
    // Details in 2 columns
    if (details.length > 0) {
      doc.setFontSize(8);
      const colWidth = textWidth / 2;
      let col = 0;
      let detailY = cardY;
      
      details.forEach((d) => {
        const x = textX + (col * colWidth);
        doc.setTextColor(...C.text);
        doc.setFont('helvetica', 'bold');
        doc.text(`${d.label}:`, x, detailY);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray);
        const labelWidth = doc.getTextWidth(`${d.label}: `);
        let val = d.value;
        const maxValWidth = colWidth - labelWidth - 4;
        while (doc.getTextWidth(val) > maxValWidth && val.length > 8) {
          val = val.slice(0, -4) + '...';
        }
        doc.text(val, x + labelWidth, detailY);
        
        col++;
        if (col >= 2) {
          col = 0;
          detailY += 6;
        }
      });
      cardY = detailY + (col > 0 ? 7 : 2);
    }
    
    // Badges
    if (hasBadges && cardY < y + cardHeight - 6) {
      let badgeX = textX;
      doc.setFontSize(7);
      badges.slice(0, 4).forEach((badge) => {
        const w = doc.getTextWidth(badge) + 6;
        if (badgeX + w > pageWidth - margin - 5) return;
        
        doc.setFillColor(...color);
        doc.roundedRect(badgeX, cardY - 2, w, 6, 2, 2, 'F');
        doc.setTextColor(...C.white);
        doc.text(badge, badgeX + 3, cardY + 2);
        badgeX += w + 3;
      });
    }
    
    y += cardHeight + 6;
  };

  // ========== TICKETS ==========
  if (cart.tickets && cart.tickets.length > 0) {
    addSection('INGRESSOS PARA PARQUES', C.primary);
    
    cart.tickets.forEach((ticket: TicketItem) => {
      const imgPath = getImagePathForItem(ticket.name, 'ticket');
      const details: { label: string; value: string }[] = [];
      
      if (ticket.date) details.push({ label: 'Data', value: ticket.date });
      if (ticket.validityDays || ticket.duration) {
        details.push({ label: 'Validade', value: ticket.validityDays || ticket.duration || '' });
      }
      if (ticket.guests) details.push({ label: 'Visitantes', value: ticket.guests });
      if (ticket.entryType) details.push({ label: 'Tipo', value: ticket.entryType });
      
      const badges: string[] = [];
      if (ticket.benefits) badges.push(...ticket.benefits.slice(0, 3));
      
      addCard(ticket.name, ticket.fullDescription || ticket.description, imgPath, details, badges, C.primary);
    });
  }

  // ========== HOTELS ==========
  if (cart.hotels && cart.hotels.length > 0) {
    addSection('HOSPEDAGEM', C.teal);
    
    cart.hotels.forEach((hotel: HotelItem) => {
      const imgPath = getImagePathForItem(hotel.name, 'hotel');
      const details: { label: string; value: string }[] = [];
      
      if (hotel.checkIn) details.push({ label: 'Check-in', value: hotel.checkIn });
      if (hotel.checkOut) details.push({ label: 'Check-out', value: hotel.checkOut });
      if (hotel.nights) details.push({ label: 'Noites', value: hotel.nights });
      if (hotel.rooms) details.push({ label: 'Quartos', value: hotel.rooms });
      if (hotel.guests) details.push({ label: 'Hóspedes', value: hotel.guests });
      if (hotel.roomType) details.push({ label: 'Quarto', value: hotel.roomType });
      
      const badges: string[] = [];
      if (hotel.amenities) badges.push(...hotel.amenities.slice(0, 4));
      
      addCard(hotel.name, hotel.fullDescription || hotel.roomDescription, imgPath, details, badges, C.teal);
    });
  }

  // ========== CARS ==========
  if (cart.cars && cart.cars.length > 0) {
    addSection('ALUGUEL DE CARRO', C.green);
    
    cart.cars.forEach((car: CarItem) => {
      const imgPath = getImagePathForItem(car.name, 'car');
      const details: { label: string; value: string }[] = [];
      
      if (car.pickupDate) details.push({ label: 'Retirada', value: car.pickupDate });
      if (car.returnDate) details.push({ label: 'Devolução', value: car.returnDate });
      if (car.pickupLocation) details.push({ label: 'Local', value: car.pickupLocation });
      if (car.category) details.push({ label: 'Categoria', value: car.category });
      if (car.capacity) details.push({ label: 'Capacidade', value: car.capacity });
      
      const badges: string[] = [];
      if (car.features) badges.push(...car.features.slice(0, 4));
      
      addCard(car.name, car.fullDescription, imgPath, details, badges, C.green);
    });
  }

  // ========== INSURANCE ==========
  if (cart.insurance && cart.insurance.length > 0) {
    addSection('SEGURO VIAGEM', C.purple);
    
    cart.insurance.forEach((ins: InsuranceItem) => {
      const imgPath = getImagePathForItem(ins.name, 'insurance');
      const details: { label: string; value: string }[] = [];
      
      if (ins.coverageAmount || ins.coverage) {
        details.push({ label: 'Cobertura', value: ins.coverageAmount || ins.coverage || '' });
      }
      if (ins.travelers) details.push({ label: 'Segurados', value: ins.travelers });
      if (ins.destination) details.push({ label: 'Destino', value: ins.destination });
      if (ins.dates || ins.startDate) {
        details.push({ label: 'Período', value: ins.startDate ? `${ins.startDate} a ${ins.endDate}` : ins.dates || '' });
      }
      
      const badges: string[] = [];
      if (ins.coverageDetails) badges.push(...ins.coverageDetails.slice(0, 4));
      
      addCard(ins.name, ins.fullDescription, imgPath, details, badges, C.purple);
    });
  }

  // ========== CTA PAGE ==========
  doc.addPage();
  doc.setFillColor(...C.blueDark);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setTextColor(...C.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Vamos realizar seu sonho?', pageWidth / 2, 80, { align: 'center' });
  
  doc.setTextColor(...C.primary);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Entre em contato e feche sua viagem dos sonhos!', pageWidth / 2, 95, { align: 'center' });
  
  // Contact box
  doc.setFillColor(42, 42, 78);
  doc.roundedRect(margin + 20, 120, contentWidth - 40, 70, 6, 6, 'F');
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(1);
  doc.roundedRect(margin + 20, 120, contentWidth - 40, 70, 6, 6, 'S');
  
  doc.setTextColor(...C.primary);
  doc.setFontSize(10);
  doc.text('FALE CONOSCO', pageWidth / 2, 138, { align: 'center' });
  
  doc.setTextColor(...C.gray);
  doc.setFontSize(10);
  doc.text('WhatsApp:', margin + 35, 155);
  doc.text('E-mail:', margin + 35, 168);
  doc.text('Site:', margin + 35, 181);
  
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text('(11) 99999-9999', margin + 70, 155);
  doc.text('contato@orlandofastpass.com.br', margin + 70, 168);
  doc.text('www.orlandofastpass.com.br', margin + 70, 181);
  
  // Footer
  doc.setTextColor(...C.gray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`© ${new Date().getFullYear()} Orlando Fast Pass • Todos os direitos reservados`, pageWidth / 2, pageHeight - 25, { align: 'center' });

  // Save
  const clientName = cart.clientName || 'Cliente';
  const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  doc.save(`Proposta_${clientName.replace(/\s+/g, '_')}_${date}.pdf`);
}
