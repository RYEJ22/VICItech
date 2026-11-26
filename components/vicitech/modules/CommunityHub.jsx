import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import {
  MessageSquare, ThumbsUp, Share2, Tag, User, Users, Award, PenSquare, Search, Image as ImageIcon, Send,
  CheckCircle2, HelpCircle, BookOpen, Cpu, Megaphone, X, LoaderCircle, Video, AlertCircle, Smile,
  Gamepad2, Code2, Palette, Laugh, Flag,
} from "lucide-react";
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { sanitizeSingleLineText, sanitizeUserText } from "@/lib/validation/sanitize-text";
import { insertTextAtCursor } from "@/lib/chat/chat-media-catalog";
import { ChatMediaPicker } from "@/components/chat/ChatMediaPicker";
import {
  CommentGifDisplay,
  CommunityGifPicker,
  encodeCommentGifFallback,
  parseCommentBody,
  sanitizeCommentGifUrl,
} from "./CommunityGifPicker";
import {
  MEDIA_ACCEPT_ATTRIBUTE,
  MAX_IMAGE_ATTACHMENTS,
  formatMediaFileSize,
  uploadMediaFile,
  validateMediaFile,
} from "@/lib/storage/uploadMedia";

const MediaLightbox = dynamic(
  () => import("@/components/vicitech/MediaLightbox").then((mod) => mod.MediaLightbox),
  { ssr: false },
);

/* ───────────────────────── Konfigurasi Kategori & Fallback Sampel ───────────────────────── */

const CATEGORIES = {
  all: { label: "Semua Postingan", icon: MessageSquare },
  hardware: { label: "Hardware & Rakit", icon: Cpu, cls: "border-accent-primary/30 bg-accent-subtle text-accent-hover" },
  gaming: { label: "Gaming & Mabar", icon: Gamepad2, cls: "border-emerald-600/20 bg-emerald-50 text-emerald-800" },
  dev: { label: "Dev & Coding", icon: Code2, cls: "border-default bg-subtle text-primary" },
  creative: { label: "Desain & Kreatif", icon: Palette, cls: "border-accent-primary/25 bg-accent-subtle text-primary" },
  qa: { label: "Tanya Jawab Teknis", icon: HelpCircle, cls: "border-sky-600/20 bg-sky-50 text-sky-800" },
  guide: { label: "Panduan & Diskusi", icon: BookOpen, cls: "border-emerald-600/20 bg-emerald-50 text-emerald-800" },
  meme: { label: "Meme Tech", icon: Laugh, cls: "border-amber-600/20 bg-amber-50 text-amber-800" },
  news: { label: "Pengumuman Resmi", icon: Megaphone, cls: "border-accent-primary bg-accent-primary font-semibold text-white shadow-card" },
};

const CAT_ORDER = ["all", "hardware", "gaming", "dev", "creative", "qa", "guide", "meme", "news"];
const POSTABLE = ["hardware", "gaming", "dev", "creative", "qa", "guide", "meme"];
const hasAdminRole = (...roles) => roles.some((role) => String(role ?? "").trim().toLowerCase() === "admin");

const databaseCategory = {
  hardware: "hardware",
  gaming: "gaming",
  dev: "dev",
  creative: "creative",
  qa: "troubleshooting",
  guide: "general",
  meme: "meme",
  news: "news",
};

const feedCategory = {
  hardware: "hardware",
  build_showcase: "hardware",
  gaming: "gaming",
  dev: "dev",
  creative: "creative",
  troubleshooting: "qa",
  general: "guide",
  meme: "meme",
  news: "news",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === "string" && UUID_RE.test(value);

function mapDatabasePost(row) {
  const category = feedCategory[row.category] || "guide";
  const rawUrls = Array.isArray(row.media_urls)
    ? row.media_urls.filter((url) => typeof url === "string" && url.trim().length > 0)
    : [];
  const rawTags = Array.isArray(row.tags)
    ? row.tags
        .filter((tag) => typeof tag === "string" && tag.trim().length > 0)
        .map((tag) => (tag.startsWith("#") ? tag.trim() : `#${tag.trim()}`))
    : [];
  const mediaType =
    row.media_type === "video" || row.media_type === "image"
      ? row.media_type
      : rawUrls.some((url) => /\.(mp4|webm)(\?|$)/i.test(url))
        ? "video"
        : rawUrls.length > 0
          ? "image"
          : null;
  return {
    id: row.id,
    by: row.user_id || "member",
    cat: category,
    title: row.title,
    body: row.content,
    tags: rawTags,
    isLfg: Boolean(row.is_lfg),
    lfgDetails: row.lfg_details && typeof row.lfg_details === "object" ? row.lfg_details : null,
    createdAt: new Date(row.created_at).getTime(),
    likes: Number(row.likes_count) || 0,
    liked: false,
    comments: [],
    mediaUrls: rawUrls,
    mediaType,
  };
}

const ROLES = {
  tech: { label: "Teknisi Tersertifikasi", cls: "border-emerald-600/20 bg-emerald-50 text-emerald-800", verified: true },
  lab: { label: "Admin Lab CBT", cls: "border-accent-primary/30 bg-accent-subtle text-accent-hover" },
  fan: { label: "Penggemar Hardware", cls: "border-default bg-subtle text-secondary" },
  buyer: { label: "Tim Pengadaan IT", cls: "border-amber-600/20 bg-amber-50 text-amber-800" },
  team: { label: "Tim ViciTech", cls: "border-accent-primary bg-accent-primary text-white", verified: true },
};

const AUTHORS = {
  team: { name: "Tim ViciTech", role: "team" },
  rizky: { name: "Rizky Aditya", role: "tech" },
  dewi: { name: "Dewi Anggraini", role: "tech" },
  hendra: { name: "Hendra Wijaya", role: "lab" },
  sari: { name: "Sari Nugraha", role: "lab" },
  bagas: { name: "Bagas Pratama", role: "fan" },
  nadia: { name: "Nadia Putri", role: "fan" },
  fajar: { name: "Fajar Ramadhan", role: "buyer" },
  you: { name: "Anda", role: "fan" },
};

const ATTACH_SPECS = [["CPU", "AMD Ryzen 5 7600"], ["GPU", "NVIDIA RTX 4060 8 GB"], ["RAM", "16 GB DDR5-5600"], ["Storage", "1 TB NVMe SSD"], ["PSU", "550 W 80+ Bronze"]];
const PROMPTS = {
  hardware: "Ceritakan rakitan atau komponen Anda: daftar part, suhu kerja, dan potensi upgrade. Sertakan tag seperti #RTX4060.",
  gaming: "Bagikan info game, benchmark FPS, atau ajakan mabar (LFG). Tambahkan tag seperti #Valorant atau #LFG.",
  dev: "Diskusikan setup Docker, local LLM, atau integrasi ESP32 Anda. Tambahkan tag seperti #Docker atau #ESP32.",
  creative: "Ceritakan workstation rendering, kalibrasi warna layar, atau workflow 4K Anda. Tambahkan tag seperti #CreatorRig.",
  qa: "Kendala apa yang sedang terjadi? Cantumkan seri perangkat dan gejala lengkap beserta tag seperti #PSU.",
  guide: "Bagikan panduan teknis untuk lab sekolah, kantor, atau perawatan laptop. Tambahkan tag seperti #CBTSetup.",
  meme: "Bagikan momen unik atau humor seputar dunia rakit PC dan oprek hardware. Tambahkan tag seperti #PCMeme.",
};

const mk = (id, by, cat, minsAgo, title, body, likes, comments = [], extra = {}) => ({
  id, by, cat, title, body, tags: [], isLfg: false, lfgDetails: null, likes, liked: false, createdAt: Date.now() - minsAgo * 60000,
  comments: comments.map(([cby, m, text], i) => ({ id: `${id}-c${i + 1}`, by: cby, text, createdAt: Date.now() - m * 60000 })),
  ...extra,
});

const FALLBACK_SAMPLE_POSTS = [
  mk("p1", "team", "news", 35, "Update indeks harga: lini RTX 40-series turun minggu ini",
    "Indeks Harga Hardware harian menunjukkan listing #RTX4060 dan #RTX4070 bergerak lebih rendah minggu ini, sementara stok refurbished #ThinkPadGradeA stabil. Buka Market untuk membandingkan harga terbaru.",
    128, [["bagas", 20, "Pas sekali waktunya, saya memang berencana memesan RTX 4060."]]),
  mk("p3", "bagas", "hardware", 320, "Rakitan esports 1080p di bawah Rp 14 juta",
    "Baru selesai dirakit akhir pekan ini. Mayoritas game esports berjalan di atas 140 FPS pada resolusi 1080p dan suhu terjaga di bawah 65 °C. #RTX4060 #Ryzen5 #BudgetBuild",
    94, [["rizky", 250, "Cable management-nya rapi! PSU 550 W Bronze sudah sangat cukup untuk kombinasi ini."]],
    { cost: 13900000, specs: [["CPU", "AMD Ryzen 5 7600"], ["GPU", "NVIDIA RTX 4060 8 GB"], ["RAM", "16 GB DDR5-5600"], ["Storage", "1 TB NVMe SSD"], ["PSU", "550 W 80+ Bronze"]] }),
  mk("p6", "hendra", "guide", 4300, "Cara mencegah thermal throttling pada lab komputer sekolah",
    "Solusi efektif di lab berisi 36 PC:\n1. Bersihkan filter debu setiap semester.\n2. Lakukan repaste CPU yang usianya di atas 3 tahun.\n3. Jaga suhu ruangan di bawah 28 °C.\n#CBTSetup #ThermalThrottling #LabMaintenance",
    203, [["rizky", 4200, "Repaste memang langkah yang paling sering terlewat sekolah, padahal dampaknya besar."]]),
  mk("p9", "fajar", "qa", 600, "Apakah PSU 350 W cukup untuk Core i5-12400 dengan GTX 1650?",
    "Kami menyiapkan 20 PC kantor dan berencana menambah GPU low-profile di beberapa unit. Perlu naik kapasitas PSU? #PSU #i512400",
    24, [["rizky", 540, "PSU 450 W Bronze memberi ruang efisiensi lebih baik. Cek meteran beban daya di Preset Builder."]]),
];

const TOPIC_GUIDES = [
  { title: "Mencegah Thermal Throttling di Lab Sekolah", q: "thermal" },
  { title: "Panduan Memilih Laptop Refurbished Lolos QC", q: "refurbished" },
  { title: "Menghitung Kapasitas PSU & Bottleneck", q: "psu" },
  { title: "Checklist Jaringan & UPS untuk Lab CBT", q: "cbtsetup" },
];

/* ───────────────────────── Helpers ───────────────────────── */

const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const num = (n) => new Intl.NumberFormat("id-ID").format(n);
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";
const TAG_RE = /#[A-Za-z0-9_]+/g;
const AVATAR_TONES = ["bg-accent-subtle text-accent-hover", "bg-emerald-50 text-emerald-800", "bg-sky-50 text-sky-800", "bg-amber-50 text-amber-800"];

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  if (m < 1440) return `${Math.floor(m / 60)} jam lalu`;
  return `${Math.floor(m / 1440)} hr lalu`;
}

/* ───────────────────────── Small UI pieces ───────────────────────── */

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const usernameHref = (username) =>
  typeof username === "string" && USERNAME_RE.test(username.toLowerCase()) ? `/profile/${encodeURIComponent(username.toLowerCase())}` : "";

function resolveAuthor(key, { currentUser, profiles }) {
  const seed = key !== "you" ? AUTHORS[key] : undefined;
  if (seed) return { ...seed, avatarUrl: "", href: key === "team" ? "" : usernameHref(key), isSelf: false };

  const userId = key === "you" ? currentUser?.id : key;
  const isSelf = key === "you" || (Boolean(userId) && userId === currentUser?.id);
  const profile = userId ? profiles[userId] : undefined;
  const username = profile?.username || (isSelf ? currentUser?.user_metadata?.username : "");
  const avatarUrl = profile?.avatar_url || (isSelf ? currentUser?.user_metadata?.avatar_url : "") || "";

  return {
    name: profile?.display_name || profile?.full_name || username || "Anggota ViciTech",
    role: profile?.role === "admin" ? "team" : "fan",
    avatarUrl,
    href: usernameHref(username),
    isSelf,
  };
}

function Avatar({ author, size = "h-10 w-10" }) {
  const avatar = author.avatarUrl ? (
    <img
      src={author.avatarUrl}
      alt=""
      width={40}
      height={40}
      loading="lazy"
      decoding="async"
      className={`${size} shrink-0 rounded-full border border-default bg-surface object-cover`}
    />
  ) : author.isSelf ? (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-subtle text-primary`}><User className="h-1/2 w-1/2" /></span>
  ) : (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full text-sm font-semibold ${AVATAR_TONES[[...author.name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length]}`} aria-hidden="true">{author.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
  );
  return author.href
    ? <Link href={author.href} aria-label={author.isSelf ? "Lihat profil Anda" : `Lihat profil ${author.name}`} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary">{avatar}</Link>
    : avatar;
}

function RoleBadge({ role }) {
  const r = ROLES[role] || ROLES.fan;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${r.cls}`}>
      {r.verified && <CheckCircle2 className="h-3 w-3" />}{r.label}
    </span>
  );
}

function RichText({ text, onTag }) {
  return text.split(/(#[A-Za-z0-9_]+)/g).map((part, i) =>
    /^#[A-Za-z0-9_]+$/.test(part) ? (
      <button key={i} type="button" onClick={() => onTag(part)} className={`mx-0.5 rounded bg-accent-subtle px-1.5 py-0.5 text-[13px] font-medium text-accent-hover hover:bg-accent-primary/15 ${focusRing}`}>{part}</button>
    ) : part
  );
}

/* ───────────────────────── Post creator ───────────────────────── */

function Composer({ onPublish, sectionRef, titleInputRef, canPublishOfficial }) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("hardware");
  const [body, setBody] = useState("");
  const [attachedSpecs, setAttachedSpecs] = useState(false);
  const [stagedMedia, setStagedMedia] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [publishStage, setPublishStage] = useState("");
  const fileInputRef = useRef(null);
  const stagedMediaRef = useRef([]);
  stagedMediaRef.current = stagedMedia;

  const isPublishing = Boolean(publishStage);
  const tags = useMemo(() => [...new Set(body.match(TAG_RE) ?? [])], [body]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    return () => {
      stagedMediaRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const handleFilesSelected = (event) => {
    const fileList = Array.from(event.target.files || []);
    event.target.value = "";
    if (!fileList.length) return;

    setError("");
    const currentList = [...stagedMedia];

    for (const file of fileList) {
      const validation = validateMediaFile(file);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }

      if (currentList.some((item) => item.mediaType !== validation.mediaType)) {
        setError("Pilih hingga 4 foto ATAU 1 video per postingan (tidak dapat dicampur).");
        return;
      }

      if (validation.mediaType === "video" && currentList.length >= 1) {
        setError("Maksimal 1 video yang dapat dilampirkan dalam satu postingan.");
        return;
      }

      if (validation.mediaType === "image" && currentList.length >= MAX_IMAGE_ATTACHMENTS) {
        setError(`Maksimal ${MAX_IMAGE_ATTACHMENTS} foto dapat dilampirkan dalam satu postingan.`);
        return;
      }

      currentList.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        mediaType: validation.mediaType,
        name: file.name,
        size: file.size,
      });
    }

    setStagedMedia(currentList);
  };

  const removeStagedMedia = (id) => {
    setStagedMedia((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const publish = async () => {
    if (title.trim().length < 5) return setError("Judul postingan minimal 5 karakter.");
    if (body.trim().length < 10) return setError("Tambahkan detail minimal 10 karakter agar anggota lain dapat memahami konteksnya.");
    setPublishStage(stagedMedia.length ? "uploading" : "saving");
    setError("");
    try {
      const published = await onPublish({
        title: title.trim(),
        body: body.trim(),
        cat,
        tags,
        attachedSpecs,
        mediaFiles: stagedMedia,
        onStageChange: setPublishStage,
      });
      if (!published) return;
      stagedMedia.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setTitle("");
      setBody("");
      setAttachedSpecs(false);
      setStagedMedia([]);
      setNotice("Postingan Anda berhasil diterbitkan di bagian atas feed.");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Gagal menerbitkan postingan.");
    } finally {
      setPublishStage("");
    }
  };

  const field = `vt-form-control w-full rounded-lg border border-default bg-canvas px-3.5 py-3 text-sm text-primary placeholder:text-secondary ${focusRing}`;
  return (
    <section
      id="community-composer"
      ref={sectionRef}
      aria-labelledby="composer-title"
      className="scroll-mt-24 rounded-xl border border-default bg-surface p-3.5 shadow-sm sm:p-6"
    >
      <h2 id="composer-title" className="tracking-tight flex items-center gap-2 font-sans text-xl font-bold text-primary">
        <PenSquare className="h-5 w-5 text-accent-primary" /> Bagikan Rakitan atau Ajukan Pertanyaan
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="post-title" className="mb-1.5 block text-sm text-primary">Judul postingan</label>
          <input ref={titleInputRef} id="post-title" value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} maxLength={120} placeholder="cth. Workstation editing 4K senyap di bawah Rp 40 juta" className={field} />
        </div>
        <div>
          <label htmlFor="post-cat" className="mb-1.5 block text-sm text-primary">Kategori</label>
          <select id="post-cat" value={cat} onChange={(e) => setCat(e.target.value)} className={field}>
            {[...POSTABLE, ...(canPublishOfficial ? ["news"] : [])].map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="post-body" className="mb-1.5 block text-sm text-primary">Detail</label>
        <textarea id="post-body" rows={4} value={body} onChange={(e) => { setBody(e.target.value); setError(""); }} placeholder={PROMPTS[cat] || PROMPTS.hardware} className={`${field} resize-y`} />
        {tags.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-secondary">
            <Tag className="h-3.5 w-3.5" /> Tag terdeteksi:
            {tags.map((t) => <span key={t} className="rounded bg-accent-subtle px-1.5 py-0.5 text-accent-hover">{t}</span>)}
          </p>
        )}
      </div>

      {stagedMedia.length > 0 && (
        <div className="mt-3 space-y-2 rounded-xl border border-default bg-canvas p-3">
          <div className="flex items-center justify-between text-xs font-medium text-secondary">
            <span>
              {stagedMedia[0]?.mediaType === "video"
                ? "Lampiran Video Siap Diunggah"
                : `${stagedMedia.length}/${MAX_IMAGE_ATTACHMENTS} Foto Siap Diunggah`}
            </span>
          </div>
          {stagedMedia[0]?.mediaType === "video" ? (
            <div className="relative overflow-hidden rounded-lg border border-default bg-ink">
              <video
                src={stagedMedia[0].previewUrl}
                controls
                muted
                playsInline
                preload="metadata"
                className="max-h-60 w-full object-contain"
              />
              <div className="flex items-center justify-between gap-2 bg-surface px-3 py-2 text-xs text-secondary">
                <span className="truncate font-mono">{stagedMedia[0].name} ({formatMediaFileSize(stagedMedia[0].size)})</span>
                <button
                  type="button"
                  onClick={() => removeStagedMedia(stagedMedia[0].id)}
                  disabled={isPublishing}
                  aria-label="Hapus video lampiran"
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-default text-primary hover:border-status-danger/40 hover:text-status-danger ${focusRing}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {stagedMedia.map((item) => (
                <div key={item.id} className="group relative overflow-hidden rounded-lg border border-default bg-surface">
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeStagedMedia(item.id)}
                    disabled={isPublishing}
                    aria-label={`Hapus ${item.name}`}
                    className={`absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink/80 text-white hover:bg-status-danger ${focusRing}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="truncate px-2 py-1 font-mono text-[10px] text-secondary">
                    {formatMediaFileSize(item.size)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {attachedSpecs && (
        <div className="mt-3 flex gap-3 rounded-lg border border-default bg-canvas p-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-default bg-surface text-accent-primary"><Cpu className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-primary">Contoh Spec Sheet Rakitan</p>
            <p className="text-xs text-secondary">{ATTACH_SPECS.map(([, v]) => v).join(" · ")}</p>
          </div>
          <button type="button" aria-label="Hapus spec sheet" onClick={() => setAttachedSpecs(false)} className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-secondary hover:text-primary ${focusRing}`}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <input
          ref={fileInputRef}
          type="file"
          accept={MEDIA_ACCEPT_ATTRIBUTE}
          multiple
          onChange={handleFilesSelected}
          className="sr-only"
          aria-label="Pilih foto atau video untuk postingan"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPublishing}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-default bg-canvas px-3.5 py-2 text-sm font-medium text-primary transition hover:border-accent-primary/50 hover:text-accent-hover disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
        >
          <ImageIcon className="h-4 w-4 text-accent-primary" aria-hidden="true" />
          <Video className="h-4 w-4 text-accent-primary" aria-hidden="true" />
          <span>Foto / Video</span>
        </button>

        {cat === "hardware" && (
          <button
            type="button"
            onClick={() => setAttachedSpecs((v) => !v)}
            disabled={isPublishing}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition ${focusRing} ${
              attachedSpecs
                ? "border-accent-primary bg-accent-subtle font-medium text-accent-hover"
                : "border-default bg-canvas text-secondary hover:text-primary"
            }`}
          >
            <Cpu className="h-4 w-4" aria-hidden="true" />
            <span>{attachedSpecs ? "Spec Sheet Terlampir" : "Lampirkan Spec Sheet"}</span>
          </button>
        )}

        <button type="button" onClick={() => void publish()} disabled={isPublishing} className={`ml-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-cta-hover disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}>
          {isPublishing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          <span>
            {publishStage === "uploading"
              ? "Mengunggah media…"
              : publishStage === "saving"
                ? "Menerbitkan…"
                : "Terbitkan Postingan"}
          </span>
        </button>
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-secondary">
        Lampiran mendukung hingga {MAX_IMAGE_ATTACHMENTS} foto (JPG/PNG/WebP) atau 1 video (MP4/WebM), maksimal 30 MB per berkas.
      </p>
      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-status-danger/30 bg-red-50 p-3 text-sm text-status-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {notice && <p className="mt-3 flex items-center gap-2 text-sm text-status-live"><CheckCircle2 className="h-4 w-4" /> {notice}</p>}
      </div>
    </section>
  );
}

/* ───────────────────────── Post card ───────────────────────── */

const PostCard = memo(function PostCard({ post, onLike, onComment, onTag, resolve, onOpenMedia }) {
  const [open, setOpen] = useState(false);
  const [mediaUnavailable, setMediaUnavailable] = useState(false);
  const [draft, setDraft] = useState("");
  const [selectedGif, setSelectedGif] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const commentInputRef = useRef(null);
  const commentEmojiTriggerRef = useRef(null);
  const commentGifTriggerRef = useRef(null);
  const commentSelectionRef = useRef({ start: 0, end: 0 });
  const canSubmitComment = (draft.trim().length > 0 || Boolean(selectedGif)) && !submittingComment;
  const author = resolve(post.by);
  const cat = CATEGORIES[post.cat] || CATEGORIES.guide;
  const CatIcon = cat.icon;
  const authorProfile = author.href;
  const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
  const isVideoPost =
    post.mediaType === "video" || mediaUrls.some((url) => /\.(mp4|webm)(\?|$)/i.test(url));
  const extraTags = (post.tags || []).filter((tag) => !post.body.includes(tag));

  useEffect(() => {
    if (!shareNote) return;
    const t = setTimeout(() => setShareNote(""), 2200);
    return () => clearTimeout(t);
  }, [shareNote]);

  const share = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = post.specs
      ? `${post.title}\n${post.specs.map(([k, v]) => `${k}: ${v}`).join("\n")}${post.cost ? `\nTotal: ${idr(post.cost)}` : ""}`
      : `${post.title}\n${origin}/community`;
    try { await navigator.clipboard.writeText(text); setShareNote("Tautan disalin ke papan klip"); }
    catch { setShareNote("Fitur salin tidak tersedia di browser ini"); }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!canSubmitComment) return;
    setSubmittingComment(true);
    try {
      const ok = await onComment(post.id, {
        text: draft.trim(),
        gifUrl: selectedGif?.url || null,
      });
      if (ok) {
        setDraft("");
        setSelectedGif(null);
        setEmojiOpen(false);
        setGifOpen(false);
        commentSelectionRef.current = { start: 0, end: 0 };
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const syncCommentSelection = (target) => {
    if (!target) return;
    commentSelectionRef.current = {
      start: typeof target.selectionStart === "number" ? target.selectionStart : draft.length,
      end: typeof target.selectionEnd === "number" ? target.selectionEnd : draft.length,
    };
  };

  const handleInsertCommentEmoji = (emoji) => {
    const inputEl = commentInputRef.current;
    const rawStart =
      inputEl && document.activeElement === inputEl
        ? inputEl.selectionStart
        : commentSelectionRef.current.start;
    const rawEnd =
      inputEl && document.activeElement === inputEl
        ? inputEl.selectionEnd
        : commentSelectionRef.current.end;

    const { nextValue, nextCursor } = insertTextAtCursor({
      value: draft,
      selectionStart: rawStart,
      selectionEnd: rawEnd,
      insertText: emoji,
      maxLength: 1000,
    });
    commentSelectionRef.current = { start: nextCursor, end: nextCursor };
    setDraft(nextValue);

    if (
      inputEl &&
      typeof window !== "undefined" &&
      !window.matchMedia("(max-width: 767px)").matches
    ) {
      window.requestAnimationFrame(() => {
        inputEl.focus();
        inputEl.setSelectionRange(nextCursor, nextCursor);
      });
    }
  };

  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState("");
  const isOfficialAnnouncement = post.cat === "news";

  const handleReportPost = async (reason) => {
    if (reportSubmitting) return;
    setReportSubmitting(true);
    try {
      if (isSupabaseAuthConfigured) {
        const supabase = getSupabaseBrowserClient();
        await supabase.from("user_feedback").insert({
          category: "Lainnya",
          rating: 3,
          page_module: "Moderasi Komunitas (/community)",
          message: `[LAPORAN KONTEN KOMUNITAS] Postingan "${post.title}" (ID: ${post.id}) dilaporkan dengan alasan: ${reason}.`,
        });
      }
      setReportDone(`Laporan (${reason}) telah dikirim ke tim moderasi ViciTech.`);
      setReportOpen(false);
    } catch {
      setReportDone("Laporan dicatat. Anda juga dapat melaporkannya melalui /feedback.");
      setReportOpen(false);
    } finally {
      setReportSubmitting(false);
    }
  };

  const action = `vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${focusRing}`;
  return (
    <article
      className={`vt-card-lift min-w-0 overflow-hidden rounded-2xl border bg-surface p-4 shadow-sm sm:p-6 ${
        isOfficialAnnouncement
          ? "border-[#EA580C]/40 border-l-4 border-l-[#EA580C]"
          : "border-default"
      }`}
    >
      <header className="flex items-start gap-3">
        <Avatar author={author} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {authorProfile
              ? <Link href={authorProfile} className="break-words font-semibold text-primary hover:text-accent-hover">{author.name}</Link>
              : <span className="break-words font-semibold text-primary">{author.name}</span>}
            <RoleBadge role={author.role} />
            {post.isLfg && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                <Gamepad2 className="h-3 w-3" aria-hidden="true" />
                LFG
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-secondary">{timeAgo(post.createdAt)}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${cat.cls || "border-default bg-subtle text-primary"}`}>
          <CatIcon className="h-3.5 w-3.5" aria-hidden="true" /> {cat.label}
        </span>
      </header>

      <h3 className="tracking-tight mt-3 break-words font-sans text-base font-bold leading-snug text-primary sm:mt-4 sm:text-lg">{post.title}</h3>
      <p className="mt-2 break-words whitespace-pre-line text-sm leading-relaxed text-secondary"><RichText text={post.body} onTag={onTag} /></p>

      {post.isLfg && post.lfgDetails && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-600/20 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <Gamepad2 className="h-4 w-4 text-status-live" aria-hidden="true" />
          <span className="font-semibold">Mabar LFG{post.lfgDetails.game ? ` · ${post.lfgDetails.game}` : ""}</span>
          {post.lfgDetails.rank && <span>· Rank: {post.lfgDetails.rank}</span>}
          {post.lfgDetails.slots_needed && <span>· Sisa {post.lfgDetails.slots_needed} slot</span>}
          {authorProfile && (
            <Link href={authorProfile} className="ml-auto font-semibold text-accent-cta hover:underline">
              Hubungi Host
            </Link>
          )}
        </div>
      )}

      {extraTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {extraTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTag(tag)}
              className={`rounded bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent-hover hover:bg-accent-primary/15 ${focusRing}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {(mediaUrls.length > 0 || post.mediaType) && (mediaUnavailable || mediaUrls.length === 0 ? (
        <div role="status" className="mt-3 grid aspect-video place-items-center rounded-lg border border-dashed border-default bg-canvas px-4 text-center text-xs text-secondary">
          Media tidak tersedia. Postingan tetap dapat dibaca.
        </div>
      ) : (
        isVideoPost ? (
          <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg border border-default bg-ink">
            <video
              src={mediaUrls[0]}
              controls
              playsInline
              preload="metadata"
              onError={() => setMediaUnavailable(true)}
              className="h-full w-full object-contain"
            />
          </div>
        ) : mediaUrls.length === 1 ? (
          <button
            type="button"
            onClick={() => onOpenMedia?.(mediaUrls, 0, post.title)}
            aria-label={`Perbesar gambar dari ${post.title}`}
            className={`mt-3 block aspect-video w-full overflow-hidden rounded-lg border border-default bg-canvas ${focusRing}`}
          >
            <img
              src={mediaUrls[0]}
              alt={post.title}
              width={800}
              height={600}
              loading="lazy"
              decoding="async"
              onError={() => setMediaUnavailable(true)}
              className="h-full w-full object-contain transition hover:opacity-95"
            />
          </button>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {mediaUrls.map((url, idx) => (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => onOpenMedia?.(mediaUrls, idx, post.title)}
                aria-label={`Perbesar gambar ${idx + 1} dari ${post.title}`}
                className={`overflow-hidden rounded-lg border border-default bg-canvas ${focusRing}`}
              >
                <img
                  src={url}
                  alt={`${post.title} (${idx + 1})`}
                  width={480}
                  height={360}
                  loading="lazy"
                  decoding="async"
                  onError={() => setMediaUnavailable(true)}
                  className="aspect-video w-full object-cover transition hover:opacity-95"
                />
              </button>
            ))}
          </div>
        )
      ))}

      {post.attachment && (
        <p className="mt-3 inline-flex max-w-full items-center gap-2 break-all rounded-lg border border-default bg-canvas px-3 py-1.5 text-xs text-secondary"><ImageIcon className="h-3.5 w-3.5 shrink-0" /> {post.attachment}</p>
      )}

      {post.specs && (
        <div className="mt-3 rounded-lg border border-default bg-canvas">
          <p className="flex items-center gap-1.5 border-b border-default px-3 py-2 text-xs text-secondary"><Cpu className="h-3.5 w-3.5 text-accent-primary" /> Rincian Spesifikasi Hardware</p>
          <dl className="grid gap-x-6 px-3 py-2 text-sm sm:grid-cols-2">
            {post.specs.map(([k, v]) => (
              <div key={k} className="flex min-w-0 justify-between gap-3 py-1"><dt className="min-w-0 break-words text-secondary">{k}</dt><dd className="min-w-0 break-words text-right text-primary">{v}</dd></div>
            ))}
          </dl>
          {post.cost && <p className="flex justify-between border-t border-default px-3 py-2 text-sm"><span className="text-secondary">Total estimasi rakitan</span><span className="font-mono font-semibold tabular-nums text-status-live">{idr(post.cost)}</span></p>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-default pt-3">
        <button type="button" aria-pressed={post.liked} onClick={() => onLike(post.id)} className={`${action} ${post.liked ? "bg-accent-subtle text-accent-hover" : "text-secondary hover:bg-subtle hover:text-primary"}`}>
          <ThumbsUp key={post.liked ? "liked" : "idle"} className={`h-4 w-4 ${post.liked ? "vt-motion-pop" : ""}`} fill={post.liked ? "currentColor" : "none"} aria-hidden="true" /> <span key={post.likes} className="vt-motion-pop font-mono tabular-nums">{post.likes}</span>
          <span className="sr-only">{post.liked ? "suka, Anda menyukai postingan ini" : "suka"}</span>
        </button>
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`${action} ${open ? "bg-subtle text-primary" : "text-secondary hover:bg-subtle hover:text-primary"}`}>
          <MessageSquare className="h-4 w-4" aria-hidden="true" /> <span className="font-mono tabular-nums">{post.comments.length}</span> Komentar
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={share} className={`${action} text-secondary hover:bg-subtle hover:text-primary`}>
            <Share2 className="h-4 w-4" aria-hidden="true" /> <span>{post.specs ? "Bagikan Spek" : "Bagikan"}</span>
          </button>
          <button
            type="button"
            aria-expanded={reportOpen}
            aria-label={`Laporkan postingan ${post.title}`}
            onClick={() => setReportOpen((v) => !v)}
            className={`${action} ${reportOpen ? "bg-rose-50 text-rose-700" : "text-secondary hover:bg-rose-50 hover:text-rose-700"}`}
          >
            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Laporkan</span>
          </button>
        </div>
      </div>

      {reportOpen && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2.5 text-xs">
          <span className="font-semibold text-rose-900">Laporkan konten ini:</span>
          <div className="flex flex-wrap gap-1.5">
            {["Spam / Penipuan", "Data Pribadi (UU PDP)", "Konten Tidak Pantas"].map((reason) => (
              <button
                key={reason}
                type="button"
                disabled={reportSubmitting}
                onClick={() => void handleReportPost(reason)}
                className="rounded-full border border-rose-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60"
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      )}

      {reportDone && (
        <p role="status" className="mt-2 text-xs font-medium text-emerald-800">
          {reportDone}
        </p>
      )}
      <p role="status" className="min-h-0 text-right text-xs text-status-live">{shareNote}</p>

      {open && (
        <div className="mt-2 space-y-3 rounded-lg border border-default bg-canvas p-3">
          {post.comments.length === 0 && <p className="text-sm text-secondary">Belum ada komentar. Jadilah yang pertama membalas.</p>}
          {post.comments.map((c) => {
            const commenter = resolve(c.by);
            const { text: commentText, gifUrl: commentGifUrl } = parseCommentBody(c.text, c.gifUrl);
            return (
              <div key={c.id} className="flex gap-2.5">
                <Avatar author={commenter} size="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm">
                    {commenter.href
                      ? <a href={commenter.href} className="font-medium text-primary hover:text-accent-hover">{commenter.name}</a>
                      : <span className="font-medium text-primary">{commenter.name}</span>}
                    <span className="text-xs text-secondary">{ROLES[commenter.role]?.label || "Anggota"} · {timeAgo(c.createdAt)}</span>
                  </p>
                  {commentText ? (
                    <p className="break-words whitespace-pre-line text-sm text-secondary">{commentText}</p>
                  ) : null}
                  {commentGifUrl ? (
                    <CommentGifDisplay src={commentGifUrl} alt={commentText || "GIF komentar"} />
                  ) : null}
                </div>
              </div>
            );
          })}
          {selectedGif && (
            <div className="flex items-center gap-3 rounded-xl border border-default bg-surface p-2">
              <img
                src={selectedGif.url}
                alt={selectedGif.title}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="h-14 w-20 shrink-0 rounded-lg border border-default bg-subtle object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-primary">{selectedGif.title}</p>
                <p className="text-[11px] text-secondary">GIF siap dikirim bersama komentar</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGif(null)}
                aria-label="Hapus GIF terpilih"
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-default text-secondary transition-colors hover:border-red-200 hover:bg-red-50 hover:text-status-danger ${focusRing}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <form onSubmit={submitComment} className="relative flex items-center gap-2">
            <ChatMediaPicker
              isOpen={emojiOpen}
              onClose={() => setEmojiOpen(false)}
              onSelectEmoji={handleInsertCommentEmoji}
              enabledTabs={["emoji"]}
              restoreFocusTo={commentEmojiTriggerRef}
              align="left"
            />
            <CommunityGifPicker
              isOpen={gifOpen}
              onClose={() => setGifOpen(false)}
              onSelectGif={(gif) => {
                setSelectedGif(gif);
                setGifOpen(false);
              }}
              triggerRef={commentGifTriggerRef}
              disabled={submittingComment}
            />
            <button
              ref={commentEmojiTriggerRef}
              type="button"
              onClick={() => {
                setGifOpen(false);
                setEmojiOpen((current) => !current);
              }}
              aria-expanded={emojiOpen}
              aria-haspopup="dialog"
              aria-label="Sisipkan emoji ke balasan"
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border transition active:scale-[0.95] ${focusRing} ${
                emojiOpen
                  ? "border-accent-primary bg-accent-subtle text-accent-hover"
                  : "border-default bg-surface text-secondary hover:border-accent-primary/50 hover:text-primary"
              }`}
            >
              <Smile className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              ref={commentGifTriggerRef}
              type="button"
              disabled={submittingComment}
              onClick={() => {
                setEmojiOpen(false);
                setGifOpen((current) => !current);
              }}
              aria-expanded={gifOpen}
              aria-haspopup="dialog"
              aria-label="Pilih GIF untuk komentar"
              className={`inline-flex h-10 shrink-0 items-center justify-center rounded-lg border px-2.5 font-mono text-[11px] font-bold tracking-wider transition active:scale-[0.95] ${focusRing} ${
                gifOpen
                  ? "border-accent-primary bg-accent-subtle text-accent-hover"
                  : "border-default bg-surface text-secondary hover:border-accent-primary/50 hover:text-primary"
              }`}
            >
              GIF
            </button>
            <label htmlFor={`reply-${post.id}`} className="sr-only">Tulis balasan</label>
            <input
              ref={commentInputRef}
              id={`reply-${post.id}`}
              value={draft}
              disabled={submittingComment}
              onChange={(e) => {
                setDraft(e.target.value);
                syncCommentSelection(e.currentTarget);
              }}
              onClick={(e) => syncCommentSelection(e.currentTarget)}
              onKeyUp={(e) => syncCommentSelection(e.currentTarget)}
              onSelect={(e) => syncCommentSelection(e.currentTarget)}
              placeholder="Tulis balasan atau pilih GIF…"
              className={`min-w-0 flex-1 rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-secondary ${focusRing}`}
            />
            <button
              type="submit"
              disabled={!canSubmitComment}
              aria-label="Kirim balasan"
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-cta text-white hover:bg-accent-cta-hover disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
            >
              {submittingComment ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </article>
  );
});

function buildMemberMessageHref(member) {
  if (!member) return "/messages";
  const cleanUsername = typeof member.username === "string" ? member.username.trim().toLowerCase() : "";
  if (cleanUsername && USERNAME_RE.test(cleanUsername)) {
    return `/messages?to=${encodeURIComponent(cleanUsername)}`;
  }
  if (isUuid(member.id)) {
    return `/messages?peer=${encodeURIComponent(member.id)}`;
  }
  return "/messages";
}

function normalizeProfileMember(row, currentUserId = "") {
  const rawUsername = typeof row?.username === "string" ? row.username.trim().toLowerCase() : "";
  const fullName =
    row?.full_name?.trim() ||
    row?.display_name?.trim() ||
    (rawUsername ? `@${rawUsername}` : "Anggota ViciTech");
  const roleKey =
    row?.role === "admin" || row?.role === "team"
      ? "team"
      : ROLES[row?.role]
        ? row.role
        : "fan";
  const isSelf = Boolean(currentUserId && row?.id === currentUserId);
  return {
    id: row?.id || rawUsername || fullName,
    authorKey: row?.id || rawUsername || fullName,
    name: fullName,
    username: rawUsername,
    role: roleKey,
    avatarUrl: row?.avatar_url || "",
    bio: typeof row?.bio === "string" ? row.bio.trim() : "",
    statusText: typeof row?.status_text === "string" ? row.status_text.trim() : "",
    href: usernameHref(rawUsername),
    messageHref: buildMemberMessageHref({ id: row?.id, username: rawUsername }),
    isSelf,
  };
}

const SAMPLE_DIRECTORY_MEMBERS = Object.entries(AUTHORS)
  .filter(([key]) => key !== "you" && key !== "team")
  .map(([key, info]) =>
    normalizeProfileMember({
      id: key,
      username: key,
      full_name: info.name,
      display_name: info.name,
      role: info.role,
    }),
  );

function MemberSearchCard({ member, postCount = 0, onViewPosts }) {
  return (
    <article className="vt-card-lift flex flex-col justify-between gap-3.5 rounded-xl border border-default bg-surface p-3.5 shadow-card sm:flex-row sm:items-center sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar
          author={{
            name: member.name,
            avatarUrl: member.avatarUrl,
            href: member.href,
            isSelf: member.isSelf,
          }}
          size="h-11 w-11"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {member.href ? (
              <Link
                href={member.href}
                className="truncate font-semibold text-primary hover:text-accent-primary"
              >
                {member.name}
              </Link>
            ) : (
              <span className="truncate font-semibold text-primary">{member.name}</span>
            )}
            <RoleBadge role={member.role} />
            {member.isSelf && (
              <span className="rounded-md border border-default bg-canvas px-2 py-0.5 text-[11px] font-medium text-secondary">
                Anda
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-secondary">
            {member.username && (
              <span className="font-mono text-secondary">@{member.username}</span>
            )}
            {postCount > 0 && (
              <span>· {postCount} postingan di feed</span>
            )}
            {member.statusText && (
              <span className="truncate">· {member.statusText}</span>
            )}
          </div>
          {member.bio && (
            <p className="mt-1 line-clamp-1 text-xs text-secondary">{member.bio}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <button
          type="button"
          onClick={() => onViewPosts(member)}
          className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-medium text-primary transition-all duration-200 ease-smooth hover:border-strong hover:bg-subtle active:scale-[0.98] sm:flex-initial ${focusRing}`}
        >
          <MessageSquare className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
          <span>Lihat Postingan</span>
        </button>

        {member.href && (
          <Link
            href={member.href}
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-default bg-surface px-3 py-2 text-xs font-medium text-primary transition-all duration-200 ease-smooth hover:border-strong hover:bg-subtle active:scale-[0.98] sm:flex-initial ${focusRing}`}
          >
            <User className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
            <span>Profil</span>
          </Link>
        )}

        {!member.isSelf && (
          <Link
            href={member.messageHref}
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-primary px-3.5 py-2 text-xs font-semibold text-white shadow-card transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] sm:flex-initial ${focusRing}`}
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Kirim Pesan</span>
          </Link>
        )}
      </div>
    </article>
  );
}

/* ───────────────────────── Sidebar ───────────────────────── */

function Sidebar({ topTags, contributors, onTag, onGuide, resolve }) {
  return (
    <aside className="space-y-3 sm:space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Sorotan komunitas">
      <section className="rounded-xl border border-default bg-surface p-3.5 shadow-sm sm:p-5">
        <h2 className="tracking-tight flex items-center gap-2 font-sans text-base font-bold text-primary">
          <Award className="h-5 w-5 text-status-live" aria-hidden="true" />
          <span>Kontributor Aktif</span>
        </h2>
        {contributors.length > 0 ? (
          <ol className="mt-3 space-y-3">
            {contributors.map(([key, postCount, likeTotal], i) => {
              const author = resolve(key);
              return (
                <li key={key} className="flex items-center gap-3">
                  <span className={`w-5 text-center font-mono text-sm font-semibold tabular-nums ${i === 0 ? "text-status-live" : "text-secondary"}`}>{i + 1}</span>
                  <Avatar author={author} size="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-medium text-primary">
                      {author.href
                        ? <Link href={author.href} className="truncate hover:text-accent-hover">{author.name}</Link>
                        : <span className="truncate">{author.name}</span>}
                      {i === 0 && <Award className="h-3.5 w-3.5 shrink-0 text-status-live" aria-label="Kontributor teraktif" />}
                    </p>
                    <p className="text-xs text-secondary">{ROLES[author.role]?.label || "Anggota"}</p>
                  </div>
                  <div className="text-right font-mono text-xs tabular-nums">
                    <p className="font-medium text-accent-cta">{num(likeTotal)} suka</p>
                    <p className="text-secondary">{postCount} postingan</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 text-xs text-secondary">Belum ada aktivitas kontributor yang dimuat.</p>
        )}
      </section>

      <section className="rounded-xl border border-default bg-surface p-3.5 shadow-sm sm:p-5">
        <h2 className="tracking-tight flex items-center gap-2 font-sans text-base font-bold text-primary">
          <BookOpen className="h-5 w-5 text-accent-primary" aria-hidden="true" />
          <span>Topik Panduan Cepat</span>
        </h2>
        <ul className="mt-3 divide-y divide-default">
          {TOPIC_GUIDES.map((g) => (
            <li key={g.title}>
              <button type="button" onClick={() => onGuide(g.q)} className={`min-h-11 w-full py-2.5 text-left text-sm text-primary hover:text-accent-hover ${focusRing}`}>
                {g.title}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-default bg-surface p-3.5 shadow-sm sm:p-5">
        <h2 className="tracking-tight flex items-center gap-2 font-sans text-base font-bold text-primary">
          <Tag className="h-5 w-5 text-accent-primary" aria-hidden="true" />
          <span>Tag Hardware Populer</span>
        </h2>
        {topTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <button key={tag} type="button" onClick={() => onTag(tag)} className={`rounded-md border border-default bg-canvas px-2.5 py-1 text-xs text-primary hover:border-accent-primary/40 hover:text-accent-hover ${focusRing}`}>
                {tag} <span className="font-mono text-secondary">{count}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-secondary">Tag akan muncul otomatis dari postingan komunitas.</p>
        )}
      </section>
    </aside>
  );
}

/* ───────────────────────── Page ───────────────────────── */

function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    if (!isSupabaseAuthConfigured) return undefined;
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      return undefined;
    }
    let isActive = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (isActive) setCurrentUser(data?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isActive) setCurrentUser(session?.user ?? null);
    });
    return () => {
      isActive = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  return [currentUser, setCurrentUser];
}

const FEED_PAGE_SIZE = 6;
const SUPABASE_FETCH_STEP = 24;

export default function CommunityHub() {
  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isSampleFallback, setIsSampleFallback] = useState(false);
  const [category, setCategory] = useState("all");
  const [searchMode, setSearchMode] = useState("posts");
  const [authorFilter, setAuthorFilter] = useState(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [userResults, setUserResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [userSearchError, setUserSearchError] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(FEED_PAGE_SIZE);
  const [dbFetchLimit, setDbFetchLimit] = useState(SUPABASE_FETCH_STEP);
  const [publishError, setPublishError] = useState("");
  const [currentUser, setCurrentUser] = useCurrentUser();
  const [profiles, setProfiles] = useState({});
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const userSearchReqIdRef = useRef(0);
  const [lightbox, setLightbox] = useState(null);
  const requestedProfiles = useRef(new Set());
  const likingIdsRef = useRef(new Set());
  const composerSectionRef = useRef(null);
  const composerTitleInputRef = useRef(null);

  useEffect(() => {
    setVisibleLimit(FEED_PAGE_SIZE);
  }, [category, debouncedQuery, authorFilter]);

  // Pencarian pengguna dari tabel profiles di Supabase dengan debounce 300ms
  useEffect(() => {
    if (searchMode !== "users") {
      setIsSearchingUsers(false);
      setUserSearchError("");
      return undefined;
    }

    const rawKeyword = debouncedQuery.trim().replace(/^@/, "");
    const safeKeyword = rawKeyword.replace(/[%_,()]/g, " ").trim();

    const getKnownLocalMembers = () => {
      const merged = [
        ...Object.values(profilesRef.current || {}).map((row) =>
          normalizeProfileMember(row, currentUser?.id),
        ),
        ...SAMPLE_DIRECTORY_MEMBERS,
      ];
      const seen = new Set();
      return merged.filter((item) => {
        const key = String(item.username || item.id || item.name || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const filterLocalMembers = (list) => {
      if (!safeKeyword) return list.slice(0, 8);
      const q = safeKeyword.toLowerCase();
      return list
        .filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.username.toLowerCase().includes(q) ||
            (ROLES[m.role]?.label || "").toLowerCase().includes(q),
        )
        .slice(0, 10);
    };

    if (!isSupabaseAuthConfigured) {
      setUserResults(filterLocalMembers(getKnownLocalMembers()));
      setIsSearchingUsers(false);
      return undefined;
    }

    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      setUserResults(filterLocalMembers(getKnownLocalMembers()));
      setIsSearchingUsers(false);
      return undefined;
    }

    const requestId = ++userSearchReqIdRef.current;

    // Jika input kosong, tampilkan daftar anggota awal (limit 8) secara instan sambil menyegarkan dari Supabase
    if (!safeKeyword) {
      const initialLocal = filterLocalMembers(getKnownLocalMembers());
      if (initialLocal.length > 0) {
        setUserResults(initialLocal);
      }
    }

    const runUserSearch = async () => {
      setIsSearchingUsers(true);
      setUserSearchError("");
      try {
        let req = supabase
          .from("profiles")
          .select("id, username, display_name, full_name, avatar_url, role")
          .limit(safeKeyword ? 10 : 8);

        if (safeKeyword) {
          req = req.or(
            `full_name.ilike.%${safeKeyword}%,username.ilike.%${safeKeyword}%,display_name.ilike.%${safeKeyword}%`,
          );
        }

        const { data, error } = await req;
        if (requestId !== userSearchReqIdRef.current) return;

        if (error) {
          setUserSearchError("Menampilkan direktori anggota lokal karena pencarian server sedang terkendala.");
          setUserResults(filterLocalMembers(getKnownLocalMembers()));
          return;
        }

        const rows = Array.isArray(data) ? data : [];
        const remoteMembers = rows.map((row) =>
          normalizeProfileMember(row, currentUser?.id),
        );

        if (rows.length > 0) {
          setProfiles((current) => {
            let changed = false;
            const next = { ...current };
            for (const row of rows) {
              if (row?.id && !next[row.id]) {
                next[row.id] = row;
                changed = true;
              }
            }
            return changed ? next : current;
          });
          setUserResults(remoteMembers.slice(0, safeKeyword ? 10 : 8));
        } else if (!safeKeyword || isSampleFallback) {
          setUserResults(filterLocalMembers(getKnownLocalMembers()));
        } else {
          setUserResults([]);
        }
      } catch {
        if (requestId !== userSearchReqIdRef.current) return;
        setUserResults(filterLocalMembers(getKnownLocalMembers()));
      } finally {
        if (requestId === userSearchReqIdRef.current) {
          setIsSearchingUsers(false);
        }
      }
    };

    void runUserSearch();
    return undefined;
  }, [searchMode, debouncedQuery, currentUser?.id, isSampleFallback]);

  const loadProfiles = useCallback(async (supabase, userIds) => {
    const ids = [...new Set(userIds)].filter((id) => id && isUuid(id) && !requestedProfiles.current.has(id));
    if (!ids.length) return;
    ids.forEach((id) => requestedProfiles.current.add(id));
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, full_name, avatar_url, role")
      .in("id", ids);
    if (error || !data) return;
    setProfiles((current) => ({ ...current, ...Object.fromEntries(data.map((p) => [p.id, p])) }));
  }, []);

  const resolve = useMemo(() => (key) => resolveAuthor(key, { currentUser, profiles }), [currentUser, profiles]);
  const canPublishOfficial = hasAdminRole(
    profiles[currentUser?.id]?.role,
    currentUser?.app_metadata?.role,
  );

  useEffect(() => {
    if (!currentUser?.id || !isSupabaseAuthConfigured) return;
    try {
      void loadProfiles(getSupabaseBrowserClient(), [currentUser.id]);
    } catch {
      /* feed tetap berjalan tanpa link profil */
    }
  }, [currentUser?.id, loadProfiles]);

  // Muat feed postingan, komentar persisten, dan status like user dari Supabase
  useEffect(() => {
    if (!isSupabaseAuthConfigured) {
      setPosts(FALLBACK_SAMPLE_POSTS);
      setIsSampleFallback(true);
      setIsLoadingPosts(false);
      return undefined;
    }

    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (clientError) {
      setPublishError(clientError instanceof Error ? clientError.message : "Feed komunitas sedang tidak tersedia.");
      setPosts(FALLBACK_SAMPLE_POSTS);
      setIsSampleFallback(true);
      setIsLoadingPosts(false);
      return undefined;
    }

    let isActive = true;
    const loadPosts = async () => {
      setIsLoadingPosts(true);
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, user_id, title, content, category, tags, is_lfg, lfg_details, media_urls, media_type, likes_count, created_at")
        .order("created_at", { ascending: false })
        .range(0, dbFetchLimit - 1);

      if (!isActive) return;

      if (error) {
        setPublishError(`Gagal memuat postingan komunitas: ${error.message}`);
        setPosts(FALLBACK_SAMPLE_POSTS);
        setIsSampleFallback(true);
        setIsLoadingPosts(false);
        return;
      }

      if (!data || data.length === 0) {
        setPosts(FALLBACK_SAMPLE_POSTS);
        setIsSampleFallback(true);
        setIsLoadingPosts(false);
        return;
      }

      setIsSampleFallback(false);
      const persistedPosts = data.map(mapDatabasePost);
      const postIds = persistedPosts.map((p) => p.id).filter(isUuid);
      const authorIds = data.map((row) => row.user_id);

      let commentsByPost = new Map();
      let likedSet = new Set();

      if (postIds.length > 0) {
        let [commentsRes, likesRes] = await Promise.all([
          supabase
            .from("community_comments")
            .select("id, post_id, user_id, content, gif_url, created_at")
            .in("post_id", postIds)
            .order("created_at", { ascending: true }),
          currentUser?.id
            ? supabase
                .from("community_post_likes")
                .select("post_id")
                .eq("user_id", currentUser.id)
                .in("post_id", postIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (
          commentsRes.error &&
          (commentsRes.error.code === "42703" ||
            commentsRes.error.code === "PGRST204" ||
            /gif_url/i.test(commentsRes.error.message || ""))
        ) {
          commentsRes = await supabase
            .from("community_comments")
            .select("id, post_id, user_id, content, created_at")
            .in("post_id", postIds)
            .order("created_at", { ascending: true });
        }

        if (!isActive) return;

        if (!commentsRes.error && Array.isArray(commentsRes.data)) {
          commentsByPost = new Map();
          for (const row of commentsRes.data) {
            authorIds.push(row.user_id);
            const parsedComment = parseCommentBody(row.content, row.gif_url);
            const list = commentsByPost.get(row.post_id) || [];
            list.push({
              id: row.id,
              by: row.user_id,
              text: parsedComment.text,
              gifUrl: parsedComment.gifUrl,
              createdAt: new Date(row.created_at).getTime(),
            });
            commentsByPost.set(row.post_id, list);
          }
        }

        if (!likesRes.error && Array.isArray(likesRes.data)) {
          likedSet = new Set(likesRes.data.map((row) => row.post_id));
        }
      }

      void loadProfiles(supabase, authorIds);
      setPosts(
        persistedPosts.map((post) => ({
          ...post,
          liked: likedSet.has(post.id),
          comments: commentsByPost.get(post.id) || [],
        })),
      );
      setIsLoadingPosts(false);
    };

    void loadPosts();
    return () => {
      isActive = false;
    };
  }, [loadProfiles, dbFetchLimit, currentUser?.id]);

  useEffect(() => {
    if (!isSupabaseAuthConfigured) return undefined;
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      return undefined;
    }

    const channel = supabase
      .channel("community-posts-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, ({ new: row }) => {
        if (!row?.id || !row?.title || !row?.content) return;
        const post = mapDatabasePost(row);
        void loadProfiles(supabase, [row.user_id]);
        setIsSampleFallback(false);
        setPosts((current) => {
          const filtered = current.filter((existing) => isUuid(existing.id) && existing.id !== post.id);
          return [post, ...filtered];
        });
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setPublishError("Pembaruan realtime komunitas terputus. Muat ulang halaman untuk menyegarkan feed.");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadProfiles]);

  const counts = useMemo(
    () => Object.fromEntries(CAT_ORDER.map((k) => [k, k === "all" ? posts.length : posts.filter((p) => p.cat === k).length])),
    [posts],
  );

  const postCountByAuthor = useMemo(() => {
    const countsMap = new Map();
    for (const p of posts) {
      if (!p.by) continue;
      countsMap.set(p.by, (countsMap.get(p.by) || 0) + 1);
      const authorMeta = resolve(p.by);
      if (authorMeta?.name) {
        const lowerName = authorMeta.name.toLowerCase();
        countsMap.set(lowerName, (countsMap.get(lowerName) || 0) + 1);
      }
    }
    return countsMap;
  }, [posts, resolve]);

  const visible = useMemo(() => {
    const q = searchMode === "posts" ? debouncedQuery.trim().toLowerCase().replace(/^#/, "") : "";
    return posts
      .filter((p) => category === "all" || p.cat === category)
      .filter((p) => {
        if (!authorFilter) return true;
        const postAuthor = resolve(p.by);
        const matchesId = Boolean(authorFilter.id && p.by === authorFilter.id);
        const matchesUsername = Boolean(
          authorFilter.username &&
            (String(p.by).toLowerCase() === authorFilter.username.toLowerCase() ||
              postAuthor.href === `/profile/${encodeURIComponent(authorFilter.username.toLowerCase())}`),
        );
        const matchesName = Boolean(
          authorFilter.name &&
            postAuthor.name.toLowerCase() === authorFilter.name.toLowerCase(),
        );
        return matchesId || matchesUsername || matchesName;
      })
      .filter((p) => {
        if (!q) return true;
        const hay = `${p.title} ${p.body} ${(p.tags ?? []).join(" ")} ${resolve(p.by).name} ${(CATEGORIES[p.cat] || CATEGORIES.guide).label} ${(p.specs ?? []).flat().join(" ")}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [posts, category, debouncedQuery, resolve, searchMode, authorFilter]);

  const paginatedPosts = useMemo(
    () => visible.slice(0, visibleLimit),
    [visible, visibleLimit],
  );

  const topTags = useMemo(() => {
    const tally = {};
    posts.forEach((p) => {
      const merged = new Set([...(p.body.match(TAG_RE) ?? []), ...(p.tags ?? [])]);
      merged.forEach((t) => { tally[t] = (tally[t] || 0) + 1; });
    });
    return Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
  }, [posts]);

  const activeContributors = useMemo(() => {
    const stats = new Map();
    for (const post of posts) {
      if (!post.by) continue;
      const cur = stats.get(post.by) || { count: 0, likes: 0 };
      cur.count += 1;
      cur.likes += Number(post.likes) || 0;
      stats.set(post.by, cur);
    }
    return [...stats.entries()]
      .sort((a, b) => b[1].likes - a[1].likes || b[1].count - a[1].count)
      .slice(0, 5)
      .map(([key, stat]) => [key, stat.count, stat.likes]);
  }, [posts]);

  const patch = useCallback((id, fn) => setPosts((list) => list.map((p) => (p.id === id ? fn(p) : p))), []);

  const like = useCallback(async (id) => {
    setPublishError("");
    if (!isUuid(id)) {
      patch(id, (p) => ({ ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }));
      return;
    }

    if (!currentUser?.id) {
      setPublishError("Silakan masuk ke akun Anda terlebih dahulu untuk menyukai postingan.");
      return;
    }
    if (likingIdsRef.current.has(id)) return;

    const targetPost = posts.find((p) => p.id === id);
    if (!targetPost) return;
    const nextLiked = !targetPost.liked;

    likingIdsRef.current.add(id);
    patch(id, (p) => ({
      ...p,
      liked: nextLiked,
      likes: Math.max(0, p.likes + (nextLiked ? 1 : -1)),
    }));

    try {
      const supabase = getSupabaseBrowserClient();
      if (nextLiked) {
        const { error } = await supabase
          .from("community_post_likes")
          .insert({ post_id: id, user_id: currentUser.id });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("community_post_likes")
          .delete()
          .eq("post_id", id)
          .eq("user_id", currentUser.id);
        if (error) throw error;
      }
    } catch (likeError) {
      patch(id, (p) => ({
        ...p,
        liked: !nextLiked,
        likes: Math.max(0, p.likes + (nextLiked ? -1 : 1)),
      }));
      const msg = likeError instanceof Error ? likeError.message : "Gagal menyimpan tanda suka.";
      setPublishError(`Gagal menyimpan tanda suka: ${msg}`);
    } finally {
      likingIdsRef.current.delete(id);
    }
  }, [currentUser?.id, patch, posts]);

  const addComment = useCallback(async (id, payload) => {
    setPublishError("");
    const rawText = typeof payload === "string" ? payload : (payload?.text ?? "");
    const rawGifUrl = typeof payload === "string" ? null : (payload?.gifUrl ?? null);
    const cleanText = sanitizeUserText(rawText, 1000);
    const cleanGifUrl = sanitizeCommentGifUrl(rawGifUrl);
    if (!cleanText && !cleanGifUrl) return false;

    if (!isUuid(id)) {
      patch(id, (p) => ({
        ...p,
        comments: [
          ...p.comments,
          {
            id: `${id}-c${p.comments.length + 1}`,
            by: currentUser?.id ?? "you",
            text: cleanText,
            gifUrl: cleanGifUrl,
            createdAt: Date.now(),
          },
        ],
      }));
      return true;
    }

    if (!currentUser?.id) {
      setPublishError("Silakan masuk ke akun Anda terlebih dahulu untuk mengirim komentar.");
      return false;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const insertRow = {
        post_id: id,
        user_id: currentUser.id,
        content: cleanText,
        ...(cleanGifUrl ? { gif_url: cleanGifUrl } : {}),
      };

      let { data, error } = await supabase
        .from("community_comments")
        .insert(insertRow)
        .select("id, post_id, user_id, content, gif_url, created_at")
        .single();

      const needsLegacyFallback =
        Boolean(error) &&
        (error.code === "42703" ||
          error.code === "PGRST204" ||
          error.code === "23514" ||
          /gif_url/i.test(error.message || ""));

      if (needsLegacyFallback) {
        const fallbackContent = cleanGifUrl
          ? encodeCommentGifFallback(cleanText, cleanGifUrl)
          : cleanText;
        const retryRes = await supabase
          .from("community_comments")
          .insert({
            post_id: id,
            user_id: currentUser.id,
            content: fallbackContent,
          })
          .select("id, post_id, user_id, content, created_at")
          .single();
        data = retryRes.data;
        error = retryRes.error;
      }

      if (error) throw error;

      const parsedComment = parseCommentBody(data.content, data.gif_url);
      void loadProfiles(supabase, [currentUser.id]);
      patch(id, (p) => ({
        ...p,
        comments: [
          ...p.comments,
          {
            id: data.id,
            by: data.user_id,
            text: parsedComment.text,
            gifUrl: parsedComment.gifUrl ?? cleanGifUrl,
            createdAt: new Date(data.created_at).getTime(),
          },
        ],
      }));
      return true;
    } catch (commentError) {
      const msg = commentError instanceof Error ? commentError.message : "Gagal menyimpan komentar.";
      setPublishError(`Komentar gagal dikirim: ${msg}`);
      return false;
    }
  }, [currentUser?.id, loadProfiles, patch]);

  const publish = async ({ title, body, cat, tags = [], attachedSpecs, mediaFiles = [], onStageChange }) => {
    setPublishError("");
    const cleanTitle = sanitizeSingleLineText(title, 200);
    const cleanBody = sanitizeUserText(body, 4000);
    if (!cleanTitle || !cleanBody) {
      setPublishError("Masukkan judul dan isi postingan yang valid sebelum menerbitkan.");
      return false;
    }
    try {
      const client = getSupabaseBrowserClient();
      const { data: { user: activeUser }, error: authError } = await client.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!activeUser) throw new Error("Silakan masuk terlebih dahulu sebelum menerbitkan postingan.");
      setCurrentUser(activeUser);

      if (cat === "news") {
        const { data: profile, error: profileError } = await client
          .from("profiles")
          .select("role")
          .eq("id", activeUser.id)
          .maybeSingle();
        if (profileError) throw new Error(profileError.message);
        if (!hasAdminRole(profile?.role, activeUser.app_metadata?.role)) {
          throw new Error("Hanya admin yang dapat menerbitkan Pengumuman Resmi.");
        }
      }

      let mediaUrls = [];
      let mediaType = null;
      if (Array.isArray(mediaFiles) && mediaFiles.length > 0) {
        onStageChange?.("uploading");
        const uploaded = await Promise.all(
          mediaFiles.map((item) =>
            uploadMediaFile({ file: item.file, userId: activeUser.id, context: "community" }),
          ),
        );
        mediaUrls = uploaded.map((item) => item.url);
        mediaType = uploaded[0]?.mediaType ?? null;
      }

      onStageChange?.("saving");
      const dbCat = databaseCategory[cat] || "general";
      const cleanTags = tags.map((t) => t.replace(/^#/, ""));
      let savedRow = null;
      const { data: rpcData, error: rpcError } = await client.rpc("publish_community_post", {
        p_title: cleanTitle,
        p_content: cleanBody,
        p_category: dbCat,
        p_record_shared_build: cat === "hardware",
        p_media_urls: mediaUrls,
        p_media_type: mediaType,
      });

      if (!rpcError && rpcData) {
        savedRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        if (savedRow?.id && cleanTags.length > 0) {
          void client
            .from("community_posts")
            .update({ tags: cleanTags })
            .eq("id", savedRow.id)
            .eq("user_id", activeUser.id);
          savedRow = { ...savedRow, tags: cleanTags };
        }
      } else if (rpcError && rpcError.code !== "PGRST202" && rpcError.code !== "42883") {
        throw new Error(rpcError.message);
      } else {
        const { data, error } = await client.from("community_posts").insert({
          user_id: activeUser.id,
          title: cleanTitle,
          content: cleanBody,
          category: dbCat,
          tags: cleanTags,
          media_urls: mediaUrls,
          media_type: mediaType,
        }).select("id, user_id, title, content, category, tags, is_lfg, lfg_details, media_urls, media_type, likes_count, created_at").single();
        if (error) throw new Error(error.message);
        savedRow = data;

        if (cat === "hardware") {
          const { error: buildError } = await client.from("shared_builds").insert({ user_id: activeUser.id, title: cleanTitle });
          if (buildError) setPublishError(`Postingan terbit, tetapi ringkasan build gagal disimpan: ${buildError.message}`);
        }
      }

      const post = mapDatabasePost(savedRow);
      void loadProfiles(client, [activeUser.id]);
      if (attachedSpecs && cat === "hardware") {
        post.specs = ATTACH_SPECS;
      }
      setIsSampleFallback(false);
      setPosts((list) => [post, ...list.filter((existing) => isUuid(existing.id) && existing.id !== post.id)]);
      setCategory("all");
      setQuery("");
      return true;
    } catch (publishError) {
      setPublishError(publishError instanceof Error ? publishError.message : "Gagal menerbitkan postingan.");
      return false;
    }
  };

  const searchTag = useCallback((tag) => {
    setSearchMode("posts");
    setAuthorFilter(null);
    setCategory("all");
    setQuery(tag);
  }, []);
  const clearFilters = useCallback(() => {
    setSearchMode("posts");
    setAuthorFilter(null);
    setCategory("all");
    setQuery("");
  }, []);
  const handleViewMemberPosts = useCallback((member) => {
    setAuthorFilter({
      id: member.id,
      username: member.username,
      name: member.name,
    });
    setCategory("all");
    setQuery("");
    setSearchMode("posts");
  }, []);
  const handleOpenMedia = useCallback((images, index, title) => {
    setLightbox({ images, index, title });
  }, []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const handleFocusComposer = useCallback(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    composerSectionRef.current?.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        composerTitleInputRef.current?.focus({ preventScroll: true });
      });
    }
  }, []);

  return (
    <div className="min-w-0 bg-canvas text-primary antialiased">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 sm:pb-24 sm:pt-10 lg:px-8">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <span className={isSampleFallback ? "vt-badge-sample" : "vt-badge-live"}>
              {isSampleFallback ? "Feed Sampel Lokal" : "Feed Komunitas Aktif"}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-cta">
              Berbagi rakitan &amp; solusi teknis
            </span>
          </div>
          <h1 className="mt-2.5 flex min-w-0 items-center gap-2 font-sans text-xl font-bold tracking-tight text-primary sm:mt-3 sm:gap-3 sm:text-5xl">
            <MessageSquare className="h-6 w-6 shrink-0 text-accent-primary sm:h-8 sm:w-8" /> <span className="min-w-0 break-words">Komunitas &amp; Pusat Pengetahuan</span>
          </h1>
          <p className="mt-2 max-w-2xl break-words text-xs text-secondary sm:mt-3 sm:text-base">
            Pamerkan rakitan PC Anda, pelajari praktik terbaik dari admin lab CBT maupun teknisi tersertifikasi, dan diskusikan solusi perangkat keras harian.
          </p>
          <button
            type="button"
            onClick={handleFocusComposer}
            className={`mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-accent-primary/25 bg-surface px-4 py-2 text-xs font-medium text-accent-hover transition hover:bg-accent-subtle sm:mt-5 sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm ${focusRing}`}
          >
            <PenSquare className="h-4 w-4 text-accent-primary" aria-hidden="true" />
            <span>Buat Postingan Lengkap</span>
          </button>
        </header>

        <div className="mt-4 grid min-w-0 gap-3 sm:mt-8 sm:gap-6 lg:grid-cols-3">
          <div className="space-y-3.5 sm:space-y-5 lg:col-span-2">
            <Composer
              onPublish={publish}
              canPublishOfficial={canPublishOfficial}
              sectionRef={composerSectionRef}
              titleInputRef={composerTitleInputRef}
            />
            {publishError && <p role="alert" className="rounded-lg border border-status-sample/35 bg-amber-50 p-3 text-sm text-amber-900">{publishError}</p>}

            <div className="space-y-3 rounded-xl border border-default bg-surface p-3 shadow-card sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  role="tablist"
                  aria-label="Mode pencarian komunitas"
                  className="inline-flex rounded-lg border border-default bg-subtle p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={searchMode === "posts"}
                    onClick={() => setSearchMode("posts")}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 ease-smooth sm:text-sm ${focusRing} ${
                      searchMode === "posts"
                        ? "bg-accent-primary text-white shadow-card"
                        : "text-secondary hover:text-primary"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Postingan</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={searchMode === "users"}
                    onClick={() => setSearchMode("users")}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 ease-smooth sm:text-sm ${focusRing} ${
                      searchMode === "users"
                        ? "bg-accent-primary text-white shadow-card"
                        : "text-secondary hover:text-primary"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Pengguna</span>
                  </button>
                </div>

                <span className="text-xs text-secondary">
                  {searchMode === "users"
                    ? "Cari anggota untuk kirim pesan (DM) atau lihat postingan"
                    : "Filter diskusi berdasarkan kata kunci, tag, atau kategori"}
                </span>
              </div>

              <div className="relative">
                <label htmlFor="feed-search" className="sr-only">
                  {searchMode === "users" ? "Cari anggota komunitas" : "Cari postingan"}
                </label>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary sm:left-4 sm:h-5 sm:w-5" />
                <input
                  id="feed-search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    searchMode === "users"
                      ? "Cari nama lengkap atau @username anggota (cth. Rizky, @bagas)…"
                      : "Cari topik, hardware, atau tag seperti #RTX4060"
                  }
                  className={`vt-form-control w-full rounded-lg border border-default bg-subtle py-2.5 pl-10 pr-9 text-sm text-primary placeholder:text-secondary focus:bg-surface sm:py-3 sm:pl-12 ${focusRing}`}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Bersihkan kata kunci pencarian"
                    className={`absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-secondary hover:bg-subtle hover:text-primary ${focusRing}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {searchMode === "users" && (
                <div className="pt-1" aria-live="polite">
                  {userSearchError && (
                    <p className="mb-2.5 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      {userSearchError}
                    </p>
                  )}

                  {isSearchingUsers ? (
                    <div className="flex items-center justify-center gap-2.5 rounded-xl border border-default bg-canvas p-6 text-sm text-secondary">
                      <LoaderCircle className="h-4 w-4 animate-spin text-accent-primary" aria-hidden="true" />
                      <span>Mencari anggota komunitas…</span>
                    </div>
                  ) : userResults.length > 0 ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-secondary">
                        <span>
                          {query.trim()
                            ? `Menampilkan ${userResults.length} anggota untuk “${query.trim()}”`
                            : `Anggota komunitas aktif (${userResults.length})`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSearchMode("posts")}
                          className="font-medium text-accent-primary hover:underline"
                        >
                          Kembali ke Postingan
                        </button>
                      </div>
                      <div className="space-y-2.5">
                        {userResults.map((member) => {
                          const count =
                            postCountByAuthor.get(member.id) ||
                            postCountByAuthor.get(member.username) ||
                            postCountByAuthor.get(member.name.toLowerCase()) ||
                            0;
                          return (
                            <MemberSearchCard
                              key={member.id}
                              member={member}
                              postCount={count}
                              onViewPosts={handleViewMemberPosts}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-default bg-canvas p-6 text-center">
                      <Users className="mx-auto h-7 w-7 text-secondary" strokeWidth={1.6} aria-hidden="true" />
                      <p className="mt-2 font-medium text-primary">Pengguna tidak ditemukan</p>
                      <p className="mt-1 text-xs text-secondary">
                        Tidak ada anggota dengan nama atau username “{query.trim()}”. Coba kata kunci lain.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {authorFilter && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent-primary/30 bg-accent-subtle px-3.5 py-2.5 text-xs text-primary sm:text-sm">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-accent-primary" aria-hidden="true" />
                  <span>
                    Menampilkan postingan dari <strong>{authorFilter.name}</strong>
                    {authorFilter.username ? ` (@${authorFilter.username})` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setAuthorFilter(null)}
                  className={`inline-flex items-center gap-1 rounded-md border border-[#EA580C]/30 bg-white px-2.5 py-1 text-xs font-semibold text-[#EA580C] hover:bg-[#FAF9F6] ${focusRing}`}
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Tampilkan Semua</span>
                </button>
              </div>
            )}

            <div role="group" aria-label="Filter postingan berdasarkan kategori" className="no-scrollbar -mx-3 flex flex-nowrap gap-2 overflow-x-auto px-3 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
              {CAT_ORDER.map((k) => {
                const Icon = CATEGORIES[k].icon;
                const active = category === k;
                return (
                  <button key={k} type="button" aria-pressed={active} onClick={() => setCategory(k)} className={`vt-motion-press inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors sm:min-h-10 sm:gap-2 sm:px-3.5 sm:text-sm ${focusRing} ${active ? "border-accent-primary/30 bg-accent-subtle font-medium text-accent-hover" : "border-default bg-surface text-secondary hover:bg-subtle hover:text-primary"}`}>
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {CATEGORIES[k].label} <span className="font-mono text-xs text-secondary">{counts[k]}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-secondary sm:text-sm" aria-live="polite">
              Menampilkan <span className="font-mono font-semibold text-primary">{visible.length}</span> postingan
              {authorFilter ? ` oleh ${authorFilter.name}` : ""}
              {searchMode === "posts" && query.trim() ? ` untuk “${query.trim()}”` : ""}
            </p>

            {isLoadingPosts ? (
              <div className="space-y-3 sm:space-y-4" role="status" aria-label="Memuat postingan komunitas">
                {[0, 1, 2].map((skeletonIdx) => (
                  <div
                    key={skeletonIdx}
                    className="space-y-4 rounded-2xl border border-default bg-surface p-4 shadow-sm sm:p-6"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-subtle" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-36 animate-pulse rounded bg-subtle" />
                        <div className="h-3 w-20 animate-pulse rounded bg-subtle" />
                      </div>
                      <div className="h-6 w-28 animate-pulse rounded-full bg-subtle" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-5 w-3/4 animate-pulse rounded bg-subtle" />
                      <div className="h-3.5 w-full animate-pulse rounded bg-subtle" />
                      <div className="h-3.5 w-5/6 animate-pulse rounded bg-subtle" />
                    </div>
                    <div className="aspect-video w-full animate-pulse rounded-xl bg-subtle" />
                    <div className="flex items-center gap-3 border-t border-default pt-3">
                      <div className="h-8 w-16 animate-pulse rounded-lg bg-subtle" />
                      <div className="h-8 w-24 animate-pulse rounded-lg bg-subtle" />
                      <div className="ml-auto h-8 w-20 animate-pulse rounded-lg bg-subtle" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedPosts.length ? (
              <RevealOnScroll className="space-y-3 sm:space-y-4">
                {paginatedPosts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    onLike={like}
                    onComment={addComment}
                    onTag={searchTag}
                    resolve={resolve}
                    onOpenMedia={handleOpenMedia}
                  />
                ))}
                {visible.length > visibleLimit && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextVisible = visibleLimit + FEED_PAGE_SIZE;
                        setVisibleLimit(nextVisible);
                        if (nextVisible >= dbFetchLimit - 4) {
                          setDbFetchLimit((current) => current + SUPABASE_FETCH_STEP);
                        }
                      }}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-surface px-5 py-2.5 text-sm font-medium text-primary transition hover:border-accent-primary/40 hover:bg-accent-subtle ${focusRing}`}
                    >
                      Muat lebih banyak postingan ({paginatedPosts.length}/{visible.length})
                    </button>
                  </div>
                )}
              </RevealOnScroll>
            ) : (
              <div className="rounded-xl border border-dashed border-default bg-surface p-6 text-center sm:p-10">
                <p className="font-medium text-primary">Belum ada postingan yang cocok dengan filter.</p>
                <p className="mt-1 text-sm text-secondary">Coba kata kunci atau kategori lain, atau mulai diskusi baru.</p>
                <button type="button" onClick={clearFilters} className={`mt-4 min-h-11 rounded-lg border border-default bg-subtle px-4 py-2 text-sm text-primary hover:border-accent-primary/40 hover:text-accent-hover ${focusRing}`}>Reset Filter</button>
              </div>
            )}
          </div>

          <Sidebar
            topTags={topTags}
            contributors={activeContributors}
            onTag={searchTag}
            onGuide={searchTag}
            resolve={resolve}
          />
        </div>
      </div>

      {lightbox && (
        <MediaLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          altPrefix={lightbox.title || "Foto postingan komunitas"}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}
