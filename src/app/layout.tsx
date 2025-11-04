'use client';

import { Roboto } from "next/font/google";
import "./globals.css";
import SideBar from "@/components/SideBar";
import { usePathname } from "next/navigation";

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
  const showSidebar = pathname !== '/';

  return (
    <html lang="pt-BR">
      <body className={`${roboto.className} flex`}>
        {showSidebar && <SideBar />}
        <main className="flex-grow">{children}</main>
      </body>
    </html>
  );
}
