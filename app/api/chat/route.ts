import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 15;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.0-flash'] as const;
const CATALOG_TTL_MS = 60_000;
let cachedCatalog: { value: string; expiresAt: number } | null = null;

interface ChatMessage {
  readonly role: 'user' | 'model';
  readonly parts: readonly { readonly text: string }[];
}

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') || 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function takeRateLimit(ip: string): boolean {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
  const current = rateBuckets.get(ip);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

async function getCatalogContext(): Promise<string> {
  if (cachedCatalog && cachedCatalog.expiresAt > Date.now()) return cachedCatalog.value;
  const fallback = 'Katalog saat ini belum dapat dimuat.';
  try {
    const result = await Promise.race([
      (async () => {
        const supabase = await createClient();
        const { data, error } = await supabase.from('products').select('title, category, price, stock_status, specs')
          .eq('seller_type', 'vicitech').neq('stock_status', 'sold_out').order('updated_at', { ascending: false }).limit(80);
        if (error || !data) return fallback;
        return data.map((product) => {
          const specs = product.specs && typeof product.specs === 'object' && !Array.isArray(product.specs)
            ? Object.entries(product.specs).map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`).join(', ') : '';
          return `- ${product.title} | ${product.category} | Rp${product.price.toLocaleString('id-ID')} | stok: ${product.stock_status}${specs ? ` | spesifikasi: ${specs}` : ''}`;
        }).join('\n') || 'Belum ada produk tersedia di katalog.';
      })(),
      new Promise<string>((resolve) => setTimeout(() => resolve(fallback), 2_000)),
    ]);
    cachedCatalog = { value: result, expiresAt: Date.now() + CATALOG_TTL_MS };
    return result;
  } catch { return fallback; }
}

function isChatMessage(value: unknown): value is { role: 'user' | 'assistant'; content: string } {
  if (!isRecord(value)) return false;
  const message = value;
  return (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' && message.content.length > 0 && message.content.length <= 4000;
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'Layanan AI belum dikonfigurasi. Silakan coba lagi nanti.' }, { status: 503 });
  }

  if (!takeRateLimit(getClientIp(request))) {
    return NextResponse.json({ error: 'Batas konsultasi tercapai. Silakan coba lagi dalam satu menit.' }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Pesan tidak dapat dibaca. Silakan kirim ulang.' }, { status: 400 });
  }
  if (!isRecord(payload) || !Array.isArray(payload.messages)) {
    return NextResponse.json({ error: 'Format percakapan tidak valid.' }, { status: 400 });
  }
  const rawMessages = payload.messages;
  if (rawMessages.length < 1 || rawMessages.length > 24 || !rawMessages.every(isChatMessage)) {
    return NextResponse.json({ error: 'Pesan tidak valid atau percakapan terlalu panjang.' }, { status: 400 });
  }

  const catalog = await getCatalogContext();

  const systemInstruction = `Kamu adalah "ViciTech AI — Konsultan Rakitan & Hardware". Jawab secara alami, ringkas, dan jelas dalam Bahasa Indonesia. Bantu merencanakan rakitan PC berdasarkan anggaran dan penggunaan, mengecek kompatibilitas upgrade RAM/NVMe laptop berdasarkan model dan spesifikasi yang diberikan, serta menjelaskan bottleneck hardware dengan mudah. Jangan mengarang kompatibilitas, stok, atau harga; gunakan katalog di bawah, jelaskan bila data tidak tersedia, dan sebutkan harga akurat dalam Rupiah. Setiap unit/rakitan ViciTech melewati IoT Burn-In & Telemetry QC serta mendapat sertifikat serial unik sebelum dikirim. Pembayaran mendukung DP (Down Payment) atau Full Payment melalui Midtrans. Fokus hanya pada hardware PC/laptop/periferal dan layanan ViciTech; tolak permintaan di luar topik dengan sopan.\n\nKATALOG ViciTech:\n${catalog}`;

  const contents = rawMessages.map((message) => {
    const item = message;
    const geminiMessage: ChatMessage = { role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }] };
    return geminiMessage;
  });
  let upstream: Response | null = null;
  let failureReason = 'Tidak ada model Gemini yang tersedia.';
  for (const [index, model] of GEMINI_MODELS.entries()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const abortFromClient = () => controller.abort();
    request.signal.addEventListener('abort', abortFromClient, { once: true });
    try {
      const response = await fetch(`${GEMINI_ENDPOINT}/${model}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: 1200,
          ...(model.startsWith('gemini-3') ? { thinkingLevel: 'minimal' } : { thinkingConfig: { thinkingBudget: 0 } }),
        },
      }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      request.signal.removeEventListener('abort', abortFromClient);
      if (response.ok) {
        upstream = response;
        break;
      }
      const responseText = await response.text();
      let googleMessage = responseText;
      try {
        const errorPayload: unknown = JSON.parse(responseText);
        if (isRecord(errorPayload) && isRecord(errorPayload.error) && typeof errorPayload.error.message === 'string') {
          googleMessage = errorPayload.error.message;
        }
      } catch {
        // Keep the raw response text as the diagnostic when it is not JSON.
      }
      const cleanReason = googleMessage.slice(0, 300) || 'Google API tidak mengembalikan detail error.';
      console.error(`[api/chat] Gemini ${model} gagal: HTTP ${response.status} — ${cleanReason}`);
      failureReason = `HTTP ${response.status}: ${cleanReason}`;
      if ((response.status !== 403 && response.status !== 404) || index === GEMINI_MODELS.length - 1) break;
    } catch (error) {
      clearTimeout(timeout);
      request.signal.removeEventListener('abort', abortFromClient);
      if (request.signal.aborted) throw error;
      failureReason = error instanceof Error ? error.message : 'Koneksi ke Google AI gagal.';
      console.error(`[api/chat] Gemini ${model} gagal: ${failureReason}`);
      if (index === GEMINI_MODELS.length - 1) break;
    }
  }

  if (!upstream?.body) {
    const error = 'Konsultan AI belum dapat menjawab saat ini. Silakan coba lagi.';
    const reason = process.env.NODE_ENV === 'development' ? ` (${failureReason})` : '';
    return NextResponse.json({ error: `${error}${reason}` }, { status: 502 });
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n');
          buffer = events.pop() ?? '';
          for (const line of events) {
            if (!line.startsWith('data:')) continue;
            const json = line.slice(5).trim();
            if (!json || json === '[DONE]') continue;
            try {
              const event: unknown = JSON.parse(json);
              if (isRecord(event) && Array.isArray(event.candidates)) {
                const first = event.candidates[0];
                if (isRecord(first) && isRecord(first.content) && Array.isArray(first.content.parts)) {
                  const text = first.content.parts.flatMap((part) => isRecord(part) && typeof part.text === 'string' ? [part.text] : []).join('');
                  if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              }
            } catch {
              // Ignore incomplete or non-JSON server-sent events.
            }
          }
        }
        if (buffer.startsWith('data:')) {
          const json = buffer.slice(5).trim();
          if (json && json !== '[DONE]') {
            try {
              const event: unknown = JSON.parse(json);
              if (isRecord(event) && Array.isArray(event.candidates)) {
                const first = event.candidates[0];
                if (isRecord(first) && isRecord(first.content) && Array.isArray(first.content.parts)) {
                  const text = first.content.parts.flatMap((part) => isRecord(part) && typeof part.text === 'string' ? [part.text] : []).join('');
                  if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              }
            } catch {
              // Ignore incomplete trailing server-sent events.
            }
          }
        }
        controller.close();
      } catch {
        controller.error(new Error('Aliran jawaban terputus.'));
      } finally {
        reader.releaseLock();
      }
    },
    cancel() {
      void reader.cancel();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
}
