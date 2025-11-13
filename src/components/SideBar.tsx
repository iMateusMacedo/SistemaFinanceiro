'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Target, LogOut, X } from 'lucide-react';

const links = [
  { name: 'Início', href: '/home', icon: Home },
  { name: 'Metas', href: '/goals', icon: Target },
];

interface SideBarProps {
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
}

export default function SideBar({ isMobileMenuOpen, toggleMobileMenu }: SideBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    // Fechar o menu móvel antes de deslogar, se estiver aberto
    if (isMobileMenuOpen) {
      toggleMobileMenu();
    }
    router.push('/');
  };

  return (
    <div 
      className={`flex flex-col w-64 bg-slate-900 text-gray-100 fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex items-center justify-between h-20 border-b border-slate-800 px-4">
        <h1 className="text-2xl font-bold rainbow-text">
          MG Wallet
        </h1>
        <button onClick={toggleMobileMenu} className="md:hidden text-gray-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>
      <nav className="flex-grow p-4">
        <ul>
          {links.map((link) => {
            const LinkIcon = link.icon;
            return (
              <li key={link.name}>
                <Link
                  href={link.href}
                  onClick={isMobileMenuOpen ? toggleMobileMenu : undefined}
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
