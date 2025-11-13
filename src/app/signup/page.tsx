'use client';

import { useState } from 'react';
import { Eye, EyeOff, Github, Chrome } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log('Form Data:', { fullName, email, password, confirmPassword });

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName, email, password, confirmPassword }),
    });

    const data = await res.json();
    console.log('API Response:', data);

    if (res.ok) {
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
        router.push('/');
      }, 5000);
    } else {
      alert(data.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      {showSuccessPopup && (
        <div className="fixed top-5 right-5 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50">
          Seu cadastro foi realizado com sucesso!
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl w-full bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Coluna da Esquerda: Branding */}
        <div className="hidden md:flex flex-col justify-center p-12 bg-gradient-to-br from-emerald-500 to-cyan-600">
          <div className="flex items-center mb-4">
            <h1 className="text-5xl font-bold text-white">Bem-vindo a <span className="rainbow-text">MG Wallet</span></h1>
          </div>
          <p className="text-lg">Comece a jornada para uma vida financeira mais organizada e próspera.</p>
        </div>

        {/* Coluna da Direita: Formulário de Cadastro */}
        <div className="p-8 md:p-12">
          {/* Mobile Header */}
          <div className="md:hidden text-center mb-8">
            <h1 className="text-4xl font-bold rainbow-text">MG Wallet</h1>
          </div>

          <h2 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
            Cadastro
          </h2>
          <form className="space-y-6" onSubmit={handleSignup}>
            <div>
              <label
                htmlFor="fullName"
                className="text-sm font-medium text-gray-400"
              >
                Nome Completo
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 mt-1 bg-gray-700 rounded-lg border-2 border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-400"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 mt-1 bg-gray-700 rounded-lg border-2 border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition sm:text-sm"
              />
            </div>
            <div className="relative">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-400"
              >
                Senha
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 mt-1 bg-gray-700 rounded-lg border-2 border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 h-full"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="relative">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-gray-400"
              >
                Confirmar Senha
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 mt-1 bg-gray-700 rounded-lg border-2 border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 h-full"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div>
              <button
                type="submit"
                className="w-full px-4 py-3 text-lg font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
              >
                Cadastrar
              </button>
            </div>
          </form>
          <div className="mt-8 text-sm text-center">
            <p className="text-gray-400">
              Já tem uma conta?{' '}
              <a
                href="/"
                className="font-medium text-cyan-400 hover:text-cyan-300"
              >
                Faça login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
