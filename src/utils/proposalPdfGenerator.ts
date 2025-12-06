import jsPDF from 'jspdf';
import { ParsedCart, TicketItem, HotelItem, CarItem, InsuranceItem } from '@/components/proposals/ProposalTab';

// Image paths for local images
const LOCAL_IMAGES = {
  disney: [
    '/images/proposals/parks/disney-1.jpg',
    '/images/proposals/parks/disney-2.jpg',
    '/images/proposals/parks/disney-3.jpg',
    '/images/proposals/parks/disney-4.jpg',
    '/images/proposals/parks/disney-5.jpg',
    '/images/proposals/parks/disney-6.jpg',
  ],
  universal: '/images/proposals/universal-park.jpg',
  seaworld: '/images/proposals/seaworld.jpg',
  animal: '/images/proposals/animal-kingdom.jpg',
  hotel: '/images/proposals/hotel-resort.jpg',
  hotelLuxury: '/images/proposals/luxury-hotel.jpg',
  car: '/images/proposals/car-rental.jpg',
  insurance: '/images/proposals/travel-insurance.jpg',
  logo: '/images/logo-branco.png',
};

// Premium color palette
const COLORS = {
  // Primary brand
  orange: [249, 115, 22] as [number, number, number],
  orangeLight: [255, 165, 89] as [number, number, number],
  orangeDark: [194, 65, 12] as [number, number, number],
  
  // Deep blues for premium feel
  navyDark: [15, 23, 42] as [number, number, number],
  navy: [30, 41, 59] as [number, number, number],
  navyLight: [51, 65, 85] as [number, number, number],
  
  // Accents
  gold: [251, 191, 36] as [number, number, number],
  goldLight: [253, 224, 71] as [number, number, number],
  purple: [139, 92, 246] as [number, number, number],
  teal: [20, 184, 166] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  rose: [244, 63, 94] as [number, number, number],
  
  // Neutrals
  white: [255, 255, 255] as [number, number, number],
  grayLight: [248, 250, 252] as [number, number, number],
  gray: [148, 163, 184] as [number, number, number],
  grayDark: [71, 85, 105] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
};

// Get Disney image by index
function getDisneyImage(index: number): string {
  return LOCAL_IMAGES.disney[index % LOCAL_IMAGES.disney.length];
}

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
function getImagePathForItem(name: string, type: 'ticket' | 'hotel' | 'car' | 'insurance', itemIndex: number = 0): string {
  const lowerName = name.toLowerCase();
  
  if (type === 'ticket') {
    if (lowerName.includes('disney') || lowerName.includes('magic kingdom') || lowerName.includes('epcot') || lowerName.includes('hollywood') || lowerName.includes('animal')) {
      return getDisneyImage(itemIndex);
    }
    if (lowerName.includes('universal') || lowerName.includes('islands') || lowerName.includes('epic')) {
      return LOCAL_IMAGES.universal;
    }
    if (lowerName.includes('seaworld') || lowerName.includes('aquatica') || lowerName.includes('busch')) {
      return LOCAL_IMAGES.seaworld;
    }
    return getDisneyImage(itemIndex);
  }
  
  if (type === 'hotel') {
    if (lowerName.includes('deluxe') || lowerName.includes('grand') || lowerName.includes('resort')) {
      return LOCAL_IMAGES.hotelLuxury;
    }
    return LOCAL_IMAGES.hotel;
  }
  
  if (type === 'car') return LOCAL_IMAGES.car;
  if (type === 'insurance') return LOCAL_IMAGES.insurance;
  
  return getDisneyImage(itemIndex);
}

// Draw gradient background (simulated with multiple rectangles)
function drawGradientBackground(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  colorStart: [number, number, number],
  colorEnd: [number, number, number],
  steps: number = 30
) {
  const stepHeight = height / steps;
  for (let i = 0; i < steps; i++) {
    const ratio = i / steps;
    const r = Math.round(colorStart[0] + (colorEnd[0] - colorStart[0]) * ratio);
    const g = Math.round(colorStart[1] + (colorEnd[1] - colorStart[1]) * ratio);
    const b = Math.round(colorStart[2] + (colorEnd[2] - colorStart[2]) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(x, y + i * stepHeight, width, stepHeight + 0.5, 'F');
  }
}

// Draw decorative stars
function drawStars(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.setFillColor(...COLORS.gold);
  const starPositions = [
    { x: 25, y: 40, size: 2 },
    { x: pageWidth - 30, y: 55, size: 1.5 },
    { x: 35, y: pageHeight - 80, size: 1.8 },
    { x: pageWidth - 25, y: pageHeight - 100, size: 2.2 },
    { x: 50, y: 100, size: 1.2 },
    { x: pageWidth - 45, y: 130, size: 1.4 },
  ];
  
  starPositions.forEach(({ x, y, size }) => {
    // Simple 4-point star
    doc.setFillColor(251, 191, 36);
    doc.circle(x, y, size * 0.4, 'F');
    // Sparkle effect
    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(0.3);
    doc.line(x - size, y, x + size, y);
    doc.line(x, y - size, x, y + size);
  });
}

// Draw decorative corner flourish
function drawCornerFlourish(doc: jsPDF, x: number, y: number, size: number, flip: boolean = false) {
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.8);
  const dir = flip ? -1 : 1;
  
  // Curved corner lines
  doc.line(x, y, x + size * dir, y);
  doc.line(x, y, x, y + size);
  doc.line(x + (size * 0.3) * dir, y, x + (size * 0.3) * dir, y + size * 0.3);
  doc.line(x, y + size * 0.3, x + (size * 0.3) * dir, y + size * 0.3);
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
  LOCAL_IMAGES.disney.forEach(path => allPaths.add(path));
  allPaths.add(LOCAL_IMAGES.universal);
  allPaths.add(LOCAL_IMAGES.seaworld);
  allPaths.add(LOCAL_IMAGES.animal);
  allPaths.add(LOCAL_IMAGES.hotel);
  allPaths.add(LOCAL_IMAGES.hotelLuxury);
  allPaths.add(LOCAL_IMAGES.car);
  allPaths.add(LOCAL_IMAGES.insurance);
  
  console.log('Loading images:', Array.from(allPaths));
  
  await Promise.all(
    Array.from(allPaths).map(async (path) => {
      const data = await loadLocalImage(path);
      if (data) {
        imageCache.set(path, data);
        console.log('Loaded:', path);
      }
    })
  );
  
  console.log('Cache size:', imageCache.size);

  const getImage = (path: string) => imageCache.get(path) || null;
  const addImage = (path: string, x: number, y: number, w: number, h: number) => {
    const data = getImage(path);
    if (data) {
      try {
        const format = data.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(data, format, x, y, w, h);
        return true;
      } catch (e) {
        console.error('Image failed:', path, e);
      }
    }
    return false;
  };

  // ═══════════════════════════════════════════════════════════
  // PAGE 1: PREMIUM COVER
  // ═══════════════════════════════════════════════════════════
  
  // Full-page gradient background
  drawGradientBackground(doc, 0, 0, pageWidth, pageHeight, COLORS.navyDark, COLORS.navy, 40);
  
  // Decorative elements
  drawStars(doc, pageWidth, pageHeight);
  drawCornerFlourish(doc, 10, 10, 20);
  drawCornerFlourish(doc, pageWidth - 10, 10, 20, true);
  drawCornerFlourish(doc, 10, pageHeight - 30, 20);
  drawCornerFlourish(doc, pageWidth - 10, pageHeight - 30, 20, true);
  
  // Top accent bar with gradient feel
  doc.setFillColor(...COLORS.orange);
  doc.rect(0, 0, pageWidth, 4, 'F');
  doc.setFillColor(...COLORS.orangeLight);
  doc.rect(0, 0, pageWidth, 1.5, 'F');
  
  // Logo - centered and larger
  const logoImg = getImage(LOCAL_IMAGES.logo);
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', pageWidth / 2 - 40, 25, 80, 32);
    } catch (e) { /* ignore */ }
  }
  
  // Main title with shadow effect
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(42);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA DE', pageWidth / 2 + 1, 86, { align: 'center' });
  doc.text('VIAGEM', pageWidth / 2 + 1, 101, { align: 'center' });
  
  doc.setTextColor(...COLORS.white);
  doc.text('PROPOSTA DE', pageWidth / 2, 85, { align: 'center' });
  doc.text('VIAGEM', pageWidth / 2, 100, { align: 'center' });
  
  // Decorative line under title
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - 50, 108, pageWidth / 2 + 50, 108);
  doc.setFillColor(...COLORS.gold);
  doc.circle(pageWidth / 2, 108, 2, 'F');
  
  // Subtitle
  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'italic');
  doc.text('Uma experiência mágica te espera', pageWidth / 2, 120, { align: 'center' });
  
  // Client name box - premium style
  const clientBoxY = 140;
  doc.setFillColor(40, 50, 70);
  doc.roundedRect(margin + 15, clientBoxY, contentWidth - 30, 55, 8, 8, 'F');
  
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(1.5);
  doc.roundedRect(margin + 15, clientBoxY, contentWidth - 30, 55, 8, 8, 'S');
  
  // Inner glow line
  doc.setDrawColor(...COLORS.orangeLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin + 17, clientBoxY + 2, contentWidth - 34, 51, 7, 7, 'S');
  
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PREPARADA ESPECIALMENTE PARA', pageWidth / 2, clientBoxY + 18, { align: 'center' });
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  const clientName = (cart.clientName || 'Cliente').toUpperCase();
  doc.text(clientName, pageWidth / 2, clientBoxY + 40, { align: 'center' });
  
  // Trip period - elegant pill
  if (cart.summary) {
    const periodY = 210;
    doc.setFillColor(...COLORS.orange);
    doc.roundedRect(margin + 25, periodY, contentWidth - 50, 28, 14, 14, 'F');
    
    // Inner highlight
    doc.setFillColor(...COLORS.orangeLight);
    doc.roundedRect(margin + 25, periodY, contentWidth - 50, 8, 4, 4, 'F');
    
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PERÍODO DA VIAGEM', pageWidth / 2, periodY + 10, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`${cart.summary.tripStart || '...'} a ${cart.summary.tripEnd || '...'}`, pageWidth / 2, periodY + 22, { align: 'center' });
  }
  
  // Package summary icons
  const summaryY = 250;
  const items: { icon: string; label: string; count: number }[] = [];
  if (cart.tickets?.length) items.push({ icon: '🎢', label: 'Ingressos', count: cart.tickets.length });
  if (cart.hotels?.length) items.push({ icon: '🏨', label: 'Hospedagem', count: cart.hotels.length });
  if (cart.cars?.length) items.push({ icon: '🚗', label: 'Carro', count: cart.cars.length });
  if (cart.insurance?.length) items.push({ icon: '🛡️', label: 'Seguro', count: cart.insurance.length });
  
  if (items.length > 0) {
    const itemWidth = (contentWidth - 20) / items.length;
    items.forEach((item, i) => {
      const x = margin + 10 + i * itemWidth + itemWidth / 2;
      
      // Icon circle
      doc.setFillColor(50, 60, 80);
      doc.circle(x, summaryY, 12, 'F');
      
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.count}x`, x, summaryY + 3, { align: 'center' });
      
      doc.setTextColor(...COLORS.gray);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, x, summaryY + 18, { align: 'center' });
    });
  }
  
  // Footer
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setTextColor(...COLORS.grayDark);
  doc.setFontSize(9);
  doc.text(`Proposta válida por 7 dias • Gerada em ${today}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
  
  // Bottom accent
  doc.setFillColor(...COLORS.orange);
  doc.rect(0, pageHeight - 4, pageWidth, 4, 'F');

  // ═══════════════════════════════════════════════════════════
  // CONTENT PAGES
  // ═══════════════════════════════════════════════════════════
  
  const startContentPage = () => {
    doc.addPage();
    // Subtle gradient header
    drawGradientBackground(doc, 0, 0, pageWidth, 25, COLORS.navyDark, COLORS.navy, 15);
    doc.setFillColor(...COLORS.orange);
    doc.rect(0, 25, pageWidth, 2, 'F');
    
    // Logo in header
    if (logoImg) {
      try {
        doc.addImage(logoImg, 'PNG', margin, 5, 35, 14);
      } catch (e) { /* ignore */ }
    }
    
    y = 35;
  };
  
  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      startContentPage();
    }
  };
  
  // Section header - full width banner style
  const addSection = (title: string, subtitle: string, accentColor: [number, number, number]) => {
    checkPage(25);
    
    // Full width section bar
    doc.setFillColor(...accentColor);
    doc.roundedRect(margin, y, contentWidth, 18, 3, 3, 'F');
    
    // Highlight line at top
    doc.setFillColor(255, 200, 150);
    doc.rect(margin, y, contentWidth, 3, 'F');
    
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 10, y + 11);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidth - margin - 5, y + 11, { align: 'right' });
    
    y += 24;
  };
  
  // Premium card with large image
  const addPremiumCard = (
    title: string,
    description: string | undefined,
    imagePath: string,
    details: { label: string; value: string }[],
    badges: string[],
    accentColor: [number, number, number]
  ) => {
    const cardHeight = 75;
    checkPage(cardHeight + 10);
    
    // Card shadow
    doc.setFillColor(200, 200, 200);
    doc.roundedRect(margin + 2, y + 2, contentWidth, cardHeight, 6, 6, 'F');
    
    // Card background
    doc.setFillColor(...COLORS.white);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 6, 6, 'F');
    
    // Left accent bar
    doc.setFillColor(...accentColor);
    doc.roundedRect(margin, y, 5, cardHeight, 3, 3, 'F');
    
    // Image area (left side, larger)
    const imgX = margin + 8;
    const imgY = y + 5;
    const imgW = 60;
    const imgH = cardHeight - 10;
    
    // Image placeholder/background
    doc.setFillColor(...COLORS.grayLight);
    doc.roundedRect(imgX, imgY, imgW, imgH, 4, 4, 'F');
    
    // Add actual image
    const imgAdded = addImage(imagePath, imgX, imgY, imgW, imgH);
    if (imgAdded) {
      console.log('Card image added:', imagePath);
    }
    
    // Text area
    const textX = imgX + imgW + 8;
    const textWidth = contentWidth - imgW - 25;
    let textY = y + 12;
    
    // Title
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    let displayTitle = title;
    while (doc.getTextWidth(displayTitle) > textWidth && displayTitle.length > 30) {
      displayTitle = displayTitle.slice(0, -4) + '...';
    }
    doc.text(displayTitle, textX, textY);
    textY += 7;
    
    // Description
    if (description) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.grayDark);
      const descLines = doc.splitTextToSize(description, textWidth);
      descLines.slice(0, 2).forEach((line: string) => {
        doc.text(line, textX, textY);
        textY += 4;
      });
      textY += 2;
    }
    
    // Details in grid
    if (details.length > 0) {
      doc.setFontSize(8);
      const colWidth = textWidth / 2;
      let col = 0;
      
      details.slice(0, 6).forEach((d) => {
        const x = textX + (col * colWidth);
        doc.setTextColor(...accentColor);
        doc.setFont('helvetica', 'bold');
        doc.text(`${d.label}:`, x, textY);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text);
        const labelWidth = doc.getTextWidth(`${d.label}: `);
        let val = d.value;
        while (doc.getTextWidth(val) > colWidth - labelWidth - 5 && val.length > 10) {
          val = val.slice(0, -4) + '...';
        }
        doc.text(val, x + labelWidth, textY);
        
        col++;
        if (col >= 2) {
          col = 0;
          textY += 5;
        }
      });
      textY += col > 0 ? 6 : 2;
    }
    
    // Badges at bottom
    if (badges.length > 0 && textY < y + cardHeight - 8) {
      let badgeX = textX;
      doc.setFontSize(7);
      badges.slice(0, 4).forEach((badge) => {
        const w = doc.getTextWidth(badge) + 8;
        if (badgeX + w > pageWidth - margin - 10) return;
        // Badge with light accent background
        doc.setFillColor(
          Math.min(255, accentColor[0] + 180),
          Math.min(255, accentColor[1] + 180),
          Math.min(255, accentColor[2] + 180)
        );
        doc.roundedRect(badgeX, textY - 3, w, 7, 2, 2, 'F');
        
        doc.setTextColor(...accentColor);
        doc.setFont('helvetica', 'bold');
        doc.text(badge, badgeX + 4, textY + 2);
        badgeX += w + 4;
      });
    }
    
    y += cardHeight + 8;
  };
  
  // Start content
  startContentPage();
  
  // ========== TICKETS ==========
  if (cart.tickets && cart.tickets.length > 0) {
    addSection('🎢 INGRESSOS PARA PARQUES', `${cart.tickets.length} item(s)`, COLORS.orange);
    
    cart.tickets.forEach((ticket: TicketItem, index: number) => {
      const imgPath = getImagePathForItem(ticket.name, 'ticket', index);
      const details: { label: string; value: string }[] = [];
      
      if (ticket.date) details.push({ label: 'Data', value: ticket.date });
      if (ticket.validityDays || ticket.duration) {
        details.push({ label: 'Validade', value: ticket.validityDays || ticket.duration || '' });
      }
      if (ticket.guests) details.push({ label: 'Visitantes', value: ticket.guests });
      if (ticket.entryType) details.push({ label: 'Entrada', value: ticket.entryType });
      
      const badges = ticket.benefits?.slice(0, 3) || [];
      addPremiumCard(ticket.name, ticket.fullDescription || ticket.description, imgPath, details, badges, COLORS.orange);
    });
  }
  
  // ========== HOTELS ==========
  if (cart.hotels && cart.hotels.length > 0) {
    addSection('🏨 HOSPEDAGEM', `${cart.hotels.length} item(s)`, COLORS.teal);
    
    cart.hotels.forEach((hotel: HotelItem, index: number) => {
      const imgPath = getImagePathForItem(hotel.name, 'hotel', index);
      const details: { label: string; value: string }[] = [];
      
      if (hotel.checkIn) details.push({ label: 'Check-in', value: hotel.checkIn });
      if (hotel.checkOut) details.push({ label: 'Check-out', value: hotel.checkOut });
      if (hotel.nights) details.push({ label: 'Noites', value: hotel.nights });
      if (hotel.rooms) details.push({ label: 'Quartos', value: hotel.rooms });
      if (hotel.guests) details.push({ label: 'Hóspedes', value: hotel.guests });
      if (hotel.roomType) details.push({ label: 'Tipo', value: hotel.roomType });
      
      const badges = hotel.amenities?.slice(0, 4) || [];
      addPremiumCard(hotel.name, hotel.fullDescription || hotel.roomDescription, imgPath, details, badges, COLORS.teal);
    });
  }
  
  // ========== CARS ==========
  if (cart.cars && cart.cars.length > 0) {
    addSection('🚗 ALUGUEL DE CARRO', `${cart.cars.length} item(s)`, COLORS.emerald);
    
    cart.cars.forEach((car: CarItem, index: number) => {
      const imgPath = getImagePathForItem(car.name, 'car', index);
      const details: { label: string; value: string }[] = [];
      
      if (car.pickupDate) details.push({ label: 'Retirada', value: car.pickupDate });
      if (car.returnDate) details.push({ label: 'Devolução', value: car.returnDate });
      if (car.pickupLocation) details.push({ label: 'Local', value: car.pickupLocation });
      if (car.category) details.push({ label: 'Categoria', value: car.category });
      if (car.capacity) details.push({ label: 'Capacidade', value: car.capacity });
      
      const badges = car.features?.slice(0, 4) || [];
      addPremiumCard(car.name, car.fullDescription, imgPath, details, badges, COLORS.emerald);
    });
  }
  
  // ========== INSURANCE ==========
  if (cart.insurance && cart.insurance.length > 0) {
    addSection('🛡️ SEGURO VIAGEM', `${cart.insurance.length} item(s)`, COLORS.purple);
    
    cart.insurance.forEach((ins: InsuranceItem, index: number) => {
      const imgPath = getImagePathForItem(ins.name, 'insurance', index);
      const details: { label: string; value: string }[] = [];
      
      if (ins.coverageAmount || ins.coverage) {
        details.push({ label: 'Cobertura', value: ins.coverageAmount || ins.coverage || '' });
      }
      if (ins.travelers) details.push({ label: 'Viajantes', value: ins.travelers });
      if (ins.destination) details.push({ label: 'Destino', value: ins.destination });
      if (ins.dates || ins.startDate) {
        details.push({ label: 'Período', value: ins.startDate ? `${ins.startDate} a ${ins.endDate}` : ins.dates || '' });
      }
      
      const badges = ins.coverageDetails?.slice(0, 4) || [];
      addPremiumCard(ins.name, ins.fullDescription, imgPath, details, badges, COLORS.purple);
    });
  }
  
  // ═══════════════════════════════════════════════════════════
  // CTA PAGE - CALL TO ACTION
  // ═══════════════════════════════════════════════════════════
  doc.addPage();
  
  // Full page gradient
  drawGradientBackground(doc, 0, 0, pageWidth, pageHeight, COLORS.navyDark, COLORS.navy, 40);
  drawStars(doc, pageWidth, pageHeight);
  
  // Top accent
  doc.setFillColor(...COLORS.orange);
  doc.rect(0, 0, pageWidth, 4, 'F');
  
  // Logo
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', pageWidth / 2 - 35, 30, 70, 28);
    } catch (e) { /* ignore */ }
  }
  
  // Main CTA text
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('Vamos realizar', pageWidth / 2, 85, { align: 'center' });
  doc.text('seu sonho?', pageWidth / 2, 100, { align: 'center' });
  
  // Decorative line
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - 40, 110, pageWidth / 2 + 40, 110);
  doc.setFillColor(...COLORS.gold);
  doc.circle(pageWidth / 2, 110, 2, 'F');
  
  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'italic');
  doc.text('Sua viagem dos sonhos está a um passo!', pageWidth / 2, 125, { align: 'center' });
  
  // Contact box
  const ctaBoxY = 145;
  doc.setFillColor(40, 50, 70);
  doc.roundedRect(margin + 20, ctaBoxY, contentWidth - 40, 85, 10, 10, 'F');
  
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(2);
  doc.roundedRect(margin + 20, ctaBoxY, contentWidth - 40, 85, 10, 10, 'S');
  
  doc.setTextColor(...COLORS.orange);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ENTRE EM CONTATO', pageWidth / 2, ctaBoxY + 18, { align: 'center' });
  
  // Contact details
  const contactY = ctaBoxY + 35;
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text('📱 WhatsApp:', margin + 35, contactY);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('+1 (407) 801-4449', margin + 75, contactY);
  
  doc.setTextColor(...COLORS.gray);
  doc.setFont('helvetica', 'normal');
  doc.text('📧 E-mail:', margin + 35, contactY + 15);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('contato@orlandofastpass.com', margin + 70, contactY + 15);
  
  doc.setTextColor(...COLORS.gray);
  doc.setFont('helvetica', 'normal');
  doc.text('🌐 Site:', margin + 35, contactY + 30);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('www.orlandofastpass.com', margin + 60, contactY + 30);
  
  // Benefits
  const benefitsY = 250;
  doc.setFillColor(...COLORS.orange);
  doc.roundedRect(margin + 15, benefitsY, contentWidth - 30, 30, 5, 5, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const benefits = ['✓ Atendimento Personalizado', '✓ Melhores Preços', '✓ Suporte 24/7'];
  const benefitWidth = (contentWidth - 30) / 3;
  benefits.forEach((b, i) => {
    doc.text(b, margin + 15 + benefitWidth * i + benefitWidth / 2, benefitsY + 18, { align: 'center' });
  });
  
  // Bottom accent
  doc.setFillColor(...COLORS.orange);
  doc.rect(0, pageHeight - 4, pageWidth, 4, 'F');
  
  // Footer
  doc.setTextColor(...COLORS.grayDark);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Orlando Fast Pass • Sua agência especializada em Orlando', pageWidth / 2, pageHeight - 12, { align: 'center' });
  
  // Save
  const fileName = `Proposta_${(cart.clientName || 'Cliente').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}
