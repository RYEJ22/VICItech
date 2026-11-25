'use client';

import { Layers, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';
import { GLOBAL_SEARCH_ITEMS } from './navbar-state';
import styles from './navbar.module.css';

interface NavbarCommandPaletteProps {
  readonly onClose: () => void;
  readonly onNavigate: (href: string, moduleName?: string, viewName?: string) => void;
}

const SERIAL_RE = /^VICI-[A-Z]{3}-\d{4}-\d{4}$/;
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60';

export default function NavbarCommandPalette({
  onClose,
  onNavigate,
}: NavbarCommandPaletteProps): ReactElement {
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
    const matches = GLOBAL_SEARCH_ITEMS.filter((item) =>
      tokens.every((token) => `${item.label} ${item.hint} ${item.keys}`.toLowerCase().includes(token)),
    );
    if (SERIAL_RE.test(upper)) {
      return [
        {
          label: `Cek nomor seri ${upper}`,
          hint: 'Buka Panel IoT QC & Telemetri',
          href: `/qc-panel?order=${encodeURIComponent(upper)}`,
          module: 'qc',
          keys: upper,
        },
        ...matches,
      ];
    }
    return matches;
  }, [searchQuery]);

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
        aria-label="Pencarian Global"
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
            placeholder="Cari modul, nomor seri, atau panduan…"
            aria-label="Cari di ViciTech"
            autoComplete="off"
            spellCheck={false}
            className="vt-form-control h-12 flex-1 bg-transparent text-sm text-primary placeholder:text-secondary/70 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pencarian"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-secondary hover:bg-subtle hover:text-primary ${focusRing}`}
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <ul role="listbox" aria-label="Hasil pencarian" className="max-h-80 overflow-y-auto p-2">
          {searchMatches.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-secondary">
              Tidak ada hasil. Coba kata kunci &ldquo;market&rdquo;, &ldquo;gpu&rdquo;, atau serial QC.
            </li>
          ) : (
            searchMatches.map((item, idx) => (
              <li key={item.label} role="option" aria-selected={idx === searchIndex}>
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
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
                  <span className="hidden shrink-0 text-xs text-secondary sm:block">{item.hint}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
