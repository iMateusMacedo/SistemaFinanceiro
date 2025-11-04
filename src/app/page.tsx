"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = () => {
    router.push("/home");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-gray-100 font-sans">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
          Login
        </h2>
        <div className="space-y-4">
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
              className="w-full px-3 py-2 mt-1 bg-slate-700/50 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition sm:text-sm"
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
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 bg-slate-700/50 rounded-lg border-2 border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 h-full"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div>
          <button
            onClick={handleLogin}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            Entrar no Sistema
          </button>
        </div>
        <div className="text-sm text-center">
          <a
            href="/signup"
            className="font-medium text-cyan-400 hover:text-cyan-300"
          >
            Criar Nova Conta
          </a>
        </div>
        <div className="text-sm text-center">
          <a
            href="#"
            className="font-medium text-gray-400 hover:text-gray-300"
          >
            Esqueci minha senha
          </a>
        </div>
      </div>
    </div>
  );
}