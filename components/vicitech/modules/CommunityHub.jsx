import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MessageSquare, ThumbsUp, Share2, Tag, User, Award, PenSquare, Search, Image as ImageIcon, Send,
  CheckCircle2, HelpCircle, BookOpen, Cpu, Megaphone, X, LoaderCircle, Video, AlertCircle,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { sanitizeSingleLineText, sanitizeUserText } from "@/lib/validation/sanitize-text";
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

/* ───────────────────────── Static config & sample data ───────────────────────── */

const CATEGORIES = {
  all: { label: "Semua Postingan", icon: MessageSquare },
  build: { label: "Showcase Rakitan", icon: Cpu, cls: "border-accent-primary/30 bg-accent-subtle text-accent-hover" },
  guide: { label: "Panduan IT Sekolah/Kantor", icon: BookOpen, cls: "border-emerald-600/20 bg-emerald-50 text-emerald-800" },
  qa: { label: "Tanya Jawab Teknis", icon: HelpCircle, cls: "border-violet-600/20 bg-violet-50 text-violet-800" },
  news: { label: "Pengumuman Resmi", icon: Megaphone, cls: "border-amber-600/20 bg-amber-50 text-amber-800" },
};
const CAT_ORDER = ["all", "build", "guide", "qa", "news"];
const POSTABLE = ["build", "guide", "qa"]; // pengumuman resmi hanya dari tim ViciTech

const databaseCategory = { build: "build_showcase", guide: "general", qa: "troubleshooting" };
const feedCategory = { build_showcase: "build", general: "guide", troubleshooting: "qa", news: "news" };

function mapDatabasePost(row) {
  const category = feedCategory[row.category] || "guide";
  const rawUrls = Array.isArray(row.media_urls)
    ? row.media_urls.filter((url) => typeof url === "string" && url.trim().length > 0)
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
  buyer: { label: "Tim Pengadaan IT", cls: "border-violet-600/20 bg-violet-50 text-violet-800" },
  team: { label: "Tim ViciTech", cls: "border-accent-cta bg-accent-cta text-white", verified: true },
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
  build: "Ceritakan rakitan Anda: daftar komponen, suhu kerja, dan hal yang bisa ditingkatkan. Sertakan tag seperti #RTX4060.",
  guide: "Bagikan langkah teknis yang berhasil diterapkan di lab sekolah atau kantor Anda. Tambahkan tag seperti #CBTSetup.",
  qa: "Kendala apa yang sedang terjadi? Cantumkan seri perangkat dan gejala lengkap beserta tag seperti #PSU.",
};

const mk = (id, by, cat, minsAgo, title, body, likes, comments = [], extra = {}) => ({
  id, by, cat, title, body, likes, liked: false, createdAt: Date.now() - minsAgo * 60000,
  comments: comments.map(([cby, m, text], i) => ({ id: `${id}-c${i + 1}`, by: cby, text, createdAt: Date.now() - m * 60000 })),
  ...extra,
});

const SEED_POSTS = [
  mk("p1", "team", "news", 35, "Update indeks harga: lini RTX 40-series turun minggu ini",
    "Indeks Harga Hardware harian menunjukkan listing #RTX4060 dan #RTX4070 bergerak lebih rendah minggu ini, sementara stok refurbished #ThinkPadGradeA stabil. Buka Market untuk membandingkan harga terbaru.",
    128, [["bagas", 20, "Pas sekali waktunya, saya memang berencana memesan RTX 4060."]]),
  mk("p2", "team", "news", 190, "Info stok: ThinkPad T14 Grade A+ tersedia kembali di Hub Bandung",
    "Batch terbaru baru saja lulus 15 titik inspeksi IoT QC. Sekolah dapat mengajukan penawaran massal melalui modul Trade-In & Buyback. #ThinkPadGradeA #Refurbished #CBTSetup",
    86, [["sari", 150, "Sudah mengajukan penawaran untuk 30 unit, terima kasih!"], ["hendra", 120, "Apakah satu batch memakai satu laporan inspeksi terpadu?"]]),
  mk("p3", "bagas", "build", 320, "Rakitan esports 1080p di bawah Rp 14 juta",
    "Baru selesai dirakit akhir pekan ini. Mayoritas game esports berjalan di atas 140 FPS pada resolusi 1080p dan suhu terjaga di bawah 65 °C. #RTX4060 #Ryzen5 #BudgetBuild",
    94, [["rizky", 250, "Cable management-nya rapi! PSU 550 W Bronze sudah sangat cukup untuk kombinasi ini."], ["nadia", 200, "Pakai fan casing apa untuk build ini?"]],
    { cost: 13900000, attachment: "esports-rig-front.jpg", specs: [["CPU", "AMD Ryzen 5 7600"], ["GPU", "NVIDIA RTX 4060 8 GB"], ["RAM", "16 GB DDR5-5600"], ["Storage", "1 TB NVMe SSD"], ["PSU", "550 W 80+ Bronze"]] }),
  mk("p4", "nadia", "build", 1500, "Workstation editing video 4K senyap",
    "Prioritas utama adalah kebisingan rendah saat render panjang. Kurva fan diatur agar tetap di kisaran 35 dB pada beban penuh. #Ryzen9 #CreatorRig #SilentBuild",
    152, [["rizky", 1400, "Mantap. Repaste CPU kemarin juga berhasil menurunkan suhu unit saya 5 °C lagi."]],
    { cost: 38400000, attachment: "creator-rig.jpg", specs: [["CPU", "AMD Ryzen 9 7950X"], ["GPU", "NVIDIA RTX 4070 Super 12 GB"], ["RAM", "64 GB DDR5-6000"], ["Storage", "2 TB NVMe SSD"], ["PSU", "750 W 80+ Gold"]] }),
  mk("p5", "rizky", "build", 2900, "PC SFF kantor ringkas dengan dukungan dual monitor",
    "Standar rakitan B2B kami: hemat daya, senyap, dan siap untuk dua monitor sekaligus. Konsumsi idle sekitar 25 W. #OfficeSFF #DualMonitor #CoreI5",
    71, [], { cost: 9850000, specs: [["CPU", "Intel Core i5-12400"], ["GPU", "Integrated UHD 730"], ["RAM", "16 GB DDR4-3200"], ["Storage", "512 GB NVMe SSD"], ["PSU", "350 W 80+ White"]] }),
  mk("p6", "hendra", "guide", 4300, "Cara mencegah thermal throttling pada lab komputer sekolah",
    "Lab kami berisi 36 PC yang dulu sering melambat di sesi ujian CBT kedua. Solusi yang efektif:\n1. Bersihkan filter debu setiap semester.\n2. Lakukan repaste CPU yang usianya di atas 3 tahun.\n3. Jaga suhu ruangan di bawah 28 °C dan atur jeda antarsesi.\n4. Cek kurva fan di BIOS setelah update firmware.\n#CBTSetup #ThermalThrottling #LabMaintenance",
    203, [["rizky", 4200, "Repaste memang langkah yang paling sering terlewat sekolah, padahal dampaknya besar."], ["sari", 4100, "Disimpan untuk agenda maintenance bulan depan."]]),
  mk("p7", "dewi", "guide", 5800, "Rekomendasi laptop refurbished di bawah Rp 5 juta",
    "Daftar pilihan untuk laptop pelajar dan admin: cari lini bisnis seperti ThinkPad T480 atau Latitude 7280 dengan kesehatan baterai di atas 85% serta SSD. Selalu minta ringkasan hasil inspeksi IoT QC. #ThinkPadGradeA #Refurbished #BudgetLab",
    175, [["fajar", 5700, "Apakah lecet pemakaian wajar Grade A mengganggu untuk ruang kelas?"], ["dewi", 5600, "Tidak sama sekali, hanya pada bodi luar, sementara fungsi lulus 15 titik inspeksi."]]),
  mk("p8", "sari", "guide", 5100, "Checklist Jaringan & UPS untuk 30 Unit PC Ujian CBT",
    "Pembagian beban UPS dan switch gigabit agar sesi ujian serentak bebas drop tegangan maupun RTO. #CBTSetup #UPS #LabSekolah",
    144, [["hendra", 5000, "Checklist pembagian jalur MCB ini sangat membantu tim teknisi sekolah kami."]]),
  mk("p9", "fajar", "qa", 600, "Apakah PSU 350 W cukup untuk Core i5-12400 dengan GTX 1650?",
    "Kami menyiapkan 20 PC kantor dan berencana menambah GPU low-profile di beberapa unit. Preset Builder menunjukkan estimasi sekitar 150 W. Perlu naik kapasitas PSU? #PSU #i512400",
    24, [["rizky", 540, "PSU 450 W Bronze memberi ruang efisiensi lebih baik. Cek meteran beban daya di Preset Builder."], ["fajar", 500, "Terima kasih, kami naikkan ke 450 W."]]),
  mk("p10", "bagas", "qa", 980, "RTX 3080 refurbished menyentuh 83 °C saat beban penuh, wajar?",
    "Baru membeli unit Grade A+ minggu lalu. Suhu idle normal, namun saat gaming naik ke 83 °C. #RTX3080 #Thermals #Refurbished",
    37, [["rizky", 900, "Masih dalam batas aman, namun idealnya di bawah 75 °C. Periksa airflow casing dan atur ulang kurva fan."]]),
];

const BUILDERS = [["rizky", 14, 2480], ["dewi", 11, 2105], ["nadia", 9, 1870], ["bagas", 8, 1540], ["hendra", 7, 1320]];
const GUIDES = [
  { title: "Mencegah Thermal Throttling di Lab Sekolah", reads: 3280, q: "thermal" },
  { title: "Laptop Refurbished Terbaik di Bawah Rp 5 Juta", reads: 2910, q: "refurbished" },
  { title: "Memilih PSU yang Tepat untuk PC Kantor", reads: 1760, q: "psu" },
  { title: "Checklist Jaringan & UPS untuk 30 PC CBT", reads: 1540, q: "cbtsetup" },
];

/* ───────────────────────── Helpers ───────────────────────── */

const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const num = (n) => new Intl.NumberFormat("id-ID").format(n);
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";
const TAG_RE = /#[A-Za-z0-9_]+/g;
const AVATAR_TONES = ["bg-accent-subtle text-accent-hover", "bg-emerald-50 text-emerald-800", "bg-violet-50 text-violet-800", "bg-amber-50 text-amber-800"];

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  if (m < 1440) return `${Math.floor(m / 60)} jam lalu`;
  return `${Math.floor(m / 1440)} hr lalu`;
}

/* ───────────────────────── Small UI pieces ───────────────────────── */

const USERNAME_RE = /^[a-z0-9]{3,20}$/;
const usernameHref = (username) =>
  typeof username === "string" && USERNAME_RE.test(username) ? `/profile/${encodeURIComponent(username)}` : "";

function resolveAuthor(key, { currentUser, profiles }) {
  const seed = key !== "you" ? AUTHORS[key] : undefined;
  if (seed) return { ...seed, href: key === "team" ? "" : usernameHref(key), isSelf: false };

  const userId = key === "you" ? currentUser?.id : key;
  const isSelf = key === "you" || (Boolean(userId) && userId === currentUser?.id);
  const profile = userId ? profiles[userId] : undefined;
  const username = profile?.username || (isSelf ? currentUser?.user_metadata?.username : "");

  return {
    name: profile?.full_name || profile?.display_name || username || "Anggota ViciTech",
    role: "fan",
    href: usernameHref(username),
    isSelf,
  };
}

function Avatar({ author, size = "h-10 w-10" }) {
  const avatar = author.isSelf
    ? <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-subtle text-primary`}><User className="h-1/2 w-1/2" /></span>
    : <span className={`grid ${size} shrink-0 place-items-center rounded-full text-sm font-semibold ${AVATAR_TONES[[...author.name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length]}`} aria-hidden="true">{author.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>;
  return author.href
    ? <a href={author.href} aria-label={author.isSelf ? "Lihat profil Anda" : `Lihat profil ${author.name}`} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary">{avatar}</a>
    : avatar;
}

function RoleBadge({ role }) {
  const r = ROLES[role];
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

function Composer({ onPublish }) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("build");
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

  const field = `w-full rounded-lg border border-default bg-canvas px-3.5 py-3 text-sm text-primary placeholder:text-secondary ${focusRing}`;
  return (
    <section aria-labelledby="composer-title" className="rounded-xl border border-default bg-surface p-6 shadow-sm">
      <h2 id="composer-title" className="flex items-center gap-2 font-serif text-xl font-semibold text-primary">
        <PenSquare className="h-5 w-5 text-accent-primary" /> Bagikan Rakitan atau Ajukan Pertanyaan
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="post-title" className="mb-1.5 block text-sm text-primary">Judul postingan</label>
          <input id="post-title" value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} maxLength={120} placeholder="cth. Workstation editing 4K senyap di bawah Rp 40 juta" className={field} />
        </div>
        <div>
          <label htmlFor="post-cat" className="mb-1.5 block text-sm text-primary">Kategori</label>
          <select id="post-cat" value={cat} onChange={(e) => setCat(e.target.value)} className={field}>
            {POSTABLE.map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="post-body" className="mb-1.5 block text-sm text-primary">Detail</label>
        <textarea id="post-body" rows={4} value={body} onChange={(e) => { setBody(e.target.value); setError(""); }} placeholder={PROMPTS[cat]} className={`${field} resize-y`} />
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
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-canvas px-3.5 py-2 text-sm font-medium text-primary transition hover:border-accent-primary/50 hover:text-accent-hover disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
        >
          <ImageIcon className="h-4 w-4 text-accent-primary" />
          <Video className="h-4 w-4 text-accent-primary" />
          <span>Foto / Video</span>
        </button>

        {cat === "build" && (
          <button
            type="button"
            onClick={() => setAttachedSpecs((v) => !v)}
            disabled={isPublishing}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition ${focusRing} ${
              attachedSpecs
                ? "border-accent-primary bg-accent-subtle font-medium text-accent-hover"
                : "border-default bg-canvas text-secondary hover:text-primary"
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>{attachedSpecs ? "Spec Sheet Terlampir" : "Lampirkan Spec Sheet"}</span>
          </button>
        )}

        <button type="button" onClick={() => void publish()} disabled={isPublishing} className={`ml-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-cta-hover disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}>
          {isPublishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span>
            {publishStage === "uploading"
              ? "Mengunggah media…"
              : publishStage === "saving"
                ? "Menerbitkan…"
                : "Terbitkan Postingan"}
          </span>
        </button>
      </div>
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
  const [draft, setDraft] = useState("");
  const [shareNote, setShareNote] = useState("");
  const author = resolve(post.by);
  const cat = CATEGORIES[post.cat] || CATEGORIES.all;
  const CatIcon = cat.icon;
  const authorProfile = author.href;
  const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
  const isVideoPost =
    post.mediaType === "video" || mediaUrls.some((url) => /\.(mp4|webm)(\?|$)/i.test(url));

  useEffect(() => {
    if (!shareNote) return;
    const t = setTimeout(() => setShareNote(""), 2200);
    return () => clearTimeout(t);
  }, [shareNote]);

  const share = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = post.specs
      ? `${post.title}\n${post.specs.map(([k, v]) => `${k}: ${v}`).join("\n")}${post.cost ? `\nTotal: ${idr(post.cost)}` : ""}`
      : `${post.title}\n${origin}/community/${post.id}`;
    try { await navigator.clipboard.writeText(text); setShareNote("Tautan disalin ke papan klip"); }
    catch { setShareNote("Fitur salin tidak tersedia di browser ini"); }
  };

  const submitComment = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onComment(post.id, draft.trim());
    setDraft("");
  };

  const action = `inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${focusRing}`;
  return (
    <article className="rounded-xl border border-default bg-surface p-6 shadow-sm">
      <header className="flex items-start gap-3">
        <Avatar author={author} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {authorProfile
              ? <a href={authorProfile} className="font-medium text-primary hover:text-accent-hover">{author.name}</a>
              : <span className="font-medium text-primary">{author.name}</span>}
            <RoleBadge role={author.role} />
          </div>
          <p className="mt-0.5 text-xs text-secondary">{timeAgo(post.createdAt)}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${cat.cls}`}><CatIcon className="h-3.5 w-3.5" /> {cat.label}</span>
      </header>

      <h3 className="mt-4 text-lg font-semibold leading-snug text-primary">{post.title}</h3>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-secondary"><RichText text={post.body} onTag={onTag} /></p>

      {mediaUrls.length > 0 && (
        isVideoPost ? (
          <div className="mt-3 overflow-hidden rounded-lg border border-default bg-ink">
            <video
              src={mediaUrls[0]}
              controls
              playsInline
              preload="metadata"
              className="max-h-[440px] w-full object-contain"
            />
          </div>
        ) : mediaUrls.length === 1 ? (
          <button
            type="button"
            onClick={() => onOpenMedia?.(mediaUrls, 0, post.title)}
            aria-label={`Perbesar gambar dari ${post.title}`}
            className={`mt-3 block w-full overflow-hidden rounded-lg border border-default bg-canvas ${focusRing}`}
          >
            <img
              src={mediaUrls[0]}
              alt={post.title}
              width={800}
              height={600}
              loading="lazy"
              decoding="async"
              className="max-h-[440px] w-full object-cover transition hover:opacity-95"
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
                  className="aspect-[4/3] w-full object-cover transition hover:opacity-95"
                />
              </button>
            ))}
          </div>
        )
      )}

      {post.attachment && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-default bg-canvas px-3 py-1.5 text-xs text-secondary"><ImageIcon className="h-3.5 w-3.5" /> {post.attachment}</p>
      )}

      {post.specs && (
        <div className="mt-3 rounded-lg border border-default bg-canvas">
          <p className="flex items-center gap-1.5 border-b border-default px-3 py-2 text-xs text-secondary"><Cpu className="h-3.5 w-3.5 text-accent-primary" /> Rincian Spesifikasi Hardware</p>
          <dl className="grid gap-x-6 px-3 py-2 text-sm sm:grid-cols-2">
            {post.specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-1"><dt className="text-secondary">{k}</dt><dd className="text-right text-primary">{v}</dd></div>
            ))}
          </dl>
          {post.cost && <p className="flex justify-between border-t border-default px-3 py-2 text-sm"><span className="text-secondary">Total estimasi rakitan</span><span className="font-mono font-semibold tabular-nums text-status-live">{idr(post.cost)}</span></p>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-default pt-3">
        <button type="button" aria-pressed={post.liked} onClick={() => onLike(post.id)} className={`${action} ${post.liked ? "bg-accent-subtle text-accent-hover" : "text-secondary hover:bg-subtle hover:text-primary"}`}>
          <ThumbsUp className="h-4 w-4" fill={post.liked ? "currentColor" : "none"} /> <span className="font-mono tabular-nums">{post.likes}</span>
          <span className="sr-only">{post.liked ? "suka, Anda menyukai postingan ini" : "suka"}</span>
        </button>
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`${action} ${open ? "bg-subtle text-primary" : "text-secondary hover:bg-subtle hover:text-primary"}`}>
          <MessageSquare className="h-4 w-4" /> <span className="font-mono tabular-nums">{post.comments.length}</span> Komentar
        </button>
        <button type="button" onClick={share} className={`${action} ml-auto text-secondary hover:bg-subtle hover:text-primary`}>
          <Share2 className="h-4 w-4" /> {post.specs ? "Bagikan Spek" : "Bagikan"}
        </button>
      </div>
      <p role="status" className="min-h-0 text-right text-xs text-status-live">{shareNote}</p>

      {open && (
        <div className="mt-2 space-y-3 rounded-lg border border-default bg-canvas p-3">
          {post.comments.length === 0 && <p className="text-sm text-secondary">Belum ada komentar. Jadilah yang pertama membalas.</p>}
          {post.comments.map((c) => {
            const commenter = resolve(c.by);
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
                  <p className="text-sm text-secondary">{c.text}</p>
                </div>
              </div>
            );
          })}
          <form onSubmit={submitComment} className="flex gap-2">
            <label htmlFor={`reply-${post.id}`} className="sr-only">Tulis balasan</label>
            <input id={`reply-${post.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Tulis balasan…" className={`min-w-0 flex-1 rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-secondary ${focusRing}`} />
            <button type="submit" disabled={!draft.trim()} aria-label="Kirim balasan" className={`grid h-10 w-10 place-items-center rounded-full bg-accent-cta text-white hover:bg-accent-cta-hover disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </article>
  );
});

/* ───────────────────────── Sidebar ───────────────────────── */

function Sidebar({ topTags, onTag, onGuide, resolve }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Sorotan komunitas">
      <section className="rounded-xl border border-default bg-surface p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-primary"><Award className="h-5 w-5 text-status-live" /> Builder Terverifikasi Bulan Ini</h2>
        <ol className="mt-3 space-y-3">
          {BUILDERS.map(([key, builds, points], i) => {
            const author = resolve(key);
            return (
              <li key={key} className="flex items-center gap-3">
                <span className={`w-5 text-center font-mono text-sm font-semibold tabular-nums ${i === 0 ? "text-status-live" : "text-secondary"}`}>{i + 1}</span>
                <Avatar author={author} size="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-medium text-primary">
                    {author.href
                      ? <a href={author.href} className="truncate hover:text-accent-hover">{author.name}</a>
                      : <span className="truncate">{author.name}</span>}
                    {i === 0 && <Award className="h-3.5 w-3.5 shrink-0 text-status-live" aria-label="Builder terbaik bulan ini" />}
                  </p>
                  <p className="text-xs text-secondary">{ROLES[author.role]?.label || "Anggota"}</p>
                </div>
                <div className="text-right font-mono text-xs tabular-nums">
                  <p className="font-medium text-accent-hover">{num(points)} poin</p>
                  <p className="text-secondary">{builds} rakitan</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-xl border border-default bg-surface p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-primary"><BookOpen className="h-5 w-5 text-accent-primary" /> Panduan Perawatan Populer</h2>
        <ul className="mt-3 divide-y divide-default">
          {GUIDES.map((g) => (
            <li key={g.title}>
              <button type="button" onClick={() => onGuide(g.q)} className={`w-full py-2.5 text-left text-primary hover:text-accent-hover ${focusRing}`}>
                <span className="block text-sm">{g.title}</span>
                <span className="font-mono text-xs tabular-nums text-secondary">{num(g.reads)} dibaca</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-default bg-surface p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-primary"><Tag className="h-5 w-5 text-accent-primary" /> Tag Hardware Populer</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {topTags.map(([tag, count]) => (
            <button key={tag} type="button" onClick={() => onTag(tag)} className={`rounded-md border border-default bg-canvas px-2.5 py-1 text-xs text-primary hover:border-accent-primary/40 hover:text-accent-hover ${focusRing}`}>
              {tag} <span className="font-mono text-secondary">{count}</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

/* ───────────────────────── Page ───────────────────────── */

function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
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
  const [posts, setPosts] = useState(SEED_POSTS);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [visibleLimit, setVisibleLimit] = useState(FEED_PAGE_SIZE);
  const [dbFetchLimit, setDbFetchLimit] = useState(SUPABASE_FETCH_STEP);
  const [publishError, setPublishError] = useState("");
  const [currentUser, setCurrentUser] = useCurrentUser();
  const [profiles, setProfiles] = useState({});
  const [lightbox, setLightbox] = useState(null);
  const requestedProfiles = useRef(new Set());

  useEffect(() => {
    setVisibleLimit(FEED_PAGE_SIZE);
  }, [category, debouncedQuery]);

  const loadProfiles = useCallback(async (supabase, userIds) => {
    const ids = [...new Set(userIds)].filter((id) => id && !requestedProfiles.current.has(id));
    if (!ids.length) return;
    ids.forEach((id) => requestedProfiles.current.add(id));
    const { data, error } = await supabase.from("profiles").select("id, username").in("id", ids);
    if (error || !data) return;
    setProfiles((current) => ({ ...current, ...Object.fromEntries(data.map((p) => [p.id, p])) }));
  }, []);

  const resolve = useMemo(() => (key) => resolveAuthor(key, { currentUser, profiles }), [currentUser, profiles]);

  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      void loadProfiles(getSupabaseBrowserClient(), [currentUser.id]);
    } catch {
      /* feed tetap berjalan tanpa link profil */
    }
  }, [currentUser?.id, loadProfiles]);

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (clientError) {
      setPublishError(clientError instanceof Error ? clientError.message : "Feed komunitas sedang tidak tersedia.");
      return undefined;
    }

    let isActive = true;
    const loadPosts = async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, user_id, title, content, category, media_urls, media_type, likes_count, created_at")
        .order("created_at", { ascending: false })
        .range(0, dbFetchLimit - 1);
      if (error) {
        if (isActive) setPublishError(`Gagal memuat ulang postingan komunitas: ${error.message}`);
        return;
      }
      if (isActive && data) {
        const persistedPosts = data.map(mapDatabasePost);
        void loadProfiles(supabase, data.map((row) => row.user_id));
        setPosts((current) => {
          const byId = new Map(current.map((post) => [post.id, post]));
          persistedPosts.forEach((post) => byId.set(post.id, post));
          return [...byId.values()];
        });
      }
    };

    void loadPosts();
    return () => {
      isActive = false;
    };
  }, [loadProfiles, dbFetchLimit]);

  useEffect(() => {
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
        setPosts((current) => (current.some((existing) => existing.id === post.id) ? current : [post, ...current]));
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

  const counts = useMemo(() => Object.fromEntries(CAT_ORDER.map((k) => [k, k === "all" ? posts.length : posts.filter((p) => p.cat === k).length])), [posts]);

  const visible = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase().replace(/^#/, "");
    return posts
      .filter((p) => category === "all" || p.cat === category)
      .filter((p) => {
        if (!q) return true;
        const hay = `${p.title} ${p.body} ${resolve(p.by).name} ${CATEGORIES[p.cat].label} ${(p.specs ?? []).flat().join(" ")}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [posts, category, debouncedQuery, resolve]);

  const paginatedPosts = useMemo(
    () => visible.slice(0, visibleLimit),
    [visible, visibleLimit],
  );

  const topTags = useMemo(() => {
    const tally = {};
    posts.forEach((p) => (p.body.match(TAG_RE) ?? []).forEach((t) => { tally[t] = (tally[t] || 0) + 1; }));
    return Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
  }, [posts]);

  const patch = useCallback((id, fn) => setPosts((list) => list.map((p) => (p.id === id ? fn(p) : p))), []);
  const like = useCallback((id) => patch(id, (p) => ({ ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) })), [patch]);
  const addComment = useCallback((id, text) => {
    const cleanText = sanitizeUserText(text, 1000);
    if (!cleanText) return;
    patch(id, (p) => ({
      ...p,
      comments: [...p.comments, { id: `${id}-c${p.comments.length + 1}`, by: currentUser?.id ?? "you", text: cleanText, createdAt: Date.now() }],
    }));
  }, [currentUser?.id, patch]);

  const publish = async ({ title, body, cat, attachedSpecs, mediaFiles = [], onStageChange }) => {
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
      if (!activeUser) throw new Error("Silakan login terlebih dahulu sebelum menerbitkan postingan.");
      setCurrentUser(activeUser);

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
      let savedRow = null;
      const { data: rpcData, error: rpcError } = await client.rpc("publish_community_post", {
        p_title: cleanTitle,
        p_content: cleanBody,
        p_category: databaseCategory[cat],
        p_record_shared_build: cat === "build",
        p_media_urls: mediaUrls,
        p_media_type: mediaType,
      });

      if (!rpcError && rpcData) {
        savedRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      } else if (rpcError && rpcError.code !== "PGRST202" && rpcError.code !== "42883") {
        throw new Error(rpcError.message);
      } else {
        const { data, error } = await client.from("community_posts").insert({
          user_id: activeUser.id,
          title: cleanTitle,
          content: cleanBody,
          category: databaseCategory[cat],
          media_urls: mediaUrls,
          media_type: mediaType,
        }).select("id, user_id, title, content, category, media_urls, media_type, likes_count, created_at").single();
        if (error) throw new Error(error.message);
        savedRow = data;

        if (cat === "build") {
          const { error: buildError } = await client.from("shared_builds").insert({ user_id: activeUser.id, title: cleanTitle });
          if (buildError) setPublishError(`Postingan terbit, tetapi ringkasan build gagal disimpan: ${buildError.message}`);
        }
      }

      const post = mapDatabasePost(savedRow);
      void loadProfiles(client, [activeUser.id]);
      if (attachedSpecs && cat === "build") {
        post.specs = ATTACH_SPECS;
      }
      setPosts((list) => [post, ...list.filter((existing) => existing.id !== post.id)]);
      setCategory("all");
      setQuery("");
      return true;
    } catch (publishError) {
      setPublishError(publishError instanceof Error ? publishError.message : "Gagal menerbitkan postingan.");
      return false;
    }
  };

  const searchTag = useCallback((tag) => { setCategory("all"); setQuery(tag); }, []);
  const clearFilters = useCallback(() => { setCategory("all"); setQuery(""); }, []);
  const handleOpenMedia = useCallback((images, index, title) => {
    setLightbox({ images, index, title });
  }, []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  return (
    <div className="bg-canvas text-primary antialiased">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent-hover">Berbagi rakitan &amp; solusi teknis</p>
        <h1 className="flex items-center gap-3 font-serif text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
          <MessageSquare className="h-8 w-8 text-accent-primary" /> Komunitas &amp; Pusat Pengetahuan
        </h1>
        <p className="mt-3 max-w-2xl text-secondary">
          Pamerkan rakitan PC Anda, pelajari praktik terbaik dari admin lab CBT maupun teknisi tersertifikasi, dan diskusikan solusi perangkat keras harian.
        </p>
        <Link href="/community/create" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-accent-primary/25 bg-surface px-5 py-2.5 text-sm font-medium text-accent-hover transition hover:bg-accent-subtle">
          <PenSquare className="h-4 w-4 text-accent-primary" /> Buat Postingan Lengkap
        </Link>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Composer onPublish={publish} />
            {publishError && <p role="alert" className="rounded-lg border border-status-sample/35 bg-amber-50 p-3 text-sm text-amber-900">{publishError}</p>}

            <div className="relative">
              <label htmlFor="feed-search" className="sr-only">Cari postingan</label>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-secondary" />
              <input id="feed-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari topik, hardware, atau tag seperti #RTX4060" className={`w-full rounded-lg border border-default bg-surface py-3 pl-12 pr-4 text-sm text-primary placeholder:text-secondary ${focusRing}`} />
            </div>

            <div role="group" aria-label="Filter postingan berdasarkan kategori" className="flex flex-wrap gap-2">
              {CAT_ORDER.map((k) => {
                const Icon = CATEGORIES[k].icon;
                const active = category === k;
                return (
                  <button key={k} type="button" aria-pressed={active} onClick={() => setCategory(k)} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${focusRing} ${active ? "border-accent-primary/30 bg-accent-subtle font-medium text-accent-hover" : "border-default bg-surface text-secondary hover:bg-subtle hover:text-primary"}`}>
                    <Icon className="h-4 w-4" /> {CATEGORIES[k].label} <span className="font-mono text-xs text-secondary">{counts[k]}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-sm text-secondary" aria-live="polite">
              Menampilkan <span className="font-mono font-semibold text-primary">{visible.length}</span> postingan{query.trim() ? ` untuk “${query.trim()}”` : ""}
            </p>

            {paginatedPosts.length ? (
              <div className="space-y-4">
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
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-default bg-surface p-10 text-center">
                <p className="font-medium text-primary">Belum ada postingan yang cocok dengan filter.</p>
                <p className="mt-1 text-sm text-secondary">Coba kata kunci atau kategori lain, atau mulai diskusi baru.</p>
                <button type="button" onClick={clearFilters} className={`mt-4 min-h-11 rounded-lg border border-default bg-subtle px-4 py-2 text-sm text-primary hover:border-accent-primary/40 hover:text-accent-hover ${focusRing}`}>Reset Filter</button>
              </div>
            )}
          </div>

          <Sidebar topTags={topTags} onTag={searchTag} onGuide={searchTag} resolve={resolve} />
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
