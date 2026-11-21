"use client";

import { Layers, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export default function WorkspaceCommandPalette({
  onClose,
  onSelect,
  commands,
  byId,
  serialRe,
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    const key = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", key);
    const rafId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(rafId);
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const items = useMemo(() => {
    const serial = q.trim().toUpperCase();
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const found = commands.filter((c) =>
      tokens.every((t) => `${c.label} ${c.keys} ${c.hint}`.toLowerCase().includes(t)),
    );
    return serialRe.test(serial)
      ? [{ label: `Look up ${serial}`, hint: "Opens the IoT QC & Telemetry Engine", module: "qc" }, ...found]
      : found;
  }, [q, commands, serialRe]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter" && items[idx]) {
      e.preventDefault();
      onSelect(items[idx]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/45 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        className="vt-metal w-full max-w-xl overflow-hidden rounded-2xl"
      >
        <div className="flex items-center gap-3 border-b border-black/[0.06] px-4">
          <Search className="h-4 w-4 shrink-0 text-pewter" aria-hidden="true" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search modules, actions or a serial number"
            aria-label="Search"
            autoComplete="off"
            spellCheck={false}
            className="h-12 flex-1 bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
          />
          <kbd className="rounded border border-black/10 bg-black/5 px-1.5 py-0.5 text-[11px] text-pewter">
            Esc
          </kbd>
        </div>
        <ul role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-pewter">
              No matches. Try “gpu”, “upgrade” or a serial like VICI-SRV-2026-9042.
            </li>
          )}
          {items.map((it, i) => {
            const Icon = byId[it.module]?.icon || Layers;
            return (
              <li key={it.label} role="option" aria-selected={i === idx}>
                <button
                  type="button"
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => onSelect(it)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    i === idx ? "bg-signal-wash text-signal-deep" : "text-ink hover:bg-black/[0.04]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${i === idx ? "text-signal" : "text-pewter"}`}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate text-sm font-medium">{it.label}</span>
                  <span className="hidden shrink-0 text-xs text-pewter sm:block">{it.hint}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-black/[0.06] px-4 py-2.5 text-xs text-pewter">
          Arrow keys to move, Enter to open, Esc to close.
        </p>
      </div>
    </div>
  );
}
