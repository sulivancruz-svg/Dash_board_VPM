'use client';

import { useState, useRef } from 'react';
import { Brain, Send, Square, Loader } from 'lucide-react';
import type { IntelligenceData } from '@/app/api/data/intelligence/route';

interface Props {
  data: IntelligenceData;
  dateRange?: { start: string; end: string };
}

function buildChips(data: IntelligenceData): string[] {
  const chips: string[] = ['Qual canal tem melhor ROAS?', 'Onde devo investir mais?'];
  if (data.anomalies.totalAlerts > 0) chips.push('O que está causando as anomalias?');
  if (data.googleProjection.hasEnoughData) chips.push('Como está o ROAS do Google Ads?');
  if (data.efficiencyScores.length > 1) chips.push('Compare Google Ads e Meta Ads');
  return chips;
}

export function IntelligenceChat({ data, dateRange }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer]     = useState('');
  const [loading, setLoading]   = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const chips = buildChips(data);

  const submit = async (q: string) => {
    const text = q.trim();
    if (!text || loading) return;

    setQuestion('');
    setAnswer('');
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/ai/intelligence-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          dateRange: dateRange || { start: '', end: '' }
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        setAnswer(`⚠️ ${err.error ?? 'Erro ao processar pergunta'}`);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAnswer(accumulated);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setAnswer('⚠️ Não foi possível conectar com a IA. Tente novamente.');
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    // loading é resetado pelo finally de submit
  };

  return (
    <div className="bg-white border border-indigo-200 rounded-xl shadow-sm overflow-hidden">
      {/* Input */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit(question)}
            placeholder="Pergunte sobre seus dados..."
            disabled={loading}
            className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition disabled:opacity-50"
          />
          {loading ? (
            <button
              onClick={stop}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
            >
              <Square className="w-3.5 h-3.5" />
              Parar
            </button>
          ) : (
            <button
              onClick={() => submit(question)}
              disabled={!question.trim()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar
            </button>
          )}
        </div>

        {/* Chips — só exibe se não há resposta em andamento */}
        {!answer && !loading && (
          <div className="flex flex-wrap gap-2 mt-2.5 pl-9">
            {chips.map(chip => (
              <button
                key={chip}
                onClick={() => submit(chip)}
                className="text-xs font-medium px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full hover:bg-indigo-100 transition"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resposta */}
      {(answer || loading) && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
          {loading && !answer && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader className="w-3.5 h-3.5 animate-spin" />
              Analisando dados...
            </div>
          )}
          {answer && (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {answer}
              {loading && <span className="inline-block w-1 h-3.5 bg-indigo-500 animate-pulse ml-0.5 align-middle" />}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
