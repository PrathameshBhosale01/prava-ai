"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Link2, MessageCircle, Pencil, Trash2, TriangleAlert, Compass } from "lucide-react";
import { toast } from "sonner";

import Button, { buttonVariants } from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useZonePost } from "@/hooks/useZonePost";
import { zoneApi } from "@/lib/zone/client";
import { formatFullDate, plural, wasEdited } from "@/lib/zone/format";

import Avatar from "./Avatar";
import Comments from "./Comments";
import ConfirmDialog from "./ConfirmDialog";
import LikeButton from "./LikeButton";
import PostBody from "./PostBody";
import PostGallery from "./PostGallery";
import { BackLink, Problem } from "./StatePanel";

function PostSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6" role="status" aria-label="Loading story">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-4/5" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="aspect-[16/9] w-full" />
      <div className="space-y-3">
        {[100, 95, 90, 60].map((w) => (
          <Skeleton key={w} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function PostView({ id }) {
  const router = useRouter();
  const { post, loading, error, notFound, toggleLike, adjustCommentCount, retry } = useZonePost(id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  async function deletePost() {
    setDeleting(true);
    try {
      await zoneApi.deletePost(post.id);
      toast.success("Story deleted");
      router.replace("/zone");
    } catch (err) {
      setDeleting(false);
      setConfirmOpen(false);
      toast.error(err.message);
    }
  }

  if (loading) return <PostSkeleton />;

  if (notFound) {
    return (
      <Problem
        icon={Compass}
        title="This story is off the map"
        message="It may have been deleted, or the link is wrong."
        action={
          <Link href="/zone" className={buttonVariants()}>
            Browse stories
          </Link>
        }
      />
    );
  }

  if (error || !post) {
    return <Problem icon={TriangleAlert} title="Couldn't load this story" message={error} action={<Button onClick={retry}>Try again</Button>} />;
  }

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <BackLink />

      <header className="space-y-4">
        <Link
          href={`/zone?category=${encodeURIComponent(post.category)}`}
          className="inline-block rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          {post.category}
        </Link>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">{post.title}</h1>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={post.author.name} src={post.author.photoURL} className="h-10 w-10 text-sm" />
            <div className="text-sm leading-tight">
              <Link href={`/zone/author/${post.author.uid}`} className="font-medium text-foreground hover:text-primary hover:underline">
                {post.author.name}
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
                <time dateTime={post.createdAt}>{formatFullDate(post.createdAt)}</time>
                {wasEdited(post.createdAt, post.updatedAt) && <span>(edited)</span>}
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {post.readingMinutes} min read
                </span>
              </p>
            </div>
          </div>

          {post.isOwner && (
            <div className="flex gap-2">
              <Link href={`/zone/${post.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </Link>
              <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} className="hover:border-danger/50 hover:bg-danger-soft hover:text-danger">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </header>

      {post.imageUrls.length > 0 && <PostGallery images={post.imageUrls} title={post.title} startUrl={post.coverImageUrl} />}

      <PostBody>{post.content}</PostBody>

      <div className="flex items-center justify-between gap-3 border-y border-border py-3">
        <div className="flex items-center gap-1">
          <LikeButton liked={post.likedByMe} count={post.likeCount} onToggle={toggleLike} className="h-10 px-3.5 text-sm" />
          <a href="#comments-heading" className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {plural(post.commentCount, "comment")}
          </a>
        </div>
        <Button variant="ghost" size="sm" onClick={copyLink}>
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Copy link
        </Button>
      </div>

      <Comments postId={post.id} postAuthorUid={post.author.uid} onCountChange={adjustCommentCount} />

      <ConfirmDialog
        open={confirmOpen}
        busy={deleting}
        title="Delete this story?"
        description="The story, its photos, comments and likes will be permanently removed."
        confirmLabel="Delete story"
        onConfirm={deletePost}
        onCancel={() => setConfirmOpen(false)}
      />
    </article>
  );
}
