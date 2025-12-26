/**
 * Utility functions for data validation
 */

import { z } from 'zod';

// ===== Zod Schemas =====

export const OrderSchema = z.object({
  cliente: z.string().optional().nullable(),
  data: z.string(),
  pedido: z.string().optional().nullable(),
  fornecedor: z.string().optional().nullable(),
  produto: z.string().optional().nullable(),
  venda: z.number().default(0),
  comissao: z.number().default(0),
  comissaoTotal: z.number().default(0),
  porcentagemVendedor: z.number().default(0),
  comissaoVendedor: z.number().default(0),
});

export const SalesRepSchema = z.object({
  id: z.string(),
  name: z.string(),
  sales: z.number().default(0),
  commission: z.number().default(0),
  deals: z.number().default(0),
  rate: z.number().default(0),
  orders: z.array(OrderSchema).optional(),
});

export const SalesTotalsSchema = z.object({
  totalVendas: z.number().default(0),
  totalComissao: z.number().default(0),
  totalNegocios: z.number().default(0),
  taxaMedia: z.number().default(0),
  vendedoresAtivos: z.number().default(0),
});

// ===== Type exports =====
export type ValidatedOrder = z.infer<typeof OrderSchema>;
export type ValidatedSalesRep = z.infer<typeof SalesRepSchema>;
export type ValidatedSalesTotals = z.infer<typeof SalesTotalsSchema>;

// ===== Validation functions =====

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Brazilian format)
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
}

/**
 * Validate CPF
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[10])) return false;
  
  return true;
}

/**
 * Validate CNPJ
 */
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleaned[12])) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cleaned[13])) return false;
  
  return true;
}

/**
 * Validate Google Sheets URL
 */
export function isValidGoogleSheetsUrl(url: string): boolean {
  return url.includes('docs.google.com/spreadsheets') || 
         url.includes('sheets.google.com');
}

/**
 * Sanitize string by removing control characters
 */
export function sanitizeString(str: string, maxLength: number = 500): string {
  return str
    .substring(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Validate positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && !isNaN(value);
}
