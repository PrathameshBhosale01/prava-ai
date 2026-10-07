import { updateProfile } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import {
  getDisplayNameError,
  normalizeDisplayName,
  sanitizePreferences,
} from "@/lib/profileValidation";

export async function createUserProfile(user) {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);

  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      preferences: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Saves the display name. Firestore (users/{uid}.name) is the source of truth;
 * the Firebase Auth profile is kept in sync on a best-effort basis.
 */
export async function saveDisplayName(user, rawName) {
  const error = getDisplayNameError(rawName);
  if (error) throw new Error(error);

  const name = normalizeDisplayName(rawName);

  await updateDoc(doc(db, "users", user.uid), {
    name,
    updatedAt: serverTimestamp(),
  });

  try {
    await updateProfile(user, { displayName: name });
  } catch (authError) {
    console.warn("Auth display name sync failed:", authError);
  }

  return name;
}

export async function savePreferences(userId, preferences) {
  const clean = sanitizePreferences(preferences);

  await updateDoc(doc(db, "users", userId), {
    preferences: clean,
    updatedAt: serverTimestamp(),
  });

  return clean;
}