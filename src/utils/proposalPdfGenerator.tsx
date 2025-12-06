import { pdf } from '@react-pdf/renderer';
import { ProposalDocument } from '@/components/proposals/ProposalDocument';
import type { ParsedCart } from '@/components/proposals/ProposalTab';

// Image paths
const IMAGE_PATHS: Record<string, string> = {
  logo: '/images/logo-branco.png',
  logoOrange: '/images/logo-ofp.png',
  disney: '/images/proposals/disney-castle.jpg',
  universal: '/images/proposals/universal-park.jpg',
  seaworld: '/images/proposals/seaworld.jpg',
  animal: '/images/proposals/animal-kingdom.jpg',
  hotel: '/images/proposals/hotel-resort.jpg',
  hotelLuxury: '/images/proposals/luxury-hotel.jpg',
  car: '/images/proposals/car-rental.jpg',
  insurance: '/images/proposals/travel-insurance.jpg',
};

// Load image as base64
async function loadImage(path: string): Promise<string | null> {
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

export const generateProposalPDF = async (cart: ParsedCart): Promise<void> => {
  try {
    // Load all images as base64
    const imageEntries = await Promise.all(
      Object.entries(IMAGE_PATHS).map(async ([key, path]) => {
        const data = await loadImage(path);
        return [key, data || ''] as [string, string];
      })
    );
    const images = Object.fromEntries(imageEntries.filter(([_, v]) => v));

    // Generate the PDF blob
    const blob = await pdf(<ProposalDocument cart={cart} images={images} />).toBlob();
    
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
