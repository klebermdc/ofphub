import { Search, Filter, Users, Package, Calendar, Columns } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CRMStage } from '@/hooks/useCRMLeads';

const STAGES: { id: CRMStage | 'all'; title: string }[] = [
  { id: 'all', title: 'Todos os Estágios' },
  { id: 'novo_lead', title: 'Novo Lead' },
  { id: 'coletando_informacao', title: 'Coletando Informação' },
  { id: 'proposta_enviada', title: 'Proposta Enviada' },
  { id: 'venda_concluida', title: 'Venda Concluída' },
  { id: 'venda_perdida', title: 'Venda Perdida' },
];

interface CRMFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStage: CRMStage | 'all';
  onStageChange: (value: CRMStage | 'all') => void;
  selectedSalesperson: string;
  onSalespersonChange: (value: string) => void;
  selectedProduct: string;
  onProductChange: (value: string) => void;
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  salespeople: string[];
  products: string[];
  months: string[];
  showSalespersonFilter?: boolean;
}

export function CRMFilters({
  searchTerm,
  onSearchChange,
  selectedStage,
  onStageChange,
  selectedSalesperson,
  onSalespersonChange,
  selectedProduct,
  onProductChange,
  selectedMonth,
  onMonthChange,
  salespeople,
  products,
  months,
  showSalespersonFilter = true,
}: CRMFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email, telefone..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stage Filter */}
      <Select value={selectedStage} onValueChange={(v) => onStageChange(v as CRMStage | 'all')}>
        <SelectTrigger className="w-[180px]">
          <Columns className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Estágio" />
        </SelectTrigger>
        <SelectContent>
          {STAGES.map((stage) => (
            <SelectItem key={stage.id} value={stage.id}>
              {stage.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Salesperson Filter */}
      {showSalespersonFilter && (
        <Select value={selectedSalesperson} onValueChange={onSalespersonChange}>
          <SelectTrigger className="w-[180px]">
            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Vendedores</SelectItem>
            {salespeople.map((sp) => (
              <SelectItem key={sp} value={sp}>
                {sp}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Product Filter */}
      <Select value={selectedProduct} onValueChange={onProductChange}>
        <SelectTrigger className="w-[180px]">
          <Package className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Produto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Produtos</SelectItem>
          {products.map((prod) => (
            <SelectItem key={prod} value={prod}>
              {prod}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Month Filter */}
      <Select value={selectedMonth} onValueChange={onMonthChange}>
        <SelectTrigger className="w-[160px]">
          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Meses</SelectItem>
          {months.map((month) => (
            <SelectItem key={month} value={month}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
