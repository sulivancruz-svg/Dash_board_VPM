'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Visão Geral' },
    { href: '/dashboard/sellers', label: 'Vendedores' },
    { href: '/dashboard/clients', label: 'Clientes' },
    { href: '/dashboard/products', label: 'Produtos' },
    { href: '/dashboard/behavioral', label: 'Comportamento' },
    { href: '/dashboard/comparison', label: 'Comparação' },
    { href: '/dashboard/raw', label: 'Dados Brutos' },
  ];

  return (
    <nav className="bg-blue-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">Dashboard Corporativo</h1>
          </div>
          <div className="flex space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-800 text-white'
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
