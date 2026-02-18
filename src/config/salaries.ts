// Mapeamento de email → nome amigável dos vendedores
export const SALESPERSON_EMAIL_MAP: Record<string, string> = {
  "vendas@orlandofastpass.com.br": "Carolina",
  "gabriela@orlandofastpass.com.br": "Gabriela",
  "atendimento@orlandofastpass.com.br": "Kleber Augusto",
  "marcella@orlandofastpass.com.br": "Marcella",
  "pedro@orlandofastpass.com.br": "Pedro",
  "marketing@orlandofastpass.com.br": "Rafael",
  "contato@orlandofastpass.com.br": "Renata Santos",
  "comercial@orlandofastpass.com.br": "Suelen",
};

/**
 * Resolve o nome amigável de um vendedor a partir do email ou nome.
 * Se já for um nome conhecido, retorna ele mesmo.
 */
export const resolveSalespersonName = (nameOrEmail: string): string => {
  const trimmed = nameOrEmail.trim();
  const lower = trimmed.toLowerCase();
  
  // Check direct email mapping
  for (const [email, name] of Object.entries(SALESPERSON_EMAIL_MAP)) {
    if (lower === email.toLowerCase()) {
      return name;
    }
  }
  
  return trimmed;
};

// Salários fixos dos vendedores e equipe
export const SALESPERSON_SALARIES: Record<string, number> = {
  "Carolina": 1600,
  "Suelen": 1500,
  "Rafael": 5000,
  "Pedro": 1500,
  "Marcella": 1500,
  "Henrique TI": 500,
};

// Nomes que devem ser excluídos das listas de vendedores (parceiros/sócios)
export const EXCLUDED_NAMES = ["Site", "Renata", "Kleber", "contato@orlandofastpass.com.br", "atendimento@orlandofastpass.com.br"];

export const isExcludedName = (name: string): boolean => {
  const resolved = resolveSalespersonName(name);
  const normalizedName = resolved.trim().toLowerCase();
  return EXCLUDED_NAMES.some(excluded => {
    const resolvedExcluded = resolveSalespersonName(excluded).toLowerCase();
    return normalizedName.includes(resolvedExcluded) || 
           resolvedExcluded.includes(normalizedName) ||
           normalizedName.includes(excluded.toLowerCase()) ||
           excluded.toLowerCase().includes(normalizedName);
  });
};

export const getSalary = (name: string): number => {
  const resolved = resolveSalespersonName(name);
  const normalizedName = resolved.trim().toLowerCase();
  
  for (const [salesperson, salary] of Object.entries(SALESPERSON_SALARIES)) {
    if (normalizedName.includes(salesperson.toLowerCase()) || 
        salesperson.toLowerCase().includes(normalizedName)) {
      return salary;
    }
  }
  
  return 0;
};
