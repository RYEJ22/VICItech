"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, LoaderCircle, MessageSquare, Send, UserRound } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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

export default function DirectMessageDrawer({ user, initialUsername, isAuthLoading }) {
  const [client, setClient] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [profileReady, setProfileReady] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const bottomRef = useRef(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const userId = user?.id || "";

  const selectedProfile = profiles[selectedId] || null;
  const conversationsById = useMemo(() => new Map(conversations.map((item) => [item.userId, item])), [conversations]);

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
      const { data: ownProfile, error: ownProfileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, full_name, avatar_url, bio")
        .eq("id", currentUserId)
        .maybeSingle();
      if (ownProfileError) throw new Error(`Could not load your profile: ${ownProfileError.message}`);
      setProfileReady(Boolean(ownProfile));
      if (ownProfile) setProfiles((current) => ({ ...current, [ownProfile.id]: ownProfile }));
      if (!ownProfile) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const { data: rows, error: messagesError } = await supabase
        .from("direct_messages")
        .select("id, sender_id, receiver_id, content, is_read, created_at")
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false })
        .limit(500);
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
        if (message.sender_id === selectedConversationId || message.receiver_id === selectedConversationId) {
          setMessages((current) => current.some((item) => item?.id === message.id) ? current : [...current, message]);
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
        void loadInbox(supabase, userId);
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
        filter: `sender_id=eq.${userId}`,
      }, ({ new: message }) => {
        if (!active || !message?.id) return;
        if (message.receiver_id === selectedIdRef.current) {
          setMessages((current) => current.some((item) => item?.id === message.id) ? current : [...current, message]);
        }
        void loadInbox(supabase, userId);
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
  }, [userId, loadInbox]);

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
    if (!client || !userId || !selectedId) {
      setMessages([]);
      return undefined;
    }
    let active = true;
    setMessages([]);
    setError("");
    client
      .from("direct_messages")
      .select("id, sender_id, receiver_id, content, is_read, created_at")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${selectedId}),and(sender_id.eq.${selectedId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(async ({ data, error: messagesError }) => {
        if (!active) return;
        if (messagesError) {
          setError(`Could not load this conversation: ${messagesError.message}`);
          return;
        }
        const rows = Array.isArray(data) ? data : [];
        setMessages([...rows].reverse());
        const unreadIds = rows.filter((item) => item?.receiver_id === userId && !item.is_read).map((item) => item.id);
        if (unreadIds.length) {
          const { error: readError } = await client
            .from("direct_messages")
            .update({ is_read: true })
            .in("id", unreadIds)
            .eq("receiver_id", userId);
          if (readError && active) setError(`Messages loaded, but unread status could not be updated: ${readError.message}`);
          if (!readError && active) void loadInbox(client, userId);
        }
      })
      .catch((messagesError) => {
        if (active) setError(messagesError.message || "Could not load this conversation.");
      });
    return () => { active = false; };
  }, [client, userId, selectedId, loadInbox]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!client || !userId || !selectedId || !content || isSending) return;
    if (content.length > 4000) {
      setError("Messages can contain up to 4,000 characters.");
      return;
    }
    setIsSending(true);
    setError("");
    try {
      const { data, error: insertError } = await client
        .from("direct_messages")
        .insert({ sender_id: userId, receiver_id: selectedId, content })
        .select("id, sender_id, receiver_id, content, is_read, created_at")
        .single();
      if (insertError) throw new Error(`Message could not be sent: ${insertError.message}`);
      setDraft("");
      setMessages((current) => current.some((item) => item?.id === data?.id) ? current : [...current, data]);
      void loadInbox(client, userId);
    } catch (sendError) {
      setError(sendError.message || "Message could not be sent.");
    } finally {
      setIsSending(false);
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
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-black/[0.06]" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#FF5500]/[0.08] text-sm font-semibold text-[#A83A00]">{profileInitial(profile)}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#141518]">{displayName(profile)}</span>
                  <span className="mt-0.5 block truncate text-xs text-[#777C83]">{item.latest?.content || `@${profile.username || "member"}`}</span>
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
              {selectedProfile.avatar_url ? <img src={selectedProfile.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover ring-1 ring-black/[0.06]" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-[#FF5500]/[0.08] font-semibold text-[#A83A00]">{profileInitial(selectedProfile)}</span>}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[#141518]">{displayName(selectedProfile)}</span>
                <span className="block text-xs text-[#777C83]">@{selectedProfile.username || "member"}</span>
              </span>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
              {messages.length ? messages.map((message) => {
                if (!message?.id || typeof message.content !== "string") return null;
                const own = message.sender_id === userId;
                return (
                  <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                    <article className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${own ? "rounded-br-md bg-[#FF5500] text-white" : "rounded-bl-md border border-black/[0.06] bg-white text-[#30343A]"}`}>
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
                      <p className={`mt-1.5 text-right text-[10px] ${own ? "text-white/75" : "text-[#777C83]"}`}>{formatMessageTime(message.created_at)}</p>
                    </article>
                  </div>
                );
              }) : <p className="py-12 text-center text-sm text-zinc-500">No messages yet. Send a hello to start the conversation.</p>}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-black/[0.06] bg-white p-3 sm:gap-3 sm:p-4">
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }} maxLength={4000} rows={1} placeholder="Write a message…" aria-label="Message" className="max-h-36 min-h-11 flex-1 resize-y rounded-2xl border border-black/10 bg-[#F6F5F2] px-4 py-3 text-sm text-[#141518] outline-none transition-colors placeholder:text-[#777C83] focus:border-[#FF5500]/50 focus:ring-2 focus:ring-[#FF5500]/10" />
              <button type="submit" disabled={!draft.trim() || isSending} aria-label="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#FF5500] text-white shadow-sm transition-colors hover:bg-[#E94B00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40">
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
        {error && <p role="alert" className="border-t border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
      </div>
    </section>
  );
}
