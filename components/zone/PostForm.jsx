"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bold, Heading2, Italic, Link2, List, Loader2, Quote, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { zoneApi } from "@/lib/zone/client";
import { applyFormat, buildPayload, draftKey, emptyValues, isDirty } from "@/lib/zone/composer";
import { CATEGORIES, LIMITS } from "@/lib/zone/constants";
import { validateTextFields } from "@/lib/zone/validation";
import { cn } from "@/lib/utils";

import ConfirmDialog from "./ConfirmDialog";
import PhotoUploader from "./PhotoUploader";
import PostBody from "./PostBody";

const field = "w-full rounded-lg border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60";
const ok = "border-border focus-visible:border-primary focus-visible:ring-primary/30";
const bad = "border-danger focus-visible:border-danger focus-visible:ring-danger/30";

const TOOLS = [
  { kind: "bold", label: "Bold (Ctrl+B)", icon: Bold },
  { kind: "italic", label: "Italic (Ctrl+I)", icon: Italic },
  { kind: "heading", label: "Heading", icon: Heading2 },
  { kind: "list", label: "Bulleted list", icon: List },
  { kind: "quote", label: "Quote", icon: Quote },
  { kind: "link", label: "Link", icon: Link2 },
];

function Field({ id, label, hint, error, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {hint}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Shared by "new story" and "edit story".
 *  initial:  { values, photos, coverId }  what the form starts with
 *  baseline: payload to compare against for "unsaved changes" (blank form, or the saved post)
 */
export default function PostForm({ mode, postId, uid, initial, baseline, restored = false }) {
  const router = useRouter();
  const textareaRef = useRef(null);
  const submitted = useRef(false); // set once we're leaving on purpose (no warnings, no autosave)
  const tabsId = useId();

  const [values, setValues] = useState(initial.values);
  const [photos, setPhotos] = useState(initial.photos);
  const [coverId, setCoverId] = useState(initial.coverId);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState("write");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [showRestored, setShowRestored] = useState(restored);

  const isCreate = mode === "create";
  const storageKey = draftKey(uid);
  const payload = buildPayload({ values, photos, coverId });
  const payloadJson = JSON.stringify(payload);
  const dirty = isDirty(payload, baseline);
  const uploading = photos.some((p) => p.status === "uploading");
  const contentLength = values.content.trim().length;

  const clearDraft = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  // Autosave new stories so a refresh, crash or accidental tab close doesn't lose them.
  useEffect(() => {
    if (!isCreate) return;
    const timer = setTimeout(() => {
      if (submitted.current) return;
      try {
        if (dirty) localStorage.setItem(storageKey, payloadJson);
        else localStorage.removeItem(storageKey);
      } catch {} // private mode / quota: autosave is a nicety, never an error
    }, 800);
    return () => clearTimeout(timer);
  }, [isCreate, dirty, payloadJson, storageKey]);

  // Browser-level guard against closing/reloading with unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      if (submitted.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setValue = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    setErrors((errs) => (errs[name] ? { ...errs, [name]: undefined } : errs));
  };

  function format(kind) {
    const ta = textareaRef.current;
    if (!ta) return;
    const { text, start, end } = applyFormat(values.content, ta.selectionStart, ta.selectionEnd, kind);
    setValues((v) => ({ ...v, content: text }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start, end);
    });
  }

  function onContentKeyDown(e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const kind = { b: "bold", i: "italic" }[e.key.toLowerCase()];
    if (kind) {
      e.preventDefault();
      format(kind);
    }
  }

  function leave() {
    submitted.current = true;
    router.push(isCreate ? "/zone" : `/zone/${postId}`);
  }

  function discardDraft() {
    clearDraft();
    setValues(emptyValues);
    setPhotos([]);
    setCoverId(null);
    setErrors({});
    setShowRestored(false);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    const { fields } = validateTextFields(payload);
    if (Object.keys(fields).length > 0) {
      setErrors(fields);
      setTab("write");
      const first = ["title", "category", "content"].find((name) => fields[name]);
      requestAnimationFrame(() => document.getElementById(`field-${first}`)?.focus());
      return;
    }
    if (uploading) {
      toast.error("Hang on — photos are still uploading.");
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const { post } = isCreate ? await zoneApi.createPost(payload) : await zoneApi.updatePost(postId, payload);
      submitted.current = true;
      clearDraft();
      toast.success(isCreate ? "Story published!" : "Changes saved");
      router.push(`/zone/${post.id}`);
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      toast.error(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {showRestored && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-foreground">
          <span>We restored the draft you hadn&apos;t published yet.</span>
          <button type="button" onClick={discardDraft} className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-primary hover:underline">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Start over
          </button>
        </div>
      )}

      <section aria-label="Story" className="space-y-5 rounded-xl border border-border bg-surface p-4 shadow-card sm:p-6">
        <Field
          id="field-title"
          label="Title"
          error={errors.title}
          hint={
            <span className={cn("text-xs tabular-nums", values.title.length > LIMITS.title.max ? "text-danger" : "text-muted-foreground")}>
              {values.title.length}/{LIMITS.title.max}
            </span>
          }
        >
          <Input
            id="field-title"
            value={values.title}
            onChange={setValue("title")}
            maxLength={LIMITS.title.max}
            placeholder="e.g. Three snowy days in Manali"
            autoComplete="off"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "field-title-error" : undefined}
            className={cn("h-11 text-base", errors.title && bad)}
          />
        </Field>

        <Field id="field-category" label="Category" error={errors.category}>
          <select
            id="field-category"
            value={values.category}
            onChange={setValue("category")}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? "field-category-error" : undefined}
            className={cn(field, "h-11 cursor-pointer", errors.category ? bad : ok, !values.category && "text-muted-foreground")}
          >
            <option value="">Choose a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="field-content"
          label="Your story"
          error={errors.content}
          hint={
            <span className={cn("text-xs tabular-nums", contentLength > LIMITS.content.max ? "text-danger" : "text-muted-foreground")}>
              {contentLength.toLocaleString()}/{LIMITS.content.max.toLocaleString()}
            </span>
          }
        >
          <div className={cn("overflow-hidden rounded-lg border bg-surface transition-colors focus-within:ring-2", errors.content ? "border-danger focus-within:ring-danger/30" : "border-border focus-within:border-primary focus-within:ring-primary/30")}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-muted/60 px-2 py-1.5">
              <div role="tablist" aria-label="Editor mode" className="flex gap-1">
                {["write", "preview"].map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="tab"
                    id={`${tabsId}-${name}`}
                    aria-selected={tab === name}
                    aria-controls={`${tabsId}-panel-${name}`}
                    onClick={() => setTab(name)}
                    className={cn("cursor-pointer rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors", tab === name ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div role="toolbar" aria-label="Formatting" className="flex gap-0.5">
                {TOOLS.map(({ kind, label, icon: Icon }) => (
                  <button
                    key={kind}
                    type="button"
                    title={label}
                    aria-label={label}
                    disabled={tab !== "write"}
                    onClick={() => format(kind)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>

            <div role="tabpanel" id={`${tabsId}-panel-write`} aria-labelledby={`${tabsId}-write`} hidden={tab !== "write"}>
              <textarea
                id="field-content"
                ref={textareaRef}
                value={values.content}
                onChange={setValue("content")}
                onKeyDown={onContentKeyDown}
                rows={14}
                placeholder="Where did you go? What surprised you? What would you tell a friend heading there? Markdown is supported."
                aria-invalid={Boolean(errors.content)}
                aria-describedby={errors.content ? "field-content-error" : undefined}
                className="block min-h-64 w-full resize-y bg-transparent px-3 py-3 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
              />
            </div>
            <div role="tabpanel" id={`${tabsId}-panel-preview`} aria-labelledby={`${tabsId}-preview`} hidden={tab !== "preview"} className="min-h-64 px-4 py-4">
              {values.content.trim() ? <PostBody>{values.content}</PostBody> : <p className="text-sm text-muted-foreground">Nothing to preview yet — write something first.</p>}
            </div>
          </div>
        </Field>
      </section>

      <section aria-labelledby="photos-heading" className="space-y-3">
        <div>
          <h2 id="photos-heading" className="text-base font-semibold text-foreground">
            Photos <span className="font-normal text-muted-foreground">(optional)</span>
          </h2>
          <p className="text-sm text-muted-foreground">The first photo — or the one you star — becomes the cover.</p>
        </div>
        <PhotoUploader photos={photos} setPhotos={setPhotos} coverId={coverId} setCoverId={setCoverId} error={errors.imageUrls || errors.coverImage} />
      </section>

      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground" role="status">
          {uploading ? "Waiting for photos to finish uploading…" : isCreate && dirty ? "Draft saved on this device." : ""}
        </p>
        <div className="flex gap-2 sm:justify-end">
          <Button type="button" variant="outline" size="lg" className="flex-1 sm:flex-none" disabled={submitting} onClick={() => (dirty ? setDiscardOpen(true) : leave())}>
            Cancel
          </Button>
          <Button type="submit" size="lg" className="flex-1 sm:flex-none" disabled={submitting || uploading}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {submitting ? (isCreate ? "Publishing…" : "Saving…") : isCreate ? "Publish story" : "Save changes"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={discardOpen}
        title="Discard your changes?"
        description={isCreate ? "Your draft will be deleted and can't be recovered." : "Your edits to this story won't be saved."}
        confirmLabel="Discard"
        onConfirm={() => {
          clearDraft();
          leave();
        }}
        onCancel={() => setDiscardOpen(false)}
      />
    </form>
  );
}
