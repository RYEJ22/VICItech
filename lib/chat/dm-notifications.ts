import { parseChatMessagePayload } from "./chat-media-catalog";

export const DM_READ_SYNC_EVENT = "vicitech:dm-read";

export interface RealtimeDirectMessageRow {
  readonly id: string;
  readonly senderId: string;
  readonly receiverId: string;
  readonly content: string;
  readonly mediaUrls: readonly string[];
  readonly mediaType: string | null;
  readonly isRead: boolean;
  readonly createdAt: string;
}

export interface IncomingDmToast {
  readonly id: string;
  readonly senderId: string;
  readonly senderName: string;
  readonly senderUsername: string | null;
  readonly senderAvatarUrl: string | null;
  readonly preview: string;
  readonly href: string;
  readonly createdAt: string;
}

export interface FormatDmToastPreviewInput {
  readonly content?: string | null;
  readonly mediaUrls?: readonly string[] | null;
  readonly mediaType?: string | null;
}

export function formatDmBadgeCount(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  const whole = Math.floor(count);
  if (whole <= 0) return null;
  return whole > 9 ? "9+" : String(whole);
}

export function applyUnreadDelta(current: number, delta: number): number {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safeDelta = Number.isFinite(delta) ? delta : 0;
  return Math.max(0, Math.floor(safeCurrent + safeDelta));
}

export function shouldShowDmToast(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  if (pathname === "/messages" || pathname.startsWith("/messages/")) return false;
  if (pathname.startsWith("/admin")) return false;
  return true;
}

export function buildDmThreadHref(
  senderUsername: string | null | undefined,
  senderId: string,
): string {
  const trimmedUsername = typeof senderUsername === "string" ? senderUsername.trim() : "";
  if (trimmedUsername.length > 0) {
    return `/messages?to=${encodeURIComponent(trimmedUsername)}`;
  }
  return `/messages?peer=${encodeURIComponent(senderId.trim())}`;
}

export function formatDmToastPreview(input: FormatDmToastPreviewInput): string {
  const payload = parseChatMessagePayload(input);
  switch (payload.kind) {
    case "sticker":
      return `Mengirim Stiker · ${payload.sticker.title}`;
    case "gif":
      return "Mengirim GIF";
    case "video":
      return "Mengirim Video";
    case "image":
      return "Mengirim Foto";
    case "emoji_large":
    case "text": {
      const normalized = payload.text.replace(/\s+/g, " ").trim();
      if (!normalized) return "Pesan baru masuk";
      if (normalized.length <= 88) return normalized;
      return `${normalized.slice(0, 87).trimEnd()}…`;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseRealtimeDirectMessageRow(
  raw: unknown,
): RealtimeDirectMessageRow | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw["id"] === "string" ? raw["id"].trim() : "";
  const senderId = typeof raw["sender_id"] === "string" ? raw["sender_id"].trim() : "";
  const receiverId = typeof raw["receiver_id"] === "string" ? raw["receiver_id"].trim() : "";
  if (!id || !senderId || !receiverId) return null;

  const content = typeof raw["content"] === "string" ? raw["content"] : "";
  const rawUrls = raw["media_urls"];
  const mediaUrls = Array.isArray(rawUrls)
    ? rawUrls.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const mediaType = typeof raw["media_type"] === "string" && raw["media_type"].trim().length > 0
    ? raw["media_type"].trim()
    : null;
  const isRead = raw["is_read"] === true;
  const createdAtRaw = typeof raw["created_at"] === "string" ? raw["created_at"].trim() : "";

  return {
    id,
    senderId,
    receiverId,
    content,
    mediaUrls,
    mediaType,
    isRead,
    createdAt: createdAtRaw || new Date().toISOString(),
  };
}

export function dispatchDmReadSync(markedCount: number): void {
  if (typeof window === "undefined") return;
  const safeCount = Number.isFinite(markedCount) ? Math.max(0, Math.floor(markedCount)) : 0;
  if (safeCount <= 0) return;
  window.dispatchEvent(
    new CustomEvent(DM_READ_SYNC_EVENT, {
      detail: { markedCount: safeCount },
    }),
  );
}
