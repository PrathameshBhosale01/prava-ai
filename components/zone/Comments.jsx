"use client";

import { useEffect, useId, useReducer, useState } from "react";
import { Loader2, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { commentsReducer, initialCommentsState } from "@/lib/zone/commentsState";
import { LIMITS } from "@/lib/zone/constants";
import { zoneApi } from "@/lib/zone/client";
import { formatFullDate, formatPostDate, plural } from "@/lib/zone/format";
import { cn } from "@/lib/utils";

import Avatar from "./Avatar";
import ConfirmDialog from "./ConfirmDialog";

const textarea =
  "w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60";

/** Textarea + counter + submit, shared by "new comment" and "edit comment". */
function CommentForm({ initial = "", label, submitLabel, onSubmit, onCancel, autoFocus = false, compact = false }) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const length = text.trim().length;
  const tooLong = length > LIMITS.comment.max;
  const unchanged = text.trim() === initial.trim();
  const id = useId();

  async function submit(e) {
    e?.preventDefault();
    if (busy || length === 0 || tooLong || unchanged) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(text.trim());
      setText("");
    } catch (err) {
      setError(err.fields?.text || err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        value={text}
        rows={compact ? 2 : 3}
        autoFocus={autoFocus}
        disabled={busy}
        placeholder="Share your thoughts…"
        aria-invalid={Boolean(error) || tooLong}
        aria-describedby={`${id}-help`}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit(e)}
        className={textarea}
      />
      <div className="flex items-center justify-between gap-3">
        <p id={`${id}-help`} className={cn("text-xs", error || tooLong ? "text-danger" : "text-muted-foreground")} role={error ? "alert" : undefined}>
          {error || (
            <>
              <span className="tabular-nums">
                {length}/{LIMITS.comment.max}
              </span>
              <span className="hidden sm:inline"> · Ctrl/⌘ + Enter to send</span>
            </>
          )}
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={busy || length === 0 || tooLong || unchanged}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

function CommentItem({ comment, isPostAuthor, onSave, onAskDelete }) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="flex gap-3">
      <Avatar name={comment.author.name} src={comment.author.photoURL} className="mt-0.5 h-8 w-8 text-xs" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span className="font-semibold text-foreground">{comment.author.name}</span>
          {isPostAuthor && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">Author</span>}
          <time dateTime={comment.createdAt} title={formatFullDate(comment.createdAt)} className="text-xs text-muted-foreground">
            {formatPostDate(comment.createdAt)}
          </time>
          {comment.updatedAt && <span className="text-xs text-muted-foreground">(edited)</span>}
        </div>

        {editing ? (
          <div className="mt-2">
            <CommentForm
              compact
              autoFocus
              initial={comment.text}
              label="Edit your comment"
              submitLabel="Save"
              onCancel={() => setEditing(false)}
              onSubmit={async (text) => {
                await onSave(comment, text);
                setEditing(false);
              }}
            />
          </div>
        ) : (
          <>
            {/* Plain text on purpose: React escapes it, whitespace is preserved. */}
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{comment.text}</p>
            {(comment.canEdit || comment.canDelete) && (
              <div className="mt-1.5 flex gap-1 text-xs">
                {comment.canEdit && (
                  <button type="button" onClick={() => setEditing(true)} className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground">
                    <Pencil className="h-3 w-3" aria-hidden="true" /> Edit
                  </button>
                )}
                {comment.canDelete && (
                  <button type="button" onClick={() => onAskDelete(comment)} className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger">
                    <Trash2 className="h-3 w-3" aria-hidden="true" /> Delete
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export default function Comments({ postId, postAuthorUid, onCountChange }) {
  const [state, dispatch] = useReducer(commentsReducer, initialCommentsState);
  const [attempt, setAttempt] = useState(0);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const key = `${postId}|${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    zoneApi
      .listComments(postId, { signal: controller.signal })
      .then(({ comments }) => dispatch({ type: "loaded", key, items: comments }))
      .catch((error) => {
        if (error?.name !== "AbortError") dispatch({ type: "failed", key, error: error.message });
      });
    return () => controller.abort();
  }, [postId, key]);

  const current = state.key === key;

  async function add(text) {
    const { comment } = await zoneApi.addComment(postId, text);
    dispatch({ type: "added", comment });
    onCountChange(1);
  }

  async function save(comment, text) {
    const result = await zoneApi.updateComment(postId, comment.id, text);
    dispatch({ type: "updated", comment: result.comment });
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await zoneApi.deleteComment(postId, toDelete.id);
      dispatch({ type: "removed", id: toDelete.id });
      onCountChange(-1);
      toast.success("Comment deleted");
    } catch (error) {
      toast.error(error.status === 404 ? "That comment was already removed." : error.message);
      if (error.status === 404) dispatch({ type: "removed", id: toDelete.id });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <section aria-labelledby="comments-heading" className="space-y-6">
      <h2 id="comments-heading" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
        <MessageCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        Comments
        {current && state.status === "ready" && <span className="text-base font-normal text-muted-foreground">({state.items.length})</span>}
      </h2>

      <CommentForm label="Add a comment" submitLabel="Comment" onSubmit={add} />

      {!current ? (
        <div className="space-y-5" role="status" aria-label="Loading comments">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : state.status === "error" ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
          <span className="text-muted-foreground">Couldn&apos;t load comments. {state.error}</span>
          <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            Retry
          </Button>
        </div>
      ) : state.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No comments yet. Start the conversation!
        </p>
      ) : (
        <ul className="space-y-6" aria-label={plural(state.items.length, "comment")}>
          {state.items.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isPostAuthor={comment.author.uid === postAuthorUid}
              onSave={save}
              onAskDelete={setToDelete}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        busy={deleting}
        title="Delete this comment?"
        description="This can't be undone."
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
