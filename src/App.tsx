import { useState, useEffect, useMemo, FormEvent } from 'react';
import {
  PlusCircle,
  Wallet,
  History,
  Trash2,
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

import {
  Expense,
  Category,
  CATEGORIES,
  CATEGORY_COLORS
} from './types';

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

  const [date, setDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  const [isEditingIncome, setIsEditingIncome] = useState(false);

  useEffect(() => {
    if (income === 0) {
      setIsEditingIncome(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'finanças_renda',
      income.toString()
    );
  }, [income]);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {

    const querySnapshot = await getDocs(
      collection(db, 'expenses')
    );

    const loadedExpenses: Expense[] =
      querySnapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as Expense[];

    setExpenses(loadedExpenses);
  };

  const totalExpenses = useMemo(() =>
    expenses.reduce(
      (acc, curr) => acc + curr.amount,
      0
    ), [expenses]
  );

  const balance = income - totalExpenses;

  const categoryData = useMemo(() => {

    const data = CATEGORIES.map((cat) => {

      const sum = expenses
        .filter((e) => e.category === cat)
        .reduce((acc, curr) => acc + curr.amount, 0);

      return {
        name: cat,
        value: sum,
      };

    }).filter((d) => d.value > 0);

    return data;

  }, [expenses]);

  const topCategory = useMemo(() => {

    if (categoryData.length === 0) {
      return null;
    }

    return [...categoryData]
      .sort((a, b) => b.value - a.value)[0];

  }, [categoryData]);

  const handleAddExpense = async (
    e: FormEvent
  ) => {

    e.preventDefault();

    if (
      !description ||
      !amount ||
      parseFloat(amount) <= 0
    ) return;

    const newExpense = {
      description,
      amount: parseFloat(amount),
      category,
      date,
    };

    const docRef = await addDoc(
      collection(db, 'expenses'),
      newExpense
    );

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

  const removeExpense = async (
    id: string
  ) => {

    await deleteDoc(
      doc(db, 'expenses', id)
    );

    setExpenses(
      expenses.filter((e) => e.id !== id)
    );
  };

  return (

    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 p-4 md:p-8">

      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <header className="bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row items-center justify-between px-8 py-6 shadow-sm gap-6">

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

            {/* SALÁRIO */}
            <div className="flex flex-col items-end">

              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Salário Mensal
              </span>

              {isEditingIncome ? (

                <div className="flex items-center gap-2">

                  <input
                    autoFocus
                    type="number"
                    className="w-28 bg-transparent border-b border-indigo-600 outline-none font-bold text-lg text-slate-700"
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

                  <button className="p-1 text-slate-400 group-hover:text-indigo-600 transition-colors">
                    <PlusCircle className="h-4 w-4" />
                  </button>

                </div>

              )}

            </div>

            <div className="hidden md:block h-10 w-[1px] bg-slate-200"></div>

            {/* SALDO */}
            <div className="text-right">

              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Saldo Restante
              </span>

              <div
                className={`text-2xl font-black ${
                  balance >= 0
                    ? 'text-indigo-600'
                    : 'text-orange-600'
                }`}
              >
                {formatCurrency(balance)}
              </div>

            </div>

          </div>

        </header>

        {/* GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* FORM */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

            <h2 className="text-xl font-bold mb-5">
              Adicionar Despesa
            </h2>

            <form
              onSubmit={handleAddExpense}
              className="space-y-4"
            >

              <input
                type="text"
                placeholder="Descrição"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-indigo-500"
              />

              <input
                type="number"
                placeholder="Valor"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-indigo-500"
              />

              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value as Category
                  )
                }
                className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-indigo-500"
              >

                {CATEGORIES.map((cat) => (

                  <option
                    key={cat}
                    value={cat}
                  >
                    {cat}
                  </option>

                ))}

              </select>

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(e.target.value)
                }
                className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-indigo-500"
              />

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
              >
                Adicionar Gasto
              </button>

            </form>

          </div>

          {/* GRÁFICO */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

            <h2 className="text-xl font-bold mb-5">
              Resumo Financeiro
            </h2>

            <div className="h-[300px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                  >

                    {categoryData.map(
                      (entry, index) => (

                        <Cell
                          key={index}
                          fill={
                            CATEGORY_COLORS[
                            entry.name as Category
                            ]
                          }
                        />

                      )
                    )}

                  </Pie>

                  <Tooltip />

                </PieChart>

              </ResponsiveContainer>

            </div>

            {topCategory && (

              <div className="mt-4 text-center">

                <p className="text-slate-400 text-sm">
                  Categoria com mais gastos
                </p>

                <h3 className="text-lg font-bold">
                  {topCategory.name}
                </h3>

              </div>

            )}

          </div>

        </div>

        {/* HISTÓRICO */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

          <div className="flex items-center gap-2 mb-6">

            <History className="w-5 h-5 text-indigo-600" />

            <h2 className="text-xl font-bold">
              Histórico de Gastos
            </h2>

          </div>

          <div className="space-y-4">

            <AnimatePresence>

              {expenses.map((expense) => (

                <motion.div
                  key={expense.id}
                  initial={{
                    opacity: 0,
                    y: 10
                  }}
                  animate={{
                    opacity: 1,
                    y: 0
                  }}
                  exit={{
                    opacity: 0
                  }}
                  className="flex items-center justify-between border border-slate-200 rounded-xl p-4"
                >

                  <div>

                    <h3 className="font-semibold">
                      {expense.description}
                    </h3>

                    <p className="text-sm text-slate-400">

                      {expense.category} • {' '}

                      {format(
                        parseISO(expense.date),
                        "dd 'de' MMMM",
                        { locale: ptBR }
                      )}

                    </p>

                  </div>

                  <div className="flex items-center gap-4">

                    <span className="font-bold text-orange-600">
                      - {formatCurrency(expense.amount)}
                    </span>

                    <button
                      onClick={() =>
                        removeExpense(expense.id)
                      }
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                  </div>

                </motion.div>

              ))}

            </AnimatePresence>

          </div>

        </div>

        {/* FOOTER */}
        <footer className="text-center py-6">

          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-sm">

            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>

            <p className="text-sm text-slate-500">
              Criado por{' '}
              <span className="font-bold text-indigo-600">
                Leonardo Abreu
              </span>
            </p>

          </div>

        </footer>

      </div>

    </div>

  );
}