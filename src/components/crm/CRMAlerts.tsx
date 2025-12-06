import { useState } from 'react';
import { AlertTriangle, Clock, ChevronDown, ChevronUp, User, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CRMLead } from '@/hooks/useCRMLeads';
import { differenceInDays, differenceInHours } from 'date-fns';

interface CRMAlertsProps {
  leads: CRMLead[];
  onLeadClick: (lead: CRMLead) => void;
  alertDays?: number;
}

export function CRMAlerts({ leads, onLeadClick, alertDays = 2 }: CRMAlertsProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Filter leads that need attention (in coletando_informacao or proposta_enviada for more than alertDays)
  const alertLeads = leads.filter((lead) => {
    if (lead.stage !== 'coletando_informacao' && lead.stage !== 'proposta_enviada') {
      return false;
    }
    const daysSinceUpdate = differenceInDays(new Date(), new Date(lead.updated_at));
    return daysSinceUpdate >= alertDays;
  });

  // Separate by stage
  const coletandoAlerts = alertLeads.filter((l) => l.stage === 'coletando_informacao');
  const propostaAlerts = alertLeads.filter((l) => l.stage === 'proposta_enviada');

  if (alertLeads.length === 0) {
    return null;
  }

  const getTimeAgo = (date: string) => {
    const days = differenceInDays(new Date(), new Date(date));
    const hours = differenceInHours(new Date(), new Date(date)) % 24;
    
    if (days === 0) {
      return `${hours}h atrás`;
    } else if (days === 1) {
      return '1 dia';
    }
    return `${days} dias`;
  };

  const getUrgencyLevel = (date: string) => {
    const days = differenceInDays(new Date(), new Date(date));
    if (days >= 5) return 'critical';
    if (days >= 3) return 'high';
    return 'medium';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-orange-500/50 bg-orange-500/5">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-orange-500/10 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-500/20">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Leads Precisam de Atenção
                    <Badge variant="destructive" className="text-xs">
                      {alertLeads.length}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {coletandoAlerts.length} em Coletando Informação • {propostaAlerts.length} em Proposta Enviada
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Coletando Informação Alerts */}
            {coletandoAlerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-yellow-600">
                  <Clock className="h-4 w-4" />
                  Coletando Informação ({coletandoAlerts.length})
                </h4>
                <div className="grid gap-2">
                  {coletandoAlerts.map((lead) => (
                    <AlertLeadCard
                      key={lead.id}
                      lead={lead}
                      timeAgo={getTimeAgo(lead.updated_at)}
                      urgency={getUrgencyLevel(lead.updated_at)}
                      onClick={() => onLeadClick(lead)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Proposta Enviada Alerts */}
            {propostaAlerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-purple-600">
                  <Clock className="h-4 w-4" />
                  Proposta Enviada ({propostaAlerts.length})
                </h4>
                <div className="grid gap-2">
                  {propostaAlerts.map((lead) => (
                    <AlertLeadCard
                      key={lead.id}
                      lead={lead}
                      timeAgo={getTimeAgo(lead.updated_at)}
                      urgency={getUrgencyLevel(lead.updated_at)}
                      onClick={() => onLeadClick(lead)}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface AlertLeadCardProps {
  lead: CRMLead;
  timeAgo: string;
  urgency: 'medium' | 'high' | 'critical';
  onClick: () => void;
}

function AlertLeadCard({ lead, timeAgo, urgency, onClick }: AlertLeadCardProps) {
  const urgencyStyles = {
    medium: 'border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10',
    high: 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10',
    critical: 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10 animate-pulse',
  };

  const urgencyBadge = {
    medium: 'bg-yellow-500/20 text-yellow-600',
    high: 'bg-orange-500/20 text-orange-600',
    critical: 'bg-red-500/20 text-red-600',
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${urgencyStyles[urgency]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h5 className="font-medium text-sm truncate">{lead.name}</h5>
            <Badge className={`text-[10px] px-1.5 py-0 ${urgencyBadge[urgency]}`}>
              <Clock className="h-3 w-3 mr-1" />
              {timeAgo}
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            {lead.salesperson_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {lead.salesperson_name}
              </span>
            )}
            {lead.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {lead.phone}
              </span>
            )}
            {lead.email && (
              <span className="flex items-center gap-1 truncate max-w-[150px]">
                <Mail className="h-3 w-3" />
                {lead.email}
              </span>
            )}
          </div>
        </div>

        <Button variant="outline" size="sm" className="shrink-0 text-xs h-7">
          Atualizar
        </Button>
      </div>
    </div>
  );
}

// Helper function to check if a lead needs attention (exported for use in cards)
export function isLeadOverdue(lead: CRMLead, alertDays = 2): boolean {
  if (lead.stage !== 'coletando_informacao' && lead.stage !== 'proposta_enviada') {
    return false;
  }
  const daysSinceUpdate = differenceInDays(new Date(), new Date(lead.updated_at));
  return daysSinceUpdate >= alertDays;
}

export function getLeadOverdueDays(lead: CRMLead): number {
  return differenceInDays(new Date(), new Date(lead.updated_at));
}
