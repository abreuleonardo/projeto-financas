export type Category =
  | 'Lazer'
  | 'Alimentação'
  | 'Transporte'
  | 'Saúde'
  | 'Educação'
  | 'Contas'
  | 'Outros';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
}

export const CATEGORIES: Category[] = [
  'Lazer',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Contas',
  'Outros',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Lazer: '#8b5cf6',
  Alimentação: '#f97316',
  Transporte: '#06b6d4',
  Saúde: '#ef4444',
  Educação: '#22c55e',
  Contas: '#eab308',
  Outros: '#64748b',
};