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
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-700/50 bg-gradient-to-b from-slate-900 to-slate-950 backdrop-blur-xl shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-6 bg-gradient-to-b from-cyan-400 to-purple-400 rounded" />
            <h1 className="text-2xl font-bold text-white">Corp</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium">Dashboard Corporativo</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/corporate' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500 group ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon
                  size={20}
                  className={`transition-colors duration-200 ${
                    isActive
                      ? 'text-cyan-400'
                      : 'text-slate-500 group-hover:text-cyan-400'
                  }`}
                />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/30">
            <p className="text-xs text-slate-400 font-semibold">Status</p>
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              Online
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
