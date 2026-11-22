"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import {
  DM_READ_SYNC_EVENT,
  applyUnreadDelta,
  buildDmThreadHref,
  formatDmToastPreview,
  parseRealtimeDirectMessageRow,
  shouldShowDmToast,
  type IncomingDmToast,
} from "@/lib/chat/dm-notifications";

interface SenderProfileSummary {
  readonly id: string;
  readonly name: string;
  readonly username: string | null;
  readonly avatarUrl: string | null;
}

export interface UseUnreadMessagesOptions {
  readonly userId: string | null;
  readonly pathname: string | null;
  readonly enabled?: boolean;
}

export interface UseUnreadMessagesResult {
  readonly unreadCount: number;
  readonly toasts: readonly IncomingDmToast[];
  readonly dismissToast: (id: string) => void;
  readonly refreshUnreadCount: () => Promise<void>;
}

const MAX_SEEN_IDS = 100;
const MAX_VISIBLE_TOASTS = 3;
const TOAST_AUTO_DISMISS_MS = 6000;

function readMarkedCountFromDetail(detail: unknown): number {
  if (typeof detail !== "object" || detail === null || !("markedCount" in detail)) {
    return 0;
  }
  const descriptor = Object.getOwnPropertyDescriptor(detail, "markedCount");
  const value = descriptor?.value;
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function readStringField(record: unknown, key: string): string | null {
  if (typeof record !== "object" || record === null || !(key in record)) {
    return null;
  }
  const value = Object.getOwnPropertyDescriptor(record, key)?.value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function useUnreadMessages({
  userId,
  pathname,
  enabled = true,
}: UseUnreadMessagesOptions): UseUnreadMessagesResult {
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<readonly IncomingDmToast[]>([]);

  const pathnameRef = useRef<string | null>(pathname);
  pathnameRef.current = pathname;

  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const profileCacheRef = useRef<Map<string, SenderProfileSummary>>(new Map());

  const clearAllTimers = useCallback((): void => {
    timersRef.current.forEach((timerId) => clearTimeout(timerId));
    timersRef.current.clear();
  }, []);

  const dismissToast = useCallback((id: string): void => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearAllToasts = useCallback((): void => {
    clearAllTimers();
    setToasts([]);
  }, [clearAllTimers]);

  const refreshUnreadCount = useCallback(async (): Promise<void> => {
    if (!enabled || !userId || !isSupabaseAuthConfigured) {
      setUnreadCount(0);
      return;
    }
    try {
      const supabase = getSupabaseBrowserClient();
      const { count } = await supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);

      if (typeof count === "number") {
        setUnreadCount(Math.max(0, count));
      }
    } catch {
      // Keep last known badge count cleanly when transient network error occurs
    }
  }, [enabled, userId]);

  // Clear ephemeral toast notifications automatically when entering /messages or /admin
  useEffect(() => {
    if (!shouldShowDmToast(pathname)) {
      clearAllToasts();
    }
  }, [clearAllToasts, pathname]);

  useEffect(() => {
    if (!enabled || !userId || !isSupabaseAuthConfigured) {
      clearAllTimers();
      seenIdsRef.current.clear();
      profileCacheRef.current.clear();
      setUnreadCount(0);
      setToasts([]);
      return undefined;
    }

    let active = true;
    const supabase = getSupabaseBrowserClient();

    const syncUnreadCount = async (): Promise<void> => {
      try {
        const { count } = await supabase
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", userId)
          .eq("is_read", false);

        if (active && typeof count === "number") {
          setUnreadCount(Math.max(0, count));
        }
      } catch {
        // Ignore transient query errors cleanly
      }
    };

    const resolveSenderProfile = async (senderId: string): Promise<SenderProfileSummary> => {
      const cached = profileCacheRef.current.get(senderId);
      if (cached) return cached;

      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name, full_name, avatar_url")
          .eq("id", senderId)
          .maybeSingle();

        const username = readStringField(data, "username");
        const fullName = readStringField(data, "full_name");
        const displayName = readStringField(data, "display_name");
        const avatarUrl = readStringField(data, "avatar_url");
        const resolvedName =
          fullName ?? displayName ?? (username ? `@${username}` : "Anggota ViciTech");

        const summary: SenderProfileSummary = {
          id: senderId,
          name: resolvedName,
          username,
          avatarUrl,
        };
        if (profileCacheRef.current.size >= 100) {
          profileCacheRef.current.clear();
        }
        profileCacheRef.current.set(senderId, summary);
        return summary;
      } catch {
        return {
          id: senderId,
          name: "Anggota ViciTech",
          username: null,
          avatarUrl: null,
        };
      }
    };

    const enqueueToast = (toast: IncomingDmToast): void => {
      setToasts((current) => {
        if (current.some((item) => item.id === toast.id)) return current;
        const next = [toast, ...current];
        const removed = next.slice(MAX_VISIBLE_TOASTS);
        for (const oldToast of removed) {
          const oldTimer = timersRef.current.get(oldToast.id);
          if (oldTimer) {
            clearTimeout(oldTimer);
            timersRef.current.delete(oldToast.id);
          }
        }
        return next.slice(0, MAX_VISIBLE_TOASTS);
      });

      const timerId = setTimeout(() => {
        timersRef.current.delete(toast.id);
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, TOAST_AUTO_DISMISS_MS);
      timersRef.current.set(toast.id, timerId);
    };

    const handleIncomingInsert = async (rawRow: unknown): Promise<void> => {
      const row = parseRealtimeDirectMessageRow(rawRow);
      if (!row || !active || row.receiverId !== userId) return;

      if (seenIdsRef.current.has(row.id)) return;
      if (seenIdsRef.current.size >= MAX_SEEN_IDS) {
        seenIdsRef.current.clear();
      }
      seenIdsRef.current.add(row.id);

      if (!row.isRead) {
        setUnreadCount((current) => applyUnreadDelta(current, 1));
      }
      void syncUnreadCount();

      if (!row.isRead && shouldShowDmToast(pathnameRef.current)) {
        const sender = await resolveSenderProfile(row.senderId);
        if (!active || !shouldShowDmToast(pathnameRef.current)) return;

        enqueueToast({
          id: row.id,
          senderId: row.senderId,
          senderName: sender.name,
          senderUsername: sender.username,
          senderAvatarUrl: sender.avatarUrl,
          preview: formatDmToastPreview({
            content: row.content,
            mediaUrls: row.mediaUrls,
            mediaType: row.mediaType,
          }),
          href: buildDmThreadHref(sender.username, row.senderId),
          createdAt: row.createdAt,
        });
      }
    };

    void syncUnreadCount();

    const channel = supabase
      .channel(`nav-unread-dm:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload: { readonly new?: unknown }) => {
          void handleIncomingInsert(payload?.new);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          void syncUnreadCount();
        },
      )
      .subscribe();

    const handleReadSync = (event: Event): void => {
      if (!(event instanceof CustomEvent)) return;
      const markedCount = readMarkedCountFromDetail(event.detail);
      if (markedCount > 0) {
        setUnreadCount((current) => applyUnreadDelta(current, -markedCount));
      }
      void syncUnreadCount();
    };

    window.addEventListener(DM_READ_SYNC_EVENT, handleReadSync);

    return () => {
      active = false;
      clearAllTimers();
      window.removeEventListener(DM_READ_SYNC_EVENT, handleReadSync);
      void supabase.removeChannel(channel);
    };
  }, [clearAllTimers, enabled, userId]);

  return {
    unreadCount,
    toasts,
    dismissToast,
    refreshUnreadCount,
  };
}
