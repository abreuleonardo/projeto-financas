import { useState, useEffect, useMemo, FormEvent } from 'react';
import {
  PlusCircle,
  Wallet,
  TrendingDown,
  TrendingUp,
  History,
  Trash2,
  Trophy,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Expense, Category, CATEGORIES, CATEGORY_COLORS } from './types';

import { db } from './firebase';

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function App() {
  const [income, setIncome] = useState<number>(() => {
    const saved = localStorage.getItem('finanças_renda');
    return saved ? Number(saved) : 0;
  });

  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Lazer');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isEditingIncome, setIsEditingIncome] = useState(false);

  useEffect(() => {
    if (income === 0) setIsEditingIncome(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('finanças_renda', income.toString());
  }, [income]);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    const querySnapshot = await getDocs(collection(db, 'expenses'));

    const loadedExpenses: Expense[] = querySnapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    })) as Expense[];

    setExpenses(loadedExpenses);
  };

  const totalExpenses = useMemo(() =>
    expenses.reduce((acc, curr) => acc + curr.amount, 0), [expenses]);

  const balance = income - totalExpenses;

  const categoryData = useMemo(() => {
    const data = CATEGORIES.map(cat => {
      const sum = expenses
        .filter(e => e.category === cat)
        .reduce((acc, curr) => acc + curr.amount, 0);

      return {
        name: cat,
        value: sum
      };
    }).filter(d => d.value > 0);

    return data;
  }, [expenses]);

  const topCategory = useMemo(() => {
    if (categoryData.length === 0) return null;

    return [...categoryData].sort((a, b) => b.value - a.value)[0];
  }, [categoryData]);

  const handleAddExpense = async (e: FormEvent) => {
    e.preventDefault();

    if (!description || !amount || parseFloat(amount) <= 0) return;

    const newExpense = {
      description,
      amount: parseFloat(amount),
      category,
      date,
    };

    const docRef = await addDoc(collection(db, 'expenses'), newExpense);

    setExpenses([
      {
        id: docRef.id,
        ...newExpense,
      },
      ...expenses,
    ]);

    setDescription('');
    setAmount('');
  };

  const removeExpense = async (id: string) => {
    await deleteDoc(doc(db, 'expenses', id));

    setExpenses(expenses.filter((e) => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        <header className="bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row items-center justify-between px-8 py-6 shadow-sm shrink-0 gap-6">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Wallet className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">
                Controle hoje. Conquiste amanhã.
              </h1>

              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Dashboard Financeiro
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">

            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Salário Mensal
              </span>

              {isEditingIncome ? (
                <div className="flex items-center gap-2">

                  <input
                    autoFocus
                    type="number"
                    className="w-24 bg-transparent border-b border-indigo-600 outline-none font-bold text-lg text-slate-700"
                    value={income === 0 ? '' : income}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value === '') {
                        setIncome(0);
                        return;
                      }

                      setIncome(Number(value));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsEditingIncome(false);
                      }
                    }}
                  />

                  <button
                    onClick={() => setIsEditingIncome(false)}
                    className="text-indigo-600"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>

                </div>
              ) : (
                <div
                  className="flex items-center gap-2 group cursor-pointer"
                  onClick={() => setIsEditingIncome(true)}
                >
                  <span className="text-lg font-bold text-slate-700">
                    {formatCurrency(income)}
                  </span>

                  <button className="p-1 text-slate-400 group-hover:text-indigo-600 motion-safe:transition-colors">
                    <PlusCircle className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="hidden md:block h-10 w-[1px] bg-slate-200"></div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Saldo Restante
              </span>

              <div
                className={`text-2xl font-black ${balance >= 0
                    ? 'text-indigo-600'
                    : 'text-orange-600'
                  }`}
              >
                {formatCurrency(balance)}
              </div>
            </div>

          </div>
        </header>

      </div>
    </div>
  );
}