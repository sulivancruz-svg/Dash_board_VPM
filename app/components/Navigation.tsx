'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { DATE_RANGE_EVENT, withCurrentDateRange } from '@/lib/date-range';

export function Navigation() {
  const pathname = usePathname();
  const [queryVersion, setQueryVersion] = useState(-1);

  useEffect(() => {
    const updateLinks = () => setQueryVersion((value) => value + 1);
    window.addEventListener(DATE_RANGE_EVENT, updateLinks);
    window.addEventListener('popstate', updateLinks);
    updateLinks();

    return () => {
      window.removeEventListener(DATE_RANGE_EVENT, updateLinks);
      window.removeEventListener('popstate', updateLinks);
    };
  }, []);

  const navItems = [
    { href: '/dashboard', label: 'Visão Geral' },
    { href: '/dashboard/sellers', label: 'Vendedores' },
    { href: '/dashboard/clients', label: 'Clientes' },
    { href: '/dashboard/products', label: 'Produtos' },
    { href: '/dashboard/behavioral', label: 'Comportamento' },
    { href: '/dashboard/comparison', label: 'Comparação' },
    { href: '/dashboard/raw', label: 'Dados Brutos' },
    { href: '/dashboard/settings', label: 'Configurações' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-cyan-400/20 bg-[#061427]/95 text-white backdrop-blur">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-44 shrink-0 items-center justify-center rounded bg-white px-3 py-2">
              <Image
                src="/vai-pro-mundo-logo.svg"
                alt="Vai Pro Mundo"
                width={176}
                height={56}
                priority
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Dashboard Corporativo</h1>
              <p className="text-xs text-cyan-100/70">Vendas, clientes e performance comercial</p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const href = queryVersion >= 0 ? withCurrentDateRange(item.href) : item.href;

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`whitespace-nowrap rounded px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-emerald-400 text-[#061427]'
                      : 'text-cyan-100/80 hover:bg-white/10 hover:text-white'
                  }`}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
