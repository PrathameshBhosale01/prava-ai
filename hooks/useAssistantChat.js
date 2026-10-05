"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { serverTimestamp } from "firebase/firestore";

import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { createTrip } from "@/lib/tripService";
import { MAX_USER_MESSAGE_CHARS } from "@/lib/assistant/config";
import { deriveTitle, newId, toApiMessages } from "@/lib/assistant/chatUtils";
import { parseNdjsonStream } from "@/lib/assistant/stream";
import * as storage from "@/lib/assistant/chatStorage";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";

async function getToken() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Please sign in again to use the assistant.");
  return currentUser.getIdToken();
}

/**
 * All state and side effects for the AI assistant page.
 *
 * Message shape (in memory):
 *   { id, role: "user" | "assistant", content, createdAt,
 *     plan?: { trip, itinerary, tripId? }, error?, stopped?,
 *     pending?, phase?: "thinking" | "streaming" | "planning" }
 */
export function useAssistantChat() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState(null);
  const [notice, setNotice] = useState(null);

  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [savingPlanId, setSavingPlanId] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const abortRef = useRef(null);
  // Bumped whenever the visible conversation changes, so a stream that was
  // started in another chat can never write into the current one.
  const runRef = useRef(0);
  const loadRef = useRef(0);

  // ── initial data ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    storage
      .listChats(uid)
      .then((items) => {
        if (!cancelled) setChats(items);
      })
      .catch((error) => {
        console.error("Failed to load chat history:", error);
        if (!cancelled) setNotice("Couldn't load your chat history.");
      })
      .finally(() => {
        if (!cancelled) setChatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await getToken();
        const response = await fetch("/api/assistant/usage", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setUsage(data.usage);
      } catch {
        // The meter is a nicety; the chat works without it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // ── one request/response turn ─────────────────────────────────────────────

  const runExchange = useCallback(
    async ({ base, userMessage, chatId }) => {
      const runId = ++runRef.current;
      const isCurrent = () => runRef.current === runId;

      const controller = new AbortController();
      abortRef.current = controller;

      const assistantId = newId();
      let assistant = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: userMessage.createdAt + 1,
        pending: true,
        phase: "thinking",
      };

      const history = [...base, userMessage];
      setMessages([...history, assistant]);
      setBusy(true);

      const patch = (changes) => {
        assistant = { ...assistant, ...changes };
        if (isCurrent()) {
          setMessages((previous) =>
            previous.map((message) => (message.id === assistantId ? assistant : message)),
          );
        }
      };

      try {
        const token = await getToken();
        const response = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: toApiMessages(history) }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          if (data.usage && isCurrent()) setUsage(data.usage);
          throw new Error(data.error || GENERIC_ERROR);
        }

        for await (const event of parseNdjsonStream(response.body)) {
          if (event.type === "text") {
            patch({ content: assistant.content + event.delta, phase: "streaming" });
          } else if (event.type === "status") {
            patch({ phase: event.status });
          } else if (event.type === "plan") {
            patch({ plan: event.plan });
          } else if (event.type === "error") {
            patch({ error: event.message });
          } else if (event.type === "done" && event.usage && isCurrent()) {
            setUsage(event.usage);
          }
        }

        if (!assistant.content && !assistant.plan && !assistant.error) {
          patch({ error: GENERIC_ERROR });
        }
      } catch (error) {
        if (error?.name === "AbortError") {
          patch({ stopped: true });
        } else if (error instanceof TypeError) {
          patch({ error: NETWORK_ERROR });
        } else {
          patch({ error: error?.message || GENERIC_ERROR });
        }
      }

      patch({ pending: false, phase: undefined });

      if (isCurrent()) {
        setBusy(false);
        abortRef.current = null;
      }

      // ── persist ───────────────────────────────────────────────────────────
      // A turn that produced nothing (rate limit, network error…) is not worth
      // keeping; the user can simply retry.
      const failedEmpty = assistant.error && !assistant.content && !assistant.plan;
      if (failedEmpty) return;

      try {
        const isNew = !chats.some((chat) => chat.id === chatId);
        const saved = await storage.saveExchange({
          uid,
          chatId,
          isNew,
          title: deriveTitle(userMessage.content),
          messages: [userMessage, assistant],
        });

        setChats((previous) => {
          const existing = previous.find((chat) => chat.id === chatId);
          const entry = {
            id: chatId,
            title: existing?.title ?? deriveTitle(userMessage.content),
            createdAt: existing?.createdAt ?? saved.updatedAt,
            updatedAt: saved.updatedAt,
            preview: saved.preview,
          };
          return [entry, ...previous.filter((chat) => chat.id !== chatId)];
        });
      } catch (error) {
        console.error("Failed to save chat:", error);
        setNotice("This conversation couldn't be saved to your history.");
      }
    },
    [uid, chats],
  );

  // ── public actions ────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    (rawText) => {
      const text = (rawText ?? "").trim();
      if (!text || busy || !uid) return false;

      if (text.length > MAX_USER_MESSAGE_CHARS) {
        setNotice(`Messages can be up to ${MAX_USER_MESSAGE_CHARS} characters.`);
        return false;
      }

      const chatId = activeChatId ?? newId();
      if (!activeChatId) setActiveChatId(chatId);
      setNotice(null);

      runExchange({
        base: messages,
        userMessage: { id: newId(), role: "user", content: text, createdAt: Date.now() },
        chatId,
      });
      return true;
    },
    [busy, uid, activeChatId, messages, runExchange],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const retry = useCallback(() => {
    if (busy || !uid) return;

    const lastUser = messages.findLastIndex((message) => message.role === "user");
    if (lastUser === -1) return;

    // Remove the failed reply (from storage too, if it was ever saved).
    for (const failed of messages.slice(lastUser + 1)) {
      if (activeChatId) storage.deleteMessage(uid, activeChatId, failed.id).catch(() => {});
    }

    setNotice(null);
    runExchange({
      base: messages.slice(0, lastUser),
      userMessage: messages[lastUser],
      chatId: activeChatId ?? newId(),
    });
  }, [busy, uid, messages, activeChatId, runExchange]);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    runRef.current++;
    loadRef.current++;
    setMessages([]);
    setActiveChatId(null);
    setBusy(false);
    setMessagesLoading(false);
    setNotice(null);
    setSaveError(null);
  }, []);

  const openChat = useCallback(
    async (chatId) => {
      if (!uid || chatId === activeChatId) return;

      abortRef.current?.abort();
      runRef.current++;
      const loadId = ++loadRef.current;

      setBusy(false);
      setNotice(null);
      setSaveError(null);
      setActiveChatId(chatId);
      setMessages([]);
      setMessagesLoading(true);

      try {
        const loaded = await storage.loadMessages(uid, chatId);
        if (loadRef.current === loadId) setMessages(loaded);
      } catch (error) {
        console.error("Failed to open chat:", error);
        if (loadRef.current === loadId) setNotice("Couldn't open that conversation.");
      } finally {
        if (loadRef.current === loadId) setMessagesLoading(false);
      }
    },
    [uid, activeChatId],
  );

  const renameChat = useCallback(
    async (chatId, rawTitle) => {
      const title = rawTitle.replace(/\s+/g, " ").trim().slice(0, 80);
      const previous = chats.find((chat) => chat.id === chatId);
      if (!uid || !title || !previous || title === previous.title) return;

      setChats((list) => list.map((chat) => (chat.id === chatId ? { ...chat, title } : chat)));
      try {
        await storage.renameChat(uid, chatId, title);
      } catch (error) {
        console.error("Failed to rename chat:", error);
        setChats((list) =>
          list.map((chat) => (chat.id === chatId ? { ...chat, title: previous.title } : chat)),
        );
        setNotice("Couldn't rename that conversation.");
      }
    },
    [uid, chats],
  );

  const deleteChat = useCallback(
    async (chatId) => {
      if (!uid) return;

      const snapshot = chats;
      setChats((list) => list.filter((chat) => chat.id !== chatId));
      if (chatId === activeChatId) newChat();

      try {
        await storage.deleteChat(uid, chatId);
      } catch (error) {
        console.error("Failed to delete chat:", error);
        setChats(snapshot);
        setNotice("Couldn't delete that conversation.");
      }
    },
    [uid, chats, activeChatId, newChat],
  );

  const savePlan = useCallback(
    async (messageId) => {
      const message = messages.find((item) => item.id === messageId);
      if (!uid || !message?.plan || message.plan.tripId || savingPlanId) return;

      setSavingPlanId(messageId);
      setSaveError(null);

      try {
        const { trip, itinerary } = message.plan;
        const tripId = await createTrip(uid, {
          ...trip,
          itinerary,
          itineraryGeneratedAt: serverTimestamp(),
          source: "assistant",
        });

        setMessages((list) =>
          list.map((item) =>
            item.id === messageId ? { ...item, plan: { ...item.plan, tripId } } : item,
          ),
        );
        if (activeChatId) {
          storage
            .updateMessage(uid, activeChatId, messageId, { "plan.tripId": tripId })
            .catch(() => {});
        }
      } catch (error) {
        console.error("Failed to save trip:", error);
        setSaveError({ messageId, message: "Couldn't save this trip. Please try again." });
      } finally {
        setSavingPlanId(null);
      }
    },
    [uid, messages, activeChatId, savingPlanId],
  );

  const dismissNotice = useCallback(() => setNotice(null), []);

  return {
    user,
    messages,
    busy,
    usage,
    notice,
    chats,
    chatsLoading,
    activeChatId,
    messagesLoading,
    savingPlanId,
    saveError,
    sendMessage,
    stop,
    retry,
    newChat,
    openChat,
    renameChat,
    deleteChat,
    savePlan,
    dismissNotice,
  };
}