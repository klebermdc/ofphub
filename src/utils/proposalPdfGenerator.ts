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
  primary: [255, 107, 0] as [number, number, number],
  blue: [30, 58, 138] as [number, number, number],
  blueDark: [17, 24, 39] as [number, number, number],
  gold: [251, 191, 36] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  text: [31, 41, 55] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  purple: [126, 34, 206] as [number, number, number],
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
  const margin = 12;
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
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = margin;
      // Add header bar on content pages
      doc.setFillColor(...C.primary);
      doc.rect(0, 0, pageWidth, 6, 'F');
      y = 14;
    }
  };

  // ========== COVER PAGE ==========
  // Full blue gradient background
  doc.setFillColor(...C.blue);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Darker bottom
  doc.setFillColor(...C.blueDark);
  doc.rect(0, pageHeight * 0.5, pageWidth, pageHeight * 0.5, 'F');
  
  // Decorative gold circles
  doc.setFillColor(...C.gold);
  [[25, 30, 4], [185, 25, 3], [40, 70, 2], [175, 75, 3], [20, 130, 2], [190, 145, 2.5]].forEach(([x, y, r]) => {
    doc.circle(x, y, r, 'F');
  });

  // Logo
  const logoImg = getImage(LOCAL_IMAGES.logo);
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', pageWidth / 2 - 35, 22, 70, 28);
    } catch (e) { /* ignore */ }
  }

  // Tagline
  doc.setTextColor(...C.white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'italic');
  doc.text('Realizando sonhos desde 2015', pageWidth / 2, 62, { align: 'center' });

  // Main title
  doc.setFontSize(44);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA', pageWidth / 2, 88, { align: 'center' });
  doc.setFontSize(40);
  doc.text('EXCLUSIVA', pageWidth / 2, 105, { align: 'center' });

  // Gold line
  doc.setFillColor(...C.gold);
  doc.rect(pageWidth / 2 - 35, 112, 70, 3, 'F');

  // Client box
  doc.setFillColor(...C.white);
  doc.roundedRect(margin + 15, 128, contentWidth - 30, 38, 5, 5, 'F');
  
  doc.setTextColor(...C.gray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Preparada especialmente para', pageWidth / 2, 142, { align: 'center' });
  
  doc.setTextColor(...C.primary);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text((cart.clientName || 'Cliente').toUpperCase(), pageWidth / 2, 158, { align: 'center' });

  // Trip dates box
  if (cart.summary) {
    doc.setFillColor(...C.gold);
    doc.roundedRect(margin + 20, 180, contentWidth - 40, 45, 5, 5, 'F');
    
    doc.setTextColor(...C.blueDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PERÍODO DA VIAGEM', pageWidth / 2, 194, { align: 'center' });
    
    doc.setFontSize(18);
    doc.text(`${cart.summary.tripStart || '...'} a ${cart.summary.tripEnd || '...'}`, pageWidth / 2, 210, { align: 'center' });
    
    if (cart.summary.totalDays) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(cart.summary.totalDays, pageWidth / 2, 222, { align: 'center' });
    }
  }

  // Includes box
  const includes: string[] = [];
  if (cart.tickets?.length) includes.push(`${cart.tickets.length} Ingresso(s)`);
  if (cart.hotels?.length) includes.push(`${cart.hotels.length} Hospedagem`);
  if (cart.cars?.length) includes.push(`${cart.cars.length} Carro`);
  if (cart.insurance?.length) includes.push(`${cart.insurance.length} Seguro`);

  if (includes.length > 0) {
    doc.setFillColor(...C.white);
    doc.roundedRect(margin + 10, 240, contentWidth - 20, 28, 4, 4, 'F');
    
    doc.setTextColor(...C.blueDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SUA PROPOSTA INCLUI:', pageWidth / 2, 252, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.gray);
    doc.text(includes.join('   •   '), pageWidth / 2, 263, { align: 'center' });
  }

  // ========== CONTENT PAGES ==========
  doc.addPage();
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageWidth, 6, 'F');
  y = 14;

  // Section header
  const addSection = (title: string, color: [number, number, number]) => {
    checkPage(22);
    doc.setFillColor(...color);
    doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 8, y + 10);
    y += 20;
  };

  // Item card with image
  const addCard = (
    title: string,
    description: string | undefined,
    imagePath: string,
    details: { icon: string; label: string; value: string }[],
    badges: string[],
    color: [number, number, number]
  ) => {
    const imgData = getImage(imagePath);
    const hasImage = !!imgData;
    
    // Calculate heights
    const descLines = description ? doc.splitTextToSize(description, contentWidth - (hasImage ? 65 : 16)) : [];
    const visibleDescLines = Math.min(descLines.length, 3);
    const detailRows = Math.ceil(details.length / 2);
    const hasBadges = badges.length > 0;
    
    const cardHeight = Math.max(
      hasImage ? 55 : 40,
      16 + (visibleDescLines * 4.5) + (detailRows * 7) + (hasBadges ? 12 : 0) + 8
    );
    
    checkPage(cardHeight + 8);
    
    // Card background
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 4, 4, 'F');
    
    // Color accent on left
    doc.setFillColor(...color);
    doc.roundedRect(margin, y, 4, cardHeight, 2, 2, 'F');
    
    let textX = margin + 10;
    let textWidth = contentWidth - 16;
    
    // Image on left
    if (hasImage) {
      try {
        doc.addImage(imgData!, 'JPEG', margin + 6, y + 4, 48, 48);
        textX = margin + 60;
        textWidth = contentWidth - 66;
      } catch (e) {
        console.log('Failed to add image');
      }
    }
    
    let cardY = y + 10;
    
    // Title
    doc.setTextColor(...C.text);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    let displayTitle = title;
    while (doc.getTextWidth(displayTitle) > textWidth && displayTitle.length > 30) {
      displayTitle = displayTitle.slice(0, -4) + '...';
    }
    doc.text(displayTitle, textX, cardY);
    cardY += 6;
    
    // Description
    if (descLines.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.gray);
      descLines.slice(0, 3).forEach((line: string) => {
        doc.text(line, textX, cardY);
        cardY += 4.5;
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
        doc.text(`${d.icon} ${d.label}:`, x, detailY);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray);
        let val = d.value;
        const labelWidth = doc.getTextWidth(`${d.icon} ${d.label}: `);
        const maxValWidth = colWidth - labelWidth - 4;
        while (doc.getTextWidth(val) > maxValWidth && val.length > 8) {
          val = val.slice(0, -4) + '...';
        }
        doc.text(val, x + labelWidth, detailY);
        
        col++;
        if (col >= 2) {
          col = 0;
          detailY += 7;
        }
      });
      cardY = detailY + (col > 0 ? 8 : 2);
    }
    
    // Badges
    if (hasBadges && cardY < y + cardHeight - 8) {
      let badgeX = textX;
      doc.setFontSize(7);
      badges.slice(0, 4).forEach((badge) => {
        const w = doc.getTextWidth(badge) + 6;
        if (badgeX + w > pageWidth - margin - 5) return;
        
        doc.setFillColor(...color);
        doc.roundedRect(badgeX, cardY - 2, w, 7, 2, 2, 'F');
        doc.setTextColor(...C.white);
        doc.text(badge, badgeX + 3, cardY + 3);
        badgeX += w + 3;
      });
    }
    
    y += cardHeight + 6;
  };

  // ========== TICKETS ==========
  if (cart.tickets && cart.tickets.length > 0) {
    addSection('🎢 INGRESSOS E PARQUES', C.primary);
    
    cart.tickets.forEach((ticket: TicketItem) => {
      const imgPath = getImagePathForItem(ticket.name, 'ticket');
      const details: { icon: string; label: string; value: string }[] = [];
      
      if (ticket.date) details.push({ icon: '📅', label: 'Data', value: ticket.date });
      if (ticket.validityDays || ticket.duration) {
        details.push({ icon: '⏱️', label: 'Validade', value: ticket.validityDays || ticket.duration || '' });
      }
      if (ticket.guests) details.push({ icon: '👥', label: 'Visitantes', value: ticket.guests });
      if (ticket.entryType) details.push({ icon: '🎫', label: 'Tipo', value: ticket.entryType });
      if (ticket.time) details.push({ icon: '🕐', label: 'Horário', value: ticket.time });
      if (ticket.parks && ticket.parks.length > 0) {
        details.push({ icon: '🎡', label: 'Parques', value: ticket.parks.slice(0, 2).join(', ') });
      }
      
      const badges: string[] = [];
      if (ticket.benefits) badges.push(...ticket.benefits.slice(0, 3));
      
      addCard(ticket.name, ticket.fullDescription || ticket.description, imgPath, details, badges, C.primary);
    });
  }

  // ========== HOTELS ==========
  if (cart.hotels && cart.hotels.length > 0) {
    addSection('🏨 HOSPEDAGEM', C.teal);
    
    cart.hotels.forEach((hotel: HotelItem) => {
      const imgPath = getImagePathForItem(hotel.name, 'hotel');
      const details: { icon: string; label: string; value: string }[] = [];
      
      if (hotel.checkIn) details.push({ icon: '📅', label: 'Check-in', value: hotel.checkIn });
      if (hotel.checkOut) details.push({ icon: '📅', label: 'Check-out', value: hotel.checkOut });
      if (hotel.nights) details.push({ icon: '🌙', label: 'Noites', value: hotel.nights });
      if (hotel.rooms) details.push({ icon: '🚪', label: 'Quartos', value: hotel.rooms });
      if (hotel.guests) details.push({ icon: '👥', label: 'Hóspedes', value: hotel.guests });
      if (hotel.roomType) details.push({ icon: '🛏️', label: 'Quarto', value: hotel.roomType });
      if (hotel.category) details.push({ icon: '⭐', label: 'Categoria', value: hotel.category });
      
      const badges: string[] = [];
      if (hotel.amenities) badges.push(...hotel.amenities.slice(0, 4));
      
      addCard(hotel.name, hotel.fullDescription || hotel.roomDescription, imgPath, details, badges, C.teal);
    });
  }

  // ========== CARS ==========
  if (cart.cars && cart.cars.length > 0) {
    addSection('🚗 ALUGUEL DE CARRO', C.green);
    
    cart.cars.forEach((car: CarItem) => {
      const imgPath = getImagePathForItem(car.name, 'car');
      const details: { icon: string; label: string; value: string }[] = [];
      
      if (car.pickupDate) details.push({ icon: '📅', label: 'Retirada', value: car.pickupDate });
      if (car.returnDate) details.push({ icon: '📅', label: 'Devolução', value: car.returnDate });
      if (car.pickupLocation) details.push({ icon: '📍', label: 'Local', value: car.pickupLocation });
      if (car.category) details.push({ icon: '🚙', label: 'Categoria', value: car.category });
      if (car.capacity) details.push({ icon: '👥', label: 'Capacidade', value: car.capacity });
      if (car.rentalCompany) details.push({ icon: '🏢', label: 'Locadora', value: car.rentalCompany });
      
      const badges: string[] = [];
      if (car.features) badges.push(...car.features.slice(0, 4));
      
      addCard(car.name, car.fullDescription, imgPath, details, badges, C.green);
    });
  }

  // ========== INSURANCE ==========
  if (cart.insurance && cart.insurance.length > 0) {
    addSection('🛡️ SEGURO VIAGEM', C.purple);
    
    cart.insurance.forEach((ins: InsuranceItem) => {
      const imgPath = getImagePathForItem(ins.name, 'insurance');
      const details: { icon: string; label: string; value: string }[] = [];
      
      if (ins.coverageAmount || ins.coverage) {
        details.push({ icon: '💰', label: 'Cobertura', value: ins.coverageAmount || ins.coverage || '' });
      }
      if (ins.startDate) details.push({ icon: '📅', label: 'Início', value: ins.startDate });
      if (ins.endDate) details.push({ icon: '📅', label: 'Fim', value: ins.endDate });
      if (ins.travelers) details.push({ icon: '👥', label: 'Segurados', value: ins.travelers });
      if (ins.destination) details.push({ icon: '🌎', label: 'Destino', value: ins.destination });
      if (ins.dates && !ins.startDate) details.push({ icon: '📅', label: 'Período', value: ins.dates });
      
      const badges: string[] = [];
      if (ins.coverageDetails) badges.push(...ins.coverageDetails.slice(0, 4));
      
      addCard(ins.name, ins.fullDescription, imgPath, details, badges, C.purple);
    });
  }

  // ========== HIGHLIGHTS ==========
  if (cart.summary?.highlights && cart.summary.highlights.length > 0) {
    checkPage(60);
    
    doc.setFillColor(...C.gold);
    doc.roundedRect(margin, y, contentWidth, 12, 3, 3, 'F');
    doc.setTextColor(...C.blueDark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('⭐ DESTAQUES DA SUA VIAGEM', margin + 8, y + 8);
    y += 18;
    
    cart.summary.highlights.slice(0, 6).forEach((h) => {
      checkPage(10);
      doc.setFillColor(250, 250, 252);
      doc.roundedRect(margin, y, contentWidth, 9, 2, 2, 'F');
      doc.setTextColor(...C.text);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`✨ ${h}`, margin + 6, y + 6);
      y += 11;
    });
    
    y += 8;
  }

  // ========== CTA FOOTER ==========
  checkPage(75);
  
  doc.setFillColor(...C.blue);
  doc.roundedRect(margin, y, contentWidth, 65, 5, 5, 'F');
  
  doc.setFillColor(...C.gold);
  doc.rect(margin + 12, y + 5, contentWidth - 24, 3, 'F');
  
  doc.setTextColor(...C.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Pronto para realizar seu sonho?', pageWidth / 2, y + 25, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Entre em contato e feche sua viagem mágica!', pageWidth / 2, y + 36, { align: 'center' });
  
  doc.setFillColor(...C.white);
  doc.roundedRect(margin + 10, y + 44, contentWidth - 20, 16, 3, 3, 'F');
  
  doc.setTextColor(...C.blueDark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('📱 WhatsApp: (11) 99999-9999   •   ✉️ contato@orlandofastpass.com.br', pageWidth / 2, y + 54, { align: 'center' });

  // ========== PAGE NUMBERS ==========
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 248, 250);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...C.gray);
    doc.text('Orlando Fast Pass - Sua viagem dos sonhos', margin, pageHeight - 4);
    doc.text(`${i - 1} / ${totalPages - 1}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
  }

  // Save
  const fileName = `Proposta_${(cart.clientName || 'Cliente').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}
