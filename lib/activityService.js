import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

// Activities live under the user they belong to:
//   users/{userId}/activities/{activityId}
//   { action, entity, entityId, title, createdAt }
//
// action: "CREATE" | "UPDATE" | "DELETE"
// entity: "TRIP" | "ITINERARY"

function activitiesRef(userId) {
  return collection(db, "users", userId, "activities");
}

/**
 * Record something the user did. Best-effort by design: the activity feed is
 * secondary, so a failed log must never make the real action (creating a
 * trip, etc.) fail. Errors are logged and swallowed.
 */
export async function logActivity(userId, { action, entity, entityId = "", title = "" }) {
  if (!userId) return;

  try {
    await addDoc(activitiesRef(userId), {
      action,
      entity,
      entityId,
      title: String(title ?? "").slice(0, 120),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

/**
 * Newest first. Unlike logActivity this THROWS on failure, so the UI can show
 * an error state instead of a misleading "no activity yet".
 */
export async function getRecentActivities(userId, count = 8) {
  if (!userId) return [];

  const snapshot = await getDocs(
    query(activitiesRef(userId), orderBy("createdAt", "desc"), limit(count))
  );

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}