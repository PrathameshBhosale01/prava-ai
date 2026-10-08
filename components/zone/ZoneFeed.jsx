"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MotionConfig, motion } from "framer-motion";
import { Loader2, PenLine } from "lucide-react";

import Button, { buttonVariants } from "@/components/ui/Button";
import { useZoneFeed } from "@/hooks/useZoneFeed";
import { CATEGORIES } from "@/lib/zone/constants";
import { cn } from "@/lib/utils";

import CategoryFilter from "./CategoryFilter";
import { EmptyFeed, FeedError } from "./FeedStates";
import PostCard from "./PostCard";
import PostCardSkeleton from "./PostCardSkeleton";
import SearchField from "./SearchField";

const DEBOUNCE_MS = 350;
const PAGE_SIZE = 12; // only used to cap the entrance-animation stagger

export default function ZoneFeed() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The URL is the source of truth for filters: shareable links, working back button.
  const q = (searchParams.get("q") || "").trim().slice(0, 100);
  const rawCategory = searchParams.get("category") || "";
  const category = CATEGORIES.includes(rawCategory) ? rawCategory : "";

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
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  // Debounce typing → URL.
  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed === q) return;
    const timer = setTimeout(() => updateUrl({ q: trimmed, category }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateUrl only closes over router/pathname
  }, [input, q, category]);

  const { posts, loading, refreshing, error, hasMore, loadingMore, loadMore, toggleLike, retry } = useZoneFeed({ q, category });

  const filtered = Boolean(q || category);
  const clearFilters = () => {
    setInput("");
    updateUrl({ q: "", category: "" });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Travel Blog</h1>
            <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
              Stories, tips and photos from travelers around the world.
            </p>
          </div>
          <Link href="/zone/new" className={buttonVariants({ size: "lg", className: "self-start sm:self-auto" })}>
            <PenLine className="h-4 w-4" aria-hidden="true" />
            New post
          </Link>
        </header>

        <div className="space-y-4">
          <SearchField value={input} onChange={setInput} onClear={() => setInput("")} />
          <CategoryFilter value={category} onChange={(next) => updateUrl({ q, category: next })} />
        </div>

        {/* Screen readers: announce what happened after a filter change. */}
        <p role="status" aria-live="polite" className="sr-only">
          {loading || refreshing ? "Loading stories" : error ? "" : `${posts.length} ${posts.length === 1 ? "story" : "stories"} shown`}
        </p>

        {filtered && !error && !loading && (
          <p className="text-sm text-muted-foreground">
            {posts.length} {posts.length === 1 ? "result" : "results"}
            {q && <> for &ldquo;{q}&rdquo;</>}
            {category && <> in {category}</>}
            {" · "}
            <button type="button" onClick={clearFilters} className="cursor-pointer font-medium text-primary hover:underline">
              Clear
            </button>
          </p>
        )}

        {error ? (
          <FeedError message={error} onRetry={retry} />
        ) : loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading stories">
            {Array.from({ length: 6 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyFeed filtered={filtered} onClear={clearFilters} />
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
