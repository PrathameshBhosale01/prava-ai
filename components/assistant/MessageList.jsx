"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

import ChatMessage from "./ChatMessage";

const NEAR_BOTTOM_PX = 120;

/**
 * Scrolling transcript. It follows the stream while the reader is at the
 * bottom, leaves them alone if they scrolled up to read, and always jumps down
 * when they send a new message.
 */
export default function MessageList({ messages, renderExtras, onRetry }) {
  const scrollRef = useRef(null);
  const stickRef = useRef(true);
  const lastUserIdRef = useRef(null);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback((behavior = "auto") => {
    const element = scrollRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior });
  }, []);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM_PX;
    stickRef.current = nearBottom;
    setShowJump(!nearBottom);
  };

  useEffect(() => {
    const lastUser = messages.findLast((message) => message.role === "user");
    if (lastUser?.id !== lastUserIdRef.current) {
      lastUserIdRef.current = lastUser?.id ?? null;
      stickRef.current = true;
    }
    if (stickRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Conversation"
        className="h-full overflow-y-auto [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]"
      >
        <div className="mx-auto w-full max-w-3xl space-y-7 px-4 py-6 sm:px-6">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <ChatMessage
                message={message}
                extras={renderExtras?.(message)}
                canRetry={index === messages.length - 1}
                onRetry={onRetry}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {showJump && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          aria-label="Jump to latest message"
         className="absolute bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-md transition hover:bg-surface-muted hover:text-foreground"
        >
          <ArrowDown size={16} />
        </button>
      )}
    </div>
  );
}