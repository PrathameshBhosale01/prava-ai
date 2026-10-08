"use client";

import Link from "next/link";
import { Compass, Lock, TriangleAlert } from "lucide-react";

import Button, { buttonVariants } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useZonePost } from "@/hooks/useZonePost";

import { FormSkeleton } from "./NewPost";
import PostForm from "./PostForm";
import { BackLink, Problem } from "./StatePanel";

export default function EditPost({ id }) {
  const { user } = useAuth();
  const { post, loading, error, notFound, retry } = useZonePost(id);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <BackLink href={`/zone/${id}`}>Back to story</BackLink>
        <FormSkeleton />
      </div>
    );
  }

  if (notFound) {
    return <Problem icon={Compass} title="This story is off the map" message="It may have been deleted, or the link is wrong." action={<Link href="/zone" className={buttonVariants()}>Browse stories</Link>} />;
  }

  if (error || !post) {
    return <Problem icon={TriangleAlert} title="Couldn't load this story" message={error} action={<Button onClick={retry}>Try again</Button>} />;
  }

  // The API enforces this too (403) — this just gives a friendly page instead of a failed save.
  if (!post.isOwner) {
    return <Problem icon={Lock} title="You can only edit your own stories" message="Open the story to read it or leave a comment." action={<Link href={`/zone/${post.id}`} className={buttonVariants()}>View story</Link>} />;
  }

  const photos = post.imageUrls.map((url) => ({ id: url, url, previewUrl: "", status: "done", progress: 100, error: "" }));
  const initial = {
    values: { title: post.title, content: post.content, category: post.category },
    photos,
    coverId: post.coverImageUrl || photos[0]?.id || null,
  };
  const baseline = {
    title: post.title,
    content: post.content,
    category: post.category,
    imageUrls: post.imageUrls,
    coverIndex: Math.max(post.imageUrls.indexOf(post.coverImageUrl), 0),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={`/zone/${post.id}`}>Back to story</BackLink>
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Edit story</h1>
      </header>
      <PostForm key={post.id} mode="edit" postId={post.id} uid={user?.uid} initial={initial} baseline={baseline} />
    </div>
  );
}
