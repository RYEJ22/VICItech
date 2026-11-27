import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 15;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen', 'gemini-2.5-flash-lite'] as const;
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
    typeof message.content === 'string' && message.content.length <= 4000;
}

type ReplyLanguage = 'id' | 'en';

const ID_SIGNAL_RE =
  /\b(?:apa|apakah|bagaimana|gimana|kenapa|mengapa|berapa|bantu|tolong|saya|aku|kamu|anda|yang|untuk|buat|dengan|atau|dan|dari|di|ke|ini|itu|tidak|gak|nggak|belum|sudah|bisa|mau|ingin|perlu|cocok|bagus|rakit|rakitan|anggaran|harga|cek|jelaskan|rekomendasi|rekomendasikan|pilihan|bandingkan|perbedaan|stok|pengiriman|pembayaran|garansi|spesifikasi|komponen|perangkat|layanan)\b/gi;

const EN_SIGNAL_RE =
  /\b(?:what|which|how|why|when|where|can|could|would|should|help|please|i|my|me|you|your|the|a|an|on|in|of|for|with|and|or|from|to|this|that|is|are|do|does|need|want|looking|recommend|suggest|compare|difference|between|best|build|check|explain|pick|choose|price|pricing|stock|shipping|payment|warranty|compatible|compatibility|components)\b/gi;

function normalizeUiLanguage(raw: unknown): ReplyLanguage {
  return raw === 'en' ? 'en' : 'id';
}

function detectPromptLanguage(text: string, fallback: ReplyLanguage): ReplyLanguage {
  const sample = text.trim();
  if (!sample) return fallback;

  if (/\b(?:bahasa\s+indonesia|jawab\s+(?:dalam\s+)?(?:bahasa\s+)?indo(?:nesia)?|in\s+indonesian)\b/i.test(sample)) {
    return 'id';
  }
  if (/\b(?:in\s+english|reply\s+in\s+english|bahasa\s+inggris|jawab\s+(?:dalam\s+)?(?:bahasa\s+)?inggris)\b/i.test(sample)) {
    return 'en';
  }

  const idScore = (sample.match(ID_SIGNAL_RE) ?? []).length;
  const enScore = (sample.match(EN_SIGNAL_RE) ?? []).length;

  if (enScore > idScore) return 'en';
  if (idScore > enScore) return 'id';
  return fallback;
}

function isFallbackBubble(content: string): boolean {
  return /^(?:Maaf, konsultan AI belum dapat menjawab|Koneksi terputus|Konsultan AI belum dapat menjawab saat ini|Sorry, the AI consultant could not reply right now|Connection interrupted)/i.test(
    content.trim(),
  );
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
  if (!isRecord(payload)) {
    return NextResponse.json({ error: 'Format percakapan tidak valid.' }, { status: 400 });
  }
  const uiLanguage = normalizeUiLanguage(payload.language);
  if (!Array.isArray(payload.messages)) {
    return NextResponse.json(
      { error: uiLanguage === 'en' ? 'Invalid conversation format.' : 'Format percakapan tidak valid.' },
      { status: 400 },
    );
  }
  const rawMessages = payload.messages;
  if (rawMessages.length < 1 || rawMessages.length > 24 || !rawMessages.every(isChatMessage)) {
    return NextResponse.json(
      {
        error:
          uiLanguage === 'en'
            ? 'Invalid message or conversation is too long.'
            : 'Pesan tidak valid atau percakapan terlalu panjang.',
      },
      { status: 400 },
    );
  }
  const normalizedMessages = rawMessages
    .filter((message) => message.content.trim().length > 0 && !isFallbackBubble(message.content))
    .map((message) => ({ role: message.role === 'assistant' ? 'model' as const : 'user' as const, content: message.content.trim() }));
  const firstUserTurn = normalizedMessages.findIndex((message) => message.role === 'user');
  if (firstUserTurn < 0) {
    return NextResponse.json(
      { error: uiLanguage === 'en' ? 'Add a question before sending.' : 'Tambahkan pertanyaan sebelum mengirim.' },
      { status: 400 },
    );
  }
  const cleanMessages = normalizedMessages.slice(firstUserTurn);
  while (cleanMessages.at(-1)?.role === 'model') cleanMessages.pop();

  const latestUserMessage = cleanMessages.at(-1)?.content ?? '';
  const replyLanguage = detectPromptLanguage(latestUserMessage, uiLanguage);

  const catalog = await getCatalogContext();

  const targetLanguageRule =
    replyLanguage === 'en'
      ? 'For this turn, the user wrote in English (or is browsing in English), so reply naturally, concisely, and clearly in English.'
      : 'Untuk giliran ini, pengguna menulis dalam Bahasa Indonesia (atau memakai antarmuka Bahasa Indonesia), jadi jawab secara alami, ringkas, dan jelas dalam Bahasa Indonesia.';

  const systemInstruction = [
    'You are "ViciTech AI — PC Build, Hardware & Production Gear Consultant" ("ViciTech AI — Konsultan Rakitan & Hardware").',
    'LANGUAGE MATCHING RULE (HIGHEST PRIORITY):',
    '- Always match the language of the user\'s latest message: reply in natural, concise English when the user writes in English, and in natural, concise Bahasa Indonesia when the user writes in Indonesian.',
    '- If the user explicitly asks to switch languages (e.g., "reply in English" or "jawab dalam Bahasa Indonesia"), follow their request.',
    `- If the user\'s message is language-neutral (such as a bare part name, spec comparison, or serial code), default to the active UI language (${replyLanguage === 'en' ? 'English' : 'Bahasa Indonesia'}).`,
    `- ${targetLanguageRule}`,
    'TECHNICAL PRECISION & DATA TRANSPARENCY:',
    '- Help users plan PC builds by budget and workload, evaluate laptop RAM/NVMe/SSD upgrade compatibility from their model/specs, explain CPU/GPU bottleneck & +35% PSU headroom, and advise on Camera & Production gear (cameras, lenses, gimbals, lighting, camera rigs/cages, tripods/fluid heads, field monitors).',
    '- Keep standard technical hardware and production terms clear and accurate in both languages (e.g., CPU, GPU, PSU, TDP, bottleneck, DDR4/DDR5, NVMe, shutter count, mount, 1/4"-20, 3/8"-16 ARRI, 15mm rod, fluid head, SDI/HDMI, nits, NIST SP 800-88). Format prices in Rupiah (Rp) and numbers (FPS, °C/°F, W, %) cleanly for tabular reading.',
    '- Never fabricate compatibility, stock, or prices. Use the ViciTech catalog below and clearly state when an item or spec is unavailable.',
    '- Preserve honest data-source labels: explicitly distinguish Live catalog / Live ESP32 telemetry from Simulated / Demo QC profiles and Sample catalog references. Every ViciTech unit undergoes 15-point Hybrid IoT Burn-In & Telemetry QC with a unique serial certificate before shipping. Payments support DP (Down Payment) or Full Payment via Midtrans.',
    '- Stay strictly focused on PC/laptop hardware, peripherals, Camera & Production gear, and ViciTech services; politely decline off-topic requests in the matched language.',
    '',
    `VICITECH CATALOG:\n${catalog}`,
  ].join('\n');

  const contents: ChatMessage[] = cleanMessages.map((message) => ({
    role: message.role,
    parts: [{ text: message.content }],
  }));
  let upstream: Response | null = null;
  const failures: { model: string; status: string; reason: string }[] = [];
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
        generationConfig: { maxOutputTokens: 1200 },
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
      failures.push({ model, status: `HTTP ${response.status}`, reason: cleanReason });
      if (index === GEMINI_MODELS.length - 1) break;
    } catch (error) {
      clearTimeout(timeout);
      request.signal.removeEventListener('abort', abortFromClient);
      if (request.signal.aborted) throw error;
      const timedOut = controller.signal.aborted;
      const reason = timedOut
        ? 'Batas waktu 10 detik terlampaui.'
        : error instanceof Error ? error.message : 'Koneksi ke Google AI gagal.';
      failures.push({ model, status: timedOut ? 'timeout' : 'koneksi gagal', reason: reason.slice(0, 300) });
      if (index === GEMINI_MODELS.length - 1) break;
    }
  }

  if (!upstream?.body) {
    console.error('[api/chat] Semua model Gemini gagal:', failures);
    const diagnostics = failures.map(({ model, status, reason }) => `${model} (${status}): ${reason}`).join(' | ')
      || (replyLanguage === 'en' ? 'No Gemini models are currently available.' : 'Tidak ada model Gemini yang tersedia.');
    const errorPrefix = replyLanguage === 'en' ? 'All Gemini models failed. Details:' : 'Semua model Gemini gagal. Detail:';
    return NextResponse.json({ error: `${errorPrefix} ${diagnostics}` }, { status: 502 });
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
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
}
