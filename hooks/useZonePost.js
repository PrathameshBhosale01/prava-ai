"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { zoneApi } from "@/lib/zone/client";

/** Loads one post and exposes optimistic like + comment-count adjustments. */
export function useZonePost(id) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, post: null, error: "", status: 0 });
  const liking = useRef(false);

  // `attempt` is part of the key so "Try again" refetches; a new `id` hides the previous post.
  const key = `${id}|${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    zoneApi
      .getPost(id, { signal: controller.signal })
      .then(({ post }) => setState({ key, post, error: "", status: 200 }))
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setState({ key, post: null, error: error.message, status: error.status });
      });
    return () => controller.abort();
  }, [id, key]);

  const current = state.key === key;

  async function toggleLike() {
    const post = state.post;
    if (!post || liking.current) return;
    liking.current = true;

    const liked = !post.likedByMe;
    const previous = { likedByMe: post.likedByMe, likeCount: post.likeCount };
    setState((s) => ({ ...s, post: { ...s.post, likedByMe: liked, likeCount: Math.max(previous.likeCount + (liked ? 1 : -1), 0) } }));

    try {
      const result = await zoneApi.setLike(post.id, liked);
      setState((s) => ({ ...s, post: { ...s.post, ...result, likedByMe: result.liked } }));
    } catch {
      setState((s) => ({ ...s, post: { ...s.post, ...previous } }));
      toast.error("Couldn't update your like. Try again.");
    } finally {
      liking.current = false;
    }
  }

  // Comments are loaded separately; this keeps the header count in sync with adds/deletes.
  function adjustCommentCount(delta) {
    setState((s) => (s.post ? { ...s, post: { ...s.post, commentCount: Math.max(s.post.commentCount + delta, 0) } } : s));
  }

  return {
    post: current ? state.post : null,
    loading: !current,
    error: current ? state.error : "",
    notFound: current && state.status === 404,
    toggleLike,
    adjustCommentCount,
    retry: () => setAttempt((n) => n + 1),
  };
}
