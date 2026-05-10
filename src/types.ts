export type Category = 'Lazer' | 'Contas' | 'Presentes' | 'Saúde' | 'Transporte' | 'Alimentação' | 'Outros';

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: Category;
  amount: number;
}

export interface FinancialData {
  monthlyIncome: number;
  expenses: Expense[];
}

export const CATEGORIES: Category[] = [
  'Contas',
  'Alimentação',
  'Transporte',
  'Lazer',
  'Saúde',
  'Presentes',
  'Outros'
];

export const CATEGORY_COLORS: Record<Category, string> = {
  'Contas': '#f59e0b', // orange
  'Alimentação': '#fbbf24', // amber
  'Transporte': '#6366f1', // indigo
  'Lazer': '#10b981', // emerald
  'Saúde': '#06b6d4', // cyan
  'Presentes': '#ec4899', // pink
  'Outros': '#94a3b8', // slate
};
