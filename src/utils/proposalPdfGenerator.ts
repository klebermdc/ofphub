import jsPDF from 'jspdf';
import { ParsedCart, TicketItem, HotelItem, CarItem, InsuranceItem } from '@/components/proposals/ProposalTab';

const COLORS = {
  primary: [255, 107, 0] as [number, number, number],
  magicBlue: [30, 60, 120] as [number, number, number],
  magicPurple: [75, 0, 130] as [number, number, number],
  gold: [255, 215, 0] as [number, number, number],
  text: [40, 40, 45] as [number, number, number],
  lightText: [100, 100, 110] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  secondary: [25, 25, 30] as [number, number, number],
};

const imageCache: Map<string, string | null> = new Map();

async function loadImage(url: string): Promise<string | null> {
  if (imageCache.has(url)) return imageCache.get(url) || null;
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Failed');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => { imageCache.set(url, reader.result as string); resolve(reader.result as string); };
      reader.onerror = () => { imageCache.set(url, null); resolve(null); };
      reader.readAsDataURL(blob);
    });
  } catch { imageCache.set(url, null); return null; }
}

async function preloadImages(cart: ParsedCart): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const urls: string[] = [];
  cart.tickets?.forEach(t => { if (t.mainImage) urls.push(t.mainImage); else if (t.image) urls.push(t.image); });
  cart.hotels?.forEach(h => { if (h.mainImage) urls.push(h.mainImage); else if (h.image) urls.push(h.image); });
  cart.cars?.forEach(c => { if (c.mainImage) urls.push(c.mainImage); else if (c.image) urls.push(c.image); });
  cart.insurance?.forEach(i => { if (i.mainImage) urls.push(i.mainImage); else if (i.image) urls.push(i.image); });
  
  const results = await Promise.all(urls.map(async url => ({ url, data: await loadImage(url) })));
  results.forEach(({ url, data }) => { if (data) map.set(url, data); });
  return map;
}

export async function generateProposalPDF(cart: ParsedCart): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  const images = await preloadImages(cart);
  let logoData: string | null = null;
  try { logoData = await loadImage('/images/logo-branco.png'); } catch {}

  const addNewPage = (space: number): boolean => {
    if (yPosition + space > pageHeight - 20) { doc.addPage(); yPosition = margin + 10; addDecoration(); return true; }
    return false;
  };

  const addDecoration = () => {
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 5, 'F');
  };

  // === COVER PAGE ===
  doc.setFillColor(...COLORS.magicBlue);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setFillColor(75, 0, 130);
  doc.rect(0, pageHeight * 0.6, pageWidth, pageHeight * 0.4, 'F');
  
  // Stars
  [[30,40,2],[170,35,1.5],[50,80,1],[180,90,1.8],[25,150,1.2],[185,160,1]].forEach(([x,y,s]) => {
    doc.setFillColor(...COLORS.gold); doc.circle(x, y, s, 'F');
  });

  if (logoData) try { doc.addImage(logoData, 'PNG', pageWidth/2-35, 25, 70, 28); } catch {}

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14); doc.setFont('helvetica', 'normal');
  doc.text('Sua viagem dos sonhos comeca aqui', pageWidth/2, 70, { align: 'center' });
  doc.setFontSize(40); doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA', pageWidth/2, 100, { align: 'center' });
  doc.text('EXCLUSIVA', pageWidth/2, 115, { align: 'center' });
  
  doc.setFillColor(...COLORS.gold); doc.rect(pageWidth/2-30, 122, 60, 2, 'F');

  // Client box
  doc.setFillColor(255,255,255); doc.roundedRect(margin+20, 140, contentWidth-40, 35, 5, 5, 'F');
  doc.setTextColor(...COLORS.secondary); doc.setFontSize(11);
  doc.text('Preparada especialmente para', pageWidth/2, 152, { align: 'center' });
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(...COLORS.primary);
  doc.text((cart.clientName || 'Cliente').toUpperCase(), pageWidth/2, 168, { align: 'center' });

  // Summary
  if (cart.summary) {
    doc.setFillColor(...COLORS.gold); doc.roundedRect(margin+30, 190, contentWidth-60, 35, 5, 5, 'F');
    doc.setTextColor(...COLORS.secondary); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('PERIODO DA VIAGEM', pageWidth/2, 202, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${cart.summary.tripStart} a ${cart.summary.tripEnd}`, pageWidth/2, 214, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(cart.summary.totalDays || '', pageWidth/2, 222, { align: 'center' });
  }

  // Includes
  doc.setFillColor(255,255,255); doc.roundedRect(margin, 240, contentWidth, 25, 3, 3, 'F');
  doc.setTextColor(...COLORS.secondary); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('SUA PROPOSTA INCLUI:', pageWidth/2, 250, { align: 'center' });
  const items = [];
  if (cart.tickets?.length) items.push(`${cart.tickets.length} Ingresso(s)`);
  if (cart.hotels?.length) items.push(`${cart.hotels.length} Hospedagem`);
  if (cart.cars?.length) items.push(`${cart.cars.length} Carro`);
  if (cart.insurance?.length) items.push(`${cart.insurance.length} Seguro`);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(items.join('  |  '), pageWidth/2, 260, { align: 'center' });

  // === CONTENT PAGES ===
  doc.addPage(); addDecoration(); yPosition = 20;

  const addSection = (title: string, color: [number, number, number]) => {
    addNewPage(20);
    doc.setFillColor(...color); doc.roundedRect(margin, yPosition, contentWidth, 14, 3, 3, 'F');
    doc.setTextColor(...COLORS.white); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(title, margin+8, yPosition+10);
    yPosition += 20;
  };

  const addCard = (title: string, description: string, details: string[], color: [number, number, number], imgUrl?: string) => {
    const h = description ? 70 : 50;
    addNewPage(h + 8);
    
    doc.setFillColor(245,245,248); doc.roundedRect(margin, yPosition, contentWidth, h, 4, 4, 'F');
    doc.setFillColor(...color); doc.roundedRect(margin, yPosition, 4, h, 2, 2, 'F');
    
    const imgData = imgUrl ? images.get(imgUrl) : null;
    let tx = margin + 12;
    if (imgData) {
      try { doc.addImage(imgData, 'JPEG', margin+8, yPosition+5, 40, 35); tx = margin + 55; } catch {}
    }

    doc.setTextColor(...COLORS.secondary); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    const maxW = pageWidth - tx - margin - 5;
    let t = title; while (doc.getTextWidth(t) > maxW && t.length > 20) t = t.slice(0,-4) + '...';
    doc.text(t, tx, yPosition + 12);

    if (description) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...COLORS.lightText);
      const lines = doc.splitTextToSize(description, maxW);
      doc.text(lines.slice(0,3), tx, yPosition + 20);
    }

    doc.setFontSize(8); doc.setTextColor(...COLORS.text);
    details.slice(0,4).forEach((d, i) => {
      const dy = description ? 42 : 22;
      doc.text(d.substring(0,60), tx, yPosition + dy + i*6);
    });

    yPosition += h + 5;
  };

  // Tickets
  if (cart.tickets?.length) {
    addSection('INGRESSOS E PARQUES', COLORS.primary);
    for (const t of cart.tickets) {
      addCard(t.name, t.fullDescription || t.description || '', [
        `📅 ${t.date}`, `⏱️ ${t.validityDays || t.duration || ''}`, `👥 ${t.guests}`,
        t.parks?.length ? `🎢 ${t.parks.join(', ')}` : ''
      ].filter(Boolean), COLORS.primary, t.mainImage || t.image);
    }
  }

  // Hotels
  if (cart.hotels?.length) {
    addSection('HOSPEDAGEM', [59, 130, 246]);
    for (const h of cart.hotels) {
      addCard(h.name, h.fullDescription || '', [
        `📅 ${h.checkIn} → ${h.checkOut}`, `🛏️ ${h.roomType || ''}`, `🌙 ${h.nights} noites`, `👥 ${h.guests}`
      ].filter(Boolean), [59, 130, 246], h.mainImage || h.image);
    }
  }

  // Cars
  if (cart.cars?.length) {
    addSection('ALUGUEL DE CARRO', [34, 197, 94]);
    for (const c of cart.cars) {
      addCard(c.name, c.fullDescription || '', [
        `📍 ${c.pickupLocation}`, `📅 ${c.pickupDate} → ${c.returnDate}`,
        c.features?.length ? `✓ ${c.features.join(', ')}` : ''
      ].filter(Boolean), [34, 197, 94], c.mainImage || c.image);
    }
  }

  // Insurance
  if (cart.insurance?.length) {
    addSection('SEGURO VIAGEM', [147, 51, 234]);
    for (const i of cart.insurance) {
      addCard(i.name, i.fullDescription || '', [
        `💰 ${i.coverageAmount || i.coverage || ''}`, `📅 ${i.startDate || i.dates || ''}`, `👥 ${i.travelers} segurado(s)`
      ].filter(Boolean), [147, 51, 234], i.mainImage || i.image);
    }
  }

  // CTA Footer
  addNewPage(80);
  doc.setFillColor(...COLORS.magicBlue); doc.roundedRect(margin, yPosition, contentWidth, 70, 5, 5, 'F');
  doc.setFillColor(...COLORS.gold); doc.rect(margin+20, yPosition, contentWidth-40, 3, 'F');
  doc.setTextColor(...COLORS.white); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('Pronto para realizar seu sonho?', pageWidth/2, yPosition+22, { align: 'center' });
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text('Entre em contato e feche sua viagem magica!', pageWidth/2, yPosition+35, { align: 'center' });
  doc.setFillColor(255,255,255); doc.roundedRect(margin+15, yPosition+45, contentWidth-30, 18, 3, 3, 'F');
  doc.setTextColor(...COLORS.secondary); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('WhatsApp: (11) 99999-9999  |  contato@orlandofastpass.com.br', pageWidth/2, yPosition+56, { align: 'center' });

  // Page numbers
  const pages = doc.internal.pages.length - 1;
  for (let i = 2; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(...COLORS.lightText);
    doc.text(`${i-1} / ${pages-1}`, pageWidth/2, pageHeight-8, { align: 'center' });
  }

  doc.save(`Proposta_${(cart.clientName || 'Cliente').replace(/\s+/g, '_')}.pdf`);
}
