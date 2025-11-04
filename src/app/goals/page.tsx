'use client';

import { useState } from 'react';

export default function GoalsPage() {
  const [goal, setGoal] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const handleSetGoal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const numericGoal = parseFloat(goal);
    if (isNaN(numericGoal) || numericGoal <= 0) {
      alert('Por favor, insira um valor monetário válido.');
      return;
    }
    // Here you would typically save the goal to a database or state management solution.
    alert(`Meta de gastos para ${capitalizeFirstLetter(new Date(selectedYear, selectedMonth).toLocaleString('pt-BR', { month: 'long' }))} de ${selectedYear} definida para R$ ${numericGoal.toFixed(2)}`);
  };

  return (
    <main className="bg-gradient-to-br from-gray-900 to-slate-800 text-gray-100 min-h-screen font-sans p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
            Metas de Gastos
          </h1>
          <div className="flex gap-4">
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
        </div>

        <section className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-700">
          <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Definir Meta Mensal</h2>
          <form onSubmit={handleSetGoal}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
              <input
                type="number"
                placeholder="Valor da Meta (R$)"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="col-span-1 md:col-span-2 bg-slate-700/50 p-3 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
              <button type="submit" className="col-span-1 md:col-span-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 p-3 rounded-lg font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                Definir Meta
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
