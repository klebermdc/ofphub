// Salários fixos dos vendedores e equipe
export const SALESPERSON_SALARIES: Record<string, number> = {
  "Carolina": 1600,
  "Suelen": 1500,
  "Rafael": 5000,
  "Pedro": 1500,
  "Marcela": 1500,
  "Marcella": 1500,
  "Henrique TI": 500,
};

// Nomes que devem ser excluídos das listas de vendedores (parceiros/sócios)
export const EXCLUDED_NAMES = ["Site", "Renata", "Kleber"];

export const isExcludedName = (name: string): boolean => {
  const normalizedName = name.trim().toLowerCase();
  return EXCLUDED_NAMES.some(excluded => 
    normalizedName.includes(excluded.toLowerCase()) || 
    excluded.toLowerCase().includes(normalizedName)
  );
};

export const getSalary = (name: string): number => {
  // Busca o nome exato ou parcial (case insensitive)
  const normalizedName = name.trim().toLowerCase();
  
  for (const [salesperson, salary] of Object.entries(SALESPERSON_SALARIES)) {
    if (normalizedName.includes(salesperson.toLowerCase()) || 
        salesperson.toLowerCase().includes(normalizedName)) {
      return salary;
    }
  }
  
  return 0; // Retorna 0 se não encontrar
};
