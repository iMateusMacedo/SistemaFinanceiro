"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, getWeekOfMonth } from 'date-fns'; // Adicionado getWeekOfMonth
import { ptBR } from 'date-fns/locale';

interface GoalCardProps {
  title: string;
  goalAmount: number;
  currentSpent: number;
  period: 'daily' | 'weekly' | 'monthly';
  formatCurrency: (value: number) => string;
  weekNumberInMonth?: number; // Adicionado
  currentMonthName?: string; // Adicionado
}

const GoalCard: React.FC<GoalCardProps> = ({ title, goalAmount, currentSpent, period, formatCurrency, weekNumberInMonth, currentMonthName }) => {
  const percentageSpent = goalAmount && goalAmount > 0 ? (currentSpent / goalAmount) * 100 : 0;

  const getTodayDate = () => {
    return format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <div className="bg-slate-700/50 p-6 rounded-xl shadow-lg border border-slate-600 flex flex-col justify-between">
      <div>
        <h3 className="text-xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
          {title}
        </h3>
        {period === 'daily' && (
          <p className="text-sm text-gray-400 mb-4">Hoje: {getTodayDate()}</p>
        )}
        {period === 'weekly' && weekNumberInMonth && (
          <p className="text-sm text-gray-400 mb-4">Semana {weekNumberInMonth}</p>
        )}
        {period === 'monthly' && currentMonthName && (
          <p className="text-sm text-gray-400 mb-4">Mês: {currentMonthName}</p>
        )}
        <p className="text-lg text-gray-300 mb-2">Meta: {formatCurrency(goalAmount)}</p>
        <p className="text-lg text-gray-300 mb-4">Gasto Atual: {formatCurrency(currentSpent)}</p>

        {/* Barra de Progresso Rainbow */}
        <div className="w-full bg-gray-700 rounded-full h-6 mb-4 relative overflow-hidden">
          <div 
            className="h-full rounded-full absolute top-0 left-0 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
            style={{ width: `${Math.min(100, percentageSpent)}%` }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
            {percentageSpent.toFixed(2)}% Gasto
          </div>
        </div>
      </div>

      {percentageSpent <= 50 && currentSpent > 0 && (
        <p className="text-center text-emerald-400 font-semibold mt-4">
          Parabéns! Você está dentro da sua meta de gastos {title.toLowerCase().replace('meta de gastos ', '')}!
        </p>
      )}
      {percentageSpent > 50 && percentageSpent < 100 && (
        <p className="text-center text-yellow-400 font-semibold mt-4">
          Você está na metade da sua meta! Cuidado!
        </p>
      )}
      {percentageSpent >= 100 && (
        <p className="text-center text-red-400 font-semibold mt-4">
          Você ultrapassou a meta.
        </p>
      )}
    </div>
  );
};

export default function GoalsPage() {
  const router = useRouter();
  const [monthlySalary, setMonthlySalary] = useState<number | null>(null);
  const [salaryInput, setSalaryInput] = useState('');
  const [goalAmountDaily, setGoalAmountDaily] = useState(0);
  const [goalAmountWeekly, setGoalAmountWeekly] = useState(0);
  const [goalAmountMonthly, setGoalAmountMonthly] = useState(0);
  const [currentSpentDaily, setCurrentSpentDaily] = useState(0);
  const [currentSpentWeekly, setCurrentSpentWeekly] = useState(0);
  const [currentSpentMonthly, setCurrentSpentMonthly] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSalaryPopup, setShowSalaryPopup] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/user/goals');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/');
        }
        throw new Error('Falha ao buscar dados das metas');
      }
      const data = await res.json();
      setMonthlySalary(data.monthlySalary);
      setGoalAmountDaily(data.goalAmountDaily);
      setGoalAmountWeekly(data.goalAmountWeekly);
      setGoalAmountMonthly(data.goalAmountMonthly);
      setCurrentSpentDaily(data.currentSpentDaily);
      setCurrentSpentWeekly(data.currentSpentWeekly);
      setCurrentSpentMonthly(data.currentSpentMonthly);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSetMonthlySalary = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const numericSalary = parseFloat(salaryInput);
    if (isNaN(numericSalary) || numericSalary <= 0) {
      alert('Por favor, insira um valor monetário válido para o gasto mensal.');
      return;
    }

    try {
      const res = await fetch('/api/user/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlySalary: numericSalary }),
      });

      if (!res.ok) throw new Error('Falha ao definir gasto mensal');

      setMonthlySalary(numericSalary);
      setSalaryInput('');
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao definir o gasto mensal.');
    }
  };

  if (isLoading) {
    return <div className="bg-gradient-to-br from-gray-900 to-slate-800 text-gray-100 min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <main className="bg-gradient-to-br from-gray-900 to-slate-800 text-gray-100 min-h-screen font-sans p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
            Metas de Gastos
          </h1>
        </div>
        <p className="text-gray-400 mb-10">Nessa tela, você vai adicionar a quantia máxima que vai ser gasto durante o mês. E a partir dela, será calculado as metas diárias, semanais e mensal.</p>

        {/* Popup para Definir Gasto Mensal */}
        {showSalaryPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700 w-full max-w-md">
              <h2 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Definir Gasto Mensal</h2>
              <form onSubmit={(e) => {
                handleSetMonthlySalary(e);
                setShowSalaryPopup(false);
              }}>
                <div className="grid grid-cols-1 gap-5">
                  <input
                    type="text"
                    inputmode="decimal"
                    pattern="[0-9,]*"
                    placeholder="Gasto Mensal (R$)"
                    value={salaryInput}
                    onChange={(e) => setSalaryInput(e.target.value)}
                    className="col-span-1 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  />
                  <div className="flex justify-end gap-4">
                    <button 
                      type="button" 
                      onClick={() => setShowSalaryPopup(false)} 
                      className="bg-slate-600/50 text-gray-200 border border-slate-500 hover:bg-white hover:text-slate-800 p-3 rounded-lg font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 p-3 rounded-lg font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-white">
                      Definir Gasto
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Definir Gasto Mensal */}
        <section className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-700 mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Definir Gasto Mensal</h2>
            <button onClick={() => setShowSalaryPopup(true)} className="text-emerald-400 hover:text-emerald-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </button>
          </div>
          {monthlySalary !== null && (
            <p className="mt-4 text-lg text-gray-300">Gasto Mensal Atual: {formatCurrency(monthlySalary)}</p>
          )}
        </section>

        {/* Metas de Gastos Independentes */}
        <section className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-700 mb-10">
          <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Minhas Metas de Gastos</h2>
          
          {monthlySalary === null || monthlySalary <= 0 ? (
            <p className="text-center text-gray-400">Defina seu gasto mensal para calcular suas metas.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GoalCard 
                title="Meta de Gastos Diária" 
                goalAmount={goalAmountDaily} 
                currentSpent={currentSpentDaily} 
                period="daily"
                formatCurrency={formatCurrency}
              />
              <GoalCard 
                title="Meta de Gastos Semanal" 
                goalAmount={goalAmountWeekly} 
                currentSpent={currentSpentWeekly} 
                period="weekly"
                formatCurrency={formatCurrency}
              />
              <GoalCard 
                title="Meta de Gastos Mensal" 
                goalAmount={goalAmountMonthly} 
                currentSpent={currentSpentMonthly} 
                period="monthly"
                formatCurrency={formatCurrency}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
