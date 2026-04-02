const sections = [
  {
    id: 'produto',
    eyebrow: 'Direcao',
    title: 'Visao do produto',
    summary:
      'Um painel executivo para conectar investimento em marketing, origem dos resultados e receita em uma leitura simples para tomada de decisao.',
    bullets: [
      'quanto foi investido no Meta Ads',
      'onde esse investimento esta concentrado',
      'quais canais estao gerando vendas fechadas',
      'quanto de receita cada canal esta trazendo',
      'se o investimento em marketing faz sentido olhando para o retorno comercial',
    ],
  },
  {
    id: 'estrutura',
    eyebrow: 'Arquitetura',
    title: 'Estrutura do painel',
    summary:
      'O MVP deve ser pequeno, util e legivel. Quatro areas resolvem a necessidade sem transformar o produto em um cockpit excessivo.',
    bullets: [
      'Visao Geral com KPIs executivos, top canais, resumo e alertas',
      'Meta Ads com investimento por periodo, campanha, conjunto, anuncio e criativo',
      'Marketing + Vendas com receita, vendas e ticket medio por canal',
      'Configuracoes com token Meta, upload de planilhas e status de processamento',
    ],
  },
  {
    id: 'metricas',
    eyebrow: 'Prioridades',
    title: 'Metricas principais',
    summary:
      'Poucas metricas, mas metricas decisivas. O dono do negocio precisa entender retorno, distribuicao de verba e contribuicao dos canais.',
    bullets: [
      'investimento total Meta',
      'receita total',
      'vendas fechadas totais',
      'ticket medio geral e por canal',
      'impressões, alcance, frequencia, CTR, CPC e CPM',
      'resultados, custo por resultado, ROI simples e CAC simples quando houver base confiavel',
    ],
  },
  {
    id: 'meta',
    eyebrow: 'Integracao',
    title: 'Logica de Meta Ads',
    summary:
      'A experiencia de conexao deve ser segura e simples. No MVP, o melhor caminho e sincronizacao manual e leitura executiva dos dados.',
    bullets: [
      'validar token antes de salvar',
      'armazenar token criptografado',
      'nao retornar token em resposta nem logar credenciais',
      'buscar dados de 7, 14 e 30 dias',
      'mostrar campanhas com maior investimento, melhores e piores criativos e sinais de concentracao de verba',
    ],
  },
  {
    id: 'uploads',
    eyebrow: 'Dados comerciais',
    title: 'Upload de Pipedrive e Monde',
    summary:
      'O upload precisa aceitar planilhas reais sem complicar o processo. O backend faz validacao, normalizacao de canais e consolidacao dos resumos.',
    bullets: [
      'canais de origem',
      'quantidade de vendas fechadas por canal',
      'valor vendido por canal',
      'receita total',
      'ticket medio por canal',
      'comparacao entre canais',
      'regra recomendada: Pipedrive para pipeline e Monde para receita confirmada',
    ],
  },
  {
    id: 'tecnico',
    eyebrow: 'Execucao',
    title: 'Recomendacao tecnica do MVP',
    summary:
      'Para este projeto, o caminho mais pragmatica e manter Next.js, API Routes, upload manual, sync manual da Meta e persistencia de resumos consolidados.',
    bullets: [
      'persistir token Meta criptografado',
      'persistir ultima conta de ads selecionada',
      'persistir resumos da Meta por periodo',
      'persistir vendas e receita por canal',
      'evitar atribuicao complexa e excesso de graficos no MVP',
    ],
  },
];

const checklist = [
  'visao geral de marketing e vendas',
  'investimento no Meta',
  'leitura por campanhas e criativos',
  'upload de planilhas',
  'analise de vendas fechadas por canal',
  'panorama consolidado do negocio',
  'simplicidade do MVP',
];

export default function MvpSpecPage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.18),_transparent_32%),linear-gradient(135deg,_#f8fafc,_#eef2ff_42%,_#fff7ed)] p-10 shadow-sm">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="relative max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 backdrop-blur">
            Documento estrategico
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-slate-900">
            Especificacao do MVP do dashboard de marketing e receita
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            Esta pagina resume o que o produto precisa entregar para o dono do negocio: clareza sobre investimento
            em Meta Ads, origem das vendas, receita por canal e leitura consolidada do retorno comercial.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/75 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Foco</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">Decisao executiva</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                O painel deve responder rapido se o investimento esta coerente com o retorno.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Fontes</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">Meta + Pipedrive + Monde</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Midia, vendas fechadas e receita em uma mesma leitura.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tom</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">Simples e estrategico</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sem excesso de graficos ou profundidade tecnica sem utilidade.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Resumo executivo</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">O que esse dashboard precisa resolver</h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
            <p>
              O dashboard nao deve ser um painel tecnico de trafego. Ele deve ser um instrumento de gestao para
              mostrar investimento, distribuicao da verba, vendas fechadas e receita consolidada por canal.
            </p>
            <p>
              A leitura precisa ser feita em minutos. O dono do negocio deve abrir a pagina principal e entender
              imediatamente se o marketing esta sustentando vendas e se a distribuicao do capital esta coerente.
            </p>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-900 p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Perguntas-chave</p>
          <div className="mt-5 space-y-4">
            {[
              'Quanto estamos investindo no Meta?',
              'Onde esse investimento esta sendo feito?',
              'Quais canais trazem vendas fechadas?',
              'Quanto cada canal gera de receita?',
              'O investimento em marketing esta fazendo sentido?',
            ].map(question => (
              <div key={question} className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                {question}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        {sections.map((section, index) => (
          <article
            key={section.id}
            className="grid gap-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm lg:grid-cols-[220px_1fr]"
          >
            <div className="bg-slate-950 px-6 py-7 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{section.eyebrow}</p>
              <div className="mt-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold">
                {String(index + 1).padStart(2, '0')}
              </div>
            </div>
            <div className="px-7 py-7">
              <h3 className="text-2xl font-semibold text-slate-900">{section.title}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{section.summary}</p>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {section.bullets.map(item => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-emerald-200 bg-[linear-gradient(135deg,_#ecfdf5,_#f0fdf4_45%,_#ffffff)] p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">Validacao</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">Checklist final do pedido</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Esta revisao confirma que a especificacao cobre a visao geral do negocio, a leitura de Meta Ads, os
          uploads comerciais e a simplicidade desejada para o MVP.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {checklist.map(item => (
            <div
              key={item}
              className="rounded-2xl border border-emerald-200 bg-white px-4 py-4 text-sm font-medium text-slate-700 shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
