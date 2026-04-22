import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import {
  calculateMetrics,
  filterSalesByDateRange,
  getGoogleSheetsData,
  parseSalesData,
} from '@/lib/google-sheets';
import { buildInsightsPrompt } from '@/lib/insights-prompt';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_CORPORATE_ID;
  const sheetGid = process.env.GOOGLE_SHEETS_CORPORATE_GID;
  const sheetsApiKey = process.env.GOOGLE_SHEETS_CORPORATE_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!spreadsheetId || !sheetGid || !sheetsApiKey) {
    return new Response('Google Sheets configuration missing', { status: 400 });
  }

  if (!anthropicApiKey) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 400 });
  }

  const startDate = req.nextUrl.searchParams.get('startDate');
  const endDate = req.nextUrl.searchParams.get('endDate');

  let sales;
  try {
    const { headers, data } = await getGoogleSheetsData(spreadsheetId, sheetGid, sheetsApiKey);
    sales = filterSalesByDateRange(parseSalesData(data, headers), startDate, endDate);
  } catch (err) {
    return new Response(
      `Falha ao buscar dados: ${err instanceof Error ? err.message : String(err)}`,
      { status: 500 }
    );
  }

  if (sales.length === 0) {
    return new Response('Nenhuma venda encontrada no período selecionado', { status: 400 });
  }

  const metrics = calculateMetrics(sales);
  const avgAdvanceDays =
    Number((sales.reduce((sum, s) => sum + s.advanceDays, 0) / sales.length).toFixed(1));
  const shortNotice = sales.filter((s) => s.advanceDays >= 0 && s.advanceDays <= 7).length;
  const longAdvance = sales.filter((s) => s.advanceDays > 30).length;

  const prompt = buildInsightsPrompt({
    ...metrics,
    startDate: startDate ?? 'início dos registros',
    endDate: endDate ?? 'hoje',
    avgAdvanceDays,
    shortNotice,
    longAdvance,
  });

  const client = new Anthropic({ apiKey: anthropicApiKey });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache',
    },
  });
}
