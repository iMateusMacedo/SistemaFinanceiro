'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Target, LogOut } from 'lucide-react';

const links = [
  { name: 'Início', href: '/home', icon: Home },
  { name: 'Metas', href: '/goals', icon: Target },
];

export default function SideBar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="flex flex-col w-64 bg-slate-900 text-gray-100">
      <div className="flex items-center justify-center h-20 border-b border-slate-800">
        <h1 className="text-2xl font-bold rainbow-text">
          MG Wallet
        </h1>
      </div>
      <nav className="flex-grow p-4">
        <ul>
          {links.map((link) => {
            const LinkIcon = link.icon;
            return (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className={`flex items-center p-3 my-2 rounded-lg transition-colors ${pathname === link.href ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-slate-800'}`}>
                  <LinkIcon className="w-6 h-6 mr-3" />
                  <span>{link.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center w-full p-3 my-2 rounded-lg transition-colors text-gray-400 border border-transparent hover:text-red-500 hover:border-red-500 font-medium"
        >
          <LogOut className="w-6 h-6 mr-3" />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </div>
  );
}
