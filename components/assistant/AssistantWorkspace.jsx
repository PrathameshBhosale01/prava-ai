"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { useAssistantChat } from "@/hooks/useAssistantChat";
import AssistantView from "./AssistantView";

function Session() {
  const chat = useAssistantChat();
  return <AssistantView chat={chat} />;
}

/** Auth gate: sends signed-out visitors to /login, then mounts the assistant. */
export default function AssistantWorkspace() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-[calc(100dvh-7rem)] min-h-[520px] items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm text-gray-400" role="status">
        Loading assistant…
      </div>
    );
  }

  return <Session />;
}