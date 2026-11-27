'use client';

import { Layers, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { GLOBAL_SEARCH_ITEMS } from './navbar-state';
import styles from './navbar.module.css';

interface NavbarCommandPaletteProps {
  readonly onClose: () => void;
  readonly onNavigate: (href: string, moduleName?: string, viewName?: string) => void;
}

const SERIAL_RE = /^VICI-[A-Z]{3}-\d{4}-\d{4}$/;
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60';

const ENGLISH_SEARCH_LABELS: Readonly<Record<string, { readonly label: string; readonly hint: string }>> = {
  '/': { label: 'Open ViciTech Home', hint: 'Circular IT & Hardware QC ecosystem overview' },
  '/market': { label: 'Market Storefront — Ready to Ship', hint: 'Ready-to-ship custom PCs & IoT QC-certified laptops' },
  '/market?view=catalog': { label: 'Hardware Library & Specs', hint: 'Complete catalog of CPU, GPU, laptop & component specs' },
  '/market?view=upgrade': { label: 'Upgrade Analyzer', hint: 'Check RAM & storage expansion limits for your device' },
  '/builder': { label: 'Preset Builder', hint: 'Smart PC builder with socket & TDP compatibility checks' },
  '/bottleneck': { label: 'Bottleneck Analyzer', hint: 'Evaluate CPU & GPU performance balance' },
  '/versus': { label: 'Versus Arena', hint: 'Compare hardware specifications head-to-head' },
  '/qc-panel': { label: 'IoT QC & Telemetry Panel', hint: 'Track assembly status & ESP32 burn-in telemetry' },
  '/trade-in': { label: 'Trade-In & Refurbished', hint: 'Trade in old hardware & browse verified refurbished units' },
  '/partners': { label: 'Partners & Service Centers', hint: 'Find trusted local component stores & repair centers' },
  '/community': { label: 'ViciTech Community', hint: 'Build showcases, technical guides & Q&A' },
  '/messages': { label: 'Direct Messages (DM)', hint: 'Chat directly with technicians & fellow builders' },
  '/toolkit/konsultan-ai': { label: 'AI Build Consultant', hint: 'Ask for PC build, laptop upgrade & catalog guidance' },
  '/profile': { label: 'Profile & Account', hint: 'Public profile card, orders, saved presets & customization' },
  '/settings': { label: 'Settings & Privacy', hint: 'Language, theme, high contrast, text scale & privacy controls' },
  '/feedback': { label: 'Feedback & Validation', hint: 'Submit feature requests, bug reports, or pilot reviews' },
  '/cookies': { label: 'Cookie & Privacy Policy (UU PDP)', hint: 'Manage cookie preferences and personal data rights' },
};

export default function NavbarCommandPalette({
  onClose,
  onNavigate,
}: NavbarCommandPaletteProps): ReactElement {
  const { isEnglish } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  const searchMatches = useMemo(() => {
    const trimmed = searchQuery.trim();
    const upper = trimmed.toUpperCase();
    const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
    const localizedItems = GLOBAL_SEARCH_ITEMS.map((item) => {
      const en = isEnglish ? ENGLISH_SEARCH_LABELS[item.href] : undefined;
      return {
        ...item,
        displayLabel: en?.label ?? item.label,
        displayHint: en?.hint ?? item.hint,
        searchText: `${item.label} ${item.hint} ${en?.label ?? ''} ${en?.hint ?? ''} ${item.keys}`.toLowerCase(),
      };
    });
    const matches = localizedItems.filter((item) =>
      tokens.every((token) => item.searchText.includes(token)),
    );
    if (SERIAL_RE.test(upper)) {
      return [
        {
          label: isEnglish ? `Check serial ${upper}` : `Cek nomor seri ${upper}`,
          displayLabel: isEnglish ? `Check serial ${upper}` : `Cek nomor seri ${upper}`,
          hint: isEnglish ? 'Open IoT QC & Telemetry Panel' : 'Buka Panel IoT QC & Telemetri',
          displayHint: isEnglish ? 'Open IoT QC & Telemetry Panel' : 'Buka Panel IoT QC & Telemetri',
          href: `/qc-panel?order=${encodeURIComponent(upper)}`,
          module: 'qc',
          keys: upper,
          searchText: upper.toLowerCase(),
        },
        ...matches,
      ];
    }
    return matches;
  }, [isEnglish, searchQuery]);

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSearchIndex((i) => (searchMatches.length ? (i + 1) % searchMatches.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSearchIndex((i) =>
        searchMatches.length ? (i - 1 + searchMatches.length) % searchMatches.length : 0,
      );
    } else if (event.key === 'Enter' && searchMatches[searchIndex]) {
      event.preventDefault();
      const item = searchMatches[searchIndex];
      if (item) onNavigate(item.href, item.module, item.view);
    }
  };

  return (
    <div className={styles.searchBackdrop} onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEnglish ? 'Global Search' : 'Pencarian Global'}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-default bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-default px-4">
          <Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={1.75} aria-hidden="true" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchIndex(0);
            }}
            onKeyDown={onSearchKeyDown}
            placeholder={
              isEnglish
                ? 'Search modules, QC serial numbers, or guides…'
                : 'Cari modul, nomor seri, atau panduan…'
            }
            aria-label={isEnglish ? 'Search ViciTech' : 'Cari di ViciTech'}
            autoComplete="off"
            spellCheck={false}
            className="vt-form-control h-12 min-w-0 flex-1 bg-transparent text-sm text-primary placeholder:text-secondary/70 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={isEnglish ? 'Close search' : 'Tutup pencarian'}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-secondary hover:bg-subtle hover:text-primary ${focusRing}`}
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <ul
          role="listbox"
          aria-label={isEnglish ? 'Search results' : 'Hasil pencarian'}
          className="max-h-80 overflow-y-auto p-2"
        >
          {searchMatches.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-secondary">
              {isEnglish
                ? 'No matches found. Try "market", "gpu", or a QC serial number.'
                : 'Tidak ada hasil. Coba kata kunci “market”, “gpu”, atau serial QC.'}
            </li>
          ) : (
            searchMatches.map((item, idx) => (
              <li key={item.href + item.label} role="option" aria-selected={idx === searchIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setSearchIndex(idx)}
                  onClick={() => onNavigate(item.href, item.module, item.view)}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    idx === searchIndex ? 'bg-accent-subtle text-primary' : 'text-primary hover:bg-subtle'
                  }`}
                >
                  <Layers
                    className={`h-4 w-4 shrink-0 ${
                      idx === searchIndex ? 'text-accent-primary' : 'text-secondary'
                    }`}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.displayLabel}</span>
                  <span className="hidden shrink-0 text-xs text-secondary sm:block">{item.displayHint}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
