import { jsPDF } from "jspdf";
import { SalesRep } from "@/types/sales";

const formatCurrency = (value: number) => {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const generateSalesRepPDF = (rep: SalesRep) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = 0;
  
  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (currentY + requiredSpace > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
      return true;
    }
    return false;
  };

  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Comissão", pageWidth / 2, 22, { align: "center" });
  
  currentY = 45;

  // Salesperson name and date
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(rep.name, margin, currentY);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, currentY, { align: "right" });
  
  currentY += 15;

  // Summary Cards
  const cardWidth = (pageWidth - margin * 2 - 10) / 2;
  const cardHeight = 28;

  // Card 1 - Total Vendas
  doc.setFillColor(240, 240, 255);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Total de Vendas", margin + 8, currentY + 10);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(rep.sales), margin + 8, currentY + 22);

  // Card 2 - Comissão
  doc.setFillColor(240, 255, 240);
  doc.roundedRect(margin + cardWidth + 10, currentY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Comissão Total", margin + cardWidth + 18, currentY + 10);
  doc.setFontSize(14);
  doc.setTextColor(34, 139, 34);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(rep.commission), margin + cardWidth + 18, currentY + 22);

  currentY += cardHeight + 8;

  // Card 3 - Negócios
  doc.setFillColor(255, 248, 240);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Número de Pedidos", margin + 8, currentY + 10);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(String(rep.deals), margin + 8, currentY + 22);

  // Card 4 - Taxa
  doc.setFillColor(248, 240, 255);
  doc.roundedRect(margin + cardWidth + 10, currentY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Taxa Média", margin + cardWidth + 18, currentY + 10);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(`${rep.rate.toFixed(1)}%`, margin + cardWidth + 18, currentY + 22);

  currentY += cardHeight + 20;

  // Orders Table Header
  doc.setFillColor(99, 102, 241);
  doc.rect(margin, currentY, pageWidth - margin * 2, 10, 'F');
  
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  
  const colWidths = {
    data: 22,
    pedido: 22,
    cliente: 50,
    produto: 40,
    venda: 25,
    comissao: 25
  };
  
  let colX = margin + 3;
  doc.text("Data", colX, currentY + 7);
  colX += colWidths.data;
  doc.text("Pedido", colX, currentY + 7);
  colX += colWidths.pedido;
  doc.text("Cliente", colX, currentY + 7);
  colX += colWidths.cliente;
  doc.text("Produto", colX, currentY + 7);
  colX += colWidths.produto;
  doc.text("Venda", colX, currentY + 7);
  colX += colWidths.venda;
  doc.text("Comissão", colX, currentY + 7);

  currentY += 12;

  // Orders Table Rows
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  
  const orders = rep.orders || [];
  
  orders.forEach((order, index) => {
    addNewPageIfNeeded(10);
    
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 252);
      doc.rect(margin, currentY - 4, pageWidth - margin * 2, 9, 'F');
    }
    
    doc.setFontSize(7);
    doc.setTextColor(50, 50, 50);
    
    colX = margin + 3;
    
    // Data
    const dataText = order.data || '-';
    doc.text(dataText.substring(0, 10), colX, currentY + 2);
    colX += colWidths.data;
    
    // Pedido
    const pedidoText = order.pedido || '-';
    doc.text(pedidoText.substring(0, 10), colX, currentY + 2);
    colX += colWidths.pedido;
    
    // Cliente (truncate if too long)
    const clienteText = order.cliente || '-';
    doc.text(clienteText.substring(0, 25), colX, currentY + 2);
    colX += colWidths.cliente;
    
    // Produto (truncate if too long)
    const produtoText = order.produto || '-';
    doc.text(produtoText.substring(0, 20), colX, currentY + 2);
    colX += colWidths.produto;
    
    // Venda
    doc.text(formatCurrency(order.venda), colX, currentY + 2);
    colX += colWidths.venda;
    
    // Comissão
    doc.setTextColor(34, 139, 34);
    doc.text(formatCurrency(order.comissao), colX, currentY + 2);
    
    currentY += 9;
  });

  // Totals row
  addNewPageIfNeeded(15);
  currentY += 5;
  
  doc.setFillColor(99, 102, 241);
  doc.rect(margin, currentY - 4, pageWidth - margin * 2, 10, 'F');
  
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  
  colX = margin + 3;
  doc.text("TOTAL", colX, currentY + 3);
  
  colX = margin + 3 + colWidths.data + colWidths.pedido + colWidths.cliente + colWidths.produto;
  doc.text(formatCurrency(rep.sales), colX, currentY + 3);
  colX += colWidths.venda;
  doc.text(formatCurrency(rep.commission), colX, currentY + 3);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text("Documento gerado automaticamente pelo Sistema de Comissões", pageWidth / 2, pageHeight - 10, { align: "center" });
  
  // Download
  doc.save(`relatorio-${rep.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
};
