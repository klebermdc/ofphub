import jsPDF from 'jspdf';
import { ParsedCart } from '@/components/proposals/ProposalTab';

const COLORS = {
  primary: [255, 107, 0] as [number, number, number],
  primaryDark: [220, 80, 0] as [number, number, number],
  secondary: [25, 25, 30] as [number, number, number],
  accent: [255, 200, 100] as [number, number, number],
  gold: [255, 215, 0] as [number, number, number],
  magicBlue: [30, 60, 120] as [number, number, number],
  magicPurple: [75, 0, 130] as [number, number, number],
  text: [40, 40, 45] as [number, number, number],
  lightText: [100, 100, 110] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  cream: [255, 250, 245] as [number, number, number],
  lightGray: [245, 245, 248] as [number, number, number],
};

// Cache for loaded images
const imageCache: Map<string, string | null> = new Map();

async function loadImage(url: string): Promise<string | null> {
  if (imageCache.has(url)) {
    return imageCache.get(url) || null;
  }
  
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Failed to fetch');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        imageCache.set(url, result);
        resolve(result);
      };
      reader.onerror = () => {
        imageCache.set(url, null);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    imageCache.set(url, null);
    return null;
  }
}

// Preload all images from cart
async function preloadCartImages(cart: ParsedCart): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();
  const imageUrls: string[] = [];
  
  cart.tickets?.forEach(t => t.image && imageUrls.push(t.image));
  cart.hotels?.forEach(h => h.image && imageUrls.push(h.image));
  cart.cars?.forEach(c => c.image && imageUrls.push(c.image));
  cart.insurance?.forEach(i => i.image && imageUrls.push(i.image));
  
  const results = await Promise.all(
    imageUrls.map(async (url) => {
      const data = await loadImage(url);
      return { url, data };
    })
  );
  
  results.forEach(({ url, data }) => {
    if (data) imageMap.set(url, data);
  });
  
  return imageMap;
}

export async function generateProposalPDF(cart: ParsedCart): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Preload all images
  console.log('Preloading cart images...');
  const loadedImages = await preloadCartImages(cart);
  console.log(`Loaded ${loadedImages.size} images`);

  // Load logo
  let logoData: string | null = null;
  try {
    logoData = await loadImage('/images/logo-branco.png');
  } catch {
    console.log('Could not load logo');
  }

  // Helper function
  const addNewPageIfNeeded = (requiredSpace: number): boolean => {
    if (yPosition + requiredSpace > pageHeight - 25) {
      doc.addPage();
      yPosition = margin;
      addPageDecoration();
      return true;
    }
    return false;
  };

  // Page decoration - subtle magical elements
  const addPageDecoration = () => {
    // Top accent line
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 4, 'F');
    
    // Subtle corner decorations
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.3);
    
    // Top left corner
    doc.line(margin - 5, margin + 10, margin - 5, margin - 5);
    doc.line(margin - 5, margin - 5, margin + 10, margin - 5);
    
    // Top right corner
    doc.line(pageWidth - margin + 5, margin + 10, pageWidth - margin + 5, margin - 5);
    doc.line(pageWidth - margin + 5, margin - 5, pageWidth - margin - 10, margin - 5);
  };

  // ==========================================
  // ===== COVER PAGE - MAGICAL DESIGN =====
  // ==========================================
  
  // Full page gradient background
  doc.setFillColor(...COLORS.magicBlue);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Add overlay pattern effect - purple bottom
  doc.setFillColor(75, 0, 130);
  doc.rect(0, pageHeight * 0.65, pageWidth, pageHeight * 0.35, 'F');
  
  // Decorative stars/sparkles effect
  doc.setFillColor(...COLORS.gold);
  const stars = [
    { x: 30, y: 40, size: 2 },
    { x: 170, y: 35, size: 1.5 },
    { x: 50, y: 80, size: 1 },
    { x: 180, y: 90, size: 1.8 },
    { x: 25, y: 150, size: 1.2 },
    { x: 185, y: 160, size: 1 },
    { x: 40, y: 200, size: 1.5 },
    { x: 165, y: 220, size: 1.3 },
    { x: 100, y: 250, size: 0.8 },
    { x: 55, y: 260, size: 1.1 },
  ];
  
  stars.forEach(star => {
    doc.setFillColor(255, 215, 0);
    doc.circle(star.x, star.y, star.size, 'F');
  });

  // Logo centered at top
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', pageWidth / 2 - 35, 25, 70, 28);
    } catch {
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('ORLANDO FAST PASS', pageWidth / 2, 45, { align: 'center' });
    }
  }

  // Main title with sparkle effect
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Sua viagem dos sonhos comeca aqui', pageWidth / 2, 70, { align: 'center' });

  // Big title
  doc.setFontSize(42);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA', pageWidth / 2, 100, { align: 'center' });
  doc.text('EXCLUSIVA', pageWidth / 2, 115, { align: 'center' });

  // Decorative line under title
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - 40, 122, pageWidth / 2 + 40, 122);
  
  // Golden accent line
  doc.setFillColor(...COLORS.gold);
  doc.rect(pageWidth / 2 - 30, 125, 60, 2, 'F');

  // Client name box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 20, 145, contentWidth - 40, 35, 5, 5, 'F');
  
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Preparada especialmente para', pageWidth / 2, 157, { align: 'center' });
  
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text((cart.clientName || 'Cliente').toUpperCase(), pageWidth / 2, 172, { align: 'center' });

  // Trip summary box
  if (cart.summary) {
    doc.setFillColor(...COLORS.gold);
    doc.roundedRect(margin + 30, 195, contentWidth - 60, 40, 5, 5, 'F');
    
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PERIODO DA VIAGEM', pageWidth / 2, 208, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text(`${cart.summary.tripStart} a ${cart.summary.tripEnd}`, pageWidth / 2, 220, { align: 'center' });
    
    if (cart.summary.totalDays) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${cart.summary.totalDays} dias de magia`, pageWidth / 2, 230, { align: 'center' });
    }
  }

  // What's included summary
  const summaryY = 255;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, summaryY, contentWidth, 30, 3, 3, 'F');
  
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SUA PROPOSTA INCLUI:', pageWidth / 2, summaryY + 12, { align: 'center' });
  
  const items = [];
  if (cart.tickets?.length) items.push(`${cart.tickets.length} Ingresso(s)`);
  if (cart.hotels?.length) items.push(`${cart.hotels.length} Hospedagem`);
  if (cart.cars?.length) items.push(`${cart.cars.length} Carro`);
  if (cart.insurance?.length) items.push(`${cart.insurance.length} Seguro`);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text(items.join('   |   '), pageWidth / 2, summaryY + 23, { align: 'center' });

  // ==========================================
  // ===== PAGE 2+ - CONTENT PAGES =====
  // ==========================================
  
  doc.addPage();
  addPageDecoration();
  yPosition = 20;

  // Section header helper
  const addSectionHeader = (title: string, emoji: string, color: [number, number, number]) => {
    addNewPageIfNeeded(25);
    
    // Background bar
    doc.setFillColor(...color);
    doc.roundedRect(margin, yPosition, contentWidth, 16, 3, 3, 'F');
    
    // Title
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${emoji}  ${title}`, margin + 8, yPosition + 11);
    
    // Decorative element
    doc.setFillColor(...COLORS.gold);
    doc.rect(pageWidth - margin - 50, yPosition + 6, 40, 4, 'F');
    
    yPosition += 22;
  };

  // Item card helper with image support
  const addItemCardWithImage = (
    title: string,
    details: string[],
    accentColor: [number, number, number],
    imageUrl?: string
  ) => {
    const cardHeight = 55;
    const imageWidth = 50;
    const imageHeight = 40;
    
    addNewPageIfNeeded(cardHeight + 8);
    
    // Card background with shadow effect
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(margin + 1, yPosition + 1, contentWidth, cardHeight, 4, 4, 'F');
    doc.setFillColor(...COLORS.white);
    doc.roundedRect(margin, yPosition, contentWidth, cardHeight, 4, 4, 'F');
    
    // Left accent bar
    doc.setFillColor(...accentColor);
    doc.roundedRect(margin, yPosition, 4, cardHeight, 2, 2, 'F');
    
    // Try to add image
    const imageData = imageUrl ? loadedImages.get(imageUrl) : null;
    let textStartX = margin + 12;
    
    if (imageData) {
      try {
        // Image container with rounded appearance
        doc.setFillColor(240, 240, 245);
        doc.roundedRect(margin + 8, yPosition + 7.5, imageWidth, imageHeight, 3, 3, 'F');
        doc.addImage(imageData, 'JPEG', margin + 8, yPosition + 7.5, imageWidth, imageHeight);
        
        // Image border
        doc.setDrawColor(...accentColor);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin + 8, yPosition + 7.5, imageWidth, imageHeight, 3, 3, 'S');
        
        textStartX = margin + imageWidth + 15;
      } catch (e) {
        console.log('Failed to add image:', e);
        // Fallback: icon circle
        doc.setFillColor(...accentColor);
        doc.circle(margin + 25, yPosition + cardHeight/2, 12, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('★', margin + 25, yPosition + cardHeight/2 + 4, { align: 'center' });
        textStartX = margin + 45;
      }
    } else {
      // Fallback: colored icon circle
      doc.setFillColor(...accentColor);
      doc.circle(margin + 25, yPosition + cardHeight/2, 12, 'F');
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('★', margin + 25, yPosition + cardHeight/2 + 4, { align: 'center' });
      textStartX = margin + 45;
    }
    
    // Title
    const maxTextWidth = pageWidth - textStartX - margin - 5;
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    
    // Truncate title if needed
    let displayTitle = title;
    while (doc.getTextWidth(displayTitle) > maxTextWidth && displayTitle.length > 15) {
      displayTitle = displayTitle.substring(0, displayTitle.length - 4) + '...';
    }
    doc.text(displayTitle, textStartX, yPosition + 15);
    
    // Details with better spacing
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    details.forEach((detail, index) => {
      if (index < 4) {
        // Truncate detail if needed
        let displayDetail = detail;
        while (doc.getTextWidth(displayDetail) > maxTextWidth && displayDetail.length > 20) {
          displayDetail = displayDetail.substring(0, displayDetail.length - 4) + '...';
        }
        doc.text(displayDetail, textStartX, yPosition + 24 + (index * 7));
      }
    });
    
    yPosition += cardHeight + 5;
  };

  // ===== TICKETS SECTION =====
  if (cart.tickets && cart.tickets.length > 0) {
    addSectionHeader('INGRESSOS E PARQUES', 'Parques', COLORS.primary);
    
    for (const ticket of cart.tickets) {
      addItemCardWithImage(
        ticket.name,
        [
          `Data: ${ticket.date}`,
          `Duracao: ${ticket.duration}`,
          `Visitantes: ${ticket.guests}`
        ],
        COLORS.primary,
        ticket.image
      );
    }
    
    yPosition += 5;
  }

  // ===== HOTELS SECTION =====
  if (cart.hotels && cart.hotels.length > 0) {
    addSectionHeader('HOSPEDAGEM', 'Hotel', [59, 130, 246]);
    
    for (const hotel of cart.hotels) {
      const details = [
        `Check-in: ${hotel.checkIn} | Check-out: ${hotel.checkOut}`,
        `${hotel.nights} noites  |  ${hotel.rooms} quarto(s)  |  ${hotel.guests}`,
      ];
      if (hotel.roomType) {
        details.unshift(`Tipo: ${hotel.roomType.substring(0, 50)}`);
      }
      
      addItemCardWithImage(hotel.name, details, [59, 130, 246], hotel.image);
    }
    
    yPosition += 5;
  }

  // ===== CARS SECTION =====
  if (cart.cars && cart.cars.length > 0) {
    addSectionHeader('ALUGUEL DE CARRO', 'Carro', [34, 197, 94]);
    
    for (const car of cart.cars) {
      addItemCardWithImage(
        car.name,
        [
          `Retirada: ${car.pickupLocation}`,
          `Data: ${car.pickupDate}`,
          `Devolucao: ${car.returnDate}`
        ],
        [34, 197, 94],
        car.image
      );
    }
    
    yPosition += 5;
  }

  // ===== INSURANCE SECTION =====
  if (cart.insurance && cart.insurance.length > 0) {
    addSectionHeader('SEGURO VIAGEM', 'Seguro', [147, 51, 234]);
    
    for (const ins of cart.insurance) {
      addItemCardWithImage(
        ins.name,
        [
          `Cobertura: ${ins.coverage}`,
          `Periodo: ${ins.dates}`,
          `${ins.travelers} segurado(s)`
        ],
        [147, 51, 234],
        ins.image
      );
    }
    
    yPosition += 5;
  }

  // ===== FOOTER / CTA PAGE =====
  addNewPageIfNeeded(85);
  
  // Magical footer box
  doc.setFillColor(...COLORS.magicBlue);
  doc.roundedRect(margin, yPosition, contentWidth, 75, 5, 5, 'F');
  
  // Gold accent at top
  doc.setFillColor(...COLORS.gold);
  doc.rect(margin + 20, yPosition, contentWidth - 40, 4, 'F');
  
  // Magic stars
  doc.setFillColor(...COLORS.gold);
  doc.circle(margin + 15, yPosition + 25, 2, 'F');
  doc.circle(pageWidth - margin - 15, yPosition + 30, 1.5, 'F');
  doc.circle(margin + 25, yPosition + 60, 1, 'F');
  doc.circle(pageWidth - margin - 25, yPosition + 55, 1.3, 'F');
  
  // Title
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Pronto para realizar seu sonho?', pageWidth / 2, yPosition + 25, { align: 'center' });
  
  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Entre em contato conosco e feche sua viagem magica!', pageWidth / 2, yPosition + 38, { align: 'center' });
  
  // Contact info box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 15, yPosition + 48, contentWidth - 30, 20, 3, 3, 'F');
  
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('WhatsApp: (11) 99999-9999', pageWidth / 2 - 40, yPosition + 60);
  doc.text('contato@orlandofastpass.com.br', pageWidth / 2 + 35, yPosition + 60);

  // Add page numbers with elegant styling
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Skip page number on cover
    if (i === 1) continue;
    
    // Footer line
    doc.setDrawColor(...COLORS.lightText);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Page number
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.lightText);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Pagina ${i - 1} de ${totalPages - 1}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    
    // Generated date
    doc.text(
      `Proposta gerada em ${new Date().toLocaleDateString('pt-BR')}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
    
    // Company name
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Orlando Fast Pass', margin, pageHeight - 10);
  }

  // Save
  const fileName = `Proposta_${(cart.clientName || 'Cliente').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}
