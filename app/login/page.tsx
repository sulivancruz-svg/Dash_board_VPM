'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { FormEvent, Suspense, useState } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || 'Nao foi possivel entrar.');
      }

      const destination = searchParams.get('from') || '/dashboard';
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#12345B_0,#07182D_42%,#051121_100%)] px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded border border-cyan-400/20 bg-[#061427]/95 p-8 shadow-2xl shadow-black/30">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-16 w-48 shrink-0 items-center justify-center rounded bg-white px-3 py-2">
            <Image
              src="/vai-pro-mundo-logo.svg"
              alt="Vai Pro Mundo"
              width={192}
              height={64}
              priority
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Dashboard Corporativo</h1>
          <p className="mt-2 text-sm text-cyan-100/70">Digite a senha para acessar os indicadores.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-cyan-100/80">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded border border-cyan-400/25 bg-[#0B1F38] px-4 py-3 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              autoFocus
              required
            />
          </label>

          {error && <div className="rounded border border-red-400/40 bg-red-950/70 p-3 text-sm text-red-100">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-emerald-400 px-4 py-3 font-bold text-[#061427] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#12345B_0,#07182D_42%,#051121_100%)] px-4 py-10 text-slate-100">
          <div className="text-cyan-100/70">Carregando...</div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
