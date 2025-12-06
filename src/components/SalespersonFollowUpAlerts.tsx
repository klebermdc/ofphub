import { useState, useEffect } from 'react';
import { Bell, Phone, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  product: string | null;
  follow_up_date: string;
  stage: string;
}

interface SalespersonFollowUpAlertsProps {
  salespersonName: string;
}

export function SalespersonFollowUpAlerts({ salespersonName }: SalespersonFollowUpAlertsProps) {
  const [todayLeads, setTodayLeads] = useState<Lead[]>([]);
  const [overdueLeads, setOverdueLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFollowUps();
  }, [salespersonName]);

  const loadFollowUps = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('crm_leads')
        .select('id, name, phone, product, follow_up_date, stage')
        .ilike('salesperson_name', `%${salespersonName}%`)
        .not('follow_up_date', 'is', null)
        .not('stage', 'in', '("venda_concluida","venda_perdida")');

      if (error) throw error;

      const leads = data || [];
      const todayStart = startOfDay(new Date());
      
      const todayList: Lead[] = [];
      const overdueList: Lead[] = [];

      leads.forEach(lead => {
        if (!lead.follow_up_date) return;
        const followUpDate = new Date(lead.follow_up_date);
        
        if (isToday(followUpDate)) {
          todayList.push(lead);
        } else if (isBefore(followUpDate, todayStart)) {
          overdueList.push(lead);
        }
      });

      setTodayLeads(todayList);
      setOverdueLeads(overdueList);
    } catch (err) {
      console.error('Error loading follow-ups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      'novo_lead': 'Novo Lead',
      'coletando_informacao': 'Coletando Info',
      'proposta_enviada': 'Proposta Enviada'
    };
    return labels[stage] || stage;
  };

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-6 animate-pulse">
        <div className="h-20 bg-muted/20 rounded" />
      </div>
    );
  }

  const totalAlerts = todayLeads.length + overdueLeads.length;

  if (totalAlerts === 0) {
    return null;
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-warning/20 relative">
          <Bell className="h-5 w-5 text-warning" />
          {totalAlerts > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
              {totalAlerts}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-semibold">Follow-ups do Dia</h3>
          <p className="text-xs text-muted-foreground">Leads que precisam de contato</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Overdue leads */}
        {overdueLeads.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-destructive flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Atrasados ({overdueLeads.length})
            </div>
            {overdueLeads.map(lead => (
              <div 
                key={lead.id}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{lead.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded bg-muted/50 text-xs">
                      {getStageLabel(lead.stage)}
                    </span>
                  </div>
                  {lead.product && (
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      {lead.product}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Today's leads */}
        {todayLeads.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-warning flex items-center gap-1">
              <Bell className="h-3 w-3" />
              Para Hoje ({todayLeads.length})
            </div>
            {todayLeads.map(lead => (
              <div 
                key={lead.id}
                className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{lead.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded bg-muted/50 text-xs">
                      {getStageLabel(lead.stage)}
                    </span>
                  </div>
                  {lead.product && (
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      {lead.product}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
