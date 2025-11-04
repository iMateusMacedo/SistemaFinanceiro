'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// Define a interface para uma transação
interface Transaction {
  id: number;
  description: string;
  amount: number;
  category?: string;
  date: string;
}

export default function HomePage() {
  const router = useRouter();
  // Estados para ganhos e dívidas
  const [earnings, setEarnings] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Transaction[]>([]);

  // Estados para os campos de input
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'earning' | 'debt'>('debt');

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Listas de categorias
  const debtCategories = [
    "Alimentação", "Serviços", "Casa", "Compras", "Educação", 
    "Lazer", "Transações", "Saúde", "Transporte", "Viagem", "Outros"
  ];
  const earningCategories = [
    "Investimentos", "Bonificação", "Empréstimos", "Transação", 
    "Presente", "Renda Extra", "Salário", "Outros"
  ];

  // Filtra as transações com base no mês e ano selecionados
  const filteredEarnings = useMemo(() => 
    earnings.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
    }),
    [earnings, selectedMonth, selectedYear]
  );

  const filteredDebts = useMemo(() => 
    debts.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
    }),
    [debts, selectedMonth, selectedYear]
  );

  // Calcula totais usando useMemo para otimização
  const totalEarnings = useMemo(() => 
    filteredEarnings.reduce((acc, item) => acc + item.amount, 0), 
    [filteredEarnings]
  );

  const totalDebts = useMemo(() => 
    filteredDebts.reduce((acc, item) => acc + item.amount, 0),
    [filteredDebts]
  );


  const totalBalance = useMemo(() => 
    totalEarnings - totalDebts,
    [totalEarnings, totalDebts]
  );

  // Função para lidar com o envio do formulário
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const numericAmount = parseFloat(amount);
    if (!category || isNaN(numericAmount) || numericAmount <= 0) {
      alert('Por favor, preencha a categoria e um valor monetário válido.');
      return;
    }

    // Validação para a categoria "Outros" em ambos os tipos
    if (category === 'Outros' && description.trim() === '') {
      alert('Para a categoria "Outros", o campo de descrição é obrigatório.');
      return;
    }

    const finalDescription = description.trim() === '' ? category : description;

    const newTransaction: Transaction = {
      id: Date.now(),
      description: finalDescription,
      amount: numericAmount,
      category: category,
      date: new Date().toISOString().slice(0, 10),
    };

    if (type === 'earning') {
      setEarnings([...earnings, newTransaction]);
    } else {
      setDebts([...debts, newTransaction]);
    }

    // Limpa os campos do formulário
    setDescription('');
    setAmount('');
    setCategory('');
  };

  // --- Ícones SVG para a UI ---
  const WalletIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H4a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
  );
  const ArrowUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
  );
  const ArrowDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
  );

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return (
    <main className="bg-gradient-to-br from-gray-900 to-slate-800 text-gray-100 min-h-screen font-sans">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center">
            <WalletIcon />
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
              Gerenciador Financeiro
            </h1>
          </div>

          {/* Filtros de Mês e Ano */}
          <div className="flex items-center gap-4">
            <select
              value={selectedMonth}
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
              value={selectedYear}
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

        {/* Painel de Resumo */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-lg font-semibold text-cyan-400">Saldo Total</h2>
            <p className="text-4xl font-bold mt-2">R$ {totalBalance.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-lg font-semibold text-emerald-400 flex items-center">Ganhos Totais</h2>
            <p className="text-4xl font-bold mt-2">R$ {totalEarnings.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-lg font-semibold text-red-400">Dívidas Totais</h2>
            <p className="text-4xl font-bold mt-2">R$ {totalDebts.toFixed(2)}</p>
          </div>
        </section>

        {/* Formulário de Adição */}
        <section className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-700 mb-10">
          <h2 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Adicionar Nova Transação</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5 items-center">
              <select 
                value={type}
                onChange={(e) => {
                  setType(e.target.value as 'earning' | 'debt');
                  setCategory(''); // Reseta a categoria ao trocar o tipo
                }}
                className="col-span-1 md:col-span-1 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              >
                <option value="debt">Dívida</option>
                <option value="earning">Ganho</option>
              </select>
              <input
                type="text"
                placeholder="Descrição (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-1 md:col-span-2 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
              
              {type === 'debt' ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="col-span-1 md:col-span-1 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                >
                  <option value="">-- Categoria --</option>
                  {debtCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="col-span-1 md:col-span-1 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                >
                  <option value="">-- Categoria --</option>
                  {earningCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              )}

              <input
                type="number"
                placeholder="Valor (R$)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="col-span-1 md:col-span-1 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
              <button type="submit" className="col-span-1 md:col-span-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 p-3 rounded-lg font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                Adicionar
              </button>
            </div>
          </form>
        </section>

        {/* Listas de Transações */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700">
            <h2 className="text-2xl font-bold mb-4 text-emerald-400 flex items-center"><ArrowUpIcon /> Ganhos</h2>
            <ul className="space-y-3">
              {filteredEarnings.map(item => (
                <li key={item.id} className="bg-slate-700/50 p-4 rounded-lg flex justify-between items-center border border-slate-600 hover:bg-slate-700 transition-colors">
                  <div>
                    <span className="font-semibold text-lg">{item.description}</span>
                    <span className="text-sm text-cyan-400 block mt-1">{item.category}</span>
                  </div>
                  <span className="font-bold text-lg text-emerald-400">+ R$ {item.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700">
            <h2 className="text-2xl font-bold mb-4 text-red-400 flex items-center"><ArrowDownIcon /> Dívidas</h2>
            <ul className="space-y-3">
              {filteredDebts.map(item => (
                <li key={item.id} className="bg-slate-700/50 p-4 rounded-lg flex justify-between items-center border border-slate-600 hover:bg-slate-700 transition-colors">
                  <div>
                    <span className="font-semibold text-lg">{item.description}</span>
                    <span className="text-sm text-cyan-400 block mt-1">{item.category}</span>
                  </div>
                  <span className="font-bold text-lg text-red-400">- R$ {item.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}