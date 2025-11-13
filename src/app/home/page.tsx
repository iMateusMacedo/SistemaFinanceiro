'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const PieChartComponent = dynamic(() => import('@/components/PieChart'), { ssr: false });
import { useOutsideAlerter } from '@/hooks/useOutsideAlerter';

// Interfaces para os dados da API
interface ApiTransaction {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  isRecurring: boolean;
  type: 'INCOME' | 'EXPENSE';
}

interface User {
  fullName: string;
  email: string;
  balance: number;
}

export default function HomePage() {
  const router = useRouter();
  
  // Estados para dados do backend
  const [user, setUser] = useState<User | null>(null);
  const [mainBalance, setMainBalance] = useState(0);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);

  // Estados para os campos de input do formulário
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [isRecurring, setIsRecurring] = useState(false);

  // Estados para controle da UI
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isAddingBalance, setIsAddingBalance] = useState(false);
  const [balanceToAdd, setBalanceToAdd] = useState('');
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [isEarningsChartOpen, setIsEarningsChartOpen] = useState(false);
  const [isDebtsChartOpen, setIsDebtsChartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null); // Novo estado para hover
  const [longPressedItemId, setLongPressedItemId] = useState<number | null>(null); // Novo estado para long press
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const [showConfirmDeletePopup, setShowConfirmDeletePopup] = useState(false); // Novo estado para o popup de confirmação
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null); // ID da transação a ser deletada

  // Refs para popups
  const addBalancePopupRef = useRef(null);
  const earningsChartPopupRef = useRef(null);
  const debtsChartPopupRef = useRef(null);
  const addTransactionPopupRef = useRef(null);

  // Efeito para definir a data inicial apenas no cliente para evitar erro de hidratação
  useEffect(() => {
    const today = new Date();
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  }, []);

  // Função para buscar dados da API
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions');
      if (!res.ok) {
        // Se o token for inválido ou expirado, o middleware retorna 401
        if (res.status === 401) {
          router.push('/'); // Redireciona para o login
        }
        throw new Error('Falha ao buscar dados');
      }
      const data = await res.json();
      setUser(data.user);
      setMainBalance(parseFloat(data.user.totalBalance));
      setTransactions(data.transactions);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Efeito para buscar dados no carregamento do componente
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Hooks para fechar popups
  useOutsideAlerter(addBalancePopupRef, () => setIsAddingBalance(false));
  useOutsideAlerter(earningsChartPopupRef, () => setIsEarningsChartOpen(false));
  useOutsideAlerter(debtsChartPopupRef, () => setIsDebtsChartOpen(false));
  useOutsideAlerter(addTransactionPopupRef, () => setIsAddingTransaction(false));

  // Lógica para filtrar transações por mês/ano
  const { filteredEarnings, filteredDebts } = useMemo(() => {
    if (selectedMonth === null || selectedYear === null) {
      return { filteredEarnings: [], filteredDebts: [] };
    }
    const earnings = transactions.filter(t => t.type === 'INCOME');
    const debts = transactions.filter(t => t.type === 'EXPENSE');

    const filterByDate = (items: ApiTransaction[]) => items.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
    });

    return {
      filteredEarnings: filterByDate(earnings),
      filteredDebts: filterByDate(debts),
    };
  }, [transactions, selectedMonth, selectedYear]);

  // Lógica para calcular totais
  const totalEarnings = useMemo(() => 
    filteredEarnings
      .filter(item => item.category !== 'Adição de Saldo')
      .reduce((acc, item) => acc + Number(item.amount), 0), 
    [filteredEarnings]
  );

  const totalDebts = useMemo(() => 
    filteredDebts.reduce((acc, item) => acc + Number(item.amount), 0),
    [filteredDebts]
  );

  const totalBalance = mainBalance; // O saldo total agora vem diretamente do backend

  // Função para adicionar uma nova transação
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const numericAmount = parseFloat(amount);
    if (!category || isNaN(numericAmount) || numericAmount <= 0) {
      alert('Por favor, preencha a categoria e um valor monetário válido.');
      return;
    }

    const finalDescription = description.trim() === '' ? category : description;

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: finalDescription,
          amount: numericAmount,
          category,
          type: transactionType,
          date: new Date().toISOString(),
          isRecurring,
        }),
      });

      if (!res.ok) throw new Error('Falha ao criar transação');

      // Limpa o formulário e atualiza os dados
      setDescription('');
      setAmount('');
      setCategory('');
      setIsRecurring(false);
      setIsAddingTransaction(false);
      fetchData(); // Re-busca os dados para atualizar a UI
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao salvar a transação.');
    }
  };

  // Função para adicionar saldo
  const handleAddBalance = async () => {
    const numericAmount = parseFloat(balanceToAdd);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Por favor, insira um valor monetário válido.');
      return;
    }

    try {
      const res = await fetch('/api/user/balance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numericAmount }),
      });

      if (!res.ok) throw new Error('Falha ao adicionar saldo');

      // Limpa o campo e atualiza os dados
      setBalanceToAdd('');
      setIsAddingBalance(false);
      fetchData(); // Re-busca os dados para atualizar a UI
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao adicionar o saldo.');
    }
  };

  // Função para deletar transação (abre o popup de confirmação)
  const handleDeleteTransaction = (id: number) => {
    setTransactionToDelete(id);
    setShowConfirmDeletePopup(true);
  };

  // Função que executa a deleção após a confirmação
  const confirmDelete = async () => {
    if (transactionToDelete === null) return;

    try {
      const res = await fetch(`/api/transactions/${transactionToDelete}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Falha ao deletar transação');

      fetchData(); // Re-busca os dados para atualizar a UI
      setShowConfirmDeletePopup(false); // Fecha o popup
      setTransactionToDelete(null); // Limpa o ID da transação
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao deletar a transação.');
      setShowConfirmDeletePopup(false); // Fecha o popup em caso de erro
      setTransactionToDelete(null); // Limpa o ID da transação
    }
  };

  // Lógica para long press
  const handleTouchStart = (id: number) => {
    longPressTimeout.current = setTimeout(() => {
      setLongPressedItemId(id);
    }, 500); // 500ms para considerar long press
  };

  const handleTouchEnd = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  // --- Listas de categorias ---
  const debtCategories = ["Alimentação", "Serviços", "Casa", "Compras", "Educação", "Lazer", "Transações", "Saúde", "Transporte", "Viagem", "Outros"];
  const earningCategories = ["Investimentos", "Bonificação", "Empréstimos", "Transação", "Presente", "Renda Extra", "Salário", "Outros"];

  // --- Funções e Componentes de UI (sem alteração de lógica) ---
  const WalletIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 md:h-8 md:w-8 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H4a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
  const ArrowUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>;
  const ArrowDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>;
  const capitalizeFirstLetter = (string: string) => string.charAt(0).toUpperCase() + string.slice(1);
  const EyeOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
  const EyeClosedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7 .95-3.112 3.543-5.45 6.836-6.333m7.458 6.333a10.05 10.05 0 011.274 4.057M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 2l20 20" /></svg>;
  const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>;
  const PinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute top-2 right-2" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12.414V4h-2v8.414l-4 4V20h10v-3.586l-4-4zM10 20H4v-3.586l4-4V4h2v8.414l-4 4V20z" /></svg>;
  const getChartData = (transactions: ApiTransaction[]) => {
    const categoryTotals = transactions.reduce((acc, transaction) => {
      const category = transaction.category || 'Outros';
      acc[category] = (acc[category] || 0) + Number(transaction.amount);
      return acc;
    }, {} as { [key: string]: number });
    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  };
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];
  const getFirstName = (fullName: string) => fullName.split(' ')[0];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading) {
    return <div className="bg-gradient-to-br from-gray-900 to-slate-800 text-gray-100 min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <>
      {showConfirmDeletePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700 w-full max-w-md text-center">
            <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-500">Confirmar Exclusão</h2>
            <p className="text-gray-300 mb-8">Tem certeza que deseja deletar este item?</p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => {
                  setShowConfirmDeletePopup(false);
                  setTransactionToDelete(null);
                }} 
                className="bg-slate-600/50 text-gray-200 border border-slate-500 hover:bg-white hover:text-slate-800 p-3 rounded-lg font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
              >
                Não
              </button>
              <button 
                onClick={confirmDelete} 
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 p-3 rounded-lg font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-white"
              >
                Sim
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddingBalance && (
        <div ref={addBalancePopupRef} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700 w-full max-w-md">
            <h2 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Adicionar Saldo</h2>
            <div className="grid grid-cols-1 gap-5">
              <input
                type="text"
                inputmode="decimal"
                pattern="[0-9,]*"
                placeholder="Valor (R$)"
                value={balanceToAdd}
                onChange={(e) => setBalanceToAdd(e.target.value)}
                className="col-span-1 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-white focus:border-white outline-none transition text-white"
              />
              <div className="flex justify-end gap-4">
                <button onClick={() => setIsAddingBalance(false)} className="bg-slate-600/50 text-gray-200 border border-slate-500 hover:bg-white hover:text-slate-800 p-3 rounded-lg font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                  Cancelar
                </button>
                <button onClick={handleAddBalance} className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 p-3 rounded-lg font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-white">
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEarningsChartOpen && (
        <div ref={earningsChartPopupRef} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <PieChartComponent
            data={getChartData(filteredEarnings)}
            colors={COLORS}
            title={selectedMonth !== null ? `Ganhos - ${capitalizeFirstLetter(new Date(0, selectedMonth).toLocaleString('pt-BR', { month: 'long' }))}` : 'Ganhos'}
          />
          <button onClick={() => setIsEarningsChartOpen(false)} className="absolute top-4 right-4 text-white hover:text-red-500 text-4xl">&times;</button>
        </div>
      )}

      {isDebtsChartOpen && (
        <div ref={debtsChartPopupRef} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <PieChartComponent
            data={getChartData(filteredDebts)}
            colors={COLORS}
            title={selectedMonth !== null ? `Dívidas - ${capitalizeFirstLetter(new Date(0, selectedMonth).toLocaleString('pt-BR', { month: 'long' }))}` : 'Dívidas'}
          />
          <button onClick={() => setIsDebtsChartOpen(false)} className="absolute top-4 right-4 text-white hover:text-red-500 text-4xl">&times;</button>
        </div>
      )}

      <div className="bg-gradient-to-br from-gray-900 to-slate-800 text-gray-100 min-h-screen font-sans">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          <header className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4 md:gap-0">
            <div className="flex items-center">
              <WalletIcon />
              <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
                {user ? `Olá, ${getFirstName(user.fullName)}` : 'Bem-vindo'}
              </h1>
              <button onClick={() => setIsBalanceVisible(!isBalanceVisible)} className="ml-4 text-gray-400 hover:text-gray-200">
                {isBalanceVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={selectedMonth !== null ? selectedMonth : ''}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {capitalizeFirstLetter(new Date(0, i).toLocaleString('pt-BR', { month: 'long' }))}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear !== null ? selectedYear : ''}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i} value={new Date().getFullYear() - 5 + i}>
                    {new Date().getFullYear() - 5 + i}
                  </option>
                ))}
              </select>
            </div>
          </header>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700 transform hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-cyan-400">Saldo Total</h2>
                <button onClick={() => setIsAddingBalance(true)} className="text-cyan-400 hover:text-cyan-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
              </div>
              <p className="text-4xl font-bold mt-2">{isBalanceVisible ? formatCurrency(totalBalance) : 'R$ --'}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700 transform hover:scale-105 transition-transform duration-300">
              <h2 className="text-lg font-semibold text-emerald-400 flex items-center">Ganhos Totais</h2>
              <p className="text-4xl font-bold mt-2">{isBalanceVisible ? formatCurrency(totalEarnings) : 'R$ --'}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700 transform hover:scale-105 transition-transform duration-300">
              <h2 className="text-lg font-semibold text-red-400">Dívidas Totais</h2>
              <p className="text-4xl font-bold mt-2">{isBalanceVisible ? formatCurrency(totalDebts) : 'R$ --'}</p>
            </div>
          </section>

          <section className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-700 mb-10 flex justify-between items-center">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Adicionar Nova Transação</h2>
            <button onClick={() => setIsAddingTransaction(true)} className="text-emerald-400 hover:text-emerald-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </button>
          </section>

          {isAddingTransaction && (
            <div ref={addTransactionPopupRef} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className={`bg-slate-800 p-8 rounded-2xl shadow-lg border-2 ${transactionType === 'INCOME' ? 'border-emerald-500' : 'border-red-500'} w-full max-w-md`}>
                <h2 className={`text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r ${transactionType === 'INCOME' ? 'from-emerald-400 to-green-500' : 'from-red-500 to-pink-500'}`}>
                  {transactionType === 'INCOME' ? 'Adicionar Ganho' : 'Adicionar Dívida'}
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 gap-5">
                    <select 
                      value={transactionType}
                      onChange={(e) => {
                        setTransactionType(e.target.value as 'INCOME' | 'EXPENSE');
                        setCategory('');
                      }}
                      className="col-span-1 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-white focus:border-white outline-none transition"
                    >
                      <option value="EXPENSE">Dívida</option>
                      <option value="INCOME">Ganho</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Descrição (opcional)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="col-span-1 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-white focus:border-white outline-none transition"
                    />
                    
                    {transactionType === 'EXPENSE' ? (
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="col-span-1 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-white focus:border-white outline-none transition"
                      >
                        <option value="">-- Categoria --</option>
                        {debtCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    ) : (
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="col-span-1 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-white focus:border-white outline-none transition"
                      >
                        <option value="">-- Categoria --</option>
                        {earningCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    )}

                    <input
                      type="text"
                      inputmode="decimal"
                      pattern="[0-9,]*"
                      placeholder="Valor (R$)"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="col-span-1 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-white focus:border-white outline-none transition"
                    />
                    <div className="flex items-center justify-between mt-4">
                      <label htmlFor="recurring-switch" className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="recurring-switch"
                            className="sr-only"
                            checked={isRecurring}
                            onChange={() => setIsRecurring(!isRecurring)}
                          />
                          <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                          <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div>
                        </div>
                        <div className="ml-3 text-gray-200 font-medium">
                          Fixar gasto/ganho mensal
                        </div>
                      </label>
                    </div>
                    <div className="flex justify-end gap-4">
                      <button type="button" onClick={() => setIsAddingTransaction(false)} className="bg-slate-600/50 text-gray-200 border border-slate-500 hover:bg-white hover:text-slate-800 p-3 rounded-lg font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                        Cancelar
                      </button>
                      <button type="submit" className={`p-3 rounded-lg font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 ${transactionType === 'INCOME' ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700' : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'}`}>
                        Adicionar
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-emerald-400 flex items-center"><ArrowUpIcon /> Ganhos</h2>
                <button onClick={() => setIsEarningsChartOpen(true)} className="text-emerald-400 hover:text-emerald-300">
                  <ChartIcon />
                </button>
              </div>
              <ul className="space-y-3">
                {filteredEarnings.map(item => (
                  <li 
                    key={item.id} 
                    className="bg-slate-700/50 p-4 rounded-lg flex justify-between items-center border border-slate-600 hover:bg-slate-700 transition-colors relative"
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                    onTouchStart={() => handleTouchStart(item.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                  >
                    <div>
                      <span className="font-semibold text-lg">{item.description}</span>
                      <span className="text-sm text-cyan-400 block mt-1">{item.category}</span>
                    </div>
                    <span className={`font-bold text-lg ${item.category === 'Adição de Saldo' ? 'text-cyan-400' : 'text-emerald-400'}`}>
                      {isBalanceVisible ? `+ ${formatCurrency(Number(item.amount))}` : '+ R$ --'}
                    </span>
                    {item.isRecurring && <PinIcon />}
                    {(hoveredItemId === item.id || longPressedItemId === item.id) && (
                      <button 
                        onClick={() => handleDeleteTransaction(item.id)}
                        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold shadow-md"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-red-400 flex items-center"><ArrowDownIcon /> Dívidas</h2>
                <button onClick={() => setIsDebtsChartOpen(true)} className="text-red-400 hover:text-red-300">
                  <ChartIcon />
                </button>
              </div>
              <ul className="space-y-3">
                {filteredDebts.map(item => (
                  <li 
                    key={item.id} 
                    className="bg-slate-700/50 p-4 rounded-lg flex justify-between items-center border border-slate-600 hover:bg-slate-700 transition-colors relative"
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                    onTouchStart={() => handleTouchStart(item.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                  >
                    <div>
                      <span className="font-semibold text-lg">{item.description}</span>
                      <span className="text-sm text-cyan-400 block mt-1">{item.category}</span>
                    </div>
                    <span className="font-bold text-lg text-red-400">{isBalanceVisible ? `- ${formatCurrency(Number(item.amount))}` : '- R$ --'}</span>
                    {item.isRecurring && <PinIcon />}
                    {(hoveredItemId === item.id || longPressedItemId === item.id) && (
                      <button 
                        onClick={() => handleDeleteTransaction(item.id)}
                        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold shadow-md"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}