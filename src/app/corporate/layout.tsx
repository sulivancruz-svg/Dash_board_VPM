'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Users, TrendingUp, Package, Brain, GitCompare, Database } from 'lucide-react';

const navItems = [
  { href: '/corporate', label: 'Visão Geral', icon: BarChart3 },
  { href: '/corporate/sellers', label: 'Vendedores', icon: Users },
  { href: '/corporate/clients', label: 'Clientes', icon: TrendingUp },
  { href: '/corporate/products', label: 'Produtos', icon: Package },
  { href: '/corporate/behavioral', label: 'Comportamento', icon: Brain },
  { href: '/corporate/comparison', label: 'Comparação', icon: GitCompare },
  { href: '/corporate/raw', label: 'Dados Brutos', icon: Database },
];

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white shadow-lg">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold">Corp Dashboard</h1>
          <p className="text-xs text-gray-400 mt-1">Análise de Vendas</p>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/corporate' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition focus:outline-2 focus:outline-blue-500 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
