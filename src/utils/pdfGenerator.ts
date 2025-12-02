import { jsPDF } from "jspdf";
import { SalesRep } from "@/types/sales";

const formatCurrency = (value: number) => {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = (value: number) => {
  if (value === 0) return '-';
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}%`;
};

export const generateSalesRepPDF = (rep: SalesRep) => {
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

  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Comissão", pageWidth / 2, 16, { align: "center" });
  
  currentY = 35;

  // Salesperson name and date
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(rep.name, margin, currentY);
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, currentY, { align: "right" });
  
  currentY += 12;

  // Summary Cards - 3 cards in a row
  const cardWidth = (pageWidth - margin * 2 - 20) / 3;
  const cardHeight = 22;

  // Card 1 - Total Vendas
  doc.setFillColor(240, 240, 255);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Total de Vendas", margin + 5, currentY + 8);
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(rep.sales), margin + 5, currentY + 17);

  // Card 2 - Comissão
  doc.setFillColor(240, 255, 240);
  doc.roundedRect(margin + cardWidth + 10, currentY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Comissão Total", margin + cardWidth + 15, currentY + 8);
  doc.setFontSize(12);
  doc.setTextColor(34, 139, 34);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(rep.commission), margin + cardWidth + 15, currentY + 17);

  // Card 3 - Negócios
  doc.setFillColor(255, 248, 240);
  doc.roundedRect(margin + (cardWidth + 10) * 2, currentY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Número de Pedidos", margin + (cardWidth + 10) * 2 + 5, currentY + 8);
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(String(rep.deals), margin + (cardWidth + 10) * 2 + 5, currentY + 17);

  currentY += cardHeight + 12;

  // Orders Table Header
  doc.setFillColor(99, 102, 241);
  doc.rect(margin, currentY, pageWidth - margin * 2, 8, 'F');
  
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
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
  doc.text("Cliente", colX, currentY + 5.5);
  colX += colWidths.cliente;
  doc.text("Data", colX, currentY + 5.5);
  colX += colWidths.data;
  doc.text("Pedido", colX, currentY + 5.5);
  colX += colWidths.pedido;
  doc.text("Venda", colX, currentY + 5.5);
  colX += colWidths.venda;
  doc.text("Fornecedor", colX, currentY + 5.5);
  colX += colWidths.fornecedor;
  doc.text("Produto", colX, currentY + 5.5);
  colX += colWidths.produto;
  doc.text("Com.%", colX, currentY + 5.5);
  colX += colWidths.comissao;
  doc.text("Com. Total", colX, currentY + 5.5);
  colX += colWidths.comissaoTotal;
  doc.text("% Vend.", colX, currentY + 5.5);
  colX += colWidths.porcVendedor;
  doc.text("Com. Vendedor", colX, currentY + 5.5);

  currentY += 10;

  // Orders Table Rows
  doc.setFont("helvetica", "normal");
  
  const orders = rep.orders || [];
  
  orders.forEach((order, index) => {
    addNewPageIfNeeded(7);
    
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 252);
      doc.rect(margin, currentY - 3, pageWidth - margin * 2, 7, 'F');
    }
    
    doc.setFontSize(5.5);
    doc.setTextColor(50, 50, 50);
    
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
    doc.setTextColor(34, 139, 34);
    doc.text(formatCurrency(order.comissaoVendedor), colX, currentY + 2);
    
    currentY += 7;
  });

  // Totals row
  addNewPageIfNeeded(12);
  currentY += 3;
  
  doc.setFillColor(99, 102, 241);
  doc.rect(margin, currentY - 3, pageWidth - margin * 2, 8, 'F');
  
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
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

  // Footer
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text("Documento gerado automaticamente pelo Sistema de Comissões", pageWidth / 2, pageHeight - 5, { align: "center" });
  
  // Download
  doc.save(`relatorio-${rep.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
};
