"use client";

import { useSyncExternalStore } from "react";

import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { draftKey, emptyValues, parseDraft } from "@/lib/zone/composer";

import PostForm from "./PostForm";
import { BackLink } from "./StatePanel";

const EMPTY_BASELINE = { ...emptyValues, imageUrls: [], coverIndex: 0 };
const noSubscribe = () => () => {};

export function FormSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading editor">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export default function NewPost() {
  const { user } = useAuth();
  const key = draftKey(user?.uid);

  // Reading localStorage during render would differ between server and client (hydration
  // mismatch). useSyncExternalStore serves `undefined` on the server/hydration pass and the
  // real value after, so the form below only mounts once we know whether there's a draft.
  const raw = useSyncExternalStore(
    noSubscribe,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => undefined,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink />
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Write a story</h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">Share a trip, a tip, or a hidden gem with other travelers.</p>
      </header>

      {raw === undefined || !user ? <FormSkeleton /> : <NewPostForm uid={user.uid} draft={parseDraft(raw)} />}
    </div>
  );
}

function NewPostForm({ uid, draft }) {
  const photos = (draft?.imageUrls ?? []).map((url) => ({ id: url, url, previewUrl: "", status: "done", progress: 100, error: "" }));
  const initial = {
    values: { title: draft?.title ?? "", content: draft?.content ?? "", category: draft?.category ?? "" },
    photos,
    coverId: photos[draft?.coverIndex ?? 0]?.id ?? null,
  };
  return <PostForm mode="create" uid={uid} initial={initial} baseline={EMPTY_BASELINE} restored={Boolean(draft)} />;
}
