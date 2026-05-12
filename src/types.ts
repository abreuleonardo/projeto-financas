export type Category =
  | 'Lazer'
  | 'Alimentação'
  | 'Transporte'
  | 'Saúde'
  | 'Educação'
  | 'Contas'
  | 'Presentes'
  | 'Outros';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
}

export const CATEGORIES: Category[] = [
  'Contas',
  'Lazer',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Presentes',
  'Outros',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Lazer: '#8b5cf6',
  Alimentação: '#f97316',
  Transporte: '#06b6d4',
  Saúde: '#ef4444',
  Educação: '#22c55e',
  Contas: '#eab308',
  Presentes: '#f472b6',
  Outros: '#64748b',
};