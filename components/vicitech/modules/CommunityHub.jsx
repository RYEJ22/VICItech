import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MessageSquare, ThumbsUp, Share2, Tag, User, Award, PenSquare, Search, Image as ImageIcon, Send,
  CheckCircle2, HelpCircle, BookOpen, Cpu, Megaphone, X,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
  return {
    id: row.id,
    by: "you",
    cat: category,
    title: row.title,
    body: row.content,
    createdAt: new Date(row.created_at).getTime(),
    likes: Number(row.likes_count) || 0,
    liked: false,
    comments: [],
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

function profileHref(authorKey, user) {
  const username = authorKey === "you" ? user?.user_metadata?.username : authorKey === "team" ? "" : authorKey;
  return typeof username === "string" && /^[a-z0-9]{3,20}$/.test(username)
    ? `/profile/${encodeURIComponent(username)}`
    : "";
}

function Avatar({ authorKey, size = "h-10 w-10", user }) {
  const name = AUTHORS[authorKey]?.name || "ViciTech member";
  const avatar = authorKey === "you"
    ? <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300`}><User className="h-1/2 w-1/2" /></span>
    : <span className={`grid ${size} shrink-0 place-items-center rounded-full text-sm font-semibold ${AVATAR_TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length]}`} aria-hidden="true">{name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>;
  const href = profileHref(authorKey, user);
  return href ? <a href={href} aria-label={`View ${name}'s profile`} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]">{avatar}</a> : avatar;
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
  const [attached, setAttached] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const tags = useMemo(() => [...new Set(body.match(TAG_RE) ?? [])], [body]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const publish = async () => {
    if (title.trim().length < 5) return setError("Give your post a title of at least 5 characters.");
    if (body.trim().length < 10) return setError("Add a few details (at least 10 characters) so others can help.");
    setIsPublishing(true);
    setError("");
    try {
      const published = await onPublish({ title: title.trim(), body: body.trim(), cat, attached });
      if (!published) return;
      setTitle(""); setBody(""); setAttached(false);
      setNotice("Your post is live at the top of the feed.");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not publish your post.");
    } finally {
      setIsPublishing(false);
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
          <label htmlFor="post-title" className="mb-1.5 block text-sm text-zinc-700 dark:text-zinc-300">Post title</label>
          <input id="post-title" value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} maxLength={120} placeholder="e.g. Quiet 4K editing rig under Rp 40 juta" className={field} />
        </div>
        <div>
          <label htmlFor="post-cat" className="mb-1.5 block text-sm text-zinc-700 dark:text-zinc-300">Category</label>
          <select id="post-cat" value={cat} onChange={(e) => setCat(e.target.value)} className={field}>
            {POSTABLE.map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="post-body" className="mb-1.5 block text-sm text-zinc-700 dark:text-zinc-300">Details</label>
        <textarea id="post-body" rows={4} value={body} onChange={(e) => { setBody(e.target.value); setError(""); }} placeholder={PROMPTS[cat]} className={`${field} resize-y`} />
        {tags.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
            <Tag className="h-3.5 w-3.5" /> Tags detected:
            {tags.map((t) => <span key={t} className="rounded bg-emerald-600/10 dark:bg-emerald-400/10 px-1.5 py-0.5 text-[#A83A00] dark:text-[#A83A00]">{t}</span>)}
          </p>
        )}
      </div>

      {attached && (
        <div className="mt-3 flex gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-white/60 p-3">
          <div className="grid h-16 w-24 shrink-0 place-items-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500"><ImageIcon className="h-6 w-6" /></div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="text-zinc-900 dark:text-[#141518]">attached-photo.jpg <span className="text-xs text-zinc-500">(simulated)</span></p>
            <p className="text-xs text-zinc-500">Sample spec sheet: {ATTACH_SPECS.map(([, v]) => v).join(", ")}</p>
            {cat !== "build" && <p className="mt-1 text-xs text-zinc-500">The spec breakdown only appears on Build Showcases.</p>}
          </div>
          <button type="button" aria-label="Remove attachment" onClick={() => setAttached(false)} className={`h-fit rounded p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-[#141518] ${focusRing}`}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setAttached(true)} disabled={attached} className={`inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-black/10 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 hover:border-emerald-600/60 dark:hover:border-emerald-400/60 hover:text-[#A83A00] dark:hover:text-[#A83A00] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}>
          <ImageIcon className="h-4 w-4" /> {attached ? "Attached" : "Attach image or spec sheet"}
        </button>
        <button type="button" onClick={() => void publish()} disabled={isPublishing} className={`ml-auto inline-flex items-center gap-2 rounded-full bg-[#FF5500] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#E94B00] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}>
          <Send className="h-4 w-4" /> {isPublishing ? "Publishing…" : "Publish Post"}
        </button>
      </div>
      <div aria-live="polite">
        {error && <p className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
        {notice && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {notice}</p>}
      </div>
    </section>
  );
}

/* ───────────────────────── Post card ───────────────────────── */

function PostCard({ post, onLike, onComment, onTag, user }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [shareNote, setShareNote] = useState("");
  const author = AUTHORS[post.by] || AUTHORS.team;
  const cat = CATEGORIES[post.cat] || CATEGORIES.all;
  const CatIcon = cat.icon;
  const authorProfile = profileHref(post.by, user);

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
        <Avatar authorKey={post.by} user={user} />
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
          {post.comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar authorKey={c.by} size="h-8 w-8" user={user} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-sm">
                  {profileHref(c.by, user)
                    ? <a href={profileHref(c.by, user)} className="font-medium text-zinc-900 dark:text-[#141518] hover:text-[#A83A00] dark:hover:text-[#A83A00]">{AUTHORS[c.by]?.name || "ViciTech member"}</a>
                    : <span className="font-medium text-zinc-900 dark:text-[#141518]">{AUTHORS[c.by]?.name || "ViciTech member"}</span>}
                  <span className="text-xs text-zinc-500">{ROLES[AUTHORS[c.by]?.role]?.label || "Member"}, {timeAgo(c.createdAt)}</span>
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{c.text}</p>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2">
            <label htmlFor={`reply-${post.id}`} className="sr-only">Write a reply</label>
            <input id={`reply-${post.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a reply" className={`min-w-0 flex-1 rounded-lg border border-zinc-200 dark:border-black/10 bg-white dark:bg-white px-3 py-2 text-sm text-zinc-900 dark:text-[#141518] placeholder:text-zinc-600 ${focusRing}`} />
        <button type="submit" disabled={!draft.trim()} aria-label="Send reply" className={`grid h-10 w-10 place-items-center rounded-full bg-[#FF5500] text-white hover:bg-[#E94B00] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </article>
  );
}

/* ───────────────────────── Sidebar ───────────────────────── */

function Sidebar({ topTags, onTag, onGuide, user }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-[8.5rem] lg:self-start" aria-label="Community highlights">
      <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(20,21,24,0.035)]">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50"><Award className="h-5 w-5 text-emerald-700 dark:text-emerald-700" /> Top Verified Builders of the Month</h2>
        <ol className="mt-3 space-y-3">
          {BUILDERS.map(([key, builds, points], i) => (
            <li key={key} className="flex items-center gap-3">
              <span className={`w-5 text-center text-sm font-semibold tabular-nums ${i === 0 ? "text-emerald-700 dark:text-emerald-700" : "text-zinc-500"}`}>{i + 1}</span>
              <Avatar authorKey={key} size="h-9 w-9" user={user} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-sm font-medium text-zinc-900 dark:text-[#141518]">
                  {profileHref(key, user)
                    ? <a href={profileHref(key, user)} className="truncate hover:text-[#A83A00] dark:hover:text-[#A83A00]">{AUTHORS[key]?.name || "ViciTech member"}</a>
                    : <span className="truncate">{AUTHORS[key]?.name || "ViciTech member"}</span>}
                  {i === 0 && <Award className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-700" aria-label="Builder of the month" />}
                </p>
                <p className="text-xs text-zinc-500">{ROLES[AUTHORS[key]?.role]?.label || "Member"}</p>
              </div>
              <div className="text-right text-xs tabular-nums"><p className="font-medium text-[#A83A00] dark:text-[#A83A00]">{num(points)} pts</p><p className="text-zinc-500">{builds} builds</p></div>
            </li>
          ))}
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

export default function CommunityHub({ onNavigate, user }) {
  const [posts, setPosts] = useState(SEED_POSTS);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [publishError, setPublishError] = useState("");

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
        .select("id, title, content, category, likes_count, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        if (isActive) setPublishError(`Community posts could not be refreshed: ${error.message}`);
        return;
      }
      if (isActive && data) {
        const persistedPosts = data.map(mapDatabasePost);
        setPosts((current) => {
          const byId = new Map(current.map((post) => [post.id, post]));
          persistedPosts.forEach((post) => byId.set(post.id, post));
          return [...byId.values()];
        });
      }
    };

    void loadPosts();
    const channel = supabase
      .channel("community-posts-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, ({ new: row }) => {
        if (!row?.id || !row?.title || !row?.content) return;
        const post = mapDatabasePost(row);
        setPosts((current) => current.some((existing) => existing.id === post.id) ? current : [post, ...current]);
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setPublishError("Live community updates are unavailable. Reload the page to refresh the feed.");
        }
      });

    return () => {
      isActive = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const counts = useMemo(() => Object.fromEntries(CAT_ORDER.map((k) => [k, k === "all" ? posts.length : posts.filter((p) => p.cat === k).length])), [posts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    return posts
      .filter((p) => category === "all" || p.cat === category)
      .filter((p) => {
        if (!q) return true;
        const hay = `${p.title} ${p.body} ${AUTHORS[p.by].name} ${CATEGORIES[p.cat].label} ${(p.specs ?? []).flat().join(" ")}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [posts, category, query]);

  const topTags = useMemo(() => {
    const tally = {};
    posts.forEach((p) => (p.body.match(TAG_RE) ?? []).forEach((t) => { tally[t] = (tally[t] || 0) + 1; }));
    return Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
  }, [posts]);

  const patch = (id, fn) => setPosts((list) => list.map((p) => (p.id === id ? fn(p) : p)));
  const like = (id) => patch(id, (p) => ({ ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }));
  const addComment = (id, text) => patch(id, (p) => ({ ...p, comments: [...p.comments, { id: `${id}-c${p.comments.length + 1}`, by: "you", text, createdAt: Date.now() }] }));

  const publish = async ({ title, body, cat, attached }) => {
    setPublishError("");
    try {
      const client = getSupabaseBrowserClient();
      const { data: { user: activeUser }, error: authError } = await client.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!activeUser) throw new Error("Sign in before publishing a community post.");
      const { data, error } = await client.from("community_posts").insert({
        user_id: activeUser.id,
        title,
        content: body,
        category: databaseCategory[cat],
      }).select("id, title, content, category, likes_count, created_at").single();
      if (error) throw new Error(error.message);
      const post = mapDatabasePost(data);
      if (attached) {
        post.attachment = "attached-photo.jpg";
        if (cat === "build") post.specs = ATTACH_SPECS;
      }
      setPosts((list) => [post, ...list.filter((existing) => existing.id !== post.id)]);
      setCategory("all");
      setQuery("");
      if (cat === "build" && user?.id) {
        const { error: buildError } = await client.from("shared_builds").insert({ user_id: activeUser.id, title });
        if (buildError) setPublishError(`Post published, but the shared-build summary could not be saved: ${buildError.message}`);
      }
      return true;
    } catch (publishError) {
      setPublishError(publishError instanceof Error ? publishError.message : "Could not publish your post.");
      return false;
    }
  };

  const searchTag = (tag) => { setCategory("all"); setQuery(tag); };
  const clearFilters = () => { setCategory("all"); setQuery(""); };

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

            {visible.length ? (
              <div className="space-y-4">
                {visible.map((p) => <PostCard key={p.id} post={p} onLike={like} onComment={addComment} onTag={searchTag} user={user} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 dark:border-black/10 p-10 text-center">
                <p className="text-zinc-900 dark:text-[#141518]">No posts match your filters.</p>
                <p className="mt-1 text-sm text-zinc-500">Try a different keyword or category, or start the conversation yourself.</p>
                <button type="button" onClick={clearFilters} className={`mt-4 rounded-lg border border-zinc-200 dark:border-black/10 px-4 py-2 text-sm text-zinc-800 dark:text-zinc-200 hover:border-emerald-600/60 dark:hover:border-emerald-400/60 hover:text-[#A83A00] dark:hover:text-[#A83A00] ${focusRing}`}>Clear filters</button>
              </div>
            )}
          </div>

          <Sidebar topTags={topTags} onTag={searchTag} onGuide={searchTag} user={user} />
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-600">
        ViciTech Engine v1.0. Sample community content.
      </footer>
    </div>
  );
}
