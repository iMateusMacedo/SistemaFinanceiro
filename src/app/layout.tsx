'use client';

import { useState } from 'react';
import { Roboto } from "next/font/google";
import "./globals.css";
import SideBar from "@/components/SideBar";
import { usePathname } from "next/navigation";
import { Menu } from 'lucide-react';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const showSidebar = pathname !== '/' && pathname !== '/signup';
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <html lang="pt-BR">
      <body className={`${roboto.className} bg-gray-900`}>
        <div className="relative min-h-screen md:flex">
          {/* Overlay for mobile */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black opacity-50 z-20 md:hidden"
              onClick={toggleMobileMenu}
            ></div>
          )}

          {showSidebar && <SideBar isMobileMenuOpen={isMobileMenuOpen} toggleMobileMenu={toggleMobileMenu} />}
          
          <main className={`flex-grow ${showSidebar ? 'md:ml-64' : ''}`}>
            {showSidebar && (
              <header className="p-4 md:hidden flex justify-between items-center bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
                <h1 className="text-2xl font-bold rainbow-text">
                  MG Wallet
                </h1>
                <button onClick={toggleMobileMenu} className="text-gray-400 hover:text-white">
                  <Menu className="w-6 h-6" />
                </button>
              </header>
            )}
            <div>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
