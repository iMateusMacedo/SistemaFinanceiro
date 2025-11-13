"use client";

import { useState } from "react";
import { Eye, EyeOff, Github, Chrome } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push("/home");
    } else {
      alert(data.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl w-full bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Coluna da Esquerda: Branding */}
        <div className="hidden md:flex flex-col justify-center p-12 bg-gradient-to-br from-emerald-500 to-cyan-600">
          <div className="flex items-center mb-4">
            <h1 className="text-5xl font-bold text-white">Bem-vindo a <span className="rainbow-text">MG Wallet</span></h1>
          </div>
          <p className="text-lg">Faça login para gerenciar suas finanças de forma inteligente e eficiente.</p>
        </div>

        {/* Coluna da Direita: Formulário de Login */}
        <div className="p-8 md:p-12">
          <h2 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
            Login
          </h2>
          
          <div className="space-y-6">
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
            <div className="relative flex items-center mt-6">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-400 absolute -top-6 left-0"
              >
                Senha
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 mt-1 bg-gray-700 rounded-lg border-2 border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 flex items-center px-4 text-gray-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="text-right mt-4">
            <a
              href="#"
              className="text-sm font-medium text-gray-400 hover:text-cyan-400"
            >
              Esqueci minha senha
            </a>
          </div>

          <div className="mt-8">
            <button
              onClick={handleLogin}
              className="w-full px-4 py-3 text-lg font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              Entrar
            </button>
          </div>

          <div className="mt-8 text-sm text-center">
            <p className="text-gray-400">
              Não tem uma conta?{' '}
              <a
                href="/signup"
                className="font-medium text-cyan-400 hover:text-cyan-300"
              >
                Crie uma agora
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}