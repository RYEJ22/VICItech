"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, LoaderCircle, Send } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const categories = [
  { value: "build_showcase", label: "Build Showcase" },
  { value: "general", label: "IT Guide" },
  { value: "troubleshooting", label: "Tech Q&A" },
] as const;

export default function CreateCommunityPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]["value"]>("build_showcase");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (cleanTitle.length < 5 || cleanTitle.length > 120) {
      setError("Title must be between 5 and 120 characters.");
      return;
    }
    if (cleanContent.length < 10) {
      setError("Add at least 10 characters of post content.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!user) throw new Error("Sign in before publishing a community post.");

      const { error: insertError } = await supabase.from("community_posts").insert({
        user_id: user.id,
        title: cleanTitle,
        category,
        content: cleanContent,
      });
      if (insertError) throw new Error(insertError.message);

      router.push("/community");
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Could not publish your post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = "mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-emerald-400";

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50 px-4 py-10 text-zinc-900 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/community" className="inline-flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-300">
          <ArrowLeft className="h-4 w-4" /> Back to community
        </Link>
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Community &amp; Knowledge Hub</p>
          <h1 className="mt-2 text-3xl font-semibold">Create a post</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Share a build, publish an IT guide, or ask the hardware community for help.</p>

          <form onSubmit={submitPost} className="mt-7 space-y-5">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Post title
              <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={5} maxLength={120} required className={fieldClass} placeholder="What would you like to share?" />
            </label>

            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className={fieldClass}>
                {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Markdown content
              <textarea value={content} onChange={(event) => setContent(event.target.value)} minLength={10} required rows={10} className={`${fieldClass} resize-y`} placeholder="Describe the build, steps, hardware, or symptoms. Markdown is supported." />
            </label>

            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </p>
            )}

            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-zinc-950 dark:hover:bg-emerald-300">
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSubmitting ? "Publishing…" : "Publish Post"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
