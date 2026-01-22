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
  installments?: number | null;
  installmentNumber?: number | null;
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
  const [installments, setInstallments] = useState<number | ''>('');

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
  const [transactionToDelete, setTransactionToDelete] = useState<ApiTransaction | null>(null); // ID da transação a ser deletada
  const [shouldAnimateOnNextFetch, setShouldAnimateOnNextFetch] = useState(true);

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
  const fetchData = useCallback(async (year: number, month: number, animate: boolean = true) => { // month é 1-12
    setIsLoading(true);
    try {
      const res = await fetch(`/api/transactions?year=${year}&month=${month}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/');
        }
        throw new Error('Falha ao buscar dados');
      }
      const data = await res.json();
      setUser(data.user);
      setMainBalance(parseFloat(data.user.totalBalance));
      setTransactions(data.transactions);
      setShouldAnimateOnNextFetch(animate);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [router, setShouldAnimateOnNextFetch]);

  // Efeito para buscar dados quando o mês ou ano selecionado mudar
  useEffect(() => {
    if (selectedYear !== null && selectedMonth !== null) {
      // selectedMonth é 0-11, a API espera 1-12
      fetchData(selectedYear, selectedMonth + 1, true); // Animar na carga inicial/mudança de mês/ano
    }
  }, [selectedYear, selectedMonth, fetchData]);

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

  // --- Animação dos Números ---
  const [animatedBalance, setAnimatedBalance] = useState(0);
  const [animatedEarnings, setAnimatedEarnings] = useState(0);
  const [animatedDebts, setAnimatedDebts] = useState(0);

  useEffect(() => {
    if (!shouldAnimateOnNextFetch) {
      setAnimatedBalance(totalBalance);
      setAnimatedEarnings(totalEarnings);
      setAnimatedDebts(totalDebts);
      return;
    }

    const animationDuration = 1000;
    const frameRate = 1000 / 60;
    const totalFrames = animationDuration / frameRate;
    let currentFrame = 0;
    let intervalId: NodeJS.Timeout;

    const animateValues = () => {
      intervalId = setInterval(() => {
        currentFrame++;
        const progress = Math.min(1, currentFrame / totalFrames);

        setAnimatedBalance(totalBalance * progress);
        setAnimatedEarnings(totalEarnings * progress);
        setAnimatedDebts(totalDebts * progress);

        if (currentFrame >= totalFrames) {
          clearInterval(intervalId);
          // Garantir que os valores finais sejam exatos
          setAnimatedBalance(totalBalance);
          setAnimatedEarnings(totalEarnings);
          setAnimatedDebts(totalDebts);
        }
      }, frameRate);
    };

    animateValues();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [totalBalance, totalEarnings, totalDebts, shouldAnimateOnNextFetch]);


  // Função para adicionar uma nova transação
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // Mês atual (0-11)

    if (selectedYear! < currentYear || (selectedYear! === currentYear && selectedMonth! < currentMonth)) {
      alert('Você não pode realizar mais alterações nesse mês');
      return;
    }
    if (selectedYear! > currentYear || (selectedYear! === currentYear && selectedMonth! > currentMonth)) {
      alert('Você ainda não pode realizar alterações nesse mês');
      return;
    }
    
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
          date: new Date(selectedYear!, selectedMonth!, new Date().getDate()).toISOString(),
          isRecurring,
          installments: isRecurring ? installments : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Falha ao criar transação');
      }

      // Limpa o formulário e atualiza os dados
      setDescription('');
      setAmount('');
      setCategory('');
      setIsRecurring(false);
      setInstallments('');
      setIsAddingTransaction(false);
      fetchData(selectedYear!, selectedMonth! + 1, false); // Re-busca os dados para atualizar a UI, sem animar
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Ocorreu um erro ao salvar a transação.');
    }
  };

  // Função para adicionar saldo
  const handleAddBalance = async () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); 

    if (selectedYear! < currentYear || (selectedYear! === currentYear && selectedMonth! < currentMonth)) {
      alert('Você não pode realizar mais alterações nesse mês');
      return;
    }
    if (selectedYear! > currentYear || (selectedYear! === currentYear && selectedMonth! > currentMonth)) {
      alert('Você ainda não pode realizar alterações nesse mês');
      return;
    }

    const numericAmount = parseFloat(balanceToAdd);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Por favor, insira um valor monetário válido.');
      return;
    }

    try {
      const res = await fetch('/api/user/balance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numericAmount,
          date: new Date(selectedYear!, selectedMonth!, now.getDate()).toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Falha ao adicionar saldo');

      // Limpa o campo e atualiza os dados
      setBalanceToAdd('');
      setIsAddingBalance(false);
      // fetchData precisa do ano e mês (1-12)
      fetchData(selectedYear!, selectedMonth! + 1, false);
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao adicionar o saldo.');
    }
  };

  // Função para deletar transação (abre o popup de confirmação)
  const handleDeleteTransaction = (item: ApiTransaction) => {
    setTransactionToDelete(item);
    setShowConfirmDeletePopup(true);
  };

  // Função que executa a deleção após a confirmação
  const confirmDelete = async () => {
    if (transactionToDelete === null) return;
  
    try {
      // Passa um parâmetro extra para o backend se a transação for recorrente
      const url = `/api/transactions/${transactionToDelete.id}${transactionToDelete.isRecurring ? '?deleteAll=true' : ''}`;
      
      const res = await fetch(url, {
        method: 'DELETE',
      });
  
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Falha ao deletar transação');
      }
  
      fetchData(selectedYear!, selectedMonth! + 1, false); // Re-busca os dados para atualizar a UI, sem animar
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Ocorreu um erro ao deletar a transação.');
    } finally {
      setShowConfirmDeletePopup(false); // Fecha o popup
      setTransactionToDelete(null); // Limpa o objeto da transação
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
  const PinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12.414V4h-2v8.414l-4 4V20h10v-3.586l-4-4zM10 20H4v-3.586l4-4V4h2v8.414l-4 4V20z" /></svg>;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
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
            <p className="text-gray-300 mb-8">
              {transactionToDelete?.isRecurring
                ? 'Tem certeza que você deseja excluir essa transação fixada? Ao aceitar, todas as parcelas serão excluidas.'
                : 'Tem certeza que deseja deletar este item?'}
            </p>
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
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
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
                {Array.from({ length: 3 }, (_, i) => 2025 + i).map(year => (
                  <option key={year} value={year}>
                    {year}
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
              <p className="text-4xl font-bold mt-2">{isBalanceVisible ? formatCurrency(animatedBalance) : 'R$ --'}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700 transform hover:scale-105 transition-transform duration-300">
              <h2 className="text-lg font-semibold text-emerald-400 flex items-center">Ganhos Totais</h2>
              <p className="text-4xl font-bold mt-2">{isBalanceVisible ? formatCurrency(animatedEarnings) : 'R$ --'}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700 transform hover:scale-105 transition-transform duration-300">
              <h2 className="text-lg font-semibold text-red-400">Dívidas Totais</h2>
              <p className="text-4xl font-bold mt-2">{isBalanceVisible ? formatCurrency(animatedDebts) : 'R$ --'}</p>
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
                          <div className={`block w-14 h-8 rounded-full ${isRecurring ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${isRecurring ? 'translate-x-6' : ''}`}></div>
                        </div>
                        <div className="ml-3 text-gray-200 font-medium">
                          Fixar gasto/ganho mensal
                        </div>
                      </label>
                    </div>
                    {isRecurring && (
                      <div className="mt-4">
                        <label htmlFor="installments-select" className="text-gray-200 font-medium mb-2 block">
                          Número de Meses
                        </label>
                        <select
                          id="installments-select"
                          value={installments}
                          onChange={(e) => setInstallments(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                          className="col-span-1 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-white focus:border-white outline-none transition w-full"
                        >
                          <option value="">-- Selecione os meses --</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>{num}x</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex justify-end gap-4">
                      <button type="button" onClick={() => setIsAddingTransaction(false)} className="bg-slate-600/50 text-gray-200 border border-slate-500 hover:bg-white hover:text-slate-800 p-3 rounded-lg font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        disabled={isRecurring && installments === ''}
                        className={`p-3 rounded-lg font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 ${transactionType === 'INCOME' ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700' : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'} ${isRecurring && installments === '' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
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
                    <div className="relative pr-6">
                      <div className="absolute -top-4 right-0 flex items-center gap-1">
                        <span className="text-xs text-gray-400">{formatDate(item.date)}</span>
                        {item.isRecurring && <PinIcon />}
                      </div>
                      <span className={`font-bold text-lg ${item.category === 'Adição de Saldo' ? 'text-cyan-400' : 'text-emerald-400'}`}>
                        {isBalanceVisible ? `+ ${formatCurrency(Number(item.amount))}` : '+ R$ --'}
                      </span>
                    </div>
                    {(hoveredItemId === item.id || longPressedItemId === item.id) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); // Impede que o clique propague para o pai (li)
                          handleDeleteTransaction(item);
                        }}
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
                    <div className="relative pr-6">
                      <div className="absolute -top-4 right-0 flex items-center gap-1">
                        <span className="text-xs text-gray-400">{formatDate(item.date)}</span>
                        {item.isRecurring && <PinIcon />}
                      </div>
                      <span className="font-bold text-lg text-red-400">{isBalanceVisible ? `- ${formatCurrency(Number(item.amount))}` : '- R$ --'}</span>
                    </div>
                    {(hoveredItemId === item.id || longPressedItemId === item.id) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); // Impede que o clique propague para o pai (li)
                          handleDeleteTransaction(item);
                        }}
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