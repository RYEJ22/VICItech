import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 15;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

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

function isChatMessage(value: unknown): value is { role: 'user' | 'assistant'; content: string } {
  if (!isRecord(value)) return false;
  const message = value;
  return (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' && message.content.length > 0 && message.content.length <= 4000;
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
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

  let catalog = 'Katalog saat ini belum dapat dimuat.';
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('title, category, price, stock_status, specs')
      .eq('seller_type', 'vicitech')
      .neq('stock_status', 'sold_out')
      .order('updated_at', { ascending: false })
      .limit(80);
    if (!error && data) {
      catalog = data.map((product) => {
        const specs = product.specs && typeof product.specs === 'object' && !Array.isArray(product.specs)
          ? Object.entries(product.specs).map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`).join(', ')
          : '';
        return `- ${product.title} | ${product.category} | Rp${product.price.toLocaleString('id-ID')} | stok: ${product.stock_status}${specs ? ` | spesifikasi: ${specs}` : ''}`;
      }).join('\n') || 'Belum ada produk tersedia di katalog.';
    }
  } catch {
    // The consultation remains available, with an explicit catalog status in its context.
  }

  const systemInstruction = `Kamu adalah "ViciTech AI — Konsultan Rakitan & Hardware". Jawab secara alami, ringkas, dan jelas dalam Bahasa Indonesia. Bantu merencanakan rakitan PC berdasarkan anggaran dan penggunaan, mengecek kompatibilitas upgrade RAM/NVMe laptop berdasarkan model dan spesifikasi yang diberikan, serta menjelaskan bottleneck hardware dengan mudah. Jangan mengarang kompatibilitas, stok, atau harga; gunakan katalog di bawah, jelaskan bila data tidak tersedia, dan sebutkan harga akurat dalam Rupiah. Setiap unit/rakitan ViciTech melewati IoT Burn-In & Telemetry QC serta mendapat sertifikat serial unik sebelum dikirim. Pembayaran mendukung DP (Down Payment) atau Full Payment melalui Midtrans. Fokus hanya pada hardware PC/laptop/periferal dan layanan ViciTech; tolak permintaan di luar topik dengan sopan.\n\nKATALOG ViciTech:\n${catalog}`;

  let upstream: Response;
  try {
    upstream = await fetch(`${GEMINI_ENDPOINT}&key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: rawMessages.map((message) => {
          if (!isChatMessage(message)) throw new Error('Pesan tidak valid');
          const item = message;
          const geminiMessage: ChatMessage = {
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.content }],
          };
          return geminiMessage;
        }),
        generationConfig: { temperature: 0.45, maxOutputTokens: 1200 },
      }),
      signal: request.signal,
    });
  } catch {
    return NextResponse.json({ error: 'Konsultan AI sedang sulit dijangkau. Silakan coba lagi.' }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Konsultan AI belum dapat menjawab saat ini. Silakan coba lagi.' }, { status: 502 });
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
                  if (text) controller.enqueue(encoder.encode(text));
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
                  if (text) controller.enqueue(encoder.encode(text));
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
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' } });
}
