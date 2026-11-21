'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Heart } from 'lucide-react';
import type { ReactElement } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { ShareMenu } from '@/components/features/share/share-menu';
import SpotlightCard from './SpotlightCard';

export interface UserProfile {
  readonly id: string;
  readonly displayName: string;
  readonly handle: string;
  readonly initials: string;
  readonly role: string;
}

export interface CommunityPost {
  readonly id: string;
  readonly author: UserProfile;
  readonly title: string;
  readonly body: string;
  readonly category: string;
  readonly likes: number;
  readonly timeAgo: string;
}

const COMMUNITY_POSTS: readonly CommunityPost[] = [
  {
    id: 'post-airflow',
    author: { id: 'maya-builds', displayName: 'Maya Chen', handle: '@mayamakes', initials: 'MC', role: 'Perakit Sistem' },
    title: 'Airflow senyap, suhu kerja turun 8 °C',
    body: 'Penyesuaian kurva kipas casing menurunkan suhu beban workstation tanpa menambah kebisingan.',
    category: 'THERMAL DESIGN',
    likes: 128,
    timeAgo: '12 mnt lalu',
  },
  {
    id: 'post-lab',
    author: { id: 'lab-notes', displayName: 'Lab Notes', handle: '@labnotes', initials: 'LN', role: 'Lab Komunitas' },
    title: 'Checklist stabilitas RAM DDR5',
    body: 'Urutan uji profil EXPO dan MemTest singkat sebelum unit rakitan diserahkan ke pemiliknya.',
    category: 'FIELD GUIDE',
    likes: 84,
    timeAgo: '1 jam lalu',
  },
];

const LIST_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

export default function CyberSuite(): ReactElement {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [liked, setLiked] = useState<string[]>([]);

  return (
    <section
      aria-labelledby="community-preview-title"
      className="border-t border-default bg-canvas px-4 py-12 text-primary sm:px-6 sm:py-14"
    >
      <div className="mx-auto max-w-shell">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="vt-badge-sample">Postingan Komunitas · Contoh</span>
            <h2 id="community-preview-title" className="mt-2 font-serif text-xl font-semibold text-primary">
              Catatan lapangan dari perakit dan teknisi
            </h2>
          </div>
          <Link
            href="/community"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-surface px-3.5 py-2 text-xs font-medium text-primary transition-colors duration-150 hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <span>Buka Community Hub</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>

        <motion.div
          variants={prefersReducedMotion ? undefined : LIST_VARIANTS}
          initial={prefersReducedMotion ? false : 'hidden'}
          whileInView={prefersReducedMotion ? undefined : 'visible'}
          viewport={{ once: true, amount: 0.15 }}
          className="grid gap-4 md:grid-cols-2"
        >
          {COMMUNITY_POSTS.map((post) => {
            const isLiked = liked.includes(post.id);
            return (
              <motion.article key={post.id} variants={prefersReducedMotion ? undefined : ITEM_VARIANTS}>
                <SpotlightCard className="h-full p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-md bg-subtle px-2.5 py-1 font-mono text-[11px] font-medium text-primary">
                      {post.category}
                    </span>
                    <span className="font-mono text-xs text-secondary">{post.timeAgo}</span>
                  </div>
                  <h3 className="mt-3 font-serif text-lg font-semibold text-primary">{post.title}</h3>
                  <p className="mt-1.5 max-w-[65ch] text-sm leading-relaxed text-secondary">{post.body}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-default pt-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-default bg-subtle font-mono text-xs font-semibold text-primary">
                        {post.author.initials}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-primary">
                          {post.author.displayName}
                        </span>
                        <span className="block text-[11px] text-secondary">
                          {post.author.handle} · {post.author.role}
                        </span>
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        aria-pressed={isLiked}
                        onClick={() =>
                          setLiked((current) =>
                            isLiked ? current.filter((id) => id !== post.id) : [...current, post.id],
                          )
                        }
                        className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
                          isLiked
                            ? 'bg-status-danger/10 text-status-danger'
                            : 'text-secondary hover:bg-subtle hover:text-primary'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} strokeWidth={1.75} />
                        <span className="tabular-nums">{post.likes + Number(isLiked)}</span>
                      </button>
                      <ShareMenu title={post.title} text={post.body} url="/community" compact openUpward />
                    </div>
                  </div>
                </SpotlightCard>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
