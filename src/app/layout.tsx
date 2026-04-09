import type { Metadata } from 'next';
import './globals.css';
import { SidebarBrand } from '@/components/sidebar-brand';
import { SessionProviderWrapper } from '@/components/session-provider-wrapper';

export const metadata: Metadata = {
  title: 'Dashboard de Marketing & Receita',
  description: 'Analise estrategica de campanha, SDR e pipeline comercial',
};

const navItems = [
  { href: '/', label: 'Visao Executiva', icon: 'AE' },
  { href: '/paid-media', label: 'Midia Paga', icon: 'MP' },
  { href: '/pipedrive-direct', label: 'Pipedrive Direto', icon: 'PD' },
  { href: '/funnel', label: 'Funil Comercial', icon: 'FC' },
  { href: '/channels', label: 'Canais e Receita', icon: 'CR' },
  { href: '/intelligence', label: 'Inteligencia', icon: '✦' },
  { href: '/historical-imports', label: 'Uploads Historicos', icon: 'UH' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <SessionProviderWrapper>
          <div className="flex h-screen overflow-hidden">
            <aside className="w-60 flex-shrink-0 bg-slate-900 flex flex-col">
              <div className="px-5 py-6 border-b border-slate-700/60">
                <SidebarBrand />
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest px-3 mb-3">
                  Analise
                </p>
                {navItems.map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
                  >
                    <span className="w-7 h-7 rounded-md bg-slate-800 text-[11px] font-semibold flex items-center justify-center">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </a>
                ))}
              </nav>

              <div className="px-3 py-4 border-t border-slate-700/60">
                <a
                  href="/settings"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
                >
                  <span className="w-7 h-7 rounded-md bg-slate-800 text-[11px] font-semibold flex items-center justify-center">
                    ST
                  </span>
                  <span>Configuracoes</span>
                </a>
              </div>
            </aside>

            <main className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-8 py-8">{children}</div>
            </main>
          </div>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
