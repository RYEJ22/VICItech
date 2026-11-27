"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, LoaderCircle, MessageSquare, Send, Smile, UserRound, X } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sanitizeUserText } from "@/lib/validation/sanitize-text";
import {
  encodeStickerContent,
  formatChatMessagePreview,
  insertTextAtCursor,
  parseChatMessagePayload,
} from "@/lib/chat/chat-media-catalog";
import { dispatchDmReadSync } from "@/lib/chat/dm-notifications";
import { ChatMediaPicker } from "@/components/chat/ChatMediaPicker";
import { ChatGifImage } from "@/components/chat/ChatGifImage";
import { ViciTechStickerGraphic } from "@/components/chat/ViciTechStickerGraphic";
import pickerStyles from "@/components/chat/chat-media-picker.module.css";
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

const DM_PAGE_SIZE = 25;
const INBOX_FETCH_LIMIT = 120;
const DM_COLUMNS = "id, sender_id, receiver_id, content, media_urls, media_type, is_read, created_at";

function displayName(profile, isEnglish = false) {
  return (
    profile?.full_name ||
    profile?.display_name ||
    (profile?.username
      ? `@${profile.username}`
      : isEnglish
        ? "ViciTech Member"
        : "Anggota ViciTech")
  );
}

function formatMessageTime(value, isEnglish = false) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(isEnglish ? "en-US" : "id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatInboxTime(value, isEnglish = false) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return isEnglish ? "just now" : "baru saja";
  if (diffMin < 60) return isEnglish ? `${diffMin}m ago` : `${diffMin} mnt lalu`;
  if (diffMin < 1440) {
    const hrs = Math.floor(diffMin / 60);
    return isEnglish ? `${hrs}h ago` : `${hrs} jam lalu`;
  }
  if (diffMin < 10080) {
    const days = Math.floor(diffMin / 1440);
    return isEnglish ? `${days}d ago` : `${days} hr lalu`;
  }
  return new Intl.DateTimeFormat(isEnglish ? "en-US" : "id-ID", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function profileInitial(profile, isEnglish = false) {
  return displayName(profile, isEnglish).trim().charAt(0).toUpperCase() || "V";
}

function latestPreview(latest, profile, isEnglish = false) {
  return formatChatMessagePreview({
    content: latest?.content,
    mediaUrls: latest?.media_urls,
    mediaType: latest?.media_type,
    fallback: `@${profile?.username || (isEnglish ? "member" : "anggota")}`,
  });
}

const DM_SELECT_COLUMNS =
  "id, sender_id, receiver_id, content, media_urls, media_type, is_read, created_at";

async function insertDirectMessageWithRpcFallback({
  client,
  userId,
  selectedId,
  content,
  mediaUrls,
  mediaType,
}) {
  const { data: rpcId, error: rpcError } = await client.rpc(
    "send_direct_message_with_notification",
    {
      p_receiver_id: selectedId,
      p_content: content,
      p_media_urls: mediaUrls,
      p_media_type: mediaType,
    },
  );

  if (!rpcError && rpcId) {
    const { data: fetchedRow, error: fetchError } = await client
      .from("direct_messages")
      .select(DM_SELECT_COLUMNS)
      .eq("id", rpcId)
      .maybeSingle();
    if (fetchError) {
      throw new Error(`Pesan terkirim tetapi gagal memuat ulang baris: ${fetchError.message}`);
    }
    return (
      fetchedRow || {
        id: rpcId,
        sender_id: userId,
        receiver_id: selectedId,
        content,
        media_urls: mediaUrls,
        media_type: mediaType,
        is_read: false,
        created_at: new Date().toISOString(),
      }
    );
  }

  if (rpcError && rpcError.code !== "PGRST202" && rpcError.code !== "42883") {
    const err = new Error(`Pesan gagal dikirim: ${rpcError.message}`);
    err.pgCode = rpcError.code;
    throw err;
  }

  const { data, error: insertError } = await client
    .from("direct_messages")
    .insert({
      sender_id: userId,
      receiver_id: selectedId,
      content,
      media_urls: mediaUrls,
      media_type: mediaType,
    })
    .select(DM_SELECT_COLUMNS)
    .single();
  if (insertError) {
    const err = new Error(`Pesan gagal dikirim: ${insertError.message}`);
    err.pgCode = insertError.code;
    throw err;
  }
  return data;
}

async function persistDirectMessage(params) {
  try {
    return await insertDirectMessageWithRpcFallback(params);
  } catch (err) {
    const pgCode = err && typeof err === "object" ? err.pgCode : undefined;
    const isMediaConstraintFallback = pgCode === "23514" || pgCode === "22023";
    if (!isMediaConstraintFallback) throw err;

    // Graceful compatibility if migration 20261122000007 is not yet applied on remote DB
    if (params.mediaType === "gif" && params.mediaUrls.length > 0) {
      return insertDirectMessageWithRpcFallback({
        ...params,
        mediaType: "image",
      });
    }
    if (params.mediaType === "sticker") {
      return insertDirectMessageWithRpcFallback({
        ...params,
        mediaType: null,
        mediaUrls: [],
      });
    }
    throw err;
  }
}

export default function DirectMessageDrawer({
  user,
  initialUsername,
  initialPeerId = "",
  isAuthLoading,
}) {
  const { isEnglish } = useLanguage();
  const [client, setClient] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sendStage, setSendStage] = useState("");
  const [error, setError] = useState("");
  const [profileReady, setProfileReady] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const pickerTriggerRef = useRef(null);
  const selectionRangeRef = useRef({ start: 0, end: 0 });
  const pendingAttachmentsRef = useRef([]);
  pendingAttachmentsRef.current = pendingAttachments;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const shouldAutoScrollRef = useRef(true);
  const scrollBehaviorRef = useRef("auto");
  const isSending = Boolean(sendStage);
  const userId = user?.id || "";

  useEffect(() => {
    setIsPickerOpen(false);
  }, [selectedId]);

  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const selectedProfile = profiles[selectedId] || null;

  const upsertConversationFromMessage = useCallback(async (
    supabase,
    message,
    currentUserId,
    { incrementUnread = false } = {},
  ) => {
    if (!message?.sender_id || !message?.receiver_id) return;
    const otherId = message.sender_id === currentUserId ? message.receiver_id : message.sender_id;
    setConversations((current) => {
      const existing = current.find((item) => item.userId === otherId);
      const nextItem = {
        userId: otherId,
        latest: message,
        unread: incrementUnread ? (existing?.unread || 0) + 1 : (existing?.unread || 0),
      };
      return [nextItem, ...current.filter((item) => item.userId !== otherId)];
    });
    if (!profilesRef.current[otherId]) {
      const { data: participant } = await supabase
        .from("profiles")
        .select("id, username, display_name, full_name, avatar_url, bio")
        .eq("id", otherId)
        .maybeSingle();
      if (participant?.id) {
        setProfiles((current) => ({ ...current, [participant.id]: participant }));
      }
    }
  }, []);

  const loadInbox = useCallback(async (supabase, currentUserId) => {
    if (!currentUserId) {
      setConversations([]);
      setProfiles({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const [
        { data: ownProfile, error: ownProfileError },
        { data: rows, error: messagesError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, display_name, full_name, avatar_url, bio")
          .eq("id", currentUserId)
          .maybeSingle(),
        supabase
          .from("direct_messages")
          .select(DM_COLUMNS)
          .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
          .order("created_at", { ascending: false })
          .limit(INBOX_FETCH_LIMIT),
      ]);

      if (ownProfileError) throw new Error(`Gagal memuat profil Anda: ${ownProfileError.message}`);
      setProfileReady(Boolean(ownProfile));
      if (ownProfile) setProfiles((current) => ({ ...current, [ownProfile.id]: ownProfile }));
      if (!ownProfile) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      if (messagesError) throw new Error(`Gagal memuat daftar percakapan: ${messagesError.message}`);

      const latestByUser = new Map();
      for (const message of rows || []) {
        if (!message?.sender_id || !message?.receiver_id) continue;
        const otherId = message.sender_id === currentUserId ? message.receiver_id : message.sender_id;
        const conversation = latestByUser.get(otherId) || { userId: otherId, latest: message, unread: 0 };
        if (message.receiver_id === currentUserId && !message.is_read) conversation.unread += 1;
        latestByUser.set(otherId, conversation);
      }

      const nextConversations = [...latestByUser.values()].sort(
        (a, b) => new Date(b.latest?.created_at || 0) - new Date(a.latest?.created_at || 0),
      );
      setConversations(nextConversations);
      const participantIds = nextConversations.map((item) => item.userId).filter(Boolean);
      if (participantIds.length) {
        const { data: participants, error: participantsError } = await supabase
          .from("profiles")
          .select("id, username, display_name, full_name, avatar_url, bio")
          .in("id", participantIds);
        if (participantsError) throw new Error(`Gagal memuat profil lawan bicara: ${participantsError.message}`);
        setProfiles((current) => ({
          ...current,
          ...Object.fromEntries((participants || []).filter((profile) => profile?.id).map((profile) => [profile.id, profile])),
        }));
      }
    } catch (loadError) {
      setError(loadError.message || "Gagal memuat pesan Anda.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setClient(null);
      setProfileReady(false);
      setConversations([]);
      setMessages([]);
      setHasOlderMessages(false);
      setIsLoading(false);
      setRealtimeStatus("disconnected");
      return undefined;
    }
    let active = true;
    let supabase;
    setRealtimeStatus("connecting");
    try {
      supabase = getSupabaseBrowserClient();
      setClient(supabase);
    } catch (clientError) {
      setError(clientError.message);
      setRealtimeStatus("error");
      setIsLoading(false);
      return undefined;
    }
    void loadInbox(supabase, userId);
    const channel = supabase
      .channel(`direct-messages-user-${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
        filter: `receiver_id=eq.${userId}`,
      }, ({ new: message }) => {
        if (!active || !message?.id) return;
        const selectedConversationId = selectedIdRef.current;
        const isCurrentThread =
          message.sender_id === selectedConversationId || message.receiver_id === selectedConversationId;
        if (isCurrentThread) {
          shouldAutoScrollRef.current = true;
          scrollBehaviorRef.current = "smooth";
          setMessages((current) => (current.some((item) => item?.id === message.id) ? current : [...current, message]));
          if (message.receiver_id === userId && message.sender_id === selectedConversationId) {
            void supabase
              .from("direct_messages")
              .update({ is_read: true })
              .eq("id", message.id)
              .eq("receiver_id", userId)
              .eq("is_read", false)
              .select("id")
              .then(({ data: markedRows, error: readError }) => {
                if (readError && active) {
                  setError(`Pesan baru masuk, tetapi status dibaca gagal diperbarui: ${readError.message}`);
                } else if (!readError && active && Array.isArray(markedRows) && markedRows.length > 0) {
                  dispatchDmReadSync(markedRows.length);
                }
              });
          }
        }
        void upsertConversationFromMessage(supabase, message, userId, {
          incrementUnread: !isCurrentThread && message.receiver_id === userId,
        });
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
        filter: `sender_id=eq.${userId}`,
      }, ({ new: message }) => {
        if (!active || !message?.id) return;
        if (message.receiver_id === selectedIdRef.current) {
          shouldAutoScrollRef.current = true;
          scrollBehaviorRef.current = "smooth";
          setMessages((current) => (current.some((item) => item?.id === message.id) ? current : [...current, message]));
        }
        void upsertConversationFromMessage(supabase, message, userId, { incrementUnread: false });
      })
      .subscribe((status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("error");
          setError("Koneksi pesan realtime terputus. Periksa jaringan Anda lalu coba lagi.");
        } else if (status === "CLOSED") {
          setRealtimeStatus("disconnected");
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId, loadInbox, upsertConversationFromMessage]);

  useEffect(() => {
    const trimmedUsername = typeof initialUsername === "string" ? initialUsername.trim().toLowerCase() : "";
    const trimmedPeerId = typeof initialPeerId === "string" ? initialPeerId.trim() : "";
    if (!client || !userId || !profileReady || (!trimmedUsername && !trimmedPeerId)) return;

    if (!trimmedUsername && trimmedPeerId) {
      if (trimmedPeerId === userId) {
        setError("Anda tidak dapat memulai percakapan dengan akun sendiri.");
        return;
      }
      if (profilesRef.current[trimmedPeerId]) {
        setSelectedId(trimmedPeerId);
        return;
      }
    }

    let active = true;
    const baseQuery = client
      .from("profiles")
      .select("id, username, display_name, full_name, avatar_url, bio");
    const targetQuery = trimmedUsername
      ? baseQuery.eq("username", trimmedUsername)
      : baseQuery.eq("id", trimmedPeerId);

    targetQuery
      .maybeSingle()
      .then(({ data, error: targetError }) => {
        if (!active) return;
        if (targetError) {
          setError(`Profil tujuan gagal dicari: ${targetError.message}`);
          return;
        }
        if (!data) {
          setError("Profil pengguna ini tidak ditemukan.");
          return;
        }
        if (data.id === userId) {
          setError("Anda tidak dapat memulai percakapan dengan akun sendiri.");
          return;
        }
        setProfiles((current) => ({ ...current, [data.id]: data }));
        setSelectedId(data.id);
      })
      .catch((targetError) => {
        if (active) setError(targetError.message || "Gagal membuka percakapan ini.");
      });
    return () => { active = false; };
  }, [client, userId, initialUsername, initialPeerId, profileReady]);

  useEffect(() => {
    setPendingAttachments((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setHasOlderMessages(false);
    setLoadingOlder(false);
    shouldAutoScrollRef.current = true;
    if (!client || !userId || !selectedId) {
      setMessages([]);
      return undefined;
    }
    let active = true;
    setMessages([]);
    setError("");
    client
      .from("direct_messages")
      .select(DM_COLUMNS)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${selectedId}),and(sender_id.eq.${selectedId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: false })
      .limit(DM_PAGE_SIZE + 1)
      .then(async ({ data, error: messagesError }) => {
        if (!active) return;
        if (messagesError) {
          setError(`Gagal memuat percakapan ini: ${messagesError.message}`);
          return;
        }
        const rawRows = Array.isArray(data) ? data : [];
        const hasMore = rawRows.length > DM_PAGE_SIZE;
        const pageRows = hasMore ? rawRows.slice(0, DM_PAGE_SIZE) : rawRows;
        setHasOlderMessages(hasMore);
        shouldAutoScrollRef.current = true;
        scrollBehaviorRef.current = "auto";
        setMessages([...pageRows].reverse());
        const pageUnreadIds = pageRows.filter((item) => item?.receiver_id === userId && !item.is_read).map((item) => item.id);
        const { data: markedRows, error: readError } = await client
          .from("direct_messages")
          .update({ is_read: true })
          .eq("receiver_id", userId)
          .eq("sender_id", selectedId)
          .eq("is_read", false)
          .select("id");
        if (readError && active) {
          setError(`Pesan dimuat, namun status belum dibaca gagal diperbarui: ${readError.message}`);
        }
        if (!readError && active) {
          const markedCount = Array.isArray(markedRows) ? markedRows.length : pageUnreadIds.length;
          if (markedCount > 0) {
            dispatchDmReadSync(markedCount);
          }
          setConversations((current) =>
            current.map((conv) => (conv.userId === selectedId ? { ...conv, unread: 0 } : conv)),
          );
        }
      })
      .catch((messagesError) => {
        if (active) setError(messagesError.message || "Gagal memuat percakapan ini.");
      });
    return () => { active = false; };
  }, [client, userId, selectedId]);

  const loadOlderMessages = useCallback(async () => {
    const oldest = messages[0];
    if (!client || !userId || !selectedId || !oldest?.created_at || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const container = messagesContainerRef.current;
      const prevScrollHeight = container?.scrollHeight ?? 0;
      const prevScrollTop = container?.scrollTop ?? 0;
      const { data, error: olderError } = await client
        .from("direct_messages")
        .select(DM_COLUMNS)
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${selectedId}),and(sender_id.eq.${selectedId},receiver_id.eq.${userId})`)
        .lt("created_at", oldest.created_at)
        .order("created_at", { ascending: false })
        .limit(DM_PAGE_SIZE + 1);
      if (olderError) throw new Error(olderError.message);
      const rawRows = Array.isArray(data) ? data : [];
      const hasMore = rawRows.length > DM_PAGE_SIZE;
      const olderRows = (hasMore ? rawRows.slice(0, DM_PAGE_SIZE) : rawRows).reverse();
      setHasOlderMessages(hasMore);
      if (olderRows.length > 0) {
        shouldAutoScrollRef.current = false;
        setMessages((current) => {
          const seen = new Set(current.map((item) => item?.id));
          return [...olderRows.filter((item) => item?.id && !seen.has(item.id)), ...current];
        });
        if (container && typeof window !== "undefined") {
          window.requestAnimationFrame(() => {
            const delta = container.scrollHeight - prevScrollHeight;
            container.scrollTop = prevScrollTop + delta;
          });
        }
      }
    } catch (olderErr) {
      setError(olderErr instanceof Error ? olderErr.message : "Gagal memuat pesan sebelumnya.");
    } finally {
      setLoadingOlder(false);
    }
  }, [client, loadingOlder, messages, selectedId, userId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !shouldAutoScrollRef.current) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior =
      prefersReduced || scrollBehaviorRef.current === "auto" ? "auto" : "smooth";
    const rafId = window.requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior });
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [messages, selectedId]);

  const handleFilesSelected = (event) => {
    const fileList = Array.from(event.target.files || []);
    event.target.value = "";
    if (!fileList.length) return;

    setError("");
    const currentList = [...pendingAttachments];
    for (const file of fileList) {
      const validation = validateMediaFile(file);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }

      if (currentList.some((item) => item.mediaType !== validation.mediaType)) {
        setError("Pilih hingga 4 foto ATAU 1 video per pesan (tidak dapat dicampur).");
        return;
      }

      if (validation.mediaType === "video" && currentList.length >= 1) {
        setError("Maksimal 1 video yang dapat dikirim dalam satu pesan.");
        return;
      }

      if (validation.mediaType === "image" && currentList.length >= MAX_IMAGE_ATTACHMENTS) {
        setError(`Maksimal ${MAX_IMAGE_ATTACHMENTS} foto per pesan.`);
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

    setPendingAttachments(currentList);
  };

  const removeAttachment = (id) => {
    setPendingAttachments((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const trimmed = draft.trim();
    const hasMedia = pendingAttachments.length > 0;
    if (!client || !userId || !selectedId || (!trimmed && !hasMedia) || isSending) return;
    if (trimmed.length > 4000) {
      setError("Pesan teks maksimal 4.000 karakter.");
      return;
    }

    const content = trimmed ? sanitizeUserText(trimmed, 4000) : "";
    if (trimmed && !content && !hasMedia) {
      setError("Pesan tidak boleh hanya berisi karakter kontrol.");
      return;
    }

    setSendStage(hasMedia ? "uploading" : "sending");
    setError("");
    try {
      let mediaUrls = [];
      let mediaType = null;
      if (hasMedia) {
        const uploaded = await Promise.all(
          pendingAttachments.map((item) =>
            uploadMediaFile({ file: item.file, userId, context: "dm" }),
          ),
        );
        mediaUrls = uploaded.map((item) => item.url);
        mediaType = uploaded[0]?.mediaType ?? null;
      }

      setSendStage("sending");
      const sentMessage = await persistDirectMessage({
        client,
        userId,
        selectedId,
        content,
        mediaUrls,
        mediaType,
      });

      pendingAttachments.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setPendingAttachments([]);
      setDraft("");
      selectionRangeRef.current = { start: 0, end: 0 };
      setIsPickerOpen(false);
      shouldAutoScrollRef.current = true;
      scrollBehaviorRef.current = "smooth";
      setMessages((current) =>
        current.some((item) => item?.id === sentMessage?.id) ? current : [...current, sentMessage],
      );
      if (sentMessage) {
        void upsertConversationFromMessage(client, sentMessage, userId, { incrementUnread: false });
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Pesan gagal dikirim.");
    } finally {
      setSendStage("");
    }
  };

  const syncSelectionFromTextarea = useCallback((target) => {
    if (!target) return;
    selectionRangeRef.current = {
      start: typeof target.selectionStart === "number" ? target.selectionStart : draft.length,
      end: typeof target.selectionEnd === "number" ? target.selectionEnd : draft.length,
    };
  }, [draft.length]);

  const handleSelectEmoji = useCallback((emoji) => {
    const textarea = textareaRef.current;
    const rawStart =
      textarea && document.activeElement === textarea
        ? textarea.selectionStart
        : selectionRangeRef.current.start;
    const rawEnd =
      textarea && document.activeElement === textarea
        ? textarea.selectionEnd
        : selectionRangeRef.current.end;

    const { nextValue, nextCursor } = insertTextAtCursor({
      value: draft,
      selectionStart: rawStart,
      selectionEnd: rawEnd,
      insertText: emoji,
      maxLength: 4000,
    });
    selectionRangeRef.current = { start: nextCursor, end: nextCursor };
    setDraft(nextValue);

    if (
      textarea &&
      typeof window !== "undefined" &&
      !window.matchMedia("(max-width: 767px)").matches
    ) {
      window.requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(nextCursor, nextCursor);
      });
    }
  }, [draft]);

  const sendInstantMediaMessage = useCallback(
    async ({ content, mediaUrls, mediaType }) => {
      if (!client || !userId || !selectedId || isSending) return;
      setSendStage("sending");
      setError("");
      try {
        const sentMessage = await persistDirectMessage({
          client,
          userId,
          selectedId,
          content,
          mediaUrls,
          mediaType,
        });
        shouldAutoScrollRef.current = true;
        scrollBehaviorRef.current = "smooth";
        setMessages((current) =>
          current.some((item) => item?.id === sentMessage?.id) ? current : [...current, sentMessage],
        );
        if (sentMessage) {
          void upsertConversationFromMessage(client, sentMessage, userId, { incrementUnread: false });
        }
      } catch (sendError) {
        setError(sendError instanceof Error ? sendError.message : "Media gagal dikirim.");
      } finally {
        setSendStage("");
      }
    },
    [client, isSending, selectedId, upsertConversationFromMessage, userId],
  );

  const handleSelectGif = useCallback(
    (gif) => {
      void sendInstantMediaMessage({
        content: "",
        mediaUrls: [gif.url],
        mediaType: "gif",
      });
    },
    [sendInstantMediaMessage],
  );

  const handleSelectSticker = useCallback(
    (sticker) => {
      void sendInstantMediaMessage({
        content: encodeStickerContent(sticker.id),
        mediaUrls: [],
        mediaType: "sticker",
      });
    },
    [sendInstantMediaMessage],
  );

  if (isAuthLoading) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center overflow-y-auto px-4 py-6">
        <section role="status" className="mx-auto flex max-w-3xl items-center justify-center gap-3 text-sm text-secondary">
          <LoaderCircle className="h-5 w-5 animate-spin text-accent-primary" />
          <span>{isEnglish ? "Checking your ViciTech session…" : "Memeriksa sesi ViciTech Anda…"}</span>
        </section>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center overflow-y-auto px-4 py-6">
        <section className="mx-auto w-full max-w-3xl rounded-xl border border-default bg-surface p-8 text-center shadow-sm">
          <MessageSquare className="mx-auto h-10 w-10 text-accent-primary" />
          <h1 className="mt-4 font-sans text-3xl font-bold tracking-tight text-primary">
            {isEnglish ? "Sign in to open messages" : "Masuk untuk membuka pesan"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            {isEnglish
              ? "Direct messages are private and available only to signed-in ViciTech members."
              : "Pesan langsung bersifat privat dan hanya tersedia bagi anggota ViciTech yang sudah masuk."}
          </p>
        </section>
      </div>
    );
  }

  if (!isLoading && !profileReady) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center overflow-y-auto px-4 py-6">
        <section className="mx-auto w-full max-w-3xl rounded-xl border border-default bg-surface p-8 shadow-sm">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-primary">
            {isEnglish ? "Complete your profile setup" : "Lengkapi pengaturan profil Anda"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            {isEnglish
              ? "Save a unique username in Profile & Account before starting direct messages."
              : "Simpan username unik di Profil & Akun sebelum memulai pesan langsung."}
          </p>
          <Link href="/profile?tab=settings" className="vt-motion-press vt-btn-tactile mt-4 inline-flex min-h-11 items-center rounded-lg bg-accent-cta px-4 py-2 text-sm font-semibold text-white hover:bg-accent-cta-hover">
            {isEnglish ? "Open Profile Settings" : "Buka Pengaturan Profil"}
          </Link>
          {error && <p role="alert" className="mt-4 text-sm text-status-danger">{error}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col overflow-hidden px-2 pb-2 pt-1 sm:px-4 sm:pb-3 md:px-6 md:pb-4">
      <section className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-default bg-surface shadow-sm md:flex-row">
        <aside className={`flex h-full min-h-0 w-full flex-col border-default bg-surface md:w-80 md:shrink-0 md:border-r ${selectedId ? "hidden md:flex" : "flex"}`}>
          <div className="shrink-0 border-b border-default px-5 py-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-hover">
              <MessageSquare className="h-4 w-4 text-accent-primary" /> {isEnglish ? "Inbox" : "Kotak Masuk"}
              <span className={`ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium tracking-normal ${realtimeStatus === "connected" ? "text-status-live" : realtimeStatus === "error" ? "text-status-danger" : "text-secondary"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${realtimeStatus === "connected" ? "bg-status-live" : realtimeStatus === "error" ? "bg-status-danger" : "bg-secondary/50"}`} />
                {realtimeStatus === "connected"
                  ? isEnglish ? "Connected" : "Terhubung"
                  : realtimeStatus === "error"
                    ? isEnglish ? "Disconnected" : "Terputus"
                    : isEnglish ? "Connecting" : "Menghubungkan"}
              </span>
            </p>
            <h1 className="mt-2 font-sans text-2xl font-bold tracking-tight text-primary">
              {isEnglish ? "Direct Messages" : "Pesan Langsung"}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-secondary">
              {isEnglish
                ? "Private conversations with technicians and fellow ViciTech members."
                : "Percakapan pribadi dengan teknisi dan sesama anggota ViciTech."}
            </p>
          </div>
          <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 ${pickerStyles.pickerScroll}`}>
            {isLoading ? (
              <p className="flex items-center gap-2 p-4 text-sm text-secondary">
                <LoaderCircle className="h-4 w-4 animate-spin text-accent-primary" />
                <span>{isEnglish ? "Loading conversations…" : "Memuat daftar percakapan…"}</span>
              </p>
            ) : conversations.length ? conversations.map((item) => {
              const profile = profiles[item?.userId];
              if (!item?.userId || !profile) return null;
              return (
                <button key={item.userId} type="button" aria-current={selectedId === item.userId ? "true" : undefined} onClick={() => setSelectedId(item.userId)} className={`flex min-h-11 w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${selectedId === item.userId ? "bg-accent-subtle ring-1 ring-accent-primary/25" : "hover:bg-subtle"}`}>
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" width={44} height={44} loading="lazy" decoding="async" className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-black/[0.06]" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-subtle text-sm font-semibold text-accent-hover">{profileInitial(profile, isEnglish)}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-primary">{displayName(profile, isEnglish)}</span>
                      {item.latest?.created_at && (
                        <span className="shrink-0 font-mono text-[10px] text-secondary">{formatInboxTime(item.latest.created_at, isEnglish)}</span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-secondary">{latestPreview(item.latest, profile, isEnglish)}</span>
                  </span>
                  {item.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent-cta px-1 font-mono text-[11px] font-semibold text-white">{item.unread}</span>}
                </button>
              );
            }) : !error ? (
              <p className="p-4 text-sm text-secondary">
                {isEnglish
                  ? "No conversations yet. Visit another member's profile to start messaging."
                  : "Belum ada percakapan. Kunjungi profil pengguna lain untuk mulai berkirim pesan."}
              </p>
            ) : null}
          </div>
        </aside>

        <div className={`flex h-full min-h-0 min-w-0 flex-1 flex-col bg-canvas ${!selectedId ? "hidden md:flex" : "flex"}`}>
          {selectedId && selectedProfile ? (
            <>
              <header className="flex shrink-0 items-center gap-2.5 border-b border-default bg-surface px-3 py-3 sm:gap-3 sm:px-6 sm:py-3.5">
                <button type="button" aria-label={isEnglish ? "Back to conversations" : "Kembali ke daftar percakapan"} onClick={() => setSelectedId("")} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 md:hidden"><ArrowLeft className="h-5 w-5" /></button>
                {selectedProfile.username ? (
                  <Link
                    href={`/profile/${encodeURIComponent(selectedProfile.username)}`}
                    className="flex min-w-0 items-center gap-3 rounded-lg transition-colors hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                  >
                    {selectedProfile.avatar_url ? <img src={selectedProfile.avatar_url} alt="" width={44} height={44} loading="lazy" decoding="async" className="h-11 w-11 rounded-full object-cover ring-1 ring-black/[0.06]" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-subtle font-semibold text-accent-hover">{profileInitial(selectedProfile, isEnglish)}</span>}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-primary hover:text-accent-cta">{displayName(selectedProfile, isEnglish)}</span>
                      <span className="block font-mono text-xs text-secondary">@{selectedProfile.username}</span>
                    </span>
                  </Link>
                ) : (
                  <>
                    {selectedProfile.avatar_url ? <img src={selectedProfile.avatar_url} alt="" width={44} height={44} loading="lazy" decoding="async" className="h-11 w-11 rounded-full object-cover ring-1 ring-black/[0.06]" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-subtle font-semibold text-accent-hover">{profileInitial(selectedProfile, isEnglish)}</span>}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-primary">{displayName(selectedProfile, isEnglish)}</span>
                      <span className="block text-xs text-secondary">@{isEnglish ? "member" : "anggota"}</span>
                    </span>
                  </>
                )}
              </header>
              <div
                ref={messagesContainerRef}
                className={`min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 ${pickerStyles.pickerScroll}`}
                aria-live="polite"
              >
              {hasOlderMessages && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={loadOlderMessages}
                    disabled={loadingOlder}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-default bg-surface px-4 py-1.5 text-xs font-medium text-primary shadow-sm transition hover:border-accent-primary/40 hover:text-accent-hover disabled:opacity-50"
                  >
                    {loadingOlder && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                    <span>
                      {loadingOlder
                        ? isEnglish ? "Loading…" : "Memuat…"
                        : isEnglish ? "Load earlier messages" : "Muat pesan sebelumnya"}
                    </span>
                  </button>
                </div>
              )}
              {messages.length ? messages.map((message) => {
                if (!message?.id) return null;
                const payload = parseChatMessagePayload({
                  content: message.content,
                  mediaUrls: message.media_urls,
                  mediaType: message.media_type,
                });
                if (payload.kind === "text" && !payload.text.trim()) return null;

                const own = message.sender_id === userId;

                if (payload.kind === "sticker") {
                  return (
                    <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div className={`flex max-w-[88%] flex-col ${own ? "items-end" : "items-start"}`}>
                        <div className={pickerStyles.stickerPop}>
                          <ViciTechStickerGraphic sticker={payload.sticker} size="md" />
                        </div>
                        <p className="mt-1 px-1 font-mono text-[10px] text-secondary">
                          {formatMessageTime(message.created_at, isEnglish)}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={message.id} className={`flex min-w-0 ${own ? "justify-end" : "justify-start"}`}>
                    <article className={`min-w-0 max-w-[88%] overflow-hidden rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${own ? "rounded-br-md bg-accent-cta text-white" : "rounded-bl-md border border-default bg-surface text-primary"}`}>
                      {payload.kind === "gif" ? (
                        <div className="mb-1.5 w-[220px] max-w-full sm:w-[240px]">
                          <ChatGifImage
                            src={payload.gifUrl}
                            alt={payload.alt}
                            title={payload.alt}
                            width={240}
                            height={180}
                            className="max-h-60 w-full"
                            showBadge
                          />
                        </div>
                      ) : null}
                      {payload.kind === "video" ? (
                        <div className="mb-2 overflow-hidden rounded-xl bg-black">
                          <video
                            src={payload.mediaUrls[0]}
                            controls
                            playsInline
                            preload="metadata"
                            className="max-h-64 w-full object-contain"
                          />
                        </div>
                      ) : null}
                      {payload.kind === "image" ? (
                        <div className={`mb-2 grid gap-1.5 ${payload.mediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                          {payload.mediaUrls.map((url, idx) => (
                            <button
                              key={`${url}-${idx}`}
                              type="button"
                              onClick={() => setLightbox({ images: payload.mediaUrls, index: idx })}
                              aria-label={isEnglish ? `Zoom photo attachment ${idx + 1}` : `Perbesar lampiran foto ${idx + 1}`}
                              className="overflow-hidden rounded-xl bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                            >
                              <img
                                src={url}
                                alt={isEnglish ? `Message attachment ${idx + 1}` : `Lampiran pesan ${idx + 1}`}
                                width={480}
                                height={360}
                                loading="lazy"
                                decoding="async"
                                className="max-h-64 w-full object-cover transition hover:opacity-95"
                              />
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {payload.kind === "emoji_large" ? (
                        <p className="py-0.5 text-3xl leading-tight tracking-wide">{payload.text}</p>
                      ) : payload.kind === "text" ? (
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{payload.text}</p>
                      ) : "caption" in payload && payload.caption ? (
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{payload.caption}</p>
                      ) : null}
                      <p className={`mt-1.5 text-right text-[10px] ${own ? "text-white/90" : "text-secondary"}`}>{formatMessageTime(message.created_at, isEnglish)}</p>
                    </article>
                  </div>
                );
              }) : (
                <p className="py-12 text-center text-sm text-secondary">
                  {isEnglish
                    ? "No messages yet. Say hello to start the conversation."
                    : "Belum ada pesan. Kirim sapaan untuk memulai percakapan."}
                </p>
              )}
            </div>

            {pendingAttachments.length > 0 && (
              <div className="shrink-0 border-t border-default bg-canvas px-3 py-2.5 sm:px-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  {pendingAttachments.map((item) => (
                    <div
                      key={item.id}
                      className="relative flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-xl border border-default bg-surface p-1.5 pr-1.5 shadow-sm"
                    >
                      {item.mediaType === "video" ? (
                        <video
                          src={item.previewUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-12 w-16 rounded-lg bg-black object-cover"
                        />
                      ) : (
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          width={48}
                          height={48}
                          decoding="async"
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="max-w-36 min-w-0">
                        <p className="truncate text-xs font-medium text-primary">{item.name}</p>
                        <p className="font-mono text-[10px] text-secondary">{formatMediaFileSize(item.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(item.id)}
                        disabled={isSending}
                        aria-label={isEnglish ? `Remove attachment ${item.name}` : `Hapus lampiran ${item.name}`}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-subtle text-primary transition hover:bg-red-50 hover:text-status-danger"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={sendMessage} className="relative flex min-w-0 shrink-0 items-end gap-2 rounded-b-xl border-t border-default bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3 sm:p-4 md:rounded-br-xl md:rounded-bl-none">
              <ChatMediaPicker
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSelectEmoji={handleSelectEmoji}
                onSelectGif={handleSelectGif}
                onSelectSticker={handleSelectSticker}
                restoreFocusTo={pickerTriggerRef}
                disabled={isSending}
                align="left"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept={MEDIA_ACCEPT_ATTRIBUTE}
                multiple
                onChange={handleFilesSelected}
                className="sr-only"
                aria-label={isEnglish ? "Select photo or video to send" : "Pilih foto atau video untuk dikirim"}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
                aria-label={isEnglish ? "Attach photo or video" : "Lampirkan foto atau video"}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-default bg-subtle text-primary transition hover:border-accent-primary/50 hover:text-accent-hover active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <button
                ref={pickerTriggerRef}
                type="button"
                onClick={() => setIsPickerOpen((current) => !current)}
                disabled={isSending}
                aria-expanded={isPickerOpen}
                aria-haspopup="dialog"
                aria-label={isEnglish ? "Choose Emoji, GIF, or ViciTech Sticker" : "Pilih Emoji, GIF, atau Stiker ViciTech"}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-45 ${
                  isPickerOpen
                    ? "border-accent-primary bg-accent-subtle text-accent-hover"
                    : "border-default bg-subtle text-primary hover:border-accent-primary/50 hover:text-accent-hover"
                }`}
              >
                <Smile className="h-5 w-5" strokeWidth={1.75} />
              </button>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  syncSelectionFromTextarea(event.currentTarget);
                }}
                onClick={(event) => syncSelectionFromTextarea(event.currentTarget)}
                onKeyUp={(event) => syncSelectionFromTextarea(event.currentTarget)}
                onSelect={(event) => syncSelectionFromTextarea(event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                maxLength={4000}
                rows={1}
                placeholder={
                  isSending
                    ? isEnglish ? "Sending…" : "Mengirim…"
                    : pendingAttachments.length
                      ? isEnglish ? "Add a caption (optional)…" : "Tambahkan keterangan (opsional)…"
                      : isEnglish ? "Write a message…" : "Tulis pesan…"
                }
                aria-label={isEnglish ? "Write a message" : "Tulis pesan"}
                className="vt-form-control max-h-36 min-h-11 min-w-0 flex-1 resize-y rounded-2xl border border-default bg-subtle px-4 py-3 text-sm text-primary outline-none transition-colors placeholder:text-secondary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
              />
              <button
                type="submit"
                disabled={(!draft.trim() && pendingAttachments.length === 0) || isSending}
                aria-label={
                  sendStage === "uploading"
                    ? isEnglish ? "Uploading media" : "Mengunggah media"
                    : sendStage === "sending"
                      ? isEnglish ? "Sending…" : "Mengirim…"
                      : isEnglish ? "Send message" : "Kirim pesan"
                }
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-cta text-white shadow-sm transition-colors hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <UserRound className="mx-auto h-10 w-10 text-accent-primary/80" />
              <p className="mt-3 font-sans text-lg font-medium text-primary">
                {isEnglish ? "Your conversations appear here." : "Percakapan Anda tampil di sini."}
              </p>
              <p className="mt-1 text-sm text-secondary">
                {isEnglish ? "Select a thread to read and reply." : "Pilih salah satu utas untuk membaca dan membalas."}
              </p>
            </div>
          </div>
        )}
        {error && <p role="alert" className="shrink-0 border-t border-status-danger/20 bg-red-50 px-4 py-2 text-sm text-status-danger">{error}</p>}
      </div>

      {lightbox && (
        <MediaLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          altPrefix={isEnglish ? "Direct message attachment" : "Lampiran pesan langsung"}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
    </div>
  );
}
