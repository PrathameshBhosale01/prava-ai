"use client";

import { useState } from "react";
import { Check, MessageSquare, Pencil, Plus, Trash2, X } from "lucide-react";

import { groupChatsByDate } from "@/lib/assistant/chatUtils";

function Skeleton() {
  return (
    <div className="space-y-2 px-3 py-2" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
         <div key={index} className="h-11 animate-pulse rounded-lg bg-surface-muted" style={{ animationDelay: `${index * 120}ms` }} />
      ))}
    </div>
  );
}

const iconButton =
  "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-muted hover:text-foreground ";
 
/**
 * Conversation list. Renders its own header so it works both as the desktop
 * side panel and inside the mobile drawer (`onClose` shows a close button).
 */
export default function HistoryPanel({
  chats,
  loading,
  activeChatId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onClose,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);

  const groups = groupChatsByDate(chats);

  const startEditing = (chat) => {
    setConfirmingId(null);
    setEditingId(chat.id);
    setDraft(chat.title);
  };

  const commitEdit = () => {
    if (editingId) onRename(editingId, draft);
    setEditingId(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="flex-1 text-sm font-semibold text-foreground">Chat history</h2>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-muted"
        >
          <Plus size={14} />
          New
        </button>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close chat history" className={iconButton}>
            <X size={16} />
          </button>
        )}
      </div>

     <div className="min-h-0 flex-1 overflow-y-auto py-2 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
        {loading ? (
          <Skeleton />
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
           <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
              <MessageSquare size={18} />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">No conversations yet</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Your chats are saved here so you can pick up where you left off.</p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="mb-3">
               <h3 className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h3>
              <ul className="space-y-0.5 px-2">
                {group.items.map((chat) => {
                  const active = chat.id === activeChatId;

                  if (editingId === chat.id) {
                    return (
                       <li key={chat.id} className="flex items-center gap-1 rounded-lg bg-surface-muted p-1.5">
                        <input
                          autoFocus
                          value={draft}
                          maxLength={80}
                          aria-label="Chat title"
                          onChange={(event) => setDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") commitEdit();
                            if (event.key === "Escape") setEditingId(null);
                          }}
                          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none! focus:border-primary"
                        />
                        <button type="button" onClick={commitEdit} aria-label="Save title" className={iconButton}>
                          <Check size={15} />
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} aria-label="Cancel rename" className={iconButton}>
                          <X size={15} />
                        </button>
                      </li>
                    );
                  }

                  if (confirmingId === chat.id) {
                    return (
                       <li key={chat.id} className="rounded-lg border border-danger/30 bg-danger-soft p-2.5">
                        <p className="truncate text-sm font-medium text-danger">Delete “{chat.title}”?</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingId(null);
                              onDelete(chat.id);
                            }}
                            className="rounded-md bg-danger px-3 py-1 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                             className="rounded-md border border-danger/30 bg-surface px-3 py-1 text-xs font-medium text-danger transition hover:bg-danger/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={chat.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onSelect(chat.id)}
                        aria-current={active ? "true" : undefined}
                        className={`block w-full rounded-lg px-3 py-2 text-left transition ${
                          active ? "bg-surface-muted" : "hover:bg-surface-muted"
                        }`}
                      >
                        <span className={`block truncate pr-14 text-sm ${active ? "font-medium text-foreground" : "text-foreground"}`}>
                          {chat.title}
                        </span>
                        {chat.preview && (
                          <span className="mt-0.5 block truncate pr-14 text-xs text-muted-foreground">{chat.preview}</span>
                        )}
                      </button>

                      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                        <button type="button" onClick={() => startEditing(chat)} aria-label={`Rename ${chat.title}`} className={iconButton}>
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setConfirmingId(chat.id);
                          }}
                          aria-label={`Delete ${chat.title}`}
                            className={`${iconButton} hover:text-danger`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}