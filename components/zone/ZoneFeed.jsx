"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MotionConfig, motion } from "framer-motion";
import { Loader2, PenLine, UserRound } from "lucide-react";

import Button, { buttonVariants } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useZoneFeed } from "@/hooks/useZoneFeed";
import { CATEGORIES, SORT_OPTIONS } from "@/lib/zone/constants";
import { cn } from "@/lib/utils";

import CategoryFilter from "./CategoryFilter";
import { EmptyFeed, FeedError } from "./FeedStates";
import PostCard from "./PostCard";
import PostCardSkeleton from "./PostCardSkeleton";
import SearchField from "./SearchField";
import SortSelect from "./SortSelect";
import { BackLink } from "./StatePanel";

const DEBOUNCE_MS = 350;
const PAGE_SIZE = 12; // only used to cap the entrance-animation stagger

/**
 * The story feed. With `authorUid` it becomes that writer's page ("My stories" when it's you):
 * same cards, sorting and paging, but no search/category filters.
 */
export default function ZoneFeed({ authorUid = "" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAuthorPage = Boolean(authorUid);
  const isSelf = isAuthorPage && user?.uid === authorUid;

  // The URL is the source of truth for filters: shareable links, working back button.
  const q = isAuthorPage ? "" : (searchParams.get("q") || "").trim().slice(0, 100);
  const rawCategory = searchParams.get("category") || "";
  const category = !isAuthorPage && CATEGORIES.includes(rawCategory) ? rawCategory : "";
  const rawSort = searchParams.get("sort") || "";
  const sort = SORT_OPTIONS.some((o) => o.value === rawSort) ? rawSort : "new";

  const [input, setInput] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  // Back/forward changed the URL → follow it, but never clobber what the user is typing
  // (our own debounced update echoes back as a trimmed `q`).
  if (q !== lastQ) {
    setLastQ(q);
    if (input.trim() !== q) setInput(q);
  }

  function updateUrl(next) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.category) params.set("category", next.category);
    if (next.sort && next.sort !== "new") params.set("sort", next.sort);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  // Debounce typing → URL.
  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed === q) return;
    const timer = setTimeout(() => updateUrl({ q: trimmed, category, sort }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateUrl only closes over router/pathname
  }, [input, q, category, sort]);

  const { posts, loading, refreshing, error, hasMore, loadingMore, loadMore, toggleLike, retry } = useZoneFeed({ q, category, sort, authorUid });

  const filtered = Boolean(q || category);
  const clearFilters = () => {
    setInput("");
    updateUrl({ q: "", category: "", sort });
  };

  const authorName = posts[0]?.author.name;
  const title = !isAuthorPage ? "Travel Blog" : isSelf ? "My stories" : authorName ? `Stories by ${authorName}` : "Stories";

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6">
        {isAuthorPage && <BackLink />}

        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
              {isAuthorPage ? "Everything they've shared so far." : "Stories, tips and photos from travelers around the world."}
            </p>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            {!isAuthorPage && user && (
              <Link href={`/zone/author/${user.uid}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
                <UserRound className="h-4 w-4" aria-hidden="true" />
                My stories
              </Link>
            )}
            <Link href="/zone/new" className={buttonVariants({ size: "lg" })}>
              <PenLine className="h-4 w-4" aria-hidden="true" />
              New post
            </Link>
          </div>
        </header>

        {!isAuthorPage && (
          <div className="space-y-4">
            <SearchField value={input} onChange={setInput} onClear={() => setInput("")} />
            <CategoryFilter value={category} onChange={(next) => updateUrl({ q, category: next, sort })} />
          </div>
        )}

        {/* Screen readers: announce what happened after a filter change. */}
        <p role="status" aria-live="polite" className="sr-only">
          {loading || refreshing ? "Loading stories" : error ? "" : `${posts.length} ${posts.length === 1 ? "story" : "stories"} shown`}
        </p>

        <div className="flex min-h-9 items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {filtered && !error && !loading && (
              <>
                {posts.length} {posts.length === 1 ? "result" : "results"}
                {q && <> for &ldquo;{q}&rdquo;</>}
                {category && <> in {category}</>}
                {" · "}
                <button type="button" onClick={clearFilters} className="cursor-pointer font-medium text-primary hover:underline">
                  Clear
                </button>
              </>
            )}
          </p>
          <SortSelect value={sort} onChange={(next) => updateUrl({ q, category, sort: next })} />
        </div>

        {error ? (
          <FeedError message={error} onRetry={retry} />
        ) : loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading stories">
            {Array.from({ length: 6 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyFeed filtered={filtered} onClear={clearFilters} author={isAuthorPage ? { isSelf } : undefined} />
        ) : (
          <>
            <ul aria-busy={refreshing} className={cn("grid gap-5 transition-opacity duration-200 sm:grid-cols-2 xl:grid-cols-3", refreshing && "opacity-50")}>
              {posts.map((post, index) => (
                <motion.li
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: (index % PAGE_SIZE) * 0.03 }}
                >
                  <PostCard post={post} onToggleLike={toggleLike} priority={index < 3} />
                </motion.li>
              ))}
            </ul>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" size="lg" onClick={loadMore} disabled={loadingMore || refreshing}>
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {loadingMore ? "Loading…" : "Load more stories"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </MotionConfig>
  );
}
