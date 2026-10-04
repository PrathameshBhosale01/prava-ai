import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { logActivity } from "@/lib/activityService";
import { db } from "@/lib/firebase";

export async function createTrip(userId, tripData) {
  const tripsRef = collection(db, "trips");

  const trip = {
    ...tripData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(tripsRef, trip);

  await logActivity(userId, {
    action: "CREATE",
    entity: "TRIP",
    entityId: docRef.id,
    title: tripData.title,
  });

  return docRef.id;
}

export async function getUserTrips(userId) {
  const tripsRef = collection(db, "trips");

  const tripsQuery = query(
    tripsRef,
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(tripsQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export async function getTrip(tripId) {
  const tripRef = doc(db, "trips", tripId);

  const snapshot = await getDoc(tripRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

// Pass { userId } so the change shows up in the user's activity feed.
export async function updateTrip(tripId, tripData, { userId } = {}) {
  const tripRef = doc(db, "trips", tripId);

  await updateDoc(tripRef, {
    ...tripData,
    updatedAt: serverTimestamp(),
  });

  await logActivity(userId, {
    action: "UPDATE",
    entity: "TRIP",
    entityId: tripId,
    title: tripData.title,
  });
}

// Pass { userId, title } so the deletion shows up in the activity feed.
export async function deleteTrip(tripId, { userId, title } = {}) {
  const tripRef = doc(db, "trips", tripId);

  await deleteDoc(tripRef);

  await logActivity(userId, {
    action: "DELETE",
    entity: "TRIP",
    entityId: tripId,
    title,
  });
}

export async function saveItinerary(
  tripId,
  itinerary
) {
  const tripRef = doc(db, "trips", tripId);

  await updateDoc(tripRef, {
    itinerary,
    itineraryGeneratedAt:
      serverTimestamp(),
    updatedAt:
      serverTimestamp(),
  });
}