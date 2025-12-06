import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { ParsedCart, TicketItem, HotelItem, CarItem, InsuranceItem } from './ProposalTab';

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 700 },
  ],
});

// Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 11,
    paddingTop: 30,
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
  },
  coverPage: {
    fontFamily: 'Roboto',
    backgroundColor: '#1a1a2e',
    padding: 0,
  },
  coverContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  logo: {
    width: 160,
    height: 54,
    marginBottom: 40,
  },
  coverTitle: {
    fontSize: 38,
    fontWeight: 700,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15,
  },
  coverSubtitle: {
    fontSize: 16,
    color: '#f97316',
    textAlign: 'center',
    marginBottom: 50,
  },
  coverClientBox: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f97316',
    width: '80%',
  },
  coverClientLabel: {
    fontSize: 12,
    color: '#f97316',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  coverClientName: {
    fontSize: 26,
    fontWeight: 700,
    color: '#ffffff',
  },
  coverFooter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  coverDate: {
    fontSize: 11,
    color: '#9ca3af',
  },

  // Content pages
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#f97316',
  },
  headerLogo: {
    width: 90,
    height: 30,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a2e',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 18,
    paddingBottom: 8,
    borderBottomWidth: 3,
    borderBottomColor: '#f97316',
  },

  // Cards
  itemCard: {
    marginBottom: 18,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: '#f97316',
    padding: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
  },
  cardBody: {
    padding: 14,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  cardLabel: {
    width: 100,
    fontSize: 9,
    color: '#64748b',
    fontWeight: 700,
  },
  cardValue: {
    flex: 1,
    fontSize: 9,
    color: '#1e293b',
  },
  cardDescription: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.5,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  bulletList: {
    marginTop: 6,
    paddingLeft: 8,
  },
  bulletItem: {
    fontSize: 8,
    color: '#475569',
    marginBottom: 3,
  },

  // Item image
  itemImage: {
    width: '100%',
    height: 100,
    objectFit: 'cover',
  },

  // Summary box
  summaryBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#c2410c',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#9a3412',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 700,
    color: '#1e293b',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
  },
  pageNumber: {
    fontSize: 8,
    color: '#f97316',
    fontWeight: 700,
  },

  // CTA Page
  ctaPage: {
    fontFamily: 'Roboto',
    backgroundColor: '#1a1a2e',
    padding: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: '#f97316',
    textAlign: 'center',
    marginBottom: 40,
  },
  ctaContact: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 25,
    width: '100%',
    borderWidth: 2,
    borderColor: '#f97316',
  },
  ctaContactTitle: {
    fontSize: 12,
    color: '#f97316',
    textAlign: 'center',
    marginBottom: 18,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  ctaContactItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  ctaContactLabel: {
    fontSize: 10,
    color: '#9ca3af',
    width: 75,
  },
  ctaContactValue: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 700,
  },
  ctaFooter: {
    position: 'absolute',
    bottom: 35,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  ctaFooterText: {
    fontSize: 9,
    color: '#6b7280',
  },

  // Includes badges
  includesBadge: {
    backgroundColor: '#dbeafe',
    padding: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 6,
  },
  includesText: {
    fontSize: 9,
    color: '#1e40af',
  },
});

interface ProposalDocumentProps {
  cart: ParsedCart;
  images: Record<string, string>;
}

const TicketCard = ({ ticket, imageData }: { ticket: TicketItem; imageData?: string }) => (
  <View style={styles.itemCard}>
    {imageData && (
      <Image src={imageData} style={styles.itemImage} />
    )}
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{ticket.name}</Text>
    </View>
    <View style={styles.cardBody}>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Data:</Text>
        <Text style={styles.cardValue}>{ticket.date}</Text>
      </View>
      {ticket.time && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Horário:</Text>
          <Text style={styles.cardValue}>{ticket.time}</Text>
        </View>
      )}
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Visitantes:</Text>
        <Text style={styles.cardValue}>{ticket.guests}</Text>
      </View>
      {ticket.validityDays && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Validade:</Text>
          <Text style={styles.cardValue}>{ticket.validityDays}</Text>
        </View>
      )}
      {ticket.entryType && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Tipo:</Text>
          <Text style={styles.cardValue}>{ticket.entryType}</Text>
        </View>
      )}
      {(ticket.fullDescription || ticket.description) && (
        <Text style={styles.cardDescription}>
          {ticket.fullDescription || ticket.description}
        </Text>
      )}
      {ticket.parks && ticket.parks.length > 0 && (
        <View style={styles.bulletList}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: '#475569', marginBottom: 3 }}>
            Parques inclusos:
          </Text>
          {ticket.parks.slice(0, 4).map((park, i) => (
            <Text key={i} style={styles.bulletItem}>• {park}</Text>
          ))}
        </View>
      )}
      {ticket.benefits && ticket.benefits.length > 0 && (
        <View style={styles.bulletList}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: '#475569', marginBottom: 3 }}>
            Benefícios:
          </Text>
          {ticket.benefits.slice(0, 4).map((benefit, i) => (
            <Text key={i} style={styles.bulletItem}>• {benefit}</Text>
          ))}
        </View>
      )}
    </View>
  </View>
);

const HotelCard = ({ hotel, imageData }: { hotel: HotelItem; imageData?: string }) => (
  <View style={styles.itemCard}>
    {imageData && (
      <Image src={imageData} style={styles.itemImage} />
    )}
    <View style={[styles.cardHeader, { backgroundColor: '#0d9488' }]}>
      <Text style={styles.cardTitle}>{hotel.name}</Text>
    </View>
    <View style={styles.cardBody}>
      {hotel.category && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Categoria:</Text>
          <Text style={styles.cardValue}>{hotel.category}</Text>
        </View>
      )}
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Check-in:</Text>
        <Text style={styles.cardValue}>{hotel.checkIn} {hotel.checkInTime || ''}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Check-out:</Text>
        <Text style={styles.cardValue}>{hotel.checkOut} {hotel.checkOutTime || ''}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Noites:</Text>
        <Text style={styles.cardValue}>{hotel.nights}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Quartos:</Text>
        <Text style={styles.cardValue}>{hotel.rooms}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Hóspedes:</Text>
        <Text style={styles.cardValue}>{hotel.guests}</Text>
      </View>
      {hotel.roomType && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Tipo de quarto:</Text>
          <Text style={styles.cardValue}>{hotel.roomType}</Text>
        </View>
      )}
      {hotel.mealPlan && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Alimentação:</Text>
          <Text style={styles.cardValue}>{hotel.mealPlan}</Text>
        </View>
      )}
      {(hotel.fullDescription || hotel.roomDescription) && (
        <Text style={styles.cardDescription}>
          {hotel.fullDescription || hotel.roomDescription}
        </Text>
      )}
      {hotel.amenities && hotel.amenities.length > 0 && (
        <View style={styles.bulletList}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: '#475569', marginBottom: 3 }}>
            Comodidades:
          </Text>
          {hotel.amenities.slice(0, 5).map((amenity, i) => (
            <Text key={i} style={styles.bulletItem}>• {amenity}</Text>
          ))}
        </View>
      )}
    </View>
  </View>
);

const CarCard = ({ car, imageData }: { car: CarItem; imageData?: string }) => (
  <View style={styles.itemCard}>
    {imageData && (
      <Image src={imageData} style={styles.itemImage} />
    )}
    <View style={[styles.cardHeader, { backgroundColor: '#16a34a' }]}>
      <Text style={styles.cardTitle}>{car.name}</Text>
    </View>
    <View style={styles.cardBody}>
      {car.category && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Categoria:</Text>
          <Text style={styles.cardValue}>{car.category}</Text>
        </View>
      )}
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Retirada:</Text>
        <Text style={styles.cardValue}>{car.pickupDate} {car.pickupTime || ''}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Local Retirada:</Text>
        <Text style={styles.cardValue}>{car.pickupLocation}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Devolução:</Text>
        <Text style={styles.cardValue}>{car.returnDate} {car.returnTime || ''}</Text>
      </View>
      {car.returnLocation && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Local Devolução:</Text>
          <Text style={styles.cardValue}>{car.returnLocation}</Text>
        </View>
      )}
      {car.capacity && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Capacidade:</Text>
          <Text style={styles.cardValue}>{car.capacity}</Text>
        </View>
      )}
      {car.rentalCompany && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Locadora:</Text>
          <Text style={styles.cardValue}>{car.rentalCompany}</Text>
        </View>
      )}
      {car.fullDescription && (
        <Text style={styles.cardDescription}>{car.fullDescription}</Text>
      )}
      {car.features && car.features.length > 0 && (
        <View style={styles.bulletList}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: '#475569', marginBottom: 3 }}>
            Características:
          </Text>
          {car.features.slice(0, 4).map((feature, i) => (
            <Text key={i} style={styles.bulletItem}>• {feature}</Text>
          ))}
        </View>
      )}
    </View>
  </View>
);

const InsuranceCard = ({ insurance, imageData }: { insurance: InsuranceItem; imageData?: string }) => (
  <View style={styles.itemCard}>
    {imageData && (
      <Image src={imageData} style={styles.itemImage} />
    )}
    <View style={[styles.cardHeader, { backgroundColor: '#7c3aed' }]}>
      <Text style={styles.cardTitle}>{insurance.name}</Text>
    </View>
    <View style={styles.cardBody}>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Viajantes:</Text>
        <Text style={styles.cardValue}>{insurance.travelers}</Text>
      </View>
      {insurance.destination && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Destino:</Text>
          <Text style={styles.cardValue}>{insurance.destination}</Text>
        </View>
      )}
      {(insurance.startDate || insurance.dates) && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Período:</Text>
          <Text style={styles.cardValue}>
            {insurance.startDate && insurance.endDate 
              ? `${insurance.startDate} a ${insurance.endDate}`
              : insurance.dates}
          </Text>
        </View>
      )}
      {(insurance.coverageAmount || insurance.coverage) && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Cobertura:</Text>
          <Text style={styles.cardValue}>{insurance.coverageAmount || insurance.coverage}</Text>
        </View>
      )}
      {insurance.fullDescription && (
        <Text style={styles.cardDescription}>{insurance.fullDescription}</Text>
      )}
      {insurance.coverageDetails && insurance.coverageDetails.length > 0 && (
        <View style={styles.bulletList}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: '#475569', marginBottom: 3 }}>
            Coberturas inclusas:
          </Text>
          {insurance.coverageDetails.slice(0, 5).map((detail, i) => (
            <Text key={i} style={styles.bulletItem}>• {detail}</Text>
          ))}
        </View>
      )}
    </View>
  </View>
);

export const ProposalDocument: React.FC<ProposalDocumentProps> = ({ cart, images }) => {
  const summary = cart.summary || {
    tripStart: '',
    tripEnd: '',
    totalDays: '',
  };

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Helper to get image for item
  const getImageKey = (type: string, name: string): string => {
    const lowerName = name.toLowerCase();
    
    if (type === 'ticket') {
      if (lowerName.includes('disney') || lowerName.includes('magic') || lowerName.includes('epcot')) return 'disney';
      if (lowerName.includes('universal') || lowerName.includes('islands') || lowerName.includes('epic')) return 'universal';
      if (lowerName.includes('seaworld') || lowerName.includes('busch') || lowerName.includes('aquatica')) return 'seaworld';
      if (lowerName.includes('animal')) return 'animal';
      return 'disney';
    }
    if (type === 'hotel') {
      if (lowerName.includes('luxury') || lowerName.includes('deluxe') || lowerName.includes('grand')) return 'hotelLuxury';
      return 'hotel';
    }
    if (type === 'car') return 'car';
    if (type === 'insurance') return 'insurance';
    return 'disney';
  };

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverContent}>
          {images.logo && (
            <Image src={images.logo} style={styles.logo} />
          )}
          
          <Text style={styles.coverTitle}>PROPOSTA DE VIAGEM</Text>
          <Text style={styles.coverSubtitle}>Uma experiência mágica te espera</Text>
          
          <View style={styles.coverClientBox}>
            <Text style={styles.coverClientLabel}>Preparada especialmente para</Text>
            <Text style={styles.coverClientName}>{cart.clientName || 'Cliente'}</Text>
          </View>
        </View>
        
        <View style={styles.coverFooter}>
          <Text style={styles.coverDate}>Proposta gerada em {today}</Text>
        </View>
      </Page>

      {/* Summary Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {images.logoOrange && (
            <Image src={images.logoOrange} style={styles.headerLogo} />
          )}
          <Text style={styles.headerTitle}>Resumo da Viagem</Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>
            {summary.tripTitle || `Viagem para Orlando`}
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Data de Início</Text>
              <Text style={styles.summaryValue}>{summary.tripStart || '-'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Data de Término</Text>
              <Text style={styles.summaryValue}>{summary.tripEnd || '-'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total de Dias</Text>
              <Text style={styles.summaryValue}>{summary.totalDays || '-'}</Text>
            </View>
            {summary.totalNights && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total de Noites</Text>
                <Text style={styles.summaryValue}>{summary.totalNights}</Text>
              </View>
            )}
            {summary.travelGroup && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Grupo</Text>
                <Text style={styles.summaryValue}>{summary.travelGroup}</Text>
              </View>
            )}
            {summary.totalParks && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Parques</Text>
                <Text style={styles.summaryValue}>{summary.totalParks}</Text>
              </View>
            )}
          </View>
          {summary.tripDescription && (
            <Text style={{ fontSize: 9, color: '#9a3412', marginTop: 12, lineHeight: 1.4 }}>
              {summary.tripDescription}
            </Text>
          )}
        </View>

        {/* Quick overview */}
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
            O que está incluso:
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cart.tickets && cart.tickets.length > 0 && (
              <View style={styles.includesBadge}>
                <Text style={styles.includesText}>
                  {cart.tickets.length} Ingresso(s)
                </Text>
              </View>
            )}
            {cart.hotels && cart.hotels.length > 0 && (
              <View style={[styles.includesBadge, { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.includesText, { color: '#166534' }]}>
                  {cart.hotels.length} Hospedagem(ns)
                </Text>
              </View>
            )}
            {cart.cars && cart.cars.length > 0 && (
              <View style={[styles.includesBadge, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.includesText, { color: '#92400e' }]}>
                  {cart.cars.length} Carro(s)
                </Text>
              </View>
            )}
            {cart.insurance && cart.insurance.length > 0 && (
              <View style={[styles.includesBadge, { backgroundColor: '#fce7f3' }]}>
                <Text style={[styles.includesText, { color: '#9d174d' }]}>
                  {cart.insurance.length} Seguro(s)
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Orlando Fast Pass • orlandofastpass.com.br</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `${pageNumber} / ${totalPages}`
          )} />
        </View>
      </Page>

      {/* Tickets Page */}
      {cart.tickets && cart.tickets.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            {images.logoOrange && (
              <Image src={images.logoOrange} style={styles.headerLogo} />
            )}
            <Text style={styles.headerTitle}>Ingressos</Text>
          </View>

          <Text style={styles.sectionTitle}>Ingressos para Parques</Text>

          {cart.tickets.map((ticket, index) => (
            <TicketCard 
              key={index} 
              ticket={ticket} 
              imageData={images[getImageKey('ticket', ticket.name)]} 
            />
          ))}

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>Orlando Fast Pass • orlandofastpass.com.br</Text>
            <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
              `${pageNumber} / ${totalPages}`
            )} />
          </View>
        </Page>
      )}

      {/* Hotels Page */}
      {cart.hotels && cart.hotels.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            {images.logoOrange && (
              <Image src={images.logoOrange} style={styles.headerLogo} />
            )}
            <Text style={styles.headerTitle}>Hospedagem</Text>
          </View>

          <Text style={styles.sectionTitle}>Hospedagem</Text>

          {cart.hotels.map((hotel, index) => (
            <HotelCard 
              key={index} 
              hotel={hotel} 
              imageData={images[getImageKey('hotel', hotel.name)]} 
            />
          ))}

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>Orlando Fast Pass • orlandofastpass.com.br</Text>
            <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
              `${pageNumber} / ${totalPages}`
            )} />
          </View>
        </Page>
      )}

      {/* Cars Page */}
      {cart.cars && cart.cars.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            {images.logoOrange && (
              <Image src={images.logoOrange} style={styles.headerLogo} />
            )}
            <Text style={styles.headerTitle}>Locação de Veículos</Text>
          </View>

          <Text style={styles.sectionTitle}>Locação de Veículos</Text>

          {cart.cars.map((car, index) => (
            <CarCard 
              key={index} 
              car={car} 
              imageData={images[getImageKey('car', car.name)]} 
            />
          ))}

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>Orlando Fast Pass • orlandofastpass.com.br</Text>
            <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
              `${pageNumber} / ${totalPages}`
            )} />
          </View>
        </Page>
      )}

      {/* Insurance Page */}
      {cart.insurance && cart.insurance.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            {images.logoOrange && (
              <Image src={images.logoOrange} style={styles.headerLogo} />
            )}
            <Text style={styles.headerTitle}>Seguro Viagem</Text>
          </View>

          <Text style={styles.sectionTitle}>Seguro Viagem</Text>

          {cart.insurance.map((ins, index) => (
            <InsuranceCard 
              key={index} 
              insurance={ins} 
              imageData={images[getImageKey('insurance', ins.name)]} 
            />
          ))}

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>Orlando Fast Pass • orlandofastpass.com.br</Text>
            <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
              `${pageNumber} / ${totalPages}`
            )} />
          </View>
        </Page>
      )}

      {/* CTA Page */}
      <Page size="A4" style={styles.ctaPage}>
        <Text style={styles.ctaTitle}>Vamos realizar seu sonho?</Text>
        <Text style={styles.ctaSubtitle}>
          Entre em contato e feche sua viagem dos sonhos!
        </Text>

        <View style={styles.ctaContact}>
          <Text style={styles.ctaContactTitle}>Fale Conosco</Text>
          
          <View style={styles.ctaContactItem}>
            <Text style={styles.ctaContactLabel}>WhatsApp:</Text>
            <Text style={styles.ctaContactValue}>(11) 99999-9999</Text>
          </View>
          
          <View style={styles.ctaContactItem}>
            <Text style={styles.ctaContactLabel}>E-mail:</Text>
            <Text style={styles.ctaContactValue}>contato@orlandofastpass.com.br</Text>
          </View>
          
          <View style={styles.ctaContactItem}>
            <Text style={styles.ctaContactLabel}>Site:</Text>
            <Text style={styles.ctaContactValue}>www.orlandofastpass.com.br</Text>
          </View>
        </View>

        <View style={styles.ctaFooter}>
          <Text style={styles.ctaFooterText}>
            © {new Date().getFullYear()} Orlando Fast Pass • Todos os direitos reservados
          </Text>
        </View>
      </Page>
    </Document>
  );
};
