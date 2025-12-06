import { Ticket, Building, Car, Shield, Calendar, Users, MapPin, Clock, Star, Sparkles, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ParsedCart, TicketItem, HotelItem, CarItem, InsuranceItem } from "./ProposalTab";

interface ProposalPreviewProps {
  cart: ParsedCart;
}

export const ProposalPreview = ({ cart }: ProposalPreviewProps) => {
  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
      {/* Trip Summary Header */}
      {cart.summary && (
        <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-orange-500/5 to-amber-500/10 border border-primary/20">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {cart.summary.tripTitle || 'Sua Viagem dos Sonhos'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Preparada para: <span className="font-semibold text-foreground">{cart.clientName || 'Cliente'}</span>
              </p>
            </div>
            <Badge className="bg-primary text-primary-foreground">
              {cart.summary.totalDays || 'Período completo'}
            </Badge>
          </div>
          
          {cart.summary.tripDescription && (
            <p className="text-sm mb-3 italic text-muted-foreground">
              "{cart.summary.tripDescription}"
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 bg-background/50 px-3 py-1 rounded-full">
              <Calendar className="h-4 w-4 text-primary" />
              {cart.summary.tripStart} - {cart.summary.tripEnd}
            </span>
            {cart.summary.travelGroup && (
              <span className="flex items-center gap-1.5 bg-background/50 px-3 py-1 rounded-full">
                <Users className="h-4 w-4 text-primary" />
                {cart.summary.travelGroup}
              </span>
            )}
          </div>
          
          {cart.summary.highlights && cart.summary.highlights.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">DESTAQUES DA VIAGEM:</p>
              <div className="flex flex-wrap gap-1.5">
                {cart.summary.highlights.map((highlight, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-background/50">
                    <Star className="h-3 w-3 mr-1 text-amber-500" />
                    {highlight}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tickets */}
      {cart.tickets && cart.tickets.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-bold flex items-center gap-2 text-base border-b pb-2">
            <Ticket className="h-5 w-5 text-primary" />
            Ingressos e Parques ({cart.tickets.length})
          </h4>
          {cart.tickets.map((ticket: TicketItem, index: number) => (
            <div key={index} className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                {(ticket.mainImage || ticket.image) && (
                  <div className="flex flex-col gap-1">
                    <img 
                      src={ticket.mainImage || ticket.image} 
                      alt={ticket.name}
                      className="w-24 h-24 rounded-lg object-cover flex-shrink-0 ring-2 ring-primary/20"
                    />
                    {ticket.images && ticket.images.length > 1 && (
                      <div className="flex gap-1">
                        {ticket.images.slice(1, 3).map((img, i) => (
                          <img 
                            key={i}
                            src={img} 
                            alt=""
                            className="w-11 h-11 rounded object-cover opacity-80"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="font-bold text-base">{ticket.name}</p>
                  
                  {ticket.fullDescription && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {ticket.fullDescription}
                    </p>
                  )}
                  
                  {ticket.parks && ticket.parks.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ticket.parks.map((park, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {park}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {ticket.mainAttractions && ticket.mainAttractions.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold">Atrações:</span> {ticket.mainAttractions.join(', ')}
                    </div>
                  )}
                  
                  {ticket.benefits && ticket.benefits.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ticket.benefits.map((benefit, i) => (
                        <span key={i} className="text-xs flex items-center gap-1 text-green-600">
                          <Check className="h-3 w-3" />
                          {benefit}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1 border-t">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {ticket.date}
                    </span>
                    {(ticket.validityDays || ticket.duration) && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ticket.validityDays || ticket.duration}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {ticket.guests}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hotels */}
      {cart.hotels && cart.hotels.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-bold flex items-center gap-2 text-base border-b pb-2">
            <Building className="h-5 w-5 text-blue-500" />
            Hospedagem ({cart.hotels.length})
          </h4>
          {cart.hotels.map((hotel: HotelItem, index: number) => (
            <div key={index} className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                {(hotel.mainImage || hotel.image) && (
                  <div className="flex flex-col gap-1">
                    <img 
                      src={hotel.mainImage || hotel.image} 
                      alt={hotel.name}
                      className="w-24 h-24 rounded-lg object-cover flex-shrink-0 ring-2 ring-blue-500/20"
                    />
                    {hotel.images && hotel.images.length > 1 && (
                      <div className="flex gap-1">
                        {hotel.images.slice(1, 3).map((img, i) => (
                          <img 
                            key={i}
                            src={img} 
                            alt=""
                            className="w-11 h-11 rounded object-cover opacity-80"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-bold text-base">{hotel.name}</p>
                    {hotel.category && (
                      <Badge variant="outline" className="text-xs">
                        {hotel.category}
                      </Badge>
                    )}
                  </div>
                  
                  {hotel.fullDescription && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {hotel.fullDescription}
                    </p>
                  )}
                  
                  {hotel.roomType && (
                    <p className="text-sm font-medium">🛏️ {hotel.roomType}</p>
                  )}
                  
                  {hotel.roomDescription && (
                    <p className="text-xs text-muted-foreground">{hotel.roomDescription}</p>
                  )}
                  
                  {hotel.amenities && hotel.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {hotel.amenities.slice(0, 5).map((amenity, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1 border-t">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {hotel.checkIn} → {hotel.checkOut}
                    </span>
                    <span>{hotel.nights} noites</span>
                    <span>{hotel.rooms} quarto(s)</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cars */}
      {cart.cars && cart.cars.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-bold flex items-center gap-2 text-base border-b pb-2">
            <Car className="h-5 w-5 text-green-500" />
            Aluguel de Carro ({cart.cars.length})
          </h4>
          {cart.cars.map((car: CarItem, index: number) => (
            <div key={index} className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                {(car.mainImage || car.image) && (
                  <img 
                    src={car.mainImage || car.image} 
                    alt={car.name}
                    className="w-24 h-24 rounded-lg object-cover flex-shrink-0 ring-2 ring-green-500/20"
                  />
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-bold text-base">{car.name}</p>
                    {car.category && (
                      <Badge variant="outline" className="text-xs">
                        {car.category}
                      </Badge>
                    )}
                  </div>
                  
                  {car.fullDescription && (
                    <p className="text-sm text-muted-foreground">{car.fullDescription}</p>
                  )}
                  
                  {car.features && car.features.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {car.features.map((feature, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1 border-t">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {car.pickupLocation}
                    </span>
                    <span>
                      {car.pickupDate} {car.pickupTime || ''} → {car.returnDate} {car.returnTime || ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insurance */}
      {cart.insurance && cart.insurance.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-bold flex items-center gap-2 text-base border-b pb-2">
            <Shield className="h-5 w-5 text-purple-500" />
            Seguro Viagem ({cart.insurance.length})
          </h4>
          {cart.insurance.map((ins: InsuranceItem, index: number) => (
            <div key={index} className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                {(ins.mainImage || ins.image) && (
                  <img 
                    src={ins.mainImage || ins.image} 
                    alt={ins.name}
                    className="w-24 h-24 rounded-lg object-cover flex-shrink-0 ring-2 ring-purple-500/20"
                  />
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="font-bold text-base">{ins.name}</p>
                  
                  {ins.fullDescription && (
                    <p className="text-sm text-muted-foreground">{ins.fullDescription}</p>
                  )}
                  
                  {(ins.coverageAmount || ins.coverage) && (
                    <p className="text-sm font-medium text-green-600">
                      💰 Cobertura: {ins.coverageAmount || ins.coverage}
                    </p>
                  )}
                  
                  {ins.coverageDetails && ins.coverageDetails.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ins.coverageDetails.slice(0, 4).map((detail, i) => (
                        <span key={i} className="text-xs flex items-center gap-1 text-green-600">
                          <Check className="h-3 w-3" />
                          {detail}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1 border-t">
                    <span>
                      {ins.startDate || ins.dates} {ins.endDate && `→ ${ins.endDate}`}
                    </span>
                    <span>{ins.travelers} segurado(s)</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
