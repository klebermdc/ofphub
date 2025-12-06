import { pdf } from '@react-pdf/renderer';
import { ProposalDocument } from '@/components/proposals/ProposalDocument';
import type { ParsedCart } from '@/components/proposals/ProposalTab';

export const generateProposalPDF = async (cart: ParsedCart): Promise<void> => {
  try {
    // Generate the PDF blob using the document component
    const blob = await pdf(<ProposalDocument cart={cart} />).toBlob();
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename
    const clientName = cart.clientName || 'Cliente';
    const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    link.download = `Proposta_${clientName.replace(/\s+/g, '_')}_${date}.pdf`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
