"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, LoaderCircle, MessageSquare, Send, UserRound, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sanitizeUserText } from "@/lib/validation/sanitize-text";
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

function displayName(profile) {
  return profile?.full_name || profile?.display_name || (profile?.username ? `@${profile.username}` : "ViciTech member");
}

function formatMessageTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
}

function profileInitial(profile) {
  return displayName(profile).trim().charAt(0).toUpperCase() || "V";
}

function latestPreview(latest, profile) {
  if (typeof latest?.content === "string" && latest.content.trim()) {
    return latest.content;
  }
  const mediaUrls = Array.isArray(latest?.media_urls) ? latest.media_urls : [];
  if (mediaUrls.length > 0) {
    return latest?.media_type === "video" ? "[Video]" : "[Foto]";
  }
  return `@${profile?.username || "member"}`;
}

export default function DirectMessageDrawer({ user, initialUsername, isAuthLoading }) {
  const [client, setClient] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sendStage, setSendStage] = useState("");
  const [error, setError] = useState("");
  const [profileReady, setProfileReady] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const pendingAttachmentsRef = useRef([]);
  pendingAttachmentsRef.current = pendingAttachments;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const shouldAutoScrollRef = useRef(true);
  const isSending = Boolean(sendStage);
  const userId = user?.id || "";

  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const selectedProfile = profiles[selectedId] || null;
  const conversationsById = useMemo(() => new Map(conversations.map((item) => [item.userId, item])), [conversations]);

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

      if (ownProfileError) throw new Error(`Could not load your profile: ${ownProfileError.message}`);
      setProfileReady(Boolean(ownProfile));
      if (ownProfile) setProfiles((current) => ({ ...current, [ownProfile.id]: ownProfile }));
      if (!ownProfile) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      if (messagesError) throw new Error(`Could not load conversations: ${messagesError.message}`);

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
        if (participantsError) throw new Error(`Could not load conversation profiles: ${participantsError.message}`);
        setProfiles((current) => ({
          ...current,
          ...Object.fromEntries((participants || []).filter((profile) => profile?.id).map((profile) => [profile.id, profile])),
        }));
      }
    } catch (loadError) {
      setError(loadError.message || "Could not load your messages.");
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
          setMessages((current) => (current.some((item) => item?.id === message.id) ? current : [...current, message]));
          if (message.receiver_id === userId && message.sender_id === selectedConversationId) {
            void supabase
              .from("direct_messages")
              .update({ is_read: true })
              .eq("id", message.id)
              .eq("receiver_id", userId)
              .eq("is_read", false)
              .then(({ error: readError }) => {
                if (readError && active) setError(`New message arrived, but it could not be marked read: ${readError.message}`);
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
          setError("Realtime messaging is unavailable. Check your connection and try again.");
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
    if (!client || !userId || !initialUsername || !profileReady) return;
    let active = true;
    client
      .from("profiles")
      .select("id, username, display_name, full_name, avatar_url, bio")
      .eq("username", initialUsername.trim().toLowerCase())
      .maybeSingle()
      .then(({ data, error: targetError }) => {
        if (!active) return;
        if (targetError) {
          setError(`Could not find that profile: ${targetError.message}`);
          return;
        }
        if (!data) {
          setError("This user profile could not be found.");
          return;
        }
        if (data.id === userId) {
          setError("You cannot start a conversation with yourself.");
          return;
        }
        setProfiles((current) => ({ ...current, [data.id]: data }));
        setSelectedId(data.id);
      })
      .catch((targetError) => {
        if (active) setError(targetError.message || "Could not open this conversation.");
      });
    return () => { active = false; };
  }, [client, userId, initialUsername, profileReady]);

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
          setError(`Could not load this conversation: ${messagesError.message}`);
          return;
        }
        const rawRows = Array.isArray(data) ? data : [];
        const hasMore = rawRows.length > DM_PAGE_SIZE;
        const pageRows = hasMore ? rawRows.slice(0, DM_PAGE_SIZE) : rawRows;
        setHasOlderMessages(hasMore);
        shouldAutoScrollRef.current = true;
        setMessages([...pageRows].reverse());
        const unreadIds = pageRows.filter((item) => item?.receiver_id === userId && !item.is_read).map((item) => item.id);
        if (unreadIds.length) {
          const { error: readError } = await client
            .from("direct_messages")
            .update({ is_read: true })
            .in("id", unreadIds)
            .eq("receiver_id", userId);
          if (readError && active) setError(`Messages loaded, but unread status could not be updated: ${readError.message}`);
          if (!readError && active) {
            setConversations((current) =>
              current.map((conv) => (conv.userId === selectedId ? { ...conv, unread: 0 } : conv)),
            );
          }
        }
      })
      .catch((messagesError) => {
        if (active) setError(messagesError.message || "Could not load this conversation.");
      });
    return () => { active = false; };
  }, [client, userId, selectedId]);

  const loadOlderMessages = useCallback(async () => {
    const oldest = messages[0];
    if (!client || !userId || !selectedId || !oldest?.created_at || loadingOlder) return;
    setLoadingOlder(true);
    try {
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
      }
    } catch (olderErr) {
      setError(olderErr instanceof Error ? olderErr.message : "Gagal memuat pesan sebelumnya.");
    } finally {
      setLoadingOlder(false);
    }
  }, [client, loadingOlder, messages, selectedId, userId]);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  }, [messages]);

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
      let sentMessage = null;
      const { data: rpcId, error: rpcError } = await client.rpc("send_direct_message_with_notification", {
        p_receiver_id: selectedId,
        p_content: content,
        p_media_urls: mediaUrls,
        p_media_type: mediaType,
      });

      if (!rpcError && rpcId) {
        const { data: fetchedRow, error: fetchError } = await client
          .from("direct_messages")
          .select("id, sender_id, receiver_id, content, media_urls, media_type, is_read, created_at")
          .eq("id", rpcId)
          .maybeSingle();
        if (fetchError) throw new Error(`Pesan terkirim tetapi gagal memuat ulang baris: ${fetchError.message}`);
        sentMessage = fetchedRow || {
          id: rpcId,
          sender_id: userId,
          receiver_id: selectedId,
          content,
          media_urls: mediaUrls,
          media_type: mediaType,
          is_read: false,
          created_at: new Date().toISOString(),
        };
      } else if (rpcError && rpcError.code !== "PGRST202" && rpcError.code !== "42883") {
        throw new Error(`Pesan gagal dikirim: ${rpcError.message}`);
      } else {
        const { data, error: insertError } = await client
          .from("direct_messages")
          .insert({
            sender_id: userId,
            receiver_id: selectedId,
            content,
            media_urls: mediaUrls,
            media_type: mediaType,
          })
          .select("id, sender_id, receiver_id, content, media_urls, media_type, is_read, created_at")
          .single();
        if (insertError) throw new Error(`Pesan gagal dikirim: ${insertError.message}`);
        sentMessage = data;
      }

      pendingAttachments.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setPendingAttachments([]);
      setDraft("");
      shouldAutoScrollRef.current = true;
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

  if (isAuthLoading) {
    return (
      <section role="status" className="mx-auto flex min-h-64 max-w-3xl items-center justify-center gap-3 text-sm text-[#5A606A]">
        <LoaderCircle className="h-5 w-5 animate-spin text-[#FF5500]" /> Checking your ViciTech session…
      </section>
    );
  }

  if (!userId) {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-black/[0.06] bg-white p-8 text-center shadow-[0_12px_36px_rgba(20,21,24,0.05)]">
        <MessageSquare className="mx-auto h-10 w-10 text-[#FF5500]" />
        <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-[#141518]">Sign in to your messages</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#5A606A]">Direct messages are private and available to signed-in ViciTech members.</p>
      </section>
    );
  }

  if (!isLoading && !profileReady) {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-black/[0.06] bg-white p-8 shadow-[0_12px_36px_rgba(20,21,24,0.05)]">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#141518]">Finish setting up your profile</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#5A606A]">Save a unique username in Account Settings before starting direct messages.</p>
        {error && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-[min(74vh,760px)] max-w-7xl flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_16px_48px_rgba(20,21,24,0.06)] md:flex-row">
      <aside className={`min-h-[58vh] w-full border-b border-black/[0.06] bg-white md:min-h-0 md:w-80 md:shrink-0 md:border-b-0 md:border-r ${selectedId ? "hidden md:block" : ""}`}>
        <div className="border-b border-black/[0.06] px-5 py-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#A83A00]">
            <MessageSquare className="h-4 w-4" /> Inbox
            <span className={`ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium tracking-normal ${realtimeStatus === "connected" ? "text-emerald-700" : realtimeStatus === "error" ? "text-red-700" : "text-[#777C83]"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${realtimeStatus === "connected" ? "bg-emerald-500" : realtimeStatus === "error" ? "bg-red-500" : "bg-[#A3A6AA]"}`} />
              {realtimeStatus === "connected" ? "Connected" : realtimeStatus === "error" ? "Offline" : "Connecting"}
            </span>
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-[#141518]">Direct messages</h1>
          <p className="mt-1 text-xs leading-relaxed text-[#777C83]">Private conversations with ViciTech members.</p>
        </div>
        <div className="max-h-[38vh] overflow-y-auto p-2 md:max-h-[620px]">
          {isLoading ? (
            <p className="flex items-center gap-2 p-4 text-sm text-zinc-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading conversations…</p>
          ) : conversations.length ? conversations.map((item) => {
            const profile = profiles[item?.userId];
            if (!item?.userId || !profile) return null;
            return (
              <button key={item.userId} type="button" aria-current={selectedId === item.userId ? "true" : undefined} onClick={() => setSelectedId(item.userId)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${selectedId === item.userId ? "bg-[#FF5500]/[0.06] ring-1 ring-[#FF5500]/20" : "hover:bg-[#F6F5F2]"}`}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" width={44} height={44} loading="lazy" decoding="async" className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-black/[0.06]" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#FF5500]/[0.08] text-sm font-semibold text-[#A83A00]">{profileInitial(profile)}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#141518]">{displayName(profile)}</span>
                  <span className="mt-0.5 block truncate text-xs text-[#777C83]">{latestPreview(item.latest, profile)}</span>
                </span>
                {item.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#FF5500] px-1 text-[11px] font-semibold text-white">{item.unread}</span>}
              </button>
            );
          }) : !error ? <p className="p-4 text-sm text-zinc-500">No conversations yet. Visit a public profile to send a message.</p> : null}
        </div>
      </aside>

      <div className={`flex min-h-[58vh] min-w-0 flex-1 flex-col bg-[#FCFBF9] md:min-h-0 ${!selectedId ? "hidden md:flex" : ""}`}>
        {selectedId && selectedProfile ? (
          <>
            <header className="flex items-center gap-3 border-b border-black/[0.06] bg-white px-4 py-3.5 sm:px-6">
              <button type="button" aria-label="Back to conversations" onClick={() => setSelectedId("")} className="rounded-full p-2 text-[#5A606A] transition-colors hover:bg-[#F6F5F2] hover:text-[#141518] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/60 md:hidden"><ArrowLeft className="h-4 w-4" /></button>
              {selectedProfile.avatar_url ? <img src={selectedProfile.avatar_url} alt="" width={44} height={44} loading="lazy" decoding="async" className="h-11 w-11 rounded-full object-cover ring-1 ring-black/[0.06]" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-[#FF5500]/[0.08] font-semibold text-[#A83A00]">{profileInitial(selectedProfile)}</span>}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[#141518]">{displayName(selectedProfile)}</span>
                <span className="block text-xs text-[#777C83]">@{selectedProfile.username || "member"}</span>
              </span>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
              {hasOlderMessages && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={loadOlderMessages}
                    disabled={loadingOlder}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-medium text-[#141518] shadow-sm transition hover:border-[#FF5500]/40 hover:text-[#A83A00] disabled:opacity-50"
                  >
                    {loadingOlder && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                    <span>{loadingOlder ? "Memuat…" : "Muat pesan sebelumnya"}</span>
                  </button>
                </div>
              )}
              {messages.length ? messages.map((message) => {
                if (!message?.id) return null;
                const text = typeof message.content === "string" ? message.content : "";
                const mediaUrls = Array.isArray(message.media_urls)
                  ? message.media_urls.filter((url) => typeof url === "string" && url.trim().length > 0)
                  : [];
                if (!text.trim() && mediaUrls.length === 0) return null;

                const own = message.sender_id === userId;
                const isVideo =
                  message.media_type === "video" ||
                  mediaUrls.some((url) => /\.(mp4|webm)(\?|$)/i.test(url));

                return (
                  <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                    <article className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${own ? "rounded-br-md bg-[#FF5500] text-white" : "rounded-bl-md border border-black/[0.06] bg-white text-[#30343A]"}`}>
                      {mediaUrls.length > 0 && (
                        isVideo ? (
                          <div className="mb-2 overflow-hidden rounded-xl bg-[#141518]">
                            <video
                              src={mediaUrls[0]}
                              controls
                              playsInline
                              preload="metadata"
                              className="max-h-64 w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className={`mb-2 grid gap-1.5 ${mediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                            {mediaUrls.map((url, idx) => (
                              <button
                                key={`${url}-${idx}`}
                                type="button"
                                onClick={() => setLightbox({ images: mediaUrls, index: idx })}
                                aria-label={`Perbesar lampiran foto ${idx + 1}`}
                                className="overflow-hidden rounded-xl bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                              >
                                <img
                                  src={url}
                                  alt={`Lampiran pesan ${idx + 1}`}
                                  width={480}
                                  height={360}
                                  loading="lazy"
                                  decoding="async"
                                  className="max-h-64 w-full object-cover transition hover:opacity-95"
                                />
                              </button>
                            ))}
                          </div>
                        )
                      )}
                      {text.trim() ? (
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{text}</p>
                      ) : null}
                      <p className={`mt-1.5 text-right text-[10px] ${own ? "text-white/75" : "text-[#777C83]"}`}>{formatMessageTime(message.created_at)}</p>
                    </article>
                  </div>
                );
              }) : <p className="py-12 text-center text-sm text-zinc-500">No messages yet. Send a hello to start the conversation.</p>}
              <div ref={bottomRef} />
            </div>

            {pendingAttachments.length > 0 && (
              <div className="border-t border-black/[0.06] bg-[#FAF9F6] px-3 py-2.5 sm:px-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  {pendingAttachments.map((item) => (
                    <div
                      key={item.id}
                      className="relative flex items-center gap-2 overflow-hidden rounded-xl border border-black/10 bg-white p-1.5 pr-2 shadow-sm"
                    >
                      {item.mediaType === "video" ? (
                        <video
                          src={item.previewUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-12 w-16 rounded-lg bg-[#141518] object-cover"
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
                        <p className="truncate text-xs font-medium text-[#141518]">{item.name}</p>
                        <p className="font-mono text-[10px] text-[#5A606A]">{formatMediaFileSize(item.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(item.id)}
                        disabled={isSending}
                        aria-label={`Hapus lampiran ${item.name}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F6F5F2] text-[#141518] transition hover:bg-red-50 hover:text-red-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-black/[0.06] bg-white p-3 sm:gap-3 sm:p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept={MEDIA_ACCEPT_ATTRIBUTE}
                multiple
                onChange={handleFilesSelected}
                className="sr-only"
                aria-label="Pilih foto atau video untuk dikirim"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
                aria-label="Lampirkan foto atau video"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-black/10 bg-[#F6F5F2] text-[#141518] transition hover:border-[#FF5500]/50 hover:text-[#A83A00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/60 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }} maxLength={4000} rows={1} placeholder={pendingAttachments.length ? "Tambahkan keterangan (opsional)…" : "Write a message…"} aria-label="Message" className="max-h-36 min-h-11 flex-1 resize-y rounded-2xl border border-black/10 bg-[#F6F5F2] px-4 py-3 text-sm text-[#141518] outline-none transition-colors placeholder:text-[#777C83] focus:border-[#FF5500]/50 focus:ring-2 focus:ring-[#FF5500]/10" />
              <button
                type="submit"
                disabled={(!draft.trim() && pendingAttachments.length === 0) || isSending}
                aria-label={sendStage === "uploading" ? "Mengunggah media" : "Kirim pesan"}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#FF5500] text-white shadow-sm transition-colors hover:bg-[#E94B00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <UserRound className="mx-auto h-10 w-10 text-[#FF5500]/70" />
              <p className="mt-3 font-serif text-lg font-medium text-[#30343A]">Your conversations live here.</p>
              <p className="mt-1 text-sm text-[#777C83]">Select a thread to read and reply.</p>
            </div>
          </div>
        )}
        {error && <p role="alert" className="border-t border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-700">{error}</p>}
      </div>

      {lightbox && (
        <MediaLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          altPrefix="Lampiran pesan langsung"
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  );
}
