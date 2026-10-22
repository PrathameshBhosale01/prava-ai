"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import UpgradeDialog from "@/components/billing/UpgradeDialog";

const UpgradeContext = createContext({ openUpgrade: () => {} });

/**
 * Lets any screen say "show the Upgrade dialog" with openUpgrade({ reason, message }), where `reason`
 * is a limit code (LIMIT_REACHED, REGENERATE_LIMIT, TRIP_COUNT, STOP_COUNT, TRIP_DAYS) or nothing.
 * Also thanks the person when Polar sends them back after paying (?upgraded=1).
 */
export function UpgradeProvider({ children }) {
  const [state, setState] = useState({ open: false, prompt: null });

  const openUpgrade = useCallback((prompt = {}) => setState({ open: true, prompt }), []);
  const closeUpgrade = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("upgraded") !== "1") return;
    toast.success("Thanks for upgrading! Pro unlocks in a few seconds.");
    url.searchParams.delete("upgraded");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);

  const value = useMemo(() => ({ openUpgrade }), [openUpgrade]);

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      <UpgradeDialog open={state.open} prompt={state.prompt} onClose={closeUpgrade} />
    </UpgradeContext.Provider>
  );
}

export function useUpgrade() {
  return useContext(UpgradeContext);
}
