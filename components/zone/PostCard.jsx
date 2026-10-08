import Image from "next/image";
import Link from "next/link";
import { Clock, Images, MapPin, MessageCircle } from "lucide-react";

import { formatPostDate, plural } from "@/lib/zone/format";

import Avatar from "./Avatar";
import LikeButton from "./LikeButton";

/**
 * One story in the feed.
 * The title link is stretched over the whole card (after:inset-0) so the card is
 * one big click target, while the like button sits above it (z-10) as a real,
 * separate control — no <button> nested inside an <a>.
 */
export default function PostCard({ post, onToggleLike, priority = false }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-primary/60">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-muted">
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-soft to-info-soft">
            <MapPin className="h-10 w-10 text-primary/40" aria-hidden="true" />
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium text-primary shadow-sm backdrop-blur">
          {post.category}
        </span>
        {post.imageCount > 1 && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur">
            <Images className="h-3.5 w-3.5" aria-hidden="true" />
            {post.imageCount}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h2 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-foreground">
          <Link href={`/zone/${post.id}`} className="outline-none after:absolute after:inset-0 after:content-['']">
            {post.title}
          </Link>
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={post.author.name} src={post.author.photoURL} />
            <div className="min-w-0 text-xs leading-tight">
              <p className="truncate font-medium text-foreground">{post.author.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                <time dateTime={post.createdAt}>{formatPostDate(post.createdAt)}</time>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {post.readingMinutes} min
                </span>
              </p>
            </div>
          </div>

          <div className="relative z-10 flex shrink-0 items-center gap-0.5">
            <span
              className="inline-flex items-center gap-1 px-2 text-xs text-muted-foreground"
              title={plural(post.commentCount, "comment")}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{plural(post.commentCount, "comment")}</span>
              <span aria-hidden="true" className="tabular-nums">
                {post.commentCount}
              </span>
            </span>
            <LikeButton liked={post.likedByMe} count={post.likeCount} onToggle={() => onToggleLike(post)} />
          </div>
        </div>
      </div>
    </article>
  );
}
