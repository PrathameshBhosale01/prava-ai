"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import { feedReducer, initialFeedState } from "@/lib/zone/feedState";
import { zoneApi } from "@/lib/zone/client";

/**
 * Loads the blog feed for the given filters and exposes load-more + optimistic likes.
 * The reducer is keyed by the filters (see lib/zone/feedState.js), so stale
 * responses can't clobber newer ones.
 */
export function useZoneFeed({ q, category, sort = "new", authorUid = "" }) {
  const [state, dispatch] = useReducer(feedReducer, initialFeedState);
  const [attempt, setAttempt] = useState(0);
  const pendingLikes = useRef(new Set());

  // `attempt` is part of the key so "Try again" always refetches.
  const key = `${attempt}|${category}|${sort}|${authorUid}|${q}`;

  useEffect(() => {
    const controller = new AbortController();
    zoneApi
      .listPosts({ q, category, sort, authorUid, signal: controller.signal })
      .then(({ posts, nextCursor }) => dispatch({ type: "loaded", key, posts, nextCursor }))
      .catch((error) => {
        if (error?.name === "AbortError") return;
        dispatch({ type: "failed", key, error: error.message });
      });
    return () => controller.abort();
  }, [key, q, category, sort, authorUid]);

  const isCurrent = state.key === key;

  async function loadMore() {
    if (!state.nextCursor || state.loadingMore || !isCurrent) return;
    dispatch({ type: "more-start" });
    try {
      const { posts, nextCursor } = await zoneApi.listPosts({ q, category, sort, authorUid, cursor: state.nextCursor });
      dispatch({ type: "more-loaded", key, posts, nextCursor });
    } catch (error) {
      dispatch({ type: "more-failed" });
      toast.error(error.message);
    }
  }

  async function toggleLike(post) {
    if (pendingLikes.current.has(post.id)) return; // ignore taps while the last one is in flight
    pendingLikes.current.add(post.id);

    const liked = !post.likedByMe;
    const previous = { likedByMe: post.likedByMe, likeCount: post.likeCount };
    dispatch({ type: "like-optimistic", id: post.id, liked });

    try {
      const result = await zoneApi.setLike(post.id, liked);
      dispatch({ type: "like-settled", id: post.id, ...result });
    } catch (error) {
      dispatch({ type: "like-revert", id: post.id, previous });
      toast.error(error.status === 404 ? "That post was removed." : "Couldn't update your like. Try again.");
    } finally {
      pendingLikes.current.delete(post.id);
    }
  }

  return {
    posts: state.posts,
    // First load (or retry with nothing to show yet): render skeletons.
    loading: !isCurrent && state.posts.length === 0,
    // Filters changed: keep old posts on screen, dimmed.
    refreshing: !isCurrent && state.posts.length > 0,
    error: isCurrent && state.status === "error" ? state.error : "",
    hasMore: Boolean(state.nextCursor),
    loadingMore: state.loadingMore,
    loadMore,
    toggleLike,
    retry: () => setAttempt((n) => n + 1),
  };
}
