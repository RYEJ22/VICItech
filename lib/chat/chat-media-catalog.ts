export type EmojiCategoryId = "populer" | "ekspresi" | "tech" | "simbol";

export interface EmojiCategoryMeta {
  readonly id: EmojiCategoryId;
  readonly label: string;
}

export interface ChatEmojiItem {
  readonly char: string;
  readonly label: string;
  readonly keywords: readonly string[];
  readonly category: EmojiCategoryId;
}

export interface ChatGifItem {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly previewUrl: string;
  readonly width: number;
  readonly height: number;
  readonly keywords: readonly string[];
  readonly isFallback: boolean;
}

export type ViciTechStickerVariant =
  | "gg-build"
  | "bottleneck-alert"
  | "fps-max"
  | "burn-in-ok"
  | "deal-market"
  | "thermal-throttling"
  | "pc-sultan"
  | "ngopi-render"
  | "mantap-pol"
  | "upgrade-time";

export interface ViciTechSticker {
  readonly id: ViciTechStickerVariant;
  readonly title: string;
  readonly subtitle: string;
  readonly badge: string;
  readonly accentHex: string;
  readonly surfaceHex: string;
  readonly borderHex: string;
  readonly textHex: string;
  readonly keywords: readonly string[];
}

export type ChatMessageMediaType = "image" | "video" | "gif" | "sticker" | null;

export type ChatMessagePayload =
  | { readonly kind: "sticker"; readonly sticker: ViciTechSticker; readonly caption: string }
  | { readonly kind: "gif"; readonly gifUrl: string; readonly alt: string; readonly caption: string }
  | { readonly kind: "video"; readonly mediaUrls: readonly string[]; readonly caption: string }
  | { readonly kind: "image"; readonly mediaUrls: readonly string[]; readonly caption: string }
  | { readonly kind: "emoji_large"; readonly text: string }
  | { readonly kind: "text"; readonly text: string };

export const EMOJI_CATEGORIES: readonly EmojiCategoryMeta[] = [
  { id: "populer", label: "Populer" },
  { id: "ekspresi", label: "Ekspresi" },
  { id: "tech", label: "Tech & Gaming" },
  { id: "simbol", label: "Simbol" },
] as const;

export const CURATED_EMOJIS: readonly ChatEmojiItem[] = [
  // Populer
  { char: "🔥", label: "Api Mantap", keywords: ["api", "fire", "mantap", "keren", "panas", "hot"], category: "populer" },
  { char: "😂", label: "Ngakak", keywords: ["ketawa", "ngakak", "lucu", "wkwk", "laugh"], category: "populer" },
  { char: "❤️", label: "Suka", keywords: ["hati", "cinta", "suka", "love", "heart"], category: "populer" },
  { char: "👍", label: "Jempol", keywords: ["oke", "mantap", "sip", "bagus", "setuju", "like"], category: "populer" },
  { char: "🙌", label: "Mantul", keywords: ["hore", "keren", "mantul", "salut", "selamat"], category: "populer" },
  { char: "🚀", label: "Roket Kencang", keywords: ["roket", "ngebut", "kencang", "upgrade", "launch"], category: "populer" },
  { char: "🤯", label: "Pecah", keywords: ["kaget", "spek", "dewa", "wow", "mindblown"], category: "populer" },
  { char: "💯", label: "Seratus", keywords: ["seratus", "sempurna", "fix", "top", "100"], category: "populer" },
  { char: "😭", label: "Terharu", keywords: ["nangis", "sedih", "dompet", "harga", "cry"], category: "populer" },
  { char: "🤝", label: "Deal", keywords: ["deal", "sepakat", "barter", "rekber", "collab"], category: "populer" },
  { char: "👀", label: "Intip", keywords: ["lihat", "intip", "pantau", "spill", "eyes"], category: "populer" },
  { char: "✨", label: "Kinclong", keywords: ["bersih", "kinclong", "baru", "mulus", "sparkle"], category: "populer" },
  { char: "🙏", label: "Terima Kasih", keywords: ["makasih", "tolong", "maaf", "thanks", "salam"], category: "populer" },
  { char: "😎", label: "Sultan", keywords: ["sultan", "keren", "cool", "santai", "pede"], category: "populer" },

  // Ekspresi
  { char: "😁", label: "Nyengir", keywords: ["senyum", "senang", "happy", "cengir"], category: "ekspresi" },
  { char: "🤣", label: "Ngakak Parah", keywords: ["ngakak", "ketawa", "guling", "rofl"], category: "ekspresi" },
  { char: "😊", label: "Ramah", keywords: ["senyum", "sopan", "ramah", "halo"], category: "ekspresi" },
  { char: "🥹", label: "Nahan Tangis", keywords: ["terharu", "nahan", "mupeng", "kecil"], category: "ekspresi" },
  { char: "🤔", label: "Mikir Spek", keywords: ["mikir", "bingung", "cek", "banding", "think"], category: "ekspresi" },
  { char: "🧐", label: "Cek Teliti", keywords: ["teliti", "cek", "benchmark", "analisis"], category: "ekspresi" },
  { char: "😅", label: "Waduh", keywords: ["waduh", "keringat", "aman", "lega"], category: "ekspresi" },
  { char: "🫠", label: "Meleleh", keywords: ["thermal", "panas", "meleleh", "overheat", "pasrah"], category: "ekspresi" },
  { char: "🥳", label: "Rakit Baru", keywords: ["pesta", "selamat", "unboxing", "party"], category: "ekspresi" },
  { char: "🫡", label: "Siap Komandan", keywords: ["siap", "komandan", "salut", "oke"], category: "ekspresi" },
  { char: "😤", label: "Serius", keywords: ["serius", "fokus", "gas", "push"], category: "ekspresi" },
  { char: "😴", label: "Nunggu Render", keywords: ["tidur", "ngantuk", "tunggu", "lama"], category: "ekspresi" },

  // Tech & Gaming
  { char: "💻", label: "Laptop & PC", keywords: ["laptop", "pc", "rakit", "kerja", "koding", "coding"], category: "tech" },
  { char: "🖥️", label: "Desktop Monitor", keywords: ["monitor", "desktop", "pc", "layar", "setup"], category: "tech" },
  { char: "⌨️", label: "Keyboard Mekanik", keywords: ["keyboard", "mekanik", "ketik", "gaming"], category: "tech" },
  { char: "🖱️", label: "Mouse Gaming", keywords: ["mouse", "gaming", "dpi", "klik"], category: "tech" },
  { char: "🎮", label: "Controller Game", keywords: ["game", "gaming", "fps", "console", "mabar"], category: "tech" },
  { char: "📱", label: "Smartphone HP", keywords: ["hp", "smartphone", "android", "iphone", "gadget"], category: "tech" },
  { char: "🔋", label: "Baterai Penuh", keywords: ["baterai", "cas", "charging", "daya", "watt"], category: "tech" },
  { char: "⚡", label: "Performa Kencang", keywords: ["listrik", "watt", "tdp", "kilat", "turbo", "oc"], category: "tech" },
  { char: "🌡️", label: "Suhu Thermal", keywords: ["suhu", "temp", "thermal", "burn", "panas", "dingin"], category: "tech" },
  { char: "🧠", label: "Chipset AI", keywords: ["cpu", "prosesor", "otak", "npu", "ai", "smart"], category: "tech" },
  { char: "🛠️", label: "Rakit & Servis", keywords: ["rakit", "obeng", "servis", "bongkar", "mod"], category: "tech" },
  { char: "🎧", label: "Headset Audio", keywords: ["headset", "audio", "iem", "mic", "discord"], category: "tech" },
  { char: "📷", label: "Kamera Sensor", keywords: ["kamera", "foto", "lensa", "ois", "vlog"], category: "tech" },
  { char: "🔌", label: "PSU & Kabel", keywords: ["psu", "kabel", "colokan", "power", "listrik"], category: "tech" },

  // Simbol
  { char: "✅", label: "Lolos QC", keywords: ["lolos", "centang", "aman", "verified", "check", "oke"], category: "simbol" },
  { char: "❌", label: "Batal / Fail", keywords: ["batal", "salah", "silang", "no", "bottleneck"], category: "simbol" },
  { char: "⚠️", label: "Peringatan", keywords: ["awas", "peringatan", "bottleneck", "panas", "warning"], category: "simbol" },
  { char: "💡", label: "Ide Rakit", keywords: ["ide", "saran", "tips", "lampu", "insight"], category: "simbol" },
  { char: "🏷️", label: "Harga Market", keywords: ["harga", "diskon", "promo", "market", "tag"], category: "simbol" },
  { char: "💸", label: "Racun Belanja", keywords: ["duit", "uang", "mahal", "racun", "beli", "checkout"], category: "simbol" },
  { char: "📊", label: "Benchmark", keywords: ["grafik", "skor", "benchmark", "versus", "data"], category: "simbol" },
  { char: "🏆", label: "Juara Tier", keywords: ["juara", "menang", "top", "tier", "winner"], category: "simbol" },
  { char: "⏱️", label: "Waktu Kirim", keywords: ["waktu", "cepat", "jam", "delay", "latency"], category: "simbol" },
  { char: "🇮🇩", label: "Indonesia", keywords: ["indonesia", "id", "indo", "nusantara", "merahputih"], category: "simbol" },
  { char: "🔒", label: "Aman Rekber", keywords: ["aman", "gembok", "privasi", "lock", "rekber"], category: "simbol" },
  { char: "📌", label: "Catat Pin", keywords: ["pin", "catat", "simpan", "penting"], category: "simbol" },
] as const;

export const CURATED_FALLBACK_GIFS: readonly ChatGifItem[] = [
  {
    id: "giphy-gg-thumbs-up",
    title: "Mantap GG Banget",
    url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    previewUrl: "https://media.giphy.com/media/111ebonMs90YLu/200w.gif",
    width: 480,
    height: 360,
    keywords: ["mantap", "gg", "jempol", "bagus", "setuju", "oke", "keren"],
    isFallback: true,
  },
  {
    id: "giphy-fast-typing-cat",
    title: "Ngebut Coding & Benchmark",
    url: "https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif",
    previewUrl: "https://media.giphy.com/media/LmNwrBhejkK9EFP504/200w.gif",
    width: 480,
    height: 270,
    keywords: ["coding", "kencang", "ngebut", "keyboard", "gaming", "pc", "kucing"],
    isFallback: true,
  },
  {
    id: "giphy-hacker-keyboard",
    title: "Mode Rakit & Tweak BIOS",
    url: "https://media.giphy.com/media/13GIgrGdslD9oQ/giphy.gif",
    previewUrl: "https://media.giphy.com/media/13GIgrGdslD9oQ/200w.gif",
    width: 480,
    height: 270,
    keywords: ["bios", "overclock", "hacker", "ketik", "oprek", "tech"],
    isFallback: true,
  },
  {
    id: "giphy-mind-blown",
    title: "Spek Bikin Melongo",
    url: "https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif",
    previewUrl: "https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/200w.gif",
    width: 480,
    height: 270,
    keywords: ["kaget", "wow", "spek", "sultan", "pecah", "mindblown"],
    isFallback: true,
  },
  {
    id: "giphy-shut-up-money",
    title: "Langsung Checkout!",
    url: "https://media.giphy.com/media/sDcfxFDozb3bO/giphy.gif",
    previewUrl: "https://media.giphy.com/media/sDcfxFDozb3bO/200w.gif",
    width: 480,
    height: 270,
    keywords: ["beli", "racun", "market", "checkout", "duit", "uang", "deal"],
    isFallback: true,
  },
  {
    id: "giphy-fire-celebrate",
    title: "Build Lolos Burn-In!",
    url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
    previewUrl: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200w.gif",
    width: 480,
    height: 270,
    keywords: ["selamat", "lolos", "qc", "api", "menang", "juara"],
    isFallback: true,
  },
  {
    id: "giphy-laptop-slam",
    title: "Bottleneck Parah Coy",
    url: "https://media.giphy.com/media/l0HlRnAWXxn0MhKLK/giphy.gif",
    previewUrl: "https://media.giphy.com/media/l0HlRnAWXxn0MhKLK/200w.gif",
    width: 480,
    height: 270,
    keywords: ["lag", "bottleneck", "patah", "kesal", "fps", "error"],
    isFallback: true,
  },
  {
    id: "giphy-pc-overheat",
    title: "Suhu Tembus 95 Derajat",
    url: "https://media.giphy.com/media/NTur7XlVDUdqM/giphy.gif",
    previewUrl: "https://media.giphy.com/media/NTur7XlVDUdqM/200w.gif",
    width: 480,
    height: 360,
    keywords: ["panas", "thermal", "overheat", "api", "throttling", "aman"],
    isFallback: true,
  },
  {
    id: "giphy-deal-handshake",
    title: "Gas Rekber Deal",
    url: "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif",
    previewUrl: "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/200w.gif",
    width: 480,
    height: 270,
    keywords: ["deal", "sepakat", "handshake", "market", "rekber", "bungkus"],
    isFallback: true,
  },
  {
    id: "giphy-thinking-math",
    title: "Hitung Watt & Budget",
    url: "https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif",
    previewUrl: "https://media.giphy.com/media/3o7btPCcdNniyf0ArS/200w.gif",
    width: 480,
    height: 270,
    keywords: ["mikir", "hitung", "psu", "budget", "harga", "banding"],
    isFallback: true,
  },
  {
    id: "giphy-popcorn-versus",
    title: "Nonton Adu Spek VS",
    url: "https://media.giphy.com/media/pUeXcg80cO8I8/giphy.gif",
    previewUrl: "https://media.giphy.com/media/pUeXcg80cO8I8/200w.gif",
    width: 480,
    height: 360,
    keywords: ["versus", "adu", "nonton", "popcorn", "seru", "komparasi"],
    isFallback: true,
  },
  {
    id: "giphy-gaming-pro",
    title: "Fokus Ranked Rata Kanan",
    url: "https://media.giphy.com/media/citBl9yPwnUOs/giphy.gif",
    previewUrl: "https://media.giphy.com/media/citBl9yPwnUOs/200w.gif",
    width: 480,
    height: 270,
    keywords: ["gaming", "mabar", "ranked", "fps", "fokus", "pro"],
    isFallback: true,
  },
  {
    id: "giphy-cat-approve",
    title: "Suhu Aman & Halus",
    url: "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif",
    previewUrl: "https://media.giphy.com/media/MDJ9IbxxvDUQM/200w.gif",
    width: 480,
    height: 360,
    keywords: ["lucu", "aman", "kucing", "suka", "halus", "smooth"],
    isFallback: true,
  },
  {
    id: "giphy-loading-wait",
    title: "Lagi Render Sabar Ya",
    url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
    previewUrl: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/200w.gif",
    width: 480,
    height: 360,
    keywords: ["loading", "render", "tunggu", "sabar", "lama", "proses"],
    isFallback: true,
  },
] as const;

export const VICITECH_STICKERS: readonly ViciTechSticker[] = [
  {
    id: "gg-build",
    title: "GG Build!",
    subtitle: "Rakit Rapi & Seimbang",
    badge: "TIER S+",
    accentHex: "#C2410C",
    surfaceHex: "#FAF9F6",
    borderHex: "#E4E2DD",
    textHex: "#1C1917",
    keywords: ["gg", "build", "rakit", "mantap", "seimbang"],
  },
  {
    id: "bottleneck-alert",
    title: "Bottleneck Alert!",
    subtitle: "Cek Rasio CPU & GPU",
    badge: "ANALISIS",
    accentHex: "#B45309",
    surfaceHex: "#FFFBEB",
    borderHex: "#FDE68A",
    textHex: "#78350F",
    keywords: ["bottleneck", "cpu", "gpu", "alert", "cek"],
  },
  {
    id: "fps-max",
    title: "FPS Rata Kanan",
    subtitle: "144+ FPS Ultra Ready",
    badge: "GAMING",
    accentHex: "#15803D",
    surfaceHex: "#F0FDF4",
    borderHex: "#BBF7D0",
    textHex: "#14532D",
    keywords: ["fps", "gaming", "ultra", "kencang", "mabar"],
  },
  {
    id: "burn-in-ok",
    title: "Burn-In Lolos",
    subtitle: "Suhu & Stabilitas Aman",
    badge: "IOT QC",
    accentHex: "#0369A1",
    surfaceHex: "#F0F9FF",
    borderHex: "#BAE6FD",
    textHex: "#0C4A6E",
    keywords: ["burn", "qc", "iot", "lolos", "stabil", "aman"],
  },
  {
    id: "deal-market",
    title: "Sikat Market!",
    subtitle: "Harga Worth It Banget",
    badge: "DEAL",
    accentHex: "#C2410C",
    surfaceHex: "#FFF7ED",
    borderHex: "#FED7AA",
    textHex: "#7C2D12",
    keywords: ["market", "deal", "murah", "worth", "beli"],
  },
  {
    id: "thermal-throttling",
    title: "Panas Coy!",
    subtitle: "Saatnya Repaste & Airflow",
    badge: "THERMAL",
    accentHex: "#BE123C",
    surfaceHex: "#FFF1F2",
    borderHex: "#FECDD3",
    textHex: "#881337",
    keywords: ["panas", "thermal", "throttling", "kipas", "repaste"],
  },
  {
    id: "pc-sultan",
    title: "Spec Sultan",
    subtitle: "High-End Tanpa Kompromi",
    badge: "FLAGSHIP",
    accentHex: "#92400E",
    surfaceHex: "#FEFCE8",
    borderHex: "#FEF08A",
    textHex: "#713F12",
    keywords: ["sultan", "flagship", "mahal", "mewah", "high"],
  },
  {
    id: "ngopi-render",
    title: "Ngopi Dulu",
    subtitle: "Lagi Export & Compile",
    badge: "AFK",
    accentHex: "#57534E",
    surfaceHex: "#F5F5F4",
    borderHex: "#D6D3D1",
    textHex: "#1C1917",
    keywords: ["ngopi", "kopi", "render", "tunggu", "compile"],
  },
  {
    id: "mantap-pol",
    title: "Mantap Pol!",
    subtitle: "Approved Komunitas ID",
    badge: "TOP PICK",
    accentHex: "#C2410C",
    surfaceHex: "#FAF9F6",
    borderHex: "#E4E2DD",
    textHex: "#1C1917",
    keywords: ["mantap", "top", "komunitas", "setuju", "oke"],
  },
  {
    id: "upgrade-time",
    title: "Saatnya Upgrade",
    subtitle: "Gas Compare di VS Mode",
    badge: "NEXT RIG",
    accentHex: "#334155",
    surfaceHex: "#F8FAFC",
    borderHex: "#CBD5E1",
    textHex: "#0F172A",
    keywords: ["upgrade", "baru", "versus", "compare", "rakit"],
  },
] as const;

const STICKER_BY_ID: ReadonlyMap<string, ViciTechSticker> = new Map(
  VICITECH_STICKERS.map((sticker) => [sticker.id, sticker]),
);

const STICKER_TOKEN_PATTERN = /^\[\[vt:sticker:([a-z0-9-]+)\]\]$/;

export function encodeStickerContent(stickerId: ViciTechStickerVariant): string {
  return `[[vt:sticker:${stickerId}]]`;
}

export function extractStickerId(content: string | null | undefined): string | null {
  if (typeof content !== "string") return null;
  const trimmed = content.trim();
  const match = STICKER_TOKEN_PATTERN.exec(trimmed);
  const captured = match?.[1];
  return captured ?? null;
}

export function findViciTechStickerById(
  stickerId: string | null | undefined,
): ViciTechSticker | null {
  if (!stickerId) return null;
  return STICKER_BY_ID.get(stickerId) ?? null;
}

export function filterChatEmojis(
  query: string,
  category?: EmojiCategoryId,
): readonly ChatEmojiItem[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length > 0) {
    return CURATED_EMOJIS.filter(
      (item) =>
        item.char === normalized ||
        item.label.toLowerCase().includes(normalized) ||
        item.keywords.some((kw) => kw.includes(normalized)),
    );
  }
  if (!category) return CURATED_EMOJIS;
  return CURATED_EMOJIS.filter((item) => item.category === category);
}

export function filterFallbackGifs(query: string): readonly ChatGifItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return CURATED_FALLBACK_GIFS;
  const matched = CURATED_FALLBACK_GIFS.filter(
    (item) =>
      item.title.toLowerCase().includes(normalized) ||
      item.keywords.some((kw) => kw.includes(normalized)),
  );
  return matched;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isAllowedGiphyMediaUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "giphy.com" || host.endsWith(".giphy.com");
  } catch {
    return false;
  }
}

function readGiphyRendition(
  imagesRecord: Record<string, unknown>,
  key: string,
): { url: string; width: number; height: number } | null {
  const rendition = imagesRecord[key];
  if (!isRecord(rendition)) return null;
  const url = typeof rendition["url"] === "string" ? rendition["url"].trim() : "";
  if (!url || !isAllowedGiphyMediaUrl(url)) return null;
  const widthNum = Number(rendition["width"]);
  const heightNum = Number(rendition["height"]);
  return {
    url,
    width: Number.isFinite(widthNum) && widthNum > 0 ? widthNum : 240,
    height: Number.isFinite(heightNum) && heightNum > 0 ? heightNum : 180,
  };
}

function parseGiphyResponseItem(raw: unknown): ChatGifItem | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw["id"] === "string" ? raw["id"].trim() : "";
  const images = raw["images"];
  if (!id || !isRecord(images)) return null;

  const full =
    readGiphyRendition(images, "fixed_width") ??
    readGiphyRendition(images, "downsized_medium") ??
    readGiphyRendition(images, "original");
  if (!full) return null;

  const preview =
    readGiphyRendition(images, "fixed_width_small") ??
    readGiphyRendition(images, "fixed_width") ??
    full;

  const rawTitle = typeof raw["title"] === "string" ? raw["title"].trim() : "";
  return {
    id,
    title: rawTitle || "GIF Reaksi",
    url: full.url,
    previewUrl: preview.url,
    width: full.width,
    height: full.height,
    keywords: [],
    isFallback: false,
  };
}

export interface FetchChatGifsOptions {
  readonly query: string;
  readonly apiKey?: string;
  readonly signal?: AbortSignal;
  readonly limit?: number;
}

export interface FetchChatGifsResult {
  readonly items: readonly ChatGifItem[];
  readonly source: "giphy" | "fallback";
}

export async function fetchChatGifs(
  options: FetchChatGifsOptions,
): Promise<FetchChatGifsResult> {
  const trimmedQuery = options.query.trim();
  const apiKey = options.apiKey?.trim() ?? "";
  if (!apiKey) {
    return {
      items: filterFallbackGifs(trimmedQuery),
      source: "fallback",
    };
  }

  const limit = Math.min(Math.max(options.limit ?? 18, 1), 24);
  const endpoint = trimmedQuery
    ? "https://api.giphy.com/v1/gifs/search"
    : "https://api.giphy.com/v1/gifs/trending";
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: String(limit),
    rating: "g",
    lang: "id",
  });
  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: "GET",
      signal: options.signal ?? null,
    });
    if (!response.ok) {
      return {
        items: filterFallbackGifs(trimmedQuery),
        source: "fallback",
      };
    }

    const json: unknown = await response.json();
    if (!isRecord(json) || !Array.isArray(json["data"])) {
      return {
        items: filterFallbackGifs(trimmedQuery),
        source: "fallback",
      };
    }

    const parsed: ChatGifItem[] = [];
    for (const entry of json["data"]) {
      const item = parseGiphyResponseItem(entry);
      if (item) parsed.push(item);
    }

    if (parsed.length === 0) {
      return {
        items: filterFallbackGifs(trimmedQuery),
        source: "fallback",
      };
    }

    return {
      items: parsed,
      source: "giphy",
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return {
      items: filterFallbackGifs(trimmedQuery),
      source: "fallback",
    };
  }
}

function isEmojiJoinerOrModifier(cp: number): boolean {
  return (
    cp === 0x200d || // Zero-width joiner
    cp === 0xfe0f || // Variation selector-16
    cp === 0xfe0e || // Variation selector-15
    cp === 0x20e3 || // Combining enclosing keycap
    (cp >= 0x1f3fb && cp <= 0x1f3ff) // Fitzpatrick skin tone modifiers
  );
}

function isRegionalIndicator(cp: number): boolean {
  return cp >= 0x1f1e6 && cp <= 0x1f1ff;
}

function isEmojiBaseCodePoint(cp: number): boolean {
  return (
    (cp >= 0x1f300 && cp <= 0x1faff) || // Misc Symbols & Pictographs .. Symbols Extended-A
    (cp >= 0x2600 && cp <= 0x27bf) || // Misc Symbols & Dingbats
    (cp >= 0x231a && cp <= 0x23ff) || // Watches & Technical symbols
    cp === 0x2b50 || // Star
    cp === 0x2b55 || // Hollow red circle
    cp === 0x2934 ||
    cp === 0x2935 ||
    cp === 0x25aa ||
    cp === 0x25ab ||
    cp === 0x25fb ||
    cp === 0x25fc ||
    cp === 0x25fd ||
    cp === 0x25fe ||
    cp === 0x203c ||
    cp === 0x2049 ||
    cp === 0x00a9 ||
    cp === 0x00ae ||
    cp === 0x2122 ||
    cp === 0x2139 ||
    (cp >= 0x2194 && cp <= 0x21aa) ||
    cp === 0x3030 ||
    cp === 0x303d ||
    cp === 0x3297 ||
    cp === 0x3299
  );
}

export function isEmojiOnlyShortMessage(text: string | null | undefined): boolean {
  if (typeof text !== "string") return false;
  const compact = text.trim().replace(/\s+/g, "");
  if (!compact) return false;

  const chars = Array.from(compact);
  let emojiCount = 0;
  let afterZwj = false;
  let pendingRegionalPair = false;

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (!ch) continue;
    const cp = ch.codePointAt(0);
    if (cp === undefined) return false;

    if (cp === 0x200d) {
      if (emojiCount === 0) return false;
      afterZwj = true;
      pendingRegionalPair = false;
      continue;
    }

    if (isEmojiJoinerOrModifier(cp)) {
      if (cp === 0x20e3) {
        // Keycap sequences like 1️⃣ start with ASCII digit/hash/star — reject plain digits elsewhere
        if (emojiCount === 0) return false;
      } else if (emojiCount === 0) {
        return false;
      }
      continue;
    }

    if (isRegionalIndicator(cp)) {
      afterZwj = false;
      if (pendingRegionalPair) {
        pendingRegionalPair = false;
      } else {
        pendingRegionalPair = true;
        emojiCount += 1;
      }
      if (emojiCount > 3) return false;
      continue;
    }

    pendingRegionalPair = false;

    if (isEmojiBaseCodePoint(cp)) {
      if (!afterZwj) {
        emojiCount += 1;
        if (emojiCount > 3) return false;
      }
      afterZwj = false;
      continue;
    }

    // Allow keycap base digits `#`, `*`, `0`-`9` ONLY when immediately followed by U+FE0F? + U+20E3
    const nextCp = chars[i + 1]?.codePointAt(0);
    const nextNextCp = chars[i + 2]?.codePointAt(0);
    const isKeycapBase =
      (cp === 0x23 || cp === 0x2a || (cp >= 0x30 && cp <= 0x39)) &&
      (nextCp === 0x20e3 || (nextCp === 0xfe0f && nextNextCp === 0x20e3));
    if (isKeycapBase) {
      emojiCount += 1;
      afterZwj = false;
      if (emojiCount > 3) return false;
      continue;
    }

    return false;
  }

  return emojiCount >= 1 && emojiCount <= 3 && !pendingRegionalPair && !afterZwj;
}

export interface InsertTextAtCursorOptions {
  readonly value: string;
  readonly selectionStart: number | null | undefined;
  readonly selectionEnd: number | null | undefined;
  readonly insertText: string;
  readonly maxLength?: number;
}

export interface InsertTextAtCursorResult {
  readonly nextValue: string;
  readonly nextCursor: number;
}

export function insertTextAtCursor(
  options: InsertTextAtCursorOptions,
): InsertTextAtCursorResult {
  const { value, insertText, maxLength = 4000 } = options;
  const rawStart = typeof options.selectionStart === "number" ? options.selectionStart : value.length;
  const rawEnd = typeof options.selectionEnd === "number" ? options.selectionEnd : rawStart;
  const start = Math.max(0, Math.min(rawStart, value.length));
  const end = Math.max(start, Math.min(rawEnd, value.length));

  const candidate = value.slice(0, start) + insertText + value.slice(end);
  if (candidate.length > maxLength) {
    return {
      nextValue: value,
      nextCursor: end,
    };
  }
  return {
    nextValue: candidate,
    nextCursor: start + insertText.length,
  };
}

function isGifUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  return /\.gif(\?|$)/.test(normalized) || isAllowedGiphyMediaUrl(normalized);
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url.trim());
}

export interface ParseChatMessageInput {
  readonly content?: string | null;
  readonly mediaUrls?: readonly string[] | null;
  readonly mediaType?: string | null;
}

export function parseChatMessagePayload(
  input: ParseChatMessageInput,
): ChatMessagePayload {
  const rawContent = typeof input.content === "string" ? input.content : "";
  const trimmed = rawContent.trim();
  const cleanUrls = Array.isArray(input.mediaUrls)
    ? input.mediaUrls.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    : [];

  const stickerId = extractStickerId(trimmed);
  if (stickerId) {
    const sticker = findViciTechStickerById(stickerId);
    if (sticker) {
      return {
        kind: "sticker",
        sticker,
        caption: "",
      };
    }
  }

  if (input.mediaType === "sticker" && cleanUrls.length === 0 && !stickerId) {
    return {
      kind: "text",
      text: rawContent,
    };
  }

  if (cleanUrls.length > 0) {
    const firstUrl = cleanUrls[0];
    if (
      firstUrl &&
      (input.mediaType === "gif" ||
        (cleanUrls.length === 1 && isGifUrl(firstUrl)))
    ) {
      return {
        kind: "gif",
        gifUrl: firstUrl,
        alt: trimmed || "GIF Reaksi",
        caption: trimmed,
      };
    }

    if (
      input.mediaType === "video" ||
      cleanUrls.some((url) => isVideoUrl(url))
    ) {
      return {
        kind: "video",
        mediaUrls: cleanUrls,
        caption: trimmed,
      };
    }

    return {
      kind: "image",
      mediaUrls: cleanUrls,
      caption: trimmed,
    };
  }

  if (isEmojiOnlyShortMessage(trimmed)) {
    return {
      kind: "emoji_large",
      text: trimmed,
    };
  }

  return {
    kind: "text",
    text: rawContent,
  };
}

export function formatChatMessagePreview(
  input: ParseChatMessageInput & { readonly fallback?: string },
): string {
  const parsed = parseChatMessagePayload(input);
  switch (parsed.kind) {
    case "sticker":
      return `[Stiker] ${parsed.sticker.title}`;
    case "gif":
      return parsed.caption ? `[GIF] ${parsed.caption}` : "[GIF]";
    case "video":
      return parsed.caption || "[Video]";
    case "image":
      return parsed.caption || "[Foto]";
    case "emoji_large":
    case "text": {
      const trimmed = parsed.text.trim();
      if (trimmed) return trimmed;
      return input.fallback ?? "";
    }
  }
}
