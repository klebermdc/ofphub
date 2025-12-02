import { jsPDF } from "jspdf";
import { SalesRep } from "@/types/sales";
import { getSalary } from "@/config/salaries";

const formatCurrency = (value: number) => {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = (value: number) => {
  if (value === 0) return '-';
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}%`;
};

// Orange brand colors
const COLORS = {
  primary: { r: 255, g: 140, b: 0 }, // Dark orange
  primaryLight: { r: 255, g: 200, b: 150 }, // Light orange
  accent: { r: 255, g: 165, b: 0 }, // Orange
  dark: { r: 50, g: 50, b: 50 },
  gray: { r: 100, g: 100, b: 100 },
  lightGray: { r: 248, g: 245, b: 240 },
  white: { r: 255, g: 255, b: 255 },
  green: { r: 34, g: 139, b: 34 },
};

const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const generateSalesRepPDF = async (rep: SalesRep) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let currentY = 0;
  
  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (currentY + requiredSpace > pageHeight - 15) {
      doc.addPage();
      currentY = 15;
      return true;
    }
    return false;
  };

  // Try to load logo
  let logoData: string | null = null;
  try {
    logoData = await loadImage('/images/logo-ofp.png');
  } catch (e) {
    console.log('Could not load logo:', e);
  }

  // Header with orange gradient effect
  doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  // Add subtle darker bar at top
  doc.setFillColor(230, 120, 0);
  doc.rect(0, 0, pageWidth, 3, 'F');

  // Logo and company name
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, 5, 40, 20);
  }
  
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Comissão", pageWidth / 2, 18, { align: "center" });
  
  // Date on the right
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 18, { align: "right" });
  
  currentY = 40;

  // Salesperson name with orange accent
  doc.setFillColor(COLORS.primaryLight.r, COLORS.primaryLight.g, COLORS.primaryLight.b);
  doc.roundedRect(margin, currentY - 5, pageWidth - margin * 2, 16, 3, 3, 'F');
  
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Vendedor: ${rep.name}`, margin + 8, currentY + 5);
  
  currentY += 20;

  // Get salary for this salesperson
  const salary = getSalary(rep.name);
  const totalReceiver = salary + rep.commission;

  // Summary Cards - 4 cards in a row with orange theme
  const cardWidth = (pageWidth - margin * 2 - 30) / 4;
  const cardHeight = 24;

  // Card 1 - Total Vendas
  doc.setFillColor(255, 245, 235);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 3, 3, 'S');
  
  doc.setFontSize(8);
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.setFont("helvetica", "normal");
  doc.text("Total de Vendas", margin + 6, currentY + 9);
  doc.setFontSize(12);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(rep.sales), margin + 6, currentY + 19);

  // Card 2 - Comissão
  doc.setFillColor(240, 255, 240);
  doc.roundedRect(margin + cardWidth + 10, currentY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
  doc.roundedRect(margin + cardWidth + 10, currentY, cardWidth, cardHeight, 3, 3, 'S');
  
  doc.setFontSize(8);
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.setFont("helvetica", "normal");
  doc.text("Comissão", margin + cardWidth + 16, currentY + 9);
  doc.setFontSize(12);
  doc.setTextColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(rep.commission), margin + cardWidth + 16, currentY + 19);

  // Card 3 - Salário Fixo
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(margin + (cardWidth + 10) * 2, currentY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(70, 130, 180);
  doc.roundedRect(margin + (cardWidth + 10) * 2, currentY, cardWidth, cardHeight, 3, 3, 'S');
  
  doc.setFontSize(8);
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.setFont("helvetica", "normal");
  doc.text("Salário Fixo", margin + (cardWidth + 10) * 2 + 6, currentY + 9);
  doc.setFontSize(12);
  doc.setTextColor(70, 130, 180);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(salary), margin + (cardWidth + 10) * 2 + 6, currentY + 19);

  // Card 4 - Total a Receber
  doc.setFillColor(255, 240, 245);
  doc.roundedRect(margin + (cardWidth + 10) * 3, currentY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(180, 50, 100);
  doc.roundedRect(margin + (cardWidth + 10) * 3, currentY, cardWidth, cardHeight, 3, 3, 'S');
  
  doc.setFontSize(8);
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.setFont("helvetica", "normal");
  doc.text("Total a Receber", margin + (cardWidth + 10) * 3 + 6, currentY + 9);
  doc.setFontSize(12);
  doc.setTextColor(180, 50, 100);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(totalReceiver), margin + (cardWidth + 10) * 3 + 6, currentY + 19);

  currentY += cardHeight + 12;

  // Orders Table Header with orange
  doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.rect(margin, currentY, pageWidth - margin * 2, 9, 'F');
  
  doc.setFontSize(6);
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.setFont("helvetica", "bold");
  
  // Column widths for landscape
  const colWidths = {
    cliente: 45,
    data: 20,
    pedido: 20,
    venda: 28,
    fornecedor: 30,
    produto: 35,
    comissao: 18,
    comissaoTotal: 28,
    porcVendedor: 20,
    comissaoVendedor: 28
  };
  
  let colX = margin + 2;
  doc.text("Cliente", colX, currentY + 6);
  colX += colWidths.cliente;
  doc.text("Data", colX, currentY + 6);
  colX += colWidths.data;
  doc.text("Pedido", colX, currentY + 6);
  colX += colWidths.pedido;
  doc.text("Venda", colX, currentY + 6);
  colX += colWidths.venda;
  doc.text("Fornecedor", colX, currentY + 6);
  colX += colWidths.fornecedor;
  doc.text("Produto", colX, currentY + 6);
  colX += colWidths.produto;
  doc.text("Com.%", colX, currentY + 6);
  colX += colWidths.comissao;
  doc.text("Com. Total", colX, currentY + 6);
  colX += colWidths.comissaoTotal;
  doc.text("% Vend.", colX, currentY + 6);
  colX += colWidths.porcVendedor;
  doc.text("Com. Vendedor", colX, currentY + 6);

  currentY += 11;

  // Orders Table Rows
  doc.setFont("helvetica", "normal");
  
  const orders = rep.orders || [];
  
  orders.forEach((order, index) => {
    addNewPageIfNeeded(8);
    
    // Alternate row background with orange tint
    if (index % 2 === 0) {
      doc.setFillColor(255, 250, 245);
    } else {
      doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    }
    doc.rect(margin, currentY - 4, pageWidth - margin * 2, 8, 'F');
    
    doc.setFontSize(5.5);
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    
    colX = margin + 2;
    
    // Cliente
    doc.text((order.cliente || '-').substring(0, 25), colX, currentY + 2);
    colX += colWidths.cliente;
    
    // Data
    doc.text((order.data || '-').substring(0, 12), colX, currentY + 2);
    colX += colWidths.data;
    
    // Pedido
    doc.text((order.pedido || '-').substring(0, 12), colX, currentY + 2);
    colX += colWidths.pedido;
    
    // Venda
    doc.text(formatCurrency(order.venda), colX, currentY + 2);
    colX += colWidths.venda;
    
    // Fornecedor
    doc.text((order.fornecedor || '-').substring(0, 18), colX, currentY + 2);
    colX += colWidths.fornecedor;
    
    // Produto
    doc.text((order.produto || '-').substring(0, 20), colX, currentY + 2);
    colX += colWidths.produto;
    
    // Comissão %
    doc.text(formatPercent(order.comissao), colX, currentY + 2);
    colX += colWidths.comissao;
    
    // Comissão Total
    doc.text(formatCurrency(order.comissaoTotal), colX, currentY + 2);
    colX += colWidths.comissaoTotal;
    
    // Porcentagem Vendedor
    doc.text(formatPercent(order.porcentagemVendedor), colX, currentY + 2);
    colX += colWidths.porcVendedor;
    
    // Comissão Vendedor
    doc.setTextColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
    doc.text(formatCurrency(order.comissaoVendedor), colX, currentY + 2);
    
    currentY += 8;
  });

  // Totals row
  addNewPageIfNeeded(14);
  currentY += 3;
  
  doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.rect(margin, currentY - 4, pageWidth - margin * 2, 9, 'F');
  
  doc.setFontSize(6);
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.setFont("helvetica", "bold");
  
  colX = margin + 2;
  doc.text("TOTAL", colX, currentY + 3);
  
  // Sum venda column
  colX = margin + 2 + colWidths.cliente + colWidths.data + colWidths.pedido;
  doc.text(formatCurrency(rep.sales), colX, currentY + 3);
  
  // Sum comissão vendedor column
  colX = margin + 2 + colWidths.cliente + colWidths.data + colWidths.pedido + colWidths.venda + 
         colWidths.fornecedor + colWidths.produto + colWidths.comissao + colWidths.comissaoTotal + colWidths.porcVendedor;
  doc.text(formatCurrency(rep.commission), colX, currentY + 3);

  // Final Summary Box - Salary + Commission = Total
  currentY += 18;
  addNewPageIfNeeded(35);
  
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 4, 4, 'F');
  doc.setDrawColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.setLineWidth(1);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 4, 4, 'S');
  
  doc.setFontSize(10);
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMO FINANCEIRO", margin + 10, currentY + 8);
  
  const summaryY = currentY + 18;
  const colSpacing = (pageWidth - margin * 2 - 20) / 4;
  
  // Salário
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.text("Salário Fixo:", margin + 10, summaryY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(70, 130, 180);
  doc.text(formatCurrency(salary), margin + 10 + 35, summaryY);
  
  // + symbol
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text("+", margin + 10 + colSpacing, summaryY);
  
  // Comissão
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.text("Comissão:", margin + 10 + colSpacing + 10, summaryY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
  doc.text(formatCurrency(rep.commission), margin + 10 + colSpacing + 40, summaryY);
  
  // = symbol
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text("=", margin + 10 + colSpacing * 2, summaryY);
  
  // Total a Receber
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.text("Total a Receber:", margin + 10 + colSpacing * 2 + 10, summaryY);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 50, 100);
  doc.text(formatCurrency(totalReceiver), margin + 10 + colSpacing * 2 + 55, summaryY);

  // Footer with orange accent
  doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  
  doc.setFontSize(7);
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.setFont("helvetica", "bold");
  doc.text("Orlando Fast Pass - Sistema de Comissões", pageWidth / 2, pageHeight - 5, { align: "center" });
  
  // Download
  doc.save(`relatorio-${rep.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
};
