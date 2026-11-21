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
  all: { label: "All Posts", icon: MessageSquare },
  build: { label: "Build Showcases", icon: Cpu, cls: "border-[#FF5500]/30 bg-[#FF5500]/10 text-[#A83A00]" },
  guide: { label: "School/Office IT Guides", icon: BookOpen, cls: "border-emerald-600/20 bg-emerald-50 text-emerald-800" },
  qa: { label: "Tech Q&A", icon: HelpCircle, cls: "border-violet-600/20 bg-violet-50 text-violet-800" },
  news: { label: "Official Announcements", icon: Megaphone, cls: "border-amber-600/20 bg-amber-50 text-amber-800" },
};
const CAT_ORDER = ["all", "build", "guide", "qa", "news"];
const POSTABLE = ["build", "guide", "qa"]; // announcements come from the ViciTech team only

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
    // Penulis = pemilik baris (user_id), bukan "you". Postingan user lain tidak lagi dianggap milik akun yang sedang login.
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
  tech: { label: "Certified Technician", cls: "border-emerald-600/20 bg-emerald-50 text-emerald-800", verified: true },
  lab: { label: "CBT Lab Admin", cls: "border-[#FF5500]/30 bg-[#FF5500]/10 text-[#A83A00]" },
  fan: { label: "Hardware Enthusiast", cls: "border-black/10 bg-[#F6F5F2] text-[#5A606A]" },
  buyer: { label: "IT Procurement Lead", cls: "border-violet-600/20 bg-violet-50 text-violet-800" },
  team: { label: "ViciTech Team", cls: "border-[#FF5500] bg-[#FF5500] text-white", verified: true },
};

const AUTHORS = {
  team: { name: "ViciTech Team", role: "team" },
  rizky: { name: "Rizky Aditya", role: "tech" },
  dewi: { name: "Dewi Anggraini", role: "tech" },
  hendra: { name: "Hendra Wijaya", role: "lab" },
  sari: { name: "Sari Nugraha", role: "lab" },
  bagas: { name: "Bagas Pratama", role: "fan" },
  nadia: { name: "Nadia Putri", role: "fan" },
  fajar: { name: "Fajar Ramadhan", role: "buyer" },
  you: { name: "You", role: "fan" },
};

const ATTACH_SPECS = [["CPU", "AMD Ryzen 5 7600"], ["GPU", "NVIDIA RTX 4060 8 GB"], ["RAM", "16 GB DDR5-5600"], ["Storage", "1 TB NVMe SSD"], ["PSU", "550 W 80+ Bronze"]];
const PROMPTS = {
  build: "Describe your build: parts, temperatures, what you would change. Add tags like #RTX4060.",
  guide: "Share the steps that worked for your lab or office. Add tags like #CBTSetup.",
  qa: "What is going wrong? Include model numbers and symptoms. Add tags like #PSU.",
};

const mk = (id, by, cat, minsAgo, title, body, likes, comments = [], extra = {}) => ({
  id, by, cat, title, body, likes, liked: false, createdAt: Date.now() - minsAgo * 60000,
  comments: comments.map(([cby, m, text], i) => ({ id: `${id}-c${i + 1}`, by: cby, text, createdAt: Date.now() - m * 60000 })),
  ...extra,
});

const SEED_POSTS = [
  mk("p1", "team", "news", 35, "Price index update: RTX 40-series down this week",
    "Our daily Hardware Price Index shows #RTX4060 and #RTX4070 listings trending lower week over week, while refurbished #ThinkPadGradeA stock is steady. Open the Hardware Engine to compare current prices.",
    128, [["bagas", 20, "Good timing, I was about to order the 4060."]]),
  mk("p2", "team", "news", 190, "Stock alert: Grade A+ ThinkPad T14 back at Hub Bandung",
    "A fresh batch has passed the 15-point inspection and is listed now. Schools can request bulk quotes through the Trade-In & Recycle portal. #ThinkPadGradeA #Refurbished #CBTSetup",
    86, [["sari", 150, "Requested a quote for 30 units, thank you!"], ["hendra", 120, "Does the whole batch share one inspection report?"]]),
  mk("p3", "bagas", "build", 320, "1080p esports rig for under Rp 14 juta",
    "Finished this over the weekend. It runs most esports titles above 140 FPS at 1080p and stays under 65 °C. #RTX4060 #Ryzen5 #BudgetBuild",
    94, [["rizky", 250, "Clean cable management! A 550 W Bronze unit is plenty for this combo."], ["nadia", 200, "Which case fans are you running?"]],
    { cost: 13900000, attachment: "esports-rig-front.jpg", specs: [["CPU", "AMD Ryzen 5 7600"], ["GPU", "NVIDIA RTX 4060 8 GB"], ["RAM", "16 GB DDR5-5600"], ["Storage", "1 TB NVMe SSD"], ["PSU", "550 W 80+ Bronze"]] }),
  mk("p4", "nadia", "build", 1500, "Silent 4K video editing workstation",
    "Priority was low noise during long renders. Fan curves are tuned to stay near 35 dB at full load. #Ryzen9 #CreatorRig #SilentBuild",
    152, [["rizky", 1400, "Nice. Re-pasting the CPU brought mine down another 5 °C."]],
    { cost: 38400000, attachment: "creator-rig.jpg", specs: [["CPU", "AMD Ryzen 9 7950X"], ["GPU", "NVIDIA RTX 4070 Super 12 GB"], ["RAM", "64 GB DDR5-6000"], ["Storage", "2 TB NVMe SSD"], ["PSU", "750 W 80+ Gold"]] }),
  mk("p5", "rizky", "build", 2900, "Compact office SFF with dual monitors",
    "Our standard B2B build: low power, quiet and ready for two displays. It idles around 25 W. #OfficeSFF #DualMonitor #CoreI5",
    71, [], { cost: 9850000, specs: [["CPU", "Intel Core i5-12400"], ["GPU", "Integrated UHD 730"], ["RAM", "16 GB DDR4-3200"], ["Storage", "512 GB NVMe SSD"], ["PSU", "350 W 80+ White"]] }),
  mk("p6", "hendra", "guide", 4300, "How to Prevent Thermal Throttling in School Labs",
    "Our lab of 36 PCs used to slow down during the second CBT session. What fixed it:\n1. Clean dust filters every term.\n2. Re-paste any CPU older than three years.\n3. Keep the room below 28 °C and stagger exam sessions.\n4. Check fan curves in the BIOS after each firmware update.\n#CBTSetup #ThermalThrottling #LabMaintenance",
    203, [["rizky", 4200, "Re-pasting is the step most schools skip. It is worth it."], ["sari", 4100, "Saved this for our next maintenance day."]]),
  mk("p7", "dewi", "guide", 5800, "Best Refurbished Laptops under 5 Million IDR",
    "Shortlist for student and admin laptops: look for business-class models like the ThinkPad T480 or Latitude 7280, battery health above 85% and an SSD. Always ask for the inspection summary. #ThinkPadGradeA #Refurbished #BudgetLab",
    175, [["fajar", 5700, "Is Grade A cosmetic wear a problem for classroom use?"], ["dewi", 5600, "Not at all. It only affects the shell, and the 15-point check covers function."]]),
  mk("p8", "sari", "guide", 5100, "Checklist Jaringan & UPS untuk 30 Unit PC Ujian CBT",
    "Pembagian beban UPS dan switch gigabit agar sesi ujian serentak bebas drop tegangan maupun RTO. #CBTSetup #UPS #LabSekolah",
    144, [["hendra", 5000, "Checklist pembagian jalur MCB ini sangat membantu tim teknisi sekolah kami."]]),
  mk("p9", "fajar", "qa", 600, "Is a 350 W PSU enough for an i5-12400 with a GTX 1650?",
    "We are speccing 20 office PCs and want to add a low-profile GPU to some. The Preset Builder shows about 150 W for the base build. Any reason to go bigger? #PSU #i512400",
    24, [["rizky", 540, "A 450 W Bronze unit gives you headroom and better efficiency. Check the load meter in the Preset Builder."], ["fajar", 500, "Thanks, switching to 450 W."]]),
  mk("p10", "bagas", "qa", 980, "Refurbished RTX 3080 hits 83 °C under load, is that normal?",
    "Bought a Grade A+ card last week. Idle is fine, but games push it to 83 °C. #RTX3080 #Thermals #Refurbished",
    37, [["rizky", 900, "Within spec, but under 75 °C is better. Check case airflow and the fan curve first."]]),
];

const BUILDERS = [["rizky", 14, 2480], ["dewi", 11, 2105], ["nadia", 9, 1870], ["bagas", 8, 1540], ["hendra", 7, 1320]];
const GUIDES = [
  { title: "How to Prevent Thermal Throttling in School Labs", reads: 3280, q: "thermal" },
  { title: "Best Refurbished Laptops under 5 Million IDR", reads: 2910, q: "refurbished" },
  { title: "Choosing the Right PSU for Office PCs", reads: 1760, q: "psu" },
  { title: "CBT Lab Setup Checklist for 30 Seats", reads: 1540, q: "cbtsetup" },
];

/* ───────────────────────── Helpers ───────────────────────── */

const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const num = (n) => new Intl.NumberFormat("id-ID").format(n);
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F5F2]";
const TAG_RE = /#[A-Za-z0-9_]+/g;
const AVATAR_TONES = ["bg-[#FF5500]/10 text-[#A83A00]", "bg-emerald-50 text-emerald-800", "bg-violet-50 text-violet-800", "bg-amber-50 text-amber-800"];

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)} h ago`;
  return `${Math.floor(m / 1440)} d ago`;
}

/* ───────────────────────── Small UI pieces ───────────────────────── */

function Header({ onNavigate }) {
  const go = (id) => () => onNavigate?.(id);
  const link = `shrink-0 rounded-full px-3 py-2 text-sm text-[#5A606A] hover:bg-black/[0.04] hover:text-[#141518] ${focusRing}`;
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#F6F5F2]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <span className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FF5500] text-white"><Cpu className="h-5 w-5" /></span>
          <span className="font-serif text-xl font-semibold tracking-tight">ViciTech</span>
        </span>
        <nav aria-label="Modules" className="ml-2 flex items-center gap-1 overflow-x-auto">
          <button type="button" onClick={go("engine")} className={link}>Hardware Engine</button>
          <button type="button" onClick={go("builder")} className={link}>Preset Builder</button>
          <button type="button" onClick={go("tradein")} className={link}>Trade-In &amp; Recycle</button>
          <button type="button" onClick={go("qc")} className={link}>IoT QC Engine</button>
          <button type="button" aria-current="page" className={`flex shrink-0 items-center gap-2 border-b-2 border-[#FF5500] px-3 py-1.5 text-sm font-medium text-[#C94300] ${focusRing}`}>
            <MessageSquare className="h-4 w-4" /> Community
          </button>
        </nav>
      </div>
    </header>
  );
}

const USERNAME_RE = /^[a-z0-9]{3,20}$/;
const usernameHref = (username) =>
  typeof username === "string" && USERNAME_RE.test(username) ? `/profile/${encodeURIComponent(username)}` : "";

// Satu-satunya tempat yang menentukan nama, peran, dan link profil seorang penulis.
// `key` bisa berupa key penulis sampel ("rizky"), UUID user Supabase, atau "you" (komentar lokal tanpa sesi).
function resolveAuthor(key, { currentUser, profiles }) {
  const seed = key !== "you" ? AUTHORS[key] : undefined;
  if (seed) return { ...seed, href: key === "team" ? "" : usernameHref(key), isSelf: false };

  const userId = key === "you" ? currentUser?.id : key;
  const isSelf = key === "you" || (Boolean(userId) && userId === currentUser?.id);
  const profile = userId ? profiles[userId] : undefined;
  // Username berasal dari tabel profiles milik penulis itu sendiri.
  // user_metadata hanya cadangan untuk akun yang sedang login, tidak pernah dipakai untuk akun orang lain.
  const username = profile?.username || (isSelf ? currentUser?.user_metadata?.username : "");
  
  return {
    name: profile?.full_name || profile?.display_name || username || "ViciTech member",
    role: "fan",
    href: usernameHref(username),
    isSelf, // biarin kalau mau nandain kepunyaan sendiri
  };
}
  


function Avatar({ author, size = "h-10 w-10" }) {
  const avatar = author.isSelf
    ? <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300`}><User className="h-1/2 w-1/2" /></span>
    : <span className={`grid ${size} shrink-0 place-items-center rounded-full text-sm font-semibold ${AVATAR_TONES[[...author.name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length]}`} aria-hidden="true">{author.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>;
  return author.href
    ? <a href={author.href} aria-label={author.isSelf ? "View your profile" : `View ${author.name}'s profile`} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]">{avatar}</a>
    : avatar;
}

function RoleBadge({ role }) {
  const r = ROLES[role];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${r.cls}`}>
      {r.verified && <CheckCircle2 className="h-3 w-3" />}{r.label}
    </span>
  );
}

// Renders #tags inline as clickable badges that start a tag search
function RichText({ text, onTag }) {
  return text.split(/(#[A-Za-z0-9_]+)/g).map((part, i) =>
    /^#[A-Za-z0-9_]+$/.test(part) ? (
      <button key={i} type="button" onClick={() => onTag(part)} className={`mx-0.5 rounded bg-emerald-600/10 dark:bg-emerald-400/10 px-1.5 py-0.5 text-[13px] text-[#A83A00] dark:text-[#A83A00] hover:bg-emerald-600/20 dark:hover:bg-emerald-400/20 ${focusRing}`}>{part}</button>
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
    if (title.trim().length < 5) return setError("Give your post a title of at least 5 characters.");
    if (body.trim().length < 10) return setError("Add a few details (at least 10 characters) so others can help.");
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
      setNotice("Your post is live at the top of the feed.");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not publish your post.");
    } finally {
      setPublishStage("");
    }
  };

  const field = `w-full rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm text-[#141518] placeholder:text-[#777C83] ${focusRing}`;
  return (
    <section aria-labelledby="composer-title" className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_12px_36px_rgba(20,21,24,0.04)]">
      <h2 id="composer-title" className="flex items-center gap-2 font-serif text-xl font-semibold text-[#141518]">
        <PenSquare className="h-5 w-5 text-[#FF5500]" /> Share Your Build or Ask the Community
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="post-title" className="mb-1.5 block text-sm text-zinc-700">Post title</label>
          <input id="post-title" value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} maxLength={120} placeholder="e.g. Quiet 4K editing rig under Rp 40 juta" className={field} />
        </div>
        <div>
          <label htmlFor="post-cat" className="mb-1.5 block text-sm text-zinc-700">Category</label>
          <select id="post-cat" value={cat} onChange={(e) => setCat(e.target.value)} className={field}>
            {POSTABLE.map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="post-body" className="mb-1.5 block text-sm text-zinc-700">Details</label>
        <textarea id="post-body" rows={4} value={body} onChange={(e) => { setBody(e.target.value); setError(""); }} placeholder={PROMPTS[cat]} className={`${field} resize-y`} />
        {tags.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
            <Tag className="h-3.5 w-3.5" /> Tags detected:
            {tags.map((t) => <span key={t} className="rounded bg-[#FF5500]/10 px-1.5 py-0.5 text-[#A83A00]">{t}</span>)}
          </p>
        )}
      </div>

      {stagedMedia.length > 0 && (
        <div className="mt-3 space-y-2 rounded-2xl border border-black/[0.08] bg-[#FAF9F6] p-3">
          <div className="flex items-center justify-between text-xs font-medium text-[#5A606A]">
            <span>
              {stagedMedia[0]?.mediaType === "video"
                ? "Lampiran Video Siap Diunggah"
                : `${stagedMedia.length}/${MAX_IMAGE_ATTACHMENTS} Foto Siap Diunggah`}
            </span>
          </div>
          {stagedMedia[0]?.mediaType === "video" ? (
            <div className="relative overflow-hidden rounded-xl border border-black/10 bg-[#141518]">
              <video
                src={stagedMedia[0].previewUrl}
                controls
                muted
                playsInline
                preload="metadata"
                className="max-h-60 w-full object-contain"
              />
              <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 text-xs text-[#5A606A]">
                <span className="truncate font-mono">{stagedMedia[0].name} ({formatMediaFileSize(stagedMedia[0].size)})</span>
                <button
                  type="button"
                  onClick={() => removeStagedMedia(stagedMedia[0].id)}
                  disabled={isPublishing}
                  aria-label="Hapus video lampiran"
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black/10 text-[#141518] hover:border-red-500/40 hover:text-red-700 ${focusRing}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {stagedMedia.map((item) => (
                <div key={item.id} className="group relative overflow-hidden rounded-xl border border-black/10 bg-white">
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
                    className={`absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#141518]/80 text-white hover:bg-red-600 ${focusRing}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="truncate px-2 py-1 font-mono text-[10px] text-[#5A606A]">
                    {formatMediaFileSize(item.size)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {attachedSpecs && (
        <div className="mt-3 flex gap-3 rounded-xl border border-black/[0.08] bg-[#FAF9F6] p-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-black/10 bg-white text-[#FF5500]"><Cpu className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-[#141518]">Spec Sheet Sample Build</p>
            <p className="text-xs text-[#5A606A]">{ATTACH_SPECS.map(([, v]) => v).join(" · ")}</p>
          </div>
          <button type="button" aria-label="Hapus spec sheet" onClick={() => setAttachedSpecs(false)} className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#5A606A] hover:text-[#141518] ${focusRing}`}><X className="h-4 w-4" /></button>
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
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/10 bg-[#FAF9F6] px-3.5 py-2 text-sm font-medium text-[#141518] transition hover:border-[#FF5500]/50 hover:text-[#A83A00] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
        >
          <ImageIcon className="h-4 w-4 text-[#FF5500]" />
          <Video className="h-4 w-4 text-[#FF5500]" />
          <span>Foto / Video</span>
        </button>

        {cat === "build" && (
          <button
            type="button"
            onClick={() => setAttachedSpecs((v) => !v)}
            disabled={isPublishing}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition ${focusRing} ${
              attachedSpecs
                ? "border-[#FF5500] bg-[#FF5500]/10 font-medium text-[#A83A00]"
                : "border-black/10 bg-white text-[#5A606A] hover:text-[#141518]"
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>{attachedSpecs ? "Spec Sheet Terlampir" : "Tambah Spec Sheet"}</span>
          </button>
        )}

        <button type="button" onClick={() => void publish()} disabled={isPublishing} className={`ml-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-[#FF5500] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#E94B00] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}>
          {isPublishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span>
            {publishStage === "uploading"
              ? "Mengunggah media…"
              : publishStage === "saving"
                ? "Mempublikasikan…"
                : "Publish Post"}
          </span>
        </button>
      </div>
      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {notice && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {notice}</p>}
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
    try { await navigator.clipboard.writeText(text); setShareNote("Copied to clipboard"); }
    catch { setShareNote("Copying isn't available in this browser"); }
  };

  const submitComment = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onComment(post.id, draft.trim());
    setDraft("");
  };

  const action = `inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${focusRing}`;
  return (
    <article className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_12px_36px_rgba(20,21,24,0.04)]">
      <header className="flex items-start gap-3">
        <Avatar author={author} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {authorProfile
              ? <a href={authorProfile} className="font-medium text-zinc-900 dark:text-zinc-50 hover:text-[#A83A00] dark:hover:text-[#A83A00]">{author.name}</a>
              : <span className="font-medium text-zinc-900 dark:text-zinc-50">{author.name}</span>}
            <RoleBadge role={author.role} />
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{timeAgo(post.createdAt)}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${cat.cls}`}><CatIcon className="h-3.5 w-3.5" /> {cat.label}</span>
      </header>

      <h3 className="mt-4 text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-50">{post.title}</h3>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"><RichText text={post.body} onTag={onTag} /></p>

      {mediaUrls.length > 0 && (
        isVideoPost ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-black/[0.08] bg-[#141518]">
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
            className={`mt-3 block w-full overflow-hidden rounded-2xl border border-black/[0.06] bg-[#FAF9F6] ${focusRing}`}
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
                className={`overflow-hidden rounded-xl border border-black/[0.06] bg-[#FAF9F6] ${focusRing}`}
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
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-white/60 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400"><ImageIcon className="h-3.5 w-3.5" /> {post.attachment}</p>
      )}

      {post.specs && (
        <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-white/60">
          <p className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-500"><Cpu className="h-3.5 w-3.5 text-[#A83A00] dark:text-[#A83A00]" /> Hardware spec breakdown</p>
          <dl className="grid gap-x-6 px-3 py-2 text-sm sm:grid-cols-2">
            {post.specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-1"><dt className="text-zinc-500">{k}</dt><dd className="text-right text-zinc-900 dark:text-[#141518]">{v}</dd></div>
            ))}
          </dl>
          {post.cost && <p className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm"><span className="text-zinc-500">Total build cost</span><span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-700">{idr(post.cost)}</span></p>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-zinc-200 dark:border-zinc-800 pt-3">
        <button type="button" aria-pressed={post.liked} onClick={() => onLike(post.id)} className={`${action} ${post.liked ? "bg-[#FF5500]/[0.06] text-[#A83A00]" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-[#141518]"}`}>
          <ThumbsUp className="h-4 w-4" fill={post.liked ? "currentColor" : "none"} /> <span className="tabular-nums">{post.likes}</span>
          <span className="sr-only">{post.liked ? "upvotes, you upvoted this" : "upvotes"}</span>
        </button>
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`${action} ${open ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-[#141518]" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-[#141518]"}`}>
          <MessageSquare className="h-4 w-4" /> <span className="tabular-nums">{post.comments.length}</span> {post.comments.length === 1 ? "Comment" : "Comments"}
        </button>
        <button type="button" onClick={share} className={`${action} ml-auto text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-[#141518]`}>
          <Share2 className="h-4 w-4" /> {post.specs ? "Share Spec" : "Share"}
        </button>
      </div>
      <p role="status" className="min-h-0 text-right text-xs text-emerald-700 dark:text-emerald-700">{shareNote}</p>

      {open && (
        <div className="mt-2 space-y-3 rounded-lg bg-white/50 dark:bg-white/50 p-3">
          {post.comments.length === 0 && <p className="text-sm text-zinc-500">No comments yet. Be the first to reply.</p>}
          {post.comments.map((c) => {
            const commenter = resolve(c.by);
            return (
              <div key={c.id} className="flex gap-2.5">
                <Avatar author={commenter} size="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm">
                    {commenter.href
                      ? <a href={commenter.href} className="font-medium text-zinc-900 dark:text-[#141518] hover:text-[#A83A00] dark:hover:text-[#A83A00]">{commenter.name}</a>
                      : <span className="font-medium text-zinc-900 dark:text-[#141518]">{commenter.name}</span>}
                    <span className="text-xs text-zinc-500">{ROLES[commenter.role]?.label || "Member"}, {timeAgo(c.createdAt)}</span>
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{c.text}</p>
                </div>
              </div>
            );
          })}
          <form onSubmit={submitComment} className="flex gap-2">
            <label htmlFor={`reply-${post.id}`} className="sr-only">Write a reply</label>
            <input id={`reply-${post.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a reply" className={`min-w-0 flex-1 rounded-lg border border-zinc-200 dark:border-black/10 bg-white dark:bg-white px-3 py-2 text-sm text-zinc-900 dark:text-[#141518] placeholder:text-zinc-600 ${focusRing}`} />
        <button type="submit" disabled={!draft.trim()} aria-label="Send reply" className={`grid h-10 w-10 place-items-center rounded-full bg-[#FF5500] text-white hover:bg-[#E94B00] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </article>
  );
});

/* ───────────────────────── Sidebar ───────────────────────── */

function Sidebar({ topTags, onTag, onGuide, resolve }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-[8.5rem] lg:self-start" aria-label="Community highlights">
      <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(20,21,24,0.035)]">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50"><Award className="h-5 w-5 text-emerald-700 dark:text-emerald-700" /> Top Verified Builders of the Month</h2>
        <ol className="mt-3 space-y-3">
          {BUILDERS.map(([key, builds, points], i) => {
            const author = resolve(key);
            return (
              <li key={key} className="flex items-center gap-3">
                <span className={`w-5 text-center text-sm font-semibold tabular-nums ${i === 0 ? "text-emerald-700 dark:text-emerald-700" : "text-zinc-500"}`}>{i + 1}</span>
                <Avatar author={author} size="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-medium text-zinc-900 dark:text-[#141518]">
                    {author.href
                      ? <a href={author.href} className="truncate hover:text-[#A83A00] dark:hover:text-[#A83A00]">{author.name}</a>
                      : <span className="truncate">{author.name}</span>}
                    {i === 0 && <Award className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-700" aria-label="Builder of the month" />}
                  </p>
                  <p className="text-xs text-zinc-500">{ROLES[author.role]?.label || "Member"}</p>
                </div>
                <div className="text-right text-xs tabular-nums"><p className="font-medium text-[#A83A00] dark:text-[#A83A00]">{num(points)} pts</p><p className="text-zinc-500">{builds} builds</p></div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(20,21,24,0.035)]">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50"><BookOpen className="h-5 w-5 text-[#A83A00] dark:text-[#A83A00]" /> Trending Maintenance Guides</h2>
        <ul className="mt-3 divide-y divide-zinc-800">
          {GUIDES.map((g) => (
            <li key={g.title}>
              <button type="button" onClick={() => onGuide(g.q)} className={`w-full py-2.5 text-left hover:text-[#A83A00] dark:hover:text-[#A83A00] ${focusRing}`}>
                <span className="block text-sm text-zinc-800 dark:text-zinc-200">{g.title}</span>
                <span className="text-xs tabular-nums text-zinc-500">{num(g.reads)} reads</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(20,21,24,0.035)]">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50"><Tag className="h-5 w-5 text-[#A83A00] dark:text-[#A83A00]" /> Popular hardware tags</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {topTags.map(([tag, count]) => (
            <button key={tag} type="button" onClick={() => onTag(tag)} className={`rounded-full border border-zinc-200 dark:border-black/10 px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:border-emerald-600/60 dark:hover:border-emerald-400/60 hover:text-[#A83A00] dark:hover:text-[#A83A00] ${focusRing}`}>
              {tag} <span className="text-zinc-500">{count}</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

/* ───────────────────────── Page ───────────────────────── */

/* Sesi user selalu dibaca dari Supabase Auth, bukan dari prop yang bisa tertinggal. */
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

export default function CommunityHub({ onNavigate }) {
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

  // Ambil username penulis dari tabel `profiles` (kolom: id = auth user id, username).
  // Jika tabel/kolom berbeda atau RLS menolak, penulis tampil tanpa link, bukan dengan link yang salah.
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

  // Data fetching (re-runs only when dbFetchLimit expands)
  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (clientError) {
      setPublishError(clientError instanceof Error ? clientError.message : "Community feed is unavailable.");
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
        if (isActive) setPublishError(`Community posts could not be refreshed: ${error.message}`);
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

  // Realtime subscription (kept independent from pagination state so loading more never churns sockets)
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
          setPublishError("Live community updates are unavailable. Reload the page to refresh the feed.");
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
      setPublishError("Enter a valid post title and body before publishing.");
      return false;
    }
    try {
      const client = getSupabaseBrowserClient();
      // Ambil user terbaru dari Auth server TEPAT sebelum insert.
      // Jangan memakai prop/state `user`: bisa tertinggal setelah login, logout, atau ganti akun.
      const { data: { user: activeUser }, error: authError } = await client.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!activeUser) throw new Error("Silakan login terlebih dahulu sebelum mempublikasikan postingan.");
      setCurrentUser(activeUser); // tampilan ikut akun yang benar-benar dipakai untuk insert

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
          if (buildError) setPublishError(`Post published, but the shared-build summary could not be saved: ${buildError.message}`);
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
      setPublishError(publishError instanceof Error ? publishError.message : "Could not publish your post.");
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
    <div className="min-h-screen bg-[#F6F5F2] text-[#141518] antialiased">
      <Header onNavigate={onNavigate} />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#FF5500]">Ideas shared by the community</p>
        <h1 className="flex items-center gap-3 font-serif text-4xl font-semibold tracking-tight text-[#141518] sm:text-5xl">
          <MessageSquare className="h-8 w-8 text-[#FF5500]" /> Community &amp; Knowledge Hub
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Show off your builds, learn from lab admins and certified technicians, and get answers from people who run real hardware every day.
        </p>
        <Link href="/community/create" className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#FF5500]/25 bg-white px-5 py-3 text-sm font-medium text-[#A83A00] transition hover:bg-[#FF5500]/[0.05]">
          <PenSquare className="h-4 w-4" /> Create a full post
        </Link>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Composer onPublish={publish} />
            {publishError && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">{publishError}</p>}

            <div className="relative">
              <label htmlFor="feed-search" className="sr-only">Search posts</label>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input id="feed-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search topics, hardware or tags like #RTX4060" className={`w-full rounded-lg border border-zinc-200 dark:border-black/10 bg-white dark:bg-zinc-900 py-3 pl-12 pr-4 text-sm text-zinc-900 dark:text-[#141518] placeholder:text-zinc-500 ${focusRing}`} />
            </div>

            <div role="group" aria-label="Filter posts by category" className="flex flex-wrap gap-2">
              {CAT_ORDER.map((k) => {
                const Icon = CATEGORIES[k].icon;
                const active = category === k;
                return (
                  <button key={k} type="button" aria-pressed={active} onClick={() => setCategory(k)} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${focusRing} ${active ? "border-[#FF5500]/25 bg-[#FF5500]/[0.06] font-medium text-[#A83A00]" : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-200 dark:hover:border-black/10 hover:text-zinc-800 dark:hover:text-zinc-200"}`}>
                    <Icon className="h-4 w-4" /> {CATEGORIES[k].label} <span className="text-xs text-zinc-500">{counts[k]}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-sm text-zinc-500" aria-live="polite">
              Showing {visible.length} {visible.length === 1 ? "post" : "posts"}{query.trim() ? ` for “${query.trim()}”` : ""}
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
                      className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-black/10 bg-white px-5 py-2.5 text-sm font-medium text-[#141518] transition hover:border-[#FF5500]/40 hover:bg-[#FF5500]/[0.04] ${focusRing}`}
                    >
                      Muat lebih banyak postingan ({paginatedPosts.length}/{visible.length})
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 dark:border-black/10 p-10 text-center">
                <p className="text-zinc-900 dark:text-[#141518]">No posts match your filters.</p>
                <p className="mt-1 text-sm text-zinc-500">Try a different keyword or category, or start the conversation yourself.</p>
                <button type="button" onClick={clearFilters} className={`mt-4 rounded-lg border border-zinc-200 dark:border-black/10 px-4 py-2 text-sm text-zinc-800 dark:text-zinc-200 hover:border-emerald-600/60 dark:hover:border-emerald-400/60 hover:text-[#A83A00] dark:hover:text-[#A83A00] ${focusRing}`}>Clear filters</button>
              </div>
            )}
          </div>

          <Sidebar topTags={topTags} onTag={searchTag} onGuide={searchTag} resolve={resolve} />
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-600">
        ViciTech Engine v1.0. Sample community content.
      </footer>

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