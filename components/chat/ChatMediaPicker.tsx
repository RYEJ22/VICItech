"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Film, LoaderCircle, Search, Smile, Sparkles, X } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  EMOJI_CATEGORIES,
  VICITECH_STICKERS,
  fetchChatGifs,
  filterChatEmojis,
  type ChatGifItem,
  type EmojiCategoryId,
  type ViciTechSticker,
} from "@/lib/chat/chat-media-catalog";
import { ChatGifImage } from "./ChatGifImage";
import { ViciTechStickerGraphic } from "./ViciTechStickerGraphic";
import styles from "./chat-media-picker.module.css";

export type ChatMediaTabId = "emoji" | "gif" | "sticker";

export interface ChatMediaPickerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSelectEmoji: (emoji: string) => void;
  readonly onSelectGif?: (gif: ChatGifItem) => void;
  readonly onSelectSticker?: (sticker: ViciTechSticker) => void;
  readonly enabledTabs?: readonly ChatMediaTabId[];
  readonly restoreFocusTo?: RefObject<HTMLButtonElement | null>;
  readonly disabled?: boolean;
  readonly align?: "left" | "right";
}

interface TabMeta {
  readonly id: ChatMediaTabId;
  readonly label: string;
}

const ALL_TABS: readonly TabMeta[] = [
  { id: "emoji", label: "Emoji" },
  { id: "gif", label: "GIF" },
  { id: "sticker", label: "Stiker ViciTech" },
] as const;

export function ChatMediaPicker({
  isOpen,
  onClose,
  onSelectEmoji,
  onSelectGif,
  onSelectSticker,
  enabledTabs = ["emoji", "gif", "sticker"],
  restoreFocusTo,
  disabled = false,
  align = "left",
}: ChatMediaPickerProps): ReactElement | null {
  const visibleTabs = useMemo(
    () => ALL_TABS.filter((tab) => enabledTabs.includes(tab.id)),
    [enabledTabs],
  );
  const firstTab = visibleTabs[0]?.id ?? "emoji";

  const [activeTab, setActiveTab] = useState<ChatMediaTabId>(firstTab);
  const [emojiCategory, setEmojiCategory] = useState<EmojiCategoryId>("populer");
  const [emojiQuery, setEmojiQuery] = useState("");
  const [gifQuery, setGifQuery] = useState("");
  const [gifItems, setGifItems] = useState<readonly ChatGifItem[]>([]);
  const [gifSource, setGifSource] = useState<"giphy" | "fallback">("fallback");
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [desktopPosition, setDesktopPosition] = useState<{ readonly top: number; readonly left: number } | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const debouncedGifQuery = useDebouncedValue(gifQuery, 300);

  useEffect(() => {
    if (!enabledTabs.includes(activeTab)) {
      setActiveTab(firstTab);
    }
  }, [activeTab, enabledTabs, firstTab]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewport = (): void => setIsMobileViewport(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!isOpen || isMobileViewport || typeof window === "undefined") return;
    const updatePosition = (): void => {
      const rect = restoreFocusTo?.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(364, window.innerWidth - 32);
      const height = Math.min(410, window.innerHeight - 24);
      const left = align === "right" ? rect.right - width : rect.left;
      const clampedLeft = Math.max(16, Math.min(left, window.innerWidth - width - 16));
      const above = rect.top >= height + 12;
      const preferredTop = above ? rect.top - height - 10 : rect.bottom + 10;
      const top = Math.max(12, Math.min(preferredTop, window.innerHeight - height - 12));
      setDesktopPosition({ top, left: clampedLeft });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, isMobileViewport, isOpen, restoreFocusTo]);

  const handleClose = useCallback((): void => {
    onClose();
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        restoreFocusTo?.current?.focus();
      });
    }
  }, [onClose, restoreFocusTo]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (restoreFocusTo?.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [handleClose, isOpen, onClose, restoreFocusTo]);

  useEffect(() => {
    if (!isOpen || activeTab !== "gif") return;

    const controller = new AbortController();
    let active = true;
    setIsLoadingGifs(true);

    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? "";
    void fetchChatGifs({
      query: debouncedGifQuery,
      apiKey,
      signal: controller.signal,
    })
      .then((result) => {
        if (!active) return;
        setGifItems(result.items);
        setGifSource(result.source);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      })
      .finally(() => {
        if (active) setIsLoadingGifs(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeTab, debouncedGifQuery, isOpen]);

  const filteredEmojis = useMemo(
    () => filterChatEmojis(emojiQuery, emojiCategory),
    [emojiCategory, emojiQuery],
  );

  if (!isOpen || !isMounted || (!isMobileViewport && !desktopPosition)) return null;

  const renderTabIcon = (id: ChatMediaTabId): ReactElement => {
    switch (id) {
      case "emoji":
        return <Smile className="h-3.5 w-3.5" strokeWidth={1.75} />;
      case "gif":
        return <Film className="h-3.5 w-3.5" strokeWidth={1.75} />;
      case "sticker":
        return <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />;
    }
  };

  const panelBody = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal={isMobileViewport ? true : undefined}
      aria-label="Pilih Emoji, GIF, atau Stiker ViciTech"
      className={`${styles.pickerPanel} ${
        isMobileViewport
          ? "fixed inset-x-0 bottom-0 z-50 flex max-h-[76dvh] w-full flex-col rounded-t-2xl border-t border-default bg-surface shadow-2xl"
          : "fixed z-50 flex max-h-[min(410px,calc(100dvh-1.5rem))] w-[364px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-default bg-surface shadow-xl"
      }`}
      style={!isMobileViewport && desktopPosition ? { top: desktopPosition.top, left: desktopPosition.left } : undefined}
    >
      {isMobileViewport ? (
        <div className="flex justify-center pt-2.5">
          <span className="h-1 w-10 rounded-full bg-border-default" aria-hidden="true" />
        </div>
      ) : null}

      {/* Header & Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-default px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-1" role="tablist" aria-label="Kategori media chat">
          {visibleTabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
                  active
                    ? "bg-accent-cta text-white shadow-xs"
                    : "text-secondary hover:bg-subtle hover:text-primary"
                }`}
              >
                {renderTabIcon(tab.id)}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Tutup pemilih media"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-secondary transition-colors hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 md:h-8 md:w-8"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === "emoji" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-default bg-canvas/70 px-3 py-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-secondary" strokeWidth={1.75} />
                <input
                  type="search"
                  value={emojiQuery}
                  onChange={(event) => setEmojiQuery(event.target.value)}
                  placeholder="Cari emoji (api, gaming, deal)…"
                  aria-label="Cari emoji"
                  className="vt-form-control h-9 w-full rounded-lg border border-default bg-surface pr-3 pl-8 text-xs text-primary outline-none placeholder:text-secondary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                />
              </div>

              {emojiQuery.trim().length === 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {EMOJI_CATEGORIES.map((category) => {
                    const selected = emojiCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setEmojiCategory(category.id)}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
                          selected
                            ? "bg-accent-subtle font-semibold text-accent-hover ring-1 ring-accent-primary/25"
                            : "text-secondary hover:bg-subtle hover:text-primary"
                        }`}
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className={`${styles.pickerScroll} min-h-[210px] flex-1 overflow-y-auto p-2.5`}>
              {filteredEmojis.length > 0 ? (
                <div className="grid grid-cols-7 gap-1">
                  {filteredEmojis.map((item) => (
                    <button
                      key={`${item.category}-${item.char}`}
                      type="button"
                      disabled={disabled}
                      title={item.label}
                      aria-label={`Sisipkan emoji ${item.label}`}
                      onClick={() => onSelectEmoji(item.char)}
                      className="grid h-10 w-full place-items-center rounded-lg text-xl transition-transform duration-150 hover:scale-110 hover:bg-subtle active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                    >
                      <span aria-hidden="true">{item.char}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-secondary">
                  Tidak ada emoji yang cocok dengan &ldquo;{emojiQuery}&rdquo;.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "gif" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-default bg-canvas/70 px-3 py-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-secondary" strokeWidth={1.75} />
                <input
                  type="search"
                  value={gifQuery}
                  onChange={(event) => setGifQuery(event.target.value)}
                  placeholder="Cari GIF…"
                  aria-label="Cari GIF"
                  className="vt-form-control h-9 w-full rounded-lg border border-default bg-surface pr-3 pl-8 text-xs text-primary outline-none placeholder:text-secondary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-secondary">
                <span className="font-mono uppercase tracking-wider">
                  {gifSource === "giphy" ? "Powered by GIPHY" : "Koleksi Kurasi ViciTech"}
                </span>
                {isLoadingGifs ? (
                  <span className="inline-flex items-center gap-1 text-accent-hover">
                    <LoaderCircle className="h-3 w-3 animate-spin" /> Memuat…
                  </span>
                ) : null}
              </div>
            </div>

            <div className={`${styles.pickerScroll} min-h-[220px] flex-1 overflow-y-auto p-2.5`}>
              {isLoadingGifs && gifItems.length === 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map((slot) => (
                    <div
                      key={slot}
                      className="h-24 animate-pulse rounded-lg border border-default bg-subtle"
                    />
                  ))}
                </div>
              ) : gifItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {gifItems.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onSelectGif?.(gif);
                        handleClose();
                      }}
                      aria-label={`Kirim GIF ${gif.title}`}
                      className="vt-motion-press group relative overflow-hidden rounded-lg border border-default bg-canvas text-left hover:border-accent-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                    >
                      <ChatGifImage
                        src={gif.previewUrl}
                        alt={gif.title}
                        title={gif.title}
                        width={gif.width}
                        height={gif.height}
                        className="h-24 w-full"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-secondary">
                  Tidak ada GIF yang cocok untuk pencarian &ldquo;{debouncedGifQuery}&rdquo;.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "sticker" ? (
          <div className={`${styles.pickerScroll} min-h-[240px] flex-1 overflow-y-auto p-3`}>
            <p className="mb-2.5 font-mono text-[10px] tracking-wider text-secondary uppercase">
              Koleksi Stiker Editorial ViciTech
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {VICITECH_STICKERS.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onSelectSticker?.(sticker);
                    handleClose();
                  }}
                  aria-label={`Kirim stiker ${sticker.title}`}
                  className="vt-motion-press text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 rounded-2xl"
                >
                  <ViciTechStickerGraphic sticker={sticker} size="sm" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (isMobileViewport) {
    return createPortal((
      <>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Tutup panel media"
          onClick={handleClose}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        />
        {panelBody}
      </>
    ), document.body);
  }

  return createPortal(panelBody, document.body);
}
