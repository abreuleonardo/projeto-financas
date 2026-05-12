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

import { format, parseISO, isSameDay, isSameMonth, isSameYear, getMonth, getQuarter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const getPeriodReport = (
  expenses: Expense[],
  filterFn: (expense: Expense) => boolean
) => {
  const filtered = expenses.filter(filterFn);
  const total = filtered.reduce((acc, curr) => acc + curr.amount, 0);
  const categoryTotals = CATEGORIES.map((cat) => ({
    category: cat,
    amount: filtered
      .filter((expense) => expense.category === cat)
      .reduce((acc, curr) => acc + curr.amount, 0),
  })).filter((item) => item.amount > 0);

  const topCategory = categoryTotals.length === 0
    ? null
    : [...categoryTotals].sort((a, b) => b.amount - a.amount)[0].category;

  return {
    total,
    topCategory,
    categoryTotals,
  };
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

  const periodSummary = useMemo(() => {
    const now = new Date();

    return {
      daily: getPeriodReport(expenses, (expense) =>
        isSameDay(parseISO(expense.date), now)
      ),
      monthly: getPeriodReport(expenses, (expense) =>
        isSameMonth(parseISO(expense.date), now)
      ),
      quarterly: getPeriodReport(expenses, (expense) => {
        const date = parseISO(expense.date);
        return (
          isSameYear(date, now) &&
          getQuarter(date) === getQuarter(now)
        );
      }),
      semestral: getPeriodReport(expenses, (expense) => {
        const date = parseISO(expense.date);
        const month = getMonth(date);
        const currentMonth = getMonth(now);
        const sameHalf =
          (currentMonth < 6 && month < 6) ||
          (currentMonth >= 6 && month >= 6);
        return isSameYear(date, now) && sameHalf;
      }),
      annual: getPeriodReport(expenses, (expense) =>
        isSameYear(parseISO(expense.date), now)
      ),
    };
  }, [expenses]);

  const escapeCsvValue = (value: string) => {
    return `"${value.replace(/"/g, '""')}"`;
  };

  const handleExportCsv = () => {
    const csvHeader = ['Descrição', 'Valor', 'Categoria', 'Data'];
    const rows = expenses.map((expense) => [
      escapeCsvValue(expense.description),
      expense.amount.toFixed(2).replace('.', ','),
      escapeCsvValue(expense.category),
      escapeCsvValue(format(parseISO(expense.date), 'dd/MM/yyyy')),
    ]);

    const csvContent = [csvHeader, ...rows]
      .map((row) => row.join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gastos_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const drawCategoryChart = (
    doc: jsPDF,
    chartData: { name: string; value: number }[],
    startY: number
  ) => {
    if (chartData.length === 0) {
      doc.text('Nenhum dado de categoria disponível para o gráfico.', 40, startY);
      return startY + 30;
    }

    const maxValue = Math.max(...chartData.map((item) => item.value), 1);
    const barWidthMax = 420;
    const barHeight = 16;
    const gap = 18;
    let cursorY = startY;

    chartData.forEach((item) => {
      const normalizedWidth = (item.value / maxValue) * barWidthMax;
      const color = CATEGORY_COLORS[item.name as Category] || '#64748b';

      doc.setFillColor(color);
      doc.rect(130, cursorY - barHeight + 4, normalizedWidth, barHeight, 'F');
      doc.setFontSize(10);
      doc.setTextColor('#111827');
      doc.text(
        `${item.name} (${formatCurrency(item.value)})`,
        40,
        cursorY + 4
      );
      cursorY += barHeight + gap;
    });

    return cursorY;
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(18);
    doc.text('Relatório de Gastos', 40, 40);
    doc.setFontSize(11);
    doc.text(
      `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      40,
      60
    );

    autoTable(doc, {
      startY: 85,
      head: [[
        'Período',
        'Total',
        'Categoria principal'
      ]],
      body: [
        [
          'Diário',
          formatCurrency(periodSummary.daily.total),
          periodSummary.daily.topCategory ?? 'Nenhuma'
        ],
        [
          'Mensal',
          formatCurrency(periodSummary.monthly.total),
          periodSummary.monthly.topCategory ?? 'Nenhuma'
        ],
        [
          'Trimestral',
          formatCurrency(periodSummary.quarterly.total),
          periodSummary.quarterly.topCategory ?? 'Nenhuma'
        ],
        [
          'Semestral',
          formatCurrency(periodSummary.semestral.total),
          periodSummary.semestral.topCategory ?? 'Nenhuma'
        ],
        [
          'Anual',
          formatCurrency(periodSummary.annual.total),
          periodSummary.annual.topCategory ?? 'Nenhuma'
        ],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 10,
        cellPadding: 6,
      },
    });

    const chartStartY = (doc as any).lastAutoTable?.finalY ?? 180;
    doc.setFontSize(12);
    doc.text('Gastos por categoria', 40, chartStartY + 30);

    const chartEndY = drawCategoryChart(
      doc,
      categoryData,
      chartStartY + 50
    );

    if (chartEndY > 700) {
      doc.addPage();
    }

    doc.save(`relatorio_gastos_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
  };

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

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Exportar relatórios
            </h2>
            <p className="text-sm text-slate-500">
              Gere um PDF com os períodos diário, mensal, trimestral, semestral e anual, ou baixe uma planilha CSV.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportPdf}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors"
            >
              Gerar PDF
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-white font-semibold hover:bg-slate-700 transition-colors"
            >
              Exportar CSV
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="flex justify-center pt-6">

          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-3">

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