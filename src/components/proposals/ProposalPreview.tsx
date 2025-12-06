import { Ticket, Building, Car, Shield, Calendar, Users, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ParsedCart } from "./ProposalTab";

interface ProposalPreviewProps {
  cart: ParsedCart;
}

export const ProposalPreview = ({ cart }: ProposalPreviewProps) => {
  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
      {/* Client & Summary */}
      {cart.summary && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-lg">{cart.clientName || 'Cliente'}</span>
            <Badge variant="secondary">
              {cart.summary.totalDays || 'Período completo'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {cart.summary.tripStart} - {cart.summary.tripEnd}
            </span>
          </div>
          {cart.summary.highlights && cart.summary.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {cart.summary.highlights.map((highlight, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {highlight}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tickets */}
      {cart.tickets && cart.tickets.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Ticket className="h-4 w-4 text-primary" />
            Ingressos ({cart.tickets.length})
          </h4>
          {cart.tickets.map((ticket, index) => (
            <div key={index} className="p-3 rounded-lg bg-card border text-sm">
              <div className="flex gap-3">
                {ticket.image && (
                  <img 
                    src={ticket.image} 
                    alt={ticket.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ticket.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {ticket.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ticket.duration}
                    </span>
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
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Building className="h-4 w-4 text-primary" />
            Hospedagem ({cart.hotels.length})
          </h4>
          {cart.hotels.map((hotel, index) => (
            <div key={index} className="p-3 rounded-lg bg-card border text-sm">
              <div className="flex gap-3">
                {hotel.image && (
                  <img 
                    src={hotel.image} 
                    alt={hotel.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{hotel.name}</p>
                  {hotel.roomType && (
                    <p className="text-xs text-muted-foreground truncate">{hotel.roomType}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {hotel.checkIn} - {hotel.checkOut}
                    </span>
                    <span>{hotel.nights} noites</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cars */}
      {cart.cars && cart.cars.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 text-primary" />
            Carro ({cart.cars.length})
          </h4>
          {cart.cars.map((car, index) => (
            <div key={index} className="p-3 rounded-lg bg-card border text-sm">
              <div className="flex gap-3">
                {car.image && (
                  <img 
                    src={car.image} 
                    alt={car.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{car.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {car.pickupLocation}
                    </span>
                    <span>{car.pickupDate} → {car.returnDate}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insurance */}
      {cart.insurance && cart.insurance.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            Seguro Viagem ({cart.insurance.length})
          </h4>
          {cart.insurance.map((ins, index) => (
            <div key={index} className="p-3 rounded-lg bg-card border text-sm">
              <div className="flex gap-3">
                {ins.image && (
                  <img 
                    src={ins.image} 
                    alt={ins.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ins.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    <span>Cobertura: {ins.coverage}</span>
                    <span>{ins.dates}</span>
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
