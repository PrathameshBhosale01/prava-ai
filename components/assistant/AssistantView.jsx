"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { History, Plus, X } from "lucide-react";

import AssistantMark from "./AssistantMark";
import Composer from "./Composer";
import HistoryPanel from "./HistoryPanel";
import MessageList from "./MessageList";
import PlanCard, { PlanBuilding } from "./PlanCard";
import UsageMeter from "./UsageMeter";
import WelcomeScreen from "./WelcomeScreen";

/**
 * Presentational layout of the assistant. All state comes from `chat`
 * (see hooks/useAssistantChat.js), which keeps this component easy to preview.
 */
export default function AssistantView({ chat }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event) => event.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const firstName = chat.user?.displayName?.split(" ")[0];
  const showWelcome = chat.messages.length === 0 && !chat.messagesLoading;

  const renderExtras = (message) => {
    if (message.phase === "planning") return <PlanBuilding />;
    if (!message.plan) return null;
    return (
      <PlanCard
        plan={message.plan}
        saving={chat.savingPlanId === message.id}
        error={chat.saveError?.messageId === message.id ? chat.saveError.message : null}
        onSave={() => chat.savePlan(message.id)}
      />
    );
  };

  const selectChat = (id) => {
    setDrawerOpen(false);
    chat.openChat(id);
  };

  const newChat = () => {
    setDrawerOpen(false);
    chat.newChat();
  };

  const history = (onClose) => (
    <HistoryPanel
      chats={chat.chats}
      loading={chat.chatsLoading}
      activeChatId={chat.activeChatId}
      onSelect={selectChat}
      onNew={newChat}
      onRename={chat.renameChat}
      onDelete={chat.deleteChat}
      onClose={onClose}
    />
  );

  return (
    <MotionConfig reducedMotion="user">
     <div className="relative flex h-[calc(100dvh-7rem)] min-h-[520px] overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <section className="flex min-w-0 flex-1 flex-col" aria-label="Prava AI assistant">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
            <AssistantMark size="md" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold text-foreground">Prava Assistant</h1>
              <p className="truncate text-xs text-muted-foreground">Plan trips and get travel answers</p>
            </div>

            <div className="hidden sm:block">
              <UsageMeter usage={chat.usage} />
            </div>
            <button
              type="button"
              onClick={newChat}
               className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">New chat</span>
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open chat history"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-surface-muted lg:hidden">
              <History size={17} />
            </button>
          </header>

          {chat.messagesLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground" role="status">
              Loading conversation…
            </div>
          ) : showWelcome ? (
            <WelcomeScreen name={firstName} onPick={chat.sendMessage} disabled={chat.busy} />
          ) : (
            <MessageList messages={chat.messages} renderExtras={renderExtras} onRetry={chat.retry} />
          )}

          {chat.notice && (
            <div
              role="status"
              className="mx-4 mb-2 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning sm:mx-6"
            >
              <p className="flex-1">{chat.notice}</p>
               <button type="button" onClick={chat.dismissNotice} aria-label="Dismiss" className="text-warning hover:text-foreground">
                <X size={15} />
              </button>
            </div>
          )}

          <Composer onSend={chat.sendMessage} onStop={chat.stop} busy={chat.busy} />
        </section>

        <aside className="hidden w-72 shrink-0 border-l border-border bg-surface-muted/50 lg:block" aria-label="Chat history">
          {history()}
        </aside>

        <AnimatePresence>
          {drawerOpen && (
            <div className="absolute inset-0 z-30 lg:hidden">
              <motion.button
                type="button"
                aria-label="Close chat history"
                onClick={() => setDrawerOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-foreground/30"
              />
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 360, damping: 36 }}
                 className="absolute inset-y-0 right-0 w-[85%] max-w-xs border-l border-border bg-surface shadow-xl"
                aria-label="Chat history"
              >
                {history(() => setDrawerOpen(false))}
              </motion.aside>
            </div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}