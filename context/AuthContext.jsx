"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import {
  createUserProfile,
  saveDisplayName,
  savePreferences,
} from "@/lib/userService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // { uid, data } so a stale profile from a previous account is never shown.
  const [profileState, setProfileState] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          await createUserProfile(currentUser);
        } catch (error) {
          console.error("Failed to create user profile:", error);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Live copy of users/{uid}: edits made in the profile modal show up
  // everywhere (sidebar, dashboard greeting) without a refresh.
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;

    const unsubscribe = onSnapshot(
      doc(db, "users", uid),
      (snapshot) =>
        setProfileState({
          uid,
          data: snapshot.exists() ? snapshot.data() : null,
        }),
      (error) => console.error("Profile listener failed:", error)
    );

    return unsubscribe;
  }, [uid]);

  // `uid &&` matters: signed out, both sides are undefined and would match.
  const profile = uid && profileState?.uid === uid ? profileState.data : null;

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const updateDisplayName = useCallback(
    async (name) => {
      if (!user) throw new Error("You need to be signed in.");
      return saveDisplayName(user, name);
    },
    [user]
  );

  const updatePreferences = useCallback(
    async (preferences) => {
      if (!user) throw new Error("You need to be signed in.");
      return savePreferences(user.uid, preferences);
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      logout,
      updateDisplayName,
      updatePreferences,
    }),
    [user, profile, loading, logout, updateDisplayName, updatePreferences]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}