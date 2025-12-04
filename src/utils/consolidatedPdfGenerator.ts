import jsPDF from 'jspdf';
import { SalesRep, SalesTotals } from '@/types/sales';

const formatCurrency = (value: number): string => {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const COLORS = {
  primary: [255, 107, 0] as [number, number, number],
  dark: [26, 20, 16] as [number, number, number],
  gray: [120, 120, 120] as [number, number, number],
  lightGray: [200, 200, 200] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
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
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
};

interface ConsolidatedPdfOptions {
  salesReps: SalesRep[];
  totals: SalesTotals | null;
  getSalary: (name: string) => number;
  month?: string;
  year?: string;
}

export async function generateConsolidatedPDF(options: ConsolidatedPdfOptions): Promise<void> {
  const { salesReps, totals, getSalary, month, year } = options;
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Load logo
  let logoData: string | null = null;
  try {
    logoData = await loadImage('/images/logo-branco.png');
  } catch (e) {
    console.warn('Could not load logo');
  }

  // Helper functions
  const addNewPage = () => {
    doc.addPage();
    yPos = margin;
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      addNewPage();
      return true;
    }
    return false;
  };

  // ================== PAGE 1: COVER & SUMMARY ==================
  
  // Header with logo
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, yPos, 40, 15);
  }
  
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, yPos + 8, { align: 'right' });
  yPos += 25;

  // Title
  doc.setFontSize(24);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório Consolidado de Gestão', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Period
  const periodText = month && year ? `${month}/${year}` : 'Período Completo';
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text(periodText, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Divider
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ================== KPI SUMMARY ==================
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo de KPIs', margin, yPos);
  yPos += 10;

  const totalVendas = totals?.totalVendas || 0;
  const totalComissao = totals?.totalComissao || 0;
  const totalNegocios = totals?.totalNegocios || 0;
  const vendedoresAtivos = totals?.vendedoresAtivos || salesReps.length;
  const ticketMedio = totalNegocios > 0 ? totalVendas / totalNegocios : 0;
  const totalComissaoTotal = salesReps.reduce((sum, rep) => sum + (rep.orders?.reduce((s, o) => s + (o.comissaoTotal || 0), 0) || 0), 0);
  const totalSalaries = salesReps.reduce((sum, rep) => sum + getSalary(rep.name), 0);
  const totalCost = totalComissao + totalSalaries;
  const resultado = totalComissaoTotal - totalCost;

  // KPI Grid
  const kpiBoxWidth = (pageWidth - margin * 2 - 10) / 2;
  const kpiBoxHeight = 25;
  
  const drawKpiBox = (x: number, y: number, label: string, value: string, color: [number, number, number] = COLORS.primary) => {
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(x, y, kpiBoxWidth, kpiBoxHeight, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + 5, y + 8);
    doc.setFontSize(14);
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + 5, y + 19);
  };

  // Row 1
  drawKpiBox(margin, yPos, 'Faturamento', formatCurrency(totalVendas), COLORS.success);
  drawKpiBox(margin + kpiBoxWidth + 10, yPos, 'Comissão Total', formatCurrency(totalComissaoTotal), COLORS.primary);
  yPos += kpiBoxHeight + 5;

  // Row 2
  drawKpiBox(margin, yPos, 'Comissão Vendedor', formatCurrency(totalComissao), COLORS.primary);
  drawKpiBox(margin + kpiBoxWidth + 10, yPos, 'Custo Total', formatCurrency(totalCost), COLORS.danger);
  yPos += kpiBoxHeight + 5;

  // Row 3
  const resultadoColor = resultado >= 0 ? COLORS.success : COLORS.danger;
  drawKpiBox(margin, yPos, 'Resultado', formatCurrency(resultado), resultadoColor);
  drawKpiBox(margin + kpiBoxWidth + 10, yPos, 'Ticket Médio', formatCurrency(ticketMedio), COLORS.primary);
  yPos += kpiBoxHeight + 5;

  // Row 4
  drawKpiBox(margin, yPos, 'Vendedores Ativos', String(vendedoresAtivos), COLORS.primary);
  drawKpiBox(margin + kpiBoxWidth + 10, yPos, 'Total de Pedidos', String(totalNegocios), COLORS.primary);
  yPos += kpiBoxHeight + 15;

  // ================== SALESPEOPLE RANKING ==================
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Ranking de Vendedores', margin, yPos);
  yPos += 8;

  // Table header
  const colWidths = [10, 50, 35, 35, 35];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const startX = (pageWidth - tableWidth) / 2;

  doc.setFillColor(...COLORS.primary);
  doc.rect(startX, yPos, tableWidth, 8, 'F');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  
  let xPos = startX + 2;
  ['#', 'Vendedor', 'Vendas', 'Comissão', 'Pedidos'].forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });
  yPos += 8;

  // Sort by sales
  const sortedReps = [...salesReps].sort((a, b) => b.sales - a.sales);

  sortedReps.forEach((rep, index) => {
    checkPageBreak(8);
    
    const bgColor = index % 2 === 0 ? [250, 250, 250] : [255, 255, 255];
    doc.setFillColor(...(bgColor as [number, number, number]));
    doc.rect(startX, yPos, tableWidth, 7, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');
    
    let x = startX + 2;
    doc.text(String(index + 1), x, yPos + 5);
    x += colWidths[0];
    doc.text(rep.name.substring(0, 20), x, yPos + 5);
    x += colWidths[1];
    doc.text(formatCurrency(rep.sales), x, yPos + 5);
    x += colWidths[2];
    doc.text(formatCurrency(rep.commission), x, yPos + 5);
    x += colWidths[3];
    doc.text(String(rep.deals), x, yPos + 5);
    
    yPos += 7;
  });

  yPos += 10;

  // ================== PAGE 2: TOP CLIENTS ==================
  addNewPage();

  doc.setFontSize(16);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Top 10 Clientes', margin, yPos);
  yPos += 10;

  // Aggregate client data
  const clientMap = new Map<string, { name: string; revenue: number; orders: number }>();
  salesReps.forEach(rep => {
    rep.orders?.forEach(order => {
      if (!order.cliente) return;
      const existing = clientMap.get(order.cliente);
      if (existing) {
        existing.revenue += order.venda;
        existing.orders += 1;
      } else {
        clientMap.set(order.cliente, { name: order.cliente, revenue: order.venda, orders: 1 });
      }
    });
  });

  const topClients = Array.from(clientMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const totalClientRevenue = Array.from(clientMap.values()).reduce((sum, c) => sum + c.revenue, 0);

  // Client table
  const clientColWidths = [10, 70, 40, 25, 25];
  const clientTableWidth = clientColWidths.reduce((a, b) => a + b, 0);
  const clientStartX = (pageWidth - clientTableWidth) / 2;

  doc.setFillColor(...COLORS.primary);
  doc.rect(clientStartX, yPos, clientTableWidth, 8, 'F');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  
  xPos = clientStartX + 2;
  ['#', 'Cliente', 'Faturamento', 'Pedidos', '%'].forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += clientColWidths[i];
  });
  yPos += 8;

  topClients.forEach((client, index) => {
    checkPageBreak(8);
    
    const bgColor = index % 2 === 0 ? [250, 250, 250] : [255, 255, 255];
    doc.setFillColor(...(bgColor as [number, number, number]));
    doc.rect(clientStartX, yPos, clientTableWidth, 7, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');
    
    const percentage = totalClientRevenue > 0 ? (client.revenue / totalClientRevenue) * 100 : 0;
    
    let x = clientStartX + 2;
    doc.text(String(index + 1), x, yPos + 5);
    x += clientColWidths[0];
    doc.text(client.name.substring(0, 30), x, yPos + 5);
    x += clientColWidths[1];
    doc.text(formatCurrency(client.revenue), x, yPos + 5);
    x += clientColWidths[2];
    doc.text(String(client.orders), x, yPos + 5);
    x += clientColWidths[3];
    doc.text(`${percentage.toFixed(1)}%`, x, yPos + 5);
    
    yPos += 7;
  });

  yPos += 15;

  // ================== ROI PER SALESPERSON ==================
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('ROI por Vendedor', margin, yPos);
  yPos += 10;

  const roiColWidths = [50, 35, 35, 35, 25];
  const roiTableWidth = roiColWidths.reduce((a, b) => a + b, 0);
  const roiStartX = (pageWidth - roiTableWidth) / 2;

  doc.setFillColor(...COLORS.primary);
  doc.rect(roiStartX, yPos, roiTableWidth, 8, 'F');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  
  xPos = roiStartX + 2;
  ['Vendedor', 'Receita', 'Custo', 'Lucro', 'ROI'].forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += roiColWidths[i];
  });
  yPos += 8;

  const roiData = salesReps.map(rep => {
    const revenue = rep.orders?.reduce((sum, o) => sum + (o.comissaoTotal || 0), 0) || 0;
    const salary = getSalary(rep.name);
    const cost = salary + rep.commission;
    const profit = revenue - cost;
    const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
    return { name: rep.name, revenue, cost, profit, roi };
  }).sort((a, b) => b.roi - a.roi);

  roiData.forEach((data, index) => {
    checkPageBreak(8);
    
    const bgColor = index % 2 === 0 ? [250, 250, 250] : [255, 255, 255];
    doc.setFillColor(...(bgColor as [number, number, number]));
    doc.rect(roiStartX, yPos, roiTableWidth, 7, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');
    
    let x = roiStartX + 2;
    doc.text(data.name.substring(0, 20), x, yPos + 5);
    x += roiColWidths[0];
    doc.text(formatCurrency(data.revenue), x, yPos + 5);
    x += roiColWidths[1];
    doc.text(formatCurrency(data.cost), x, yPos + 5);
    x += roiColWidths[2];
    
    doc.setTextColor(...(data.profit >= 0 ? COLORS.success : COLORS.danger));
    doc.text(formatCurrency(data.profit), x, yPos + 5);
    x += roiColWidths[3];
    doc.text(`${data.roi.toFixed(1)}%`, x, yPos + 5);
    doc.setTextColor(...COLORS.dark);
    
    yPos += 7;
  });

  // ================== FOOTER ==================
  const addFooter = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gray);
      doc.text(
        `Orlando Fast Pass • Relatório Consolidado • Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  };

  addFooter();

  // Save PDF
  const fileName = month && year 
    ? `relatorio_consolidado_${month}_${year}.pdf`
    : `relatorio_consolidado_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
