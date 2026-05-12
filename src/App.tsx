import { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  PlusCircle, 
  Wallet, 
  TrendingDown, 
  TrendingUp, 
  PieChart as PieChartIcon, 
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
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, Category, CATEGORIES, CATEGORY_COLORS } from './types';

// Utils
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

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('finanças_gastos');
    return saved ? JSON.parse(saved) : [];
  });

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Lazer');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isEditingIncome, setIsEditingIncome] = useState(false);

  // Initialize editing income if it's 0
  useEffect(() => {
    if (income === 0) setIsEditingIncome(true);
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('finanças_renda', income.toString());
  }, [income]);

  useEffect(() => {
    localStorage.setItem('finanças_gastos', JSON.stringify(expenses));
  }, [expenses]);

  // Derived stats
  const totalExpenses = useMemo(() => 
    expenses.reduce((acc, curr) => acc + curr.amount, 0), [expenses]);
  
  const balance = income - totalExpenses;

  const categoryData = useMemo(() => {
    const data = CATEGORIES.map(cat => {
      const sum = expenses
        .filter(e => e.category === cat)
        .reduce((acc, curr) => acc + curr.amount, 0);
      return { name: cat, value: sum };
    }).filter(d => d.value > 0);
    return data;
  }, [expenses]);

  const topCategory = useMemo(() => {
    if (categoryData.length === 0) return null;
    return [...categoryData].sort((a, b) => b.value - a.value)[0];
  }, [categoryData]);

  const handleAddExpense = (e: FormEvent) => {
    e.preventDefault();
    if (!description || !amount || parseFloat(amount) <= 0) return;

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      description,
      amount: parseFloat(amount),
      category,
      date,
    };

    setExpenses([newExpense, ...expenses]);
    setDescription('');
    setAmount('');
  };

  const exportExpensesToCSV = () => {
    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      ['Data', 'Descrição', 'Categoria', 'Valor'],
      ...expenses.map(expense => [
        format(parseISO(expense.date), 'dd/MM/yyyy'),
        expense.description,
        expense.category,
        expense.amount.toFixed(2),
      ]),
    ];

    const csvContent = rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gastos_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generatePdfReport = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(18);
    doc.text('Relatório de Gastos', 40, 50);
    doc.setFontSize(11);
    doc.text(`Data do relatório: ${format(new Date(), 'dd/MM/yyyy')}`, 40, 70);
    doc.text(`Renda Mensal: ${formatCurrency(income)}`, 40, 86);
    doc.text(`Total Gastos: ${formatCurrency(totalExpenses)}`, 40, 102);
    doc.text(`Saldo Restante: ${formatCurrency(balance)}`, 40, 118);

    const body = expenses.map(expense => [
      format(parseISO(expense.date), 'dd/MM/yyyy'),
      expense.description,
      expense.category,
      formatCurrency(expense.amount),
    ]);

    autoTable(doc, {
      startY: 140,
      head: [['Data', 'Descrição', 'Categoria', 'Valor']],
      body,
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      columnStyles: { 3: { halign: 'right' } },
      theme: 'striped',
    });

    doc.save(`relatorio_gastos_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row items-center justify-between px-8 py-6 shadow-sm shrink-0 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">Controle de Gastos</h1>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Dashboard Financeiro</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Salário Mensal</span>
              {isEditingIncome ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="number"
                    className="w-24 bg-transparent border-b border-indigo-600 outline-none font-bold text-lg text-slate-700"
                    value={income || ''}
                    onChange={(e) => setIncome(Number(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingIncome(false)}
                  />
                  <button onClick={() => setIsEditingIncome(false)} className="text-indigo-600"><ArrowRight className="w-4 h-4"/></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingIncome(true)}>
                  <span className="text-lg font-bold text-slate-700">{formatCurrency(income)}</span>
                  <button className="p-1 text-slate-400 group-hover:text-indigo-600 motion-safe:transition-colors">
                    <PlusCircle className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="hidden md:block h-10 w-[1px] bg-slate-200"></div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Saldo Restante</span>
              <div className={`text-2xl font-black ${balance >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
                {formatCurrency(balance)}
              </div>
            </div>
          </div>
        </header>

        {/* Info Grid (Optional but enhanced for UX) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div whileHover={{ y: -2 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600"><TrendingUp className="w-6 h-6"/></div>
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Renda</p>
               <p className="text-lg font-bold text-slate-800">{formatCurrency(income)}</p>
             </div>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><TrendingDown className="w-6 h-6"/></div>
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gastos</p>
               <p className="text-lg font-bold text-slate-800">{formatCurrency(totalExpenses)}</p>
             </div>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><Trophy className="w-6 h-6"/></div>
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destaque</p>
               <p className="text-lg font-bold text-slate-800 truncate max-w-[120px]">{topCategory?.name || 'N/A'}</p>
             </div>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><History className="w-6 h-6"/></div>
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registros</p>
               <p className="text-lg font-bold text-slate-800">{expenses.length}</p>
             </div>
          </motion.div>
        </div>

        {/* Main Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form & History */}
          <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-8">
            
            {/* List / Table Area */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-bold text-slate-700 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600"/> Registro de Gastos
                </h2>
                <div className="flex gap-2 items-center">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{expenses.length} itens</span>
                </div>
              </div>
              
              <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100 bg-white">
                      <th className="px-8 py-4 font-bold border-b border-slate-100">Data</th>
                      <th className="px-8 py-4 font-bold border-b border-slate-100">Descrição</th>
                      <th className="px-8 py-4 font-bold border-b border-slate-100">Categoria</th>
                      <th className="px-8 py-4 font-bold border-b border-slate-100 text-right">Valor</th>
                      <th className="px-4 py-4 font-bold border-b border-slate-100 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-slate-600 divide-y divide-slate-50">
                    {/* Inline Form Row */}
                    <tr className="bg-indigo-50/20 border-y border-indigo-100">
                      <td className="px-8 py-4">
                        <input 
                          type="date"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-full text-xs outline-none focus:ring-1 ring-indigo-300"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </td>
                      <td className="px-8 py-4">
                        <input 
                          type="text"
                          placeholder="Descrição..."
                          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-full text-xs outline-none focus:ring-1 ring-indigo-300"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </td>
                      <td className="px-8 py-4">
                        <select 
                          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-full text-xs outline-none focus:ring-1 ring-indigo-300"
                          value={category}
                          onChange={(e) => setCategory(e.target.value as Category)}
                        >
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <input 
                            type="number"
                            placeholder="0,00"
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-24 text-right text-xs outline-none focus:ring-1 ring-indigo-300 font-mono"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button 
                          onClick={handleAddExpense}
                          className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 motion-safe:transition-all active:scale-95"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    <AnimatePresence mode="popLayout">
                      {expenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center text-slate-400">
                            <History className="w-12 h-12 mx-auto mb-4 opacity-5" />
                            <p className="text-sm font-medium">Nenhum gasto registrado ainda.</p>
                          </td>
                        </tr>
                      ) : (
                        expenses.map((expense) => (
                          <motion.tr 
                            key={expense.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            layout
                            className="hover:bg-slate-50 transition-colors group"
                            id={`expense-${expense.id}`}
                          >
                            <td className="px-8 py-4 text-slate-500 font-medium">
                              {format(parseISO(expense.date), "dd/MM/yyyy")}
                            </td>
                            <td className="px-8 py-4 font-medium text-slate-800">{expense.description}</td>
                            <td className="px-8 py-4">
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold border shadow-xs" style={{ backgroundColor: `${CATEGORY_COLORS[expense.category]}15`, color: CATEGORY_COLORS[expense.category], borderColor: `${CATEGORY_COLORS[expense.category]}30` }}>
                                {expense.category.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-right">
                              <span className="font-mono font-bold text-slate-700">
                                - {formatCurrency(expense.amount)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <button 
                                onClick={() => removeExpense(expense.id)}
                                className="p-2 text-slate-300 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Right Column: Analytics */}
          <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-8">
            
            {/* Insight Card */}
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-6">Destaque do Mês</h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                   {balance >= 0 ? <Trophy className="h-6 w-6"/> : <TrendingDown className="h-6 w-6"/>}
                </div>
                <div>
                  <div className="text-xs text-slate-500">Maior Gasto</div>
                  <div className="text-lg font-bold text-slate-800">{topCategory?.name || 'Nenhum'}</div>
                  {income > 0 && topCategory && (
                    <div className="text-xs text-orange-600 font-bold uppercase tracking-tight">
                      {((topCategory.value / totalExpenses) * 100).toFixed(0)}% do total gasto
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Pie Chart Analysis */}
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-8">Distribuição de Gastos</h3>
              
              <div className="h-[280px] w-full relative">
                {categoryData.length > 0 ? (
                  <div className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {categoryData.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={CATEGORY_COLORS[entry.name as Category]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontFamily: 'inherit', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Gasto</span>
                      <span className="text-2xl font-black text-slate-800">{formatCurrency(totalExpenses).replace('R$', '').trim()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 italic text-sm">
                    Aguardando lançamentos...
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-3">
                {categoryData.map(item => (
                  <div key={item.name} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.name as Category] }}></div>
                       <span className="text-slate-600 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </div>
      
      {/* Footer / Status Bar */}
      <footer className="mt-16 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm max-w-7xl mx-auto">
        <div className="text-[11px] text-slate-400 italic font-medium">
          Economia este mês: 
          <span className={`${balance >= 0 ? 'text-emerald-500' : 'text-orange-500'} font-bold tracking-tight ml-1`}>
            {balance >= 0 ? '+' : ''} {formatCurrency(balance)} 
            {income > 0 && ` (${((balance / income) * 100).toFixed(0)}% do salário)`}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={generatePdfReport}
            className="bg-indigo-600 text-white px-4 py-2 rounded-2xl hover:bg-indigo-700 transition-colors"
          >
            Exportar PDF
          </button>
          <button
            type="button"
            onClick={exportExpensesToCSV}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-2xl hover:bg-slate-200 transition-colors"
          >
            Exportar CSV
          </button>
        </div>
        <div className="flex items-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${balance >= 0 ? 'bg-emerald-500' : 'bg-orange-500'} animate-pulse`}></div>
            Sincronizado Localmente
          </span>
          <span>{format(new Date(), 'MMM yyyy', { locale: ptBR })}</span>
        </div>
      </footer>
    </div>
  );
}
