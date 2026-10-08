"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, RotateCcw, Star, X } from "lucide-react";

import { moveItem } from "@/lib/zone/composer";
import { ALLOWED_UPLOAD_TYPES, LIMITS } from "@/lib/zone/constants";
import { zoneApi } from "@/lib/zone/client";
import { checkImageFile, checkImageSize, prepareImage } from "@/lib/zone/imageCompress";
import { cn } from "@/lib/utils";

const iconBtn =
  "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-white";

/**
 * Controlled by the form: `photos` is [{ id, url, previewUrl, status, progress, error }]
 * and `setPhotos` takes an updater function. Uploads run in parallel, each with its own
 * progress and cancel/retry; only finished ones are submitted (see buildPayload).
 */
export default function PhotoUploader({ photos, setPhotos, coverId, setCoverId, error }) {
  const inputRef = useRef(null);
  const controllers = useRef(new Map()); // id → AbortController
  const files = useRef(new Map()); // id → File (kept for "Retry")
  const previews = useRef(new Set()); // object URLs we must revoke
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const running = controllers.current;
    const urls = previews.current;
    return () => {
      running.forEach((c) => c.abort());
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const patch = (id, changes) => setPhotos((list) => list.map((p) => (p.id === id ? { ...p, ...changes } : p)));

  async function upload(id, file) {
    const controller = new AbortController();
    controllers.current.set(id, controller);
    patch(id, { status: "uploading", progress: 0, error: "" });
    try {
      const prepared = await prepareImage(file);
      const tooBig = checkImageSize(prepared);
      if (tooBig) throw new Error(tooBig);
      const { url } = await zoneApi.uploadImage(prepared, { signal: controller.signal, onProgress: (progress) => patch(id, { progress }) });
      patch(id, { status: "done", progress: 100, url });
    } catch (err) {
      if (err?.name !== "AbortError") patch(id, { status: "error", error: err.message });
    } finally {
      controllers.current.delete(id);
    }
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const messages = [];
    const room = LIMITS.maxImages - photos.length;
    if (incoming.length > room) messages.push(`You can attach up to ${LIMITS.maxImages} photos.`);

    const items = [];
    for (const file of incoming.slice(0, Math.max(room, 0))) {
      const problem = checkImageFile(file);
      if (problem) {
        messages.push(`${file.name}: ${problem}`);
        continue;
      }
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      previews.current.add(previewUrl);
      files.current.set(id, file);
      items.push({ id, url: "", previewUrl, status: "uploading", progress: 0, error: "", canRetry: true });
    }

    setNotice(messages.join(" "));
    if (items.length === 0) return;
    setPhotos((list) => [...list, ...items]);
    items.forEach((item) => upload(item.id, files.current.get(item.id)));
  }

  function remove(photo) {
    controllers.current.get(photo.id)?.abort();
    files.current.delete(photo.id);
    if (photo.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
      previews.current.delete(photo.previewUrl);
    }
    setPhotos((list) => list.filter((p) => p.id !== photo.id));
    if (coverId === photo.id) setCoverId(null);
  }

  const done = photos.filter((p) => p.status === "done");
  const effectiveCover = done.find((p) => p.id === coverId)?.id ?? done[0]?.id;
  const full = photos.length >= LIMITS.maxImages;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
      className={cn("rounded-xl border-2 border-dashed p-3 transition-colors sm:p-4", dragging ? "border-primary bg-primary-soft" : "border-border")}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_UPLOAD_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = ""; // allow picking the same file again
        }}
      />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, index) => {
          const isCover = photo.id === effectiveCover;
          return (
            <li key={photo.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob previews can't go through next/image */}
              <img src={photo.previewUrl || photo.url} alt={`Photo ${index + 1}`} className={cn("h-full w-full object-cover", photo.status !== "done" && "opacity-50")} />

              {isCover && photo.status === "done" && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground shadow">
                  <Star className="h-3 w-3 fill-current" aria-hidden="true" /> Cover
                </span>
              )}

              {photo.status === "uploading" && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white" role="progressbar" aria-label={`Uploading photo ${index + 1}`} aria-valuenow={photo.progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    {photo.progress >= 100 ? "Processing…" : `Uploading ${photo.progress}%`}
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/30">
                    <div className="h-full bg-white transition-all" style={{ width: `${photo.progress}%` }} />
                  </div>
                </div>
              )}

              {photo.status === "error" && (
                <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-danger-soft/95 p-3 text-center">
                  <p className="text-xs font-medium text-danger">{photo.error}</p>
                  {photo.canRetry && (
                    <button type="button" onClick={() => upload(photo.id, files.current.get(photo.id))} className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-surface-muted">
                      <RotateCcw className="h-3 w-3" aria-hidden="true" /> Retry
                    </button>
                  )}
                </div>
              )}

              <button type="button" onClick={() => remove(photo)} aria-label={`Remove photo ${index + 1}`} className={cn(iconBtn, "absolute right-2 top-2")}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>

              {photo.status === "done" && (
                <div className="absolute inset-x-2 bottom-2 flex items-center justify-between opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  <div className="flex gap-1">
                    <button type="button" disabled={index === 0} onClick={() => setPhotos((l) => moveItem(l, index, index - 1))} aria-label={`Move photo ${index + 1} earlier`} className={iconBtn}>
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button type="button" disabled={index === photos.length - 1} onClick={() => setPhotos((l) => moveItem(l, index, index + 1))} aria-label={`Move photo ${index + 1} later`} className={iconBtn}>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <button type="button" aria-pressed={isCover} onClick={() => setCoverId(photo.id)} aria-label={isCover ? `Photo ${index + 1} is the cover` : `Use photo ${index + 1} as cover`} className={cn(iconBtn, isCover && "bg-primary hover:bg-primary")}>
                    <Star className={cn("h-4 w-4", isCover && "fill-current")} aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          );
        })}

        {!full && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-surface text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary-soft hover:text-primary"
            >
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
              <span className="text-sm font-medium">Add photos</span>
              <span className="text-xs">or drop them here</span>
            </button>
          </li>
        )}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground">
        {photos.length}/{LIMITS.maxImages} photos · JPG, PNG, WebP or AVIF · big photos are shrunk automatically
      </p>
      <p role="status" className={cn("text-xs text-danger", !notice && !error && "sr-only")}>
        {notice || error}
      </p>
    </div>
  );
}
